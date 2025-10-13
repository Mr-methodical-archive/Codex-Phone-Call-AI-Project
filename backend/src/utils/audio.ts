export interface PcmChunk {
  data: Buffer;
  sampleRate: number;
}

export class AudioRingBuffer {
  private chunks: PcmChunk[] = [];
  private maxDurationMs: number;

  constructor(private readonly sampleRate = 8000, private readonly maxMs = 1000) {
    this.maxDurationMs = maxMs;
  }

  push(chunk: PcmChunk) {
    this.chunks.push(chunk);
    this.trim();
  }

  pull(ms: number): Buffer {
    const requiredSamples = Math.floor((this.sampleRate * ms) / 1000);
    const buffers: Buffer[] = [];
    let collected = 0;

    while (this.chunks.length && collected < requiredSamples) {
      const next = this.chunks.shift();
      if (!next) break;
      buffers.push(next.data);
      collected += next.data.length / 2; // 16-bit PCM
    }

    return Buffer.concat(buffers);
  }

  private trim() {
    const maxSamples = Math.floor((this.sampleRate * this.maxDurationMs) / 1000);
    let total = this.chunks.reduce((acc, chunk) => acc + chunk.data.length / 2, 0);
    while (total > maxSamples && this.chunks.length) {
      const removed = this.chunks.shift();
      if (!removed) break;
      total -= removed.data.length / 2;
    }
  }
}

export function simpleVadRms(buffer: Buffer, threshold = 300): boolean {
  if (buffer.length === 0) return false;
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i);
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / (buffer.length / 2));
  return rms > threshold;
}

export function pcm16ToWav(pcmData: Buffer, sampleRate = 8000): Buffer {
  const header = Buffer.alloc(44);
  const chunkSize = pcmData.length + 36;
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}
