export type MockSpeaker = 'ivr' | 'agent';

export interface MockTimelineStep {
  at: number;
  speaker: MockSpeaker;
  text: string;
  expectDigits?: string;
  assistantResponse?: string;
}

export interface MockCallTimeline {
  steps: MockTimelineStep[];
  summary: string;
}

const timelines = new Map<string, MockCallTimeline>();

export function registerMockTimeline(callId: string, timeline: MockCallTimeline) {
  timelines.set(callId, timeline);
}

export function getMockTimeline(callId: string): MockCallTimeline | undefined {
  return timelines.get(callId);
}

export function clearMockTimeline(callId: string) {
  timelines.delete(callId);
}
