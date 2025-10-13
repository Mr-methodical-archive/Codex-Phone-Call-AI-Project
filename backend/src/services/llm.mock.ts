import { getMockTimeline } from '../telephony/mocks/timeline.js';
import type { LlmProvider, LlmResult } from './llm.js';

const progress = new Map<string, number>();

export class MockTimelineLlmProvider implements LlmProvider {
  maxTurns = 6;

  async generate(
    _messages: any,
    options: { callId: string; task: string; phoneNumber: string }
  ): Promise<LlmResult> {
    const timeline = getMockTimeline(options.callId);
    const index = progress.get(options.callId) ?? 0;
    const step = timeline?.steps[index];
    progress.set(options.callId, index + 1);
    const text = step?.assistantResponse ?? `Handling task: ${options.task}.`;
    const toolCalls = step?.expectDigits
      ? [{ type: 'dtmf' as const, digits: step.expectDigits, reason: 'Mock IVR navigation' }]
      : [];
    return { text, toolCalls };
  }
}

export function resetMockLlm(callId: string) {
  progress.delete(callId);
}
