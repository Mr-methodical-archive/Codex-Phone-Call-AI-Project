import OpenAI from 'openai';
import { env } from '../env.js';
import { AudioRingBuffer, pcm16ToWav } from '../utils/audio.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { MockTimelineSttProvider } from './stt.mock.js';

type Callback = (text: string) => void;

export interface SpeechToTextSession {
  ingest(chunk: Buffer): Promise<void>;
  close(): Promise<void>;
}

export interface SpeechToTextProvider {
  startSession(options: { callId: string; onPartial: Callback; onFinal: Callback }): SpeechToTextSession;
}

class OpenAiWhisperSession implements SpeechToTextSession {
  private buffer = new AudioRingBuffer();
  private pending: Buffer[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
    private readonly callbacks: { onPartial: Callback; onFinal: Callback },
    private readonly callId: string
  ) {}

  async ingest(chunk: Buffer): Promise<void> {
    this.pending.push(chunk);
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        void this.flush(false);
      }, env.AUDIO_CHUNK_MS * 2);
    }
  }

  async close(): Promise<void> {
    await this.flush(true);
  }

  private async flush(final: boolean) {
    const audio = Buffer.concat(this.pending);
    this.pending = [];
    this.flushTimer && clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (audio.length === 0) return;
    this.buffer.push({ data: audio, sampleRate: 8000 });
    const wav = pcm16ToWav(this.buffer.pull(env.AUDIO_CHUNK_MS * 10), 8000);
    try {
      const result = await withRetry(
        async () => {
          const file = await OpenAI.toFile(wav, `chunk-${Date.now()}.wav`);
          return this.client.audio.transcriptions.create({
            file,
            model: this.model,
            response_format: 'verbose_json'
          });
        },
        {
          onRetry: (err, attempt) => logger.warn({ err, attempt, callId: this.callId }, 'Retrying Whisper transcription')
        }
      );
      const text =
        result.text ??
        (Array.isArray((result as any).segments)
          ? (result as any).segments.map((s: any) => s.text).join(' ')
          : undefined);
      if (!text) return;
      if (final) {
        this.callbacks.onFinal(text.trim());
      } else {
        this.callbacks.onPartial(text.trim());
      }
    } catch (err) {
      logger.error({ err }, 'OpenAI Whisper transcription failed');
    }
  }
}

class GoogleSttSession implements SpeechToTextSession {
  constructor(private readonly callbacks: { onPartial: Callback; onFinal: Callback }) {}
  async ingest(chunk: Buffer): Promise<void> {
    const text = `google-stt-${chunk.length}`;
    this.callbacks.onPartial(text);
  }
  async close(): Promise<void> {
    this.callbacks.onFinal('google-stt-final');
  }
}

class OpenAiWhisperProvider implements SpeechToTextProvider {
  private client = new OpenAI({ apiKey: env.OPENAI_API_KEY! });
  startSession(options: { callId: string; onPartial: Callback; onFinal: Callback }): SpeechToTextSession {
    return new OpenAiWhisperSession(this.client, env.OPENAI_STT_MODEL, options, options.callId);
  }
}

class GoogleSttProvider implements SpeechToTextProvider {
  startSession(options: { callId: string; onPartial: Callback; onFinal: Callback }): SpeechToTextSession {
    return new GoogleSttSession(options);
  }
}

export function createSttProvider(kind: 'openai-whisper' | 'google-stt' | 'mock'): SpeechToTextProvider {
  if (kind === 'openai-whisper') {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing for OpenAI Whisper STT.');
    }
    return new OpenAiWhisperProvider();
  }
  if (kind === 'google-stt') {
    return new GoogleSttProvider();
  }
  return new MockTimelineSttProvider();
}
