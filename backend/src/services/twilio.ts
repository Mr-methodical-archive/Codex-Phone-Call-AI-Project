import twilio, { Twilio } from 'twilio';
import crypto from 'crypto';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import { CallRequestBody, CallRecord, ProviderChoice } from '../../../shared/types.js';
import { createCall, updateCall } from '../store/calls.js';
import { wsHub } from '../realtime/wsHub.js';
import { runMockScenario } from '../telephony/mocks/runner.js';
import { withRetry } from '../utils/retry.js';

export interface InitiateCallOptions {
  body: CallRequestBody;
}

export class TwilioService {
  private client?: Twilio;

  constructor() {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
  }

  async initiateCall({ body }: InitiateCallOptions): Promise<{ callId: string }> {
    const callId = crypto.randomUUID();
    const providers: ProviderChoice = {
      stt: body.providers?.stt ?? (env.USE_MOCK || body.mock ? 'mock' : 'openai-whisper'),
      tts: body.providers?.tts ?? (env.USE_MOCK || body.mock ? 'mock' : 'elevenlabs'),
      llm: body.providers?.llm ?? (env.USE_MOCK || body.mock ? 'mock' : 'openai-chat')
    };

    const record: CallRecord = {
      id: callId,
      phoneNumber: body.phoneNumber,
      userIntent: body.task,
      mock: Boolean(env.USE_MOCK || body.mock),
      providerChoices: providers,
      status: 'dialing',
      startAt: new Date().toISOString()
    };

    createCall(record);
    wsHub.broadcast({ type: 'status', data: { callId, status: 'dialing' } });

    if (record.mock) {
      logger.info({ callId }, 'Starting mock call');
      runMockScenario({
        callId,
        task: body.task,
        phoneNumber: body.phoneNumber,
        providers,
        profile: body.mockProfile ?? env.MOCK_IVR_PROFILE
      }).catch((err) => logger.error({ err, callId }, 'Mock call failed'));
      return { callId };
    }

    if (!this.client) {
      throw new Error('Twilio client not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
    if (!env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER is required for live calls.');
    }

    const voiceUrl = new URL('/twilio/voice', env.PUBLIC_BASE_URL);
    voiceUrl.searchParams.set('callId', callId);

    await withRetry(
      async () => {
        await this.client!.calls.create({
          to: body.phoneNumber,
          from: env.TWILIO_PHONE_NUMBER!,
          url: voiceUrl.toString(),
          timeLimit: env.CALL_MAX_MINUTES * 60
        });
      },
      {
        onRetry: (error, attempt) => logger.warn({ error, attempt, callId }, 'Retrying Twilio call create'),
        retries: 3,
        shouldRetry: (error) => {
          const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;
          return status === 429 || (typeof status === 'number' && status >= 500);
        }
      }
    );

    logger.info({ callId }, 'Placed outbound Twilio call');
    return { callId };
  }

  buildVoiceResponse(callId: string) {
    const streamUrl = new URL('/twilio/media', env.PUBLIC_BASE_URL);
    streamUrl.searchParams.set('callId', callId);

    const response = new twilio.twiml.VoiceResponse();
    const connect = response.connect();
    connect.stream({ url: streamUrl.toString(), track: 'inbound_track' });
    return response.toString();
  }

  async emitDtmf(callSid: string, digits: string) {
    if (env.USE_MOCK) {
      logger.info({ callSid, digits }, 'Mock DTMF emitted');
      return;
    }
    if (!this.client) {
      throw new Error('Twilio client not configured.');
    }

    await withRetry(
      async () => {
        await this.client!.calls(callSid).update({ sendDigits: digits });
      },
      {
        onRetry: (error, attempt) => logger.warn({ error, attempt, callSid }, 'Retrying Twilio DTMF emit'),
        retries: 3,
        shouldRetry: (error) => {
          const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;
          return status === 429 || (typeof status === 'number' && status >= 500);
        }
      }
    );
  }

  completeCall(callId: string, status: 'completed' | 'failed') {
    updateCall({ id: callId, status, endAt: new Date().toISOString(), metadata: undefined });
    wsHub.broadcast({ type: 'status', data: { callId, status } });
  }
}

export const twilioService = new TwilioService();
