import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { MockTimelineTtsProvider } from './tts.mock.js';

export interface TtsOptions {
  voice?: string;
}

export interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Buffer>;
}

class ElevenLabsTtsProvider implements TtsProvider {
  async synthesize(text: string, options?: TtsOptions): Promise<Buffer> {
    if (!env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY missing for ElevenLabs TTS');
    }
    const voiceId = options?.voice ?? 'Rachel';
    const response = await withRetry(
      async () => {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.ELEVENLABS_API_KEY
          },
          body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.3, similarity_boost: 0.7 } })
        });
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`ElevenLabs transient error: ${res.status}`);
        }
        return res;
      },
      {
        onRetry: (err, attempt) => logger.warn({ err, attempt }, 'Retrying ElevenLabs TTS request')
      }
    );
    if (!response.ok) {
      throw new Error(`ElevenLabs request failed: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

class GoogleTtsProvider implements TtsProvider {
  async synthesize(text: string, options?: TtsOptions): Promise<Buffer> {
    if (!env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY missing for Google TTS');
    }
    const response = await withRetry(
      async () => {
        const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'en-US', name: options?.voice ?? 'en-US-Neural2-C' },
            audioConfig: { audioEncoding: 'LINEAR16', speakingRate: 1.0 }
          })
        });
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Google TTS transient error: ${res.status}`);
        }
        return res;
      },
      {
        onRetry: (err, attempt) => logger.warn({ err, attempt }, 'Retrying Google TTS request')
      }
    );
    if (!response.ok) {
      throw new Error(`Google TTS request failed: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as { audioContent: string };
    return Buffer.from(data.audioContent, 'base64');
  }
}

export function createTtsProvider(kind: 'elevenlabs' | 'google-tts' | 'mock'): TtsProvider {
  if (kind === 'elevenlabs') {
    return new ElevenLabsTtsProvider();
  }
  if (kind === 'google-tts') {
    return new GoogleTtsProvider();
  }
  return new MockTimelineTtsProvider();
}
