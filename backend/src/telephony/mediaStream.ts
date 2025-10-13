import { WebSocketServer } from 'ws';
import type { Server as HttpServer } from 'http';
import crypto from 'crypto';
import { createSttProvider } from '../services/stt.js';
import { createTtsProvider } from '../services/tts.js';
import { createLlmProvider, LlmMessage } from '../services/llm.js';
import { wsHub } from '../realtime/wsHub.js';
import { getCall, insertTranscript } from '../store/calls.js';
import { summarizeCall } from '../services/summarizer.js';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';
import { TranscriptLine } from '../../../shared/types.js';
import { BoundedQueue } from '../utils/queue.js';
import { withRetry } from '../utils/retry.js';

interface TwilioMediaMessage {
  event: 'connected' | 'start' | 'media' | 'stop' | string;
  start?: { streamSid: string; callSid: string };
  media?: { payload: string };
}

function inferStatus(text: string): 'ivr' | 'human' | 'on-hold' {
  const normalized = text.toLowerCase();
  if (normalized.includes('press') || normalized.includes('menu') || normalized.includes('option')) {
    return 'ivr';
  }
  if (normalized.includes('hold')) {
    return 'on-hold';
  }
  return 'human';
}

export function attachMediaStreamServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/twilio/media' });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    const callId = url.searchParams.get('callId');
    if (!callId) {
      socket.close(1008, 'callId required');
      return;
    }
    const callRecord = getCall(callId);
    if (!callRecord) {
      socket.close(1008, 'unknown call');
      return;
    }

    const sttProvider = createSttProvider(callRecord.providerChoices.stt ?? 'mock');
    const ttsProvider = createTtsProvider(callRecord.providerChoices.tts ?? 'mock');
    const llmProvider = createLlmProvider(callRecord.providerChoices.llm ?? 'mock');
    const messages: LlmMessage[] = [];
    let streamSid = '';
    let callSid = '';
    const transcript: TranscriptLine[] = [];
    const audioQueue = new BoundedQueue<Buffer>(Math.ceil((1000 / env.AUDIO_CHUNK_MS) * 5));
    let speaking = false;
    let flushTimer: NodeJS.Timeout | undefined;

    const sttSession = sttProvider.startSession({
      callId,
      onPartial: (text) => {
        const id = crypto.randomUUID();
        const entry: TranscriptLine = {
          id,
          callId,
          speaker: 'remote' as const,
          text,
          createdAt: new Date().toISOString(),
          isFinal: false
        };
        insertTranscript(entry);
        wsHub.broadcast({ type: 'partial', data: entry });
      },
      onFinal: async (text) => {
        const id = crypto.randomUUID();
        const entry: TranscriptLine = {
          id,
          callId,
          speaker: 'remote' as const,
          text,
          createdAt: new Date().toISOString(),
          isFinal: true
        };
        insertTranscript(entry);
        transcript.push(entry);
        wsHub.broadcast({ type: 'final', data: entry });
        const conversationalStatus = inferStatus(text);
        wsHub.broadcast({ type: 'status', data: { callId, status: conversationalStatus } });
        messages.push({ role: 'user', content: text });
        try {
          const result = await withRetry(
            async () =>
              llmProvider.generate(messages, {
                callId,
                task: callRecord.userIntent,
                phoneNumber: callRecord.phoneNumber
              }),
            {
              onRetry: (err, attempt) => logger.warn({ err, attempt, callId }, 'LLM retry')
            }
          );
          if (result.text) {
            messages.push({ role: 'assistant', content: result.text });
            const responseLine: TranscriptLine = {
              id: crypto.randomUUID(),
              callId,
              speaker: 'assistant' as const,
              text: result.text,
              createdAt: new Date().toISOString(),
              isFinal: true
            };
            insertTranscript(responseLine);
            transcript.push(responseLine);
            wsHub.broadcast({ type: 'final', data: responseLine });
            speaking = true;
            wsHub.broadcast({ type: 'status', data: { callId, status: 'speaking' } });
            await withRetry(
              async () => {
                const audio = await ttsProvider.synthesize(result.text);
                if (streamSid) {
                  socket.send(
                    JSON.stringify({
                      event: 'media',
                      streamSid,
                      media: { payload: audio.toString('base64') }
                    })
                  );
                }
              },
              { onRetry: (err, attempt) => logger.warn({ err, attempt, callId }, 'TTS retry') }
            ).finally(() => {
              speaking = false;
            });
          }
          for (const tool of result.toolCalls) {
            if (tool.type === 'dtmf' && callSid) {
              void import('../services/twilio.js').then(({ twilioService }) =>
                twilioService.emitDtmf(callSid, tool.digits)
              );
            }
          }
        } catch (err) {
          logger.error({ err }, 'LLM generation error');
          wsHub.broadcast({ type: 'error', data: { callId, message: 'LLM generation failed' } });
        }
      }
    });

    const flushAudio = async () => {
      if (speaking) return;
      const chunks = audioQueue.drain();
      if (!chunks.length) return;
      try {
        await sttSession.ingest(Buffer.concat(chunks));
      } catch (err) {
        logger.error({ err }, 'STT ingest failure');
      }
    };

    flushTimer = setInterval(flushAudio, env.AUDIO_CHUNK_MS);

    socket.on('message', async (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as TwilioMediaMessage;
        if (message.event === 'start') {
          streamSid = message.start?.streamSid ?? '';
          callSid = message.start?.callSid ?? '';
          wsHub.broadcast({ type: 'status', data: { callId, status: 'connected' } });
        } else if (message.event === 'media' && message.media?.payload) {
          const chunk = Buffer.from(message.media.payload, 'base64');
          audioQueue.push(chunk);
        } else if (message.event === 'stop') {
          flushTimer && clearInterval(flushTimer);
          await sttSession.close();
          wsHub.broadcast({ type: 'status', data: { callId, status: 'completed' } });
          await summarizeCall({ callId, task: callRecord.userIntent, transcript });
        }
      } catch (err) {
        logger.error({ err }, 'Invalid Twilio media message');
      }
    });

    socket.on('close', () => {
      flushTimer && clearInterval(flushTimer);
      void sttSession.close();
    });
  });

  return {
    async close() {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    }
  };
}
