import type { TtsProvider, TtsOptions } from './tts.js';

function generateTone(durationMs: number, frequency = 440): Buffer {
  const sampleRate = 8000;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    const value = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    const amplitude = Math.floor(value * 32767 * 0.2);
    buffer.writeInt16LE(amplitude, i * 2);
  }
  return buffer;
}

export class MockTimelineTtsProvider implements TtsProvider {
  async synthesize(text: string, _options?: TtsOptions): Promise<Buffer> {
    const duration = Math.min(Math.max(text.length * 40, 400), 2000);
    const tone = text.includes('press') ? generateTone(duration, 880) : generateTone(duration, 440);
    return tone;
  }
}
