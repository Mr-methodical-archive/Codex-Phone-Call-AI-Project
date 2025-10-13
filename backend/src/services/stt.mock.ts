import { getMockTimeline } from '../telephony/mocks/timeline.js';
import type { SpeechToTextProvider, SpeechToTextSession } from './stt.js';

export class MockTimelineSttSession implements SpeechToTextSession {
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly callId: string, private readonly callbacks: { onPartial: (text: string) => void; onFinal: (text: string) => void }) {
    const timeline = getMockTimeline(callId);
    if (!timeline) return;
    for (const step of timeline.steps) {
      const partialTime = Math.max(step.at - 200, 0);
      this.timers.push(
        setTimeout(() => {
          this.callbacks.onPartial(step.text.slice(0, Math.min(step.text.length, 30)) + '...');
        }, partialTime)
      );
      this.timers.push(
        setTimeout(() => {
          this.callbacks.onFinal(step.text);
        }, step.at)
      );
    }
  }

  async ingest(): Promise<void> {
    // No-op for deterministic timeline playback
  }

  async close(): Promise<void> {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }
}

export class MockTimelineSttProvider implements SpeechToTextProvider {
  startSession(options: { callId: string; onPartial: (text: string) => void; onFinal: (text: string) => void }): SpeechToTextSession {
    return new MockTimelineSttSession(options.callId, options);
  }
}
