import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { wsHub } from '../../realtime/wsHub.js';
import { insertTranscript, updateCall } from '../../store/calls.js';
import { createLlmProvider, LlmMessage } from '../../services/llm.js';
import { createTtsProvider } from '../../services/tts.js';
import { summarizeCall } from '../../services/summarizer.js';
import { ProviderChoice, TranscriptLine } from '../../../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { buildTelecomBasicTimeline } from './scripts/telecom-basic.js';
import { clearMockTimeline, registerMockTimeline } from './timeline.js';
import { resetMockLlm } from '../../services/llm.mock.js';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTimeline(profile: string | undefined, task: string) {
  switch (profile) {
    case 'telecom-basic':
    default:
      return buildTelecomBasicTimeline(task);
  }
}

export async function runMockScenario(options: {
  callId: string;
  task: string;
  phoneNumber: string;
  providers: ProviderChoice;
  profile: string;
}) {
  const { callId, task, providers } = options;
  const llm = createLlmProvider(providers.llm ?? 'mock');
  const tts = createTtsProvider(providers.tts ?? 'mock');
  const messages: LlmMessage[] = [];
  const transcript: TranscriptLine[] = [];

  const timeline = resolveTimeline(options.profile, task);
  registerMockTimeline(callId, timeline);
  resetMockLlm(callId);

  updateCall({ id: callId, status: 'connected', endAt: undefined, metadata: { mock: true } });
  wsHub.broadcast({ type: 'status', data: { callId, status: 'connected', detail: 'mock-connected' } });

  const sortedSteps = [...timeline.steps].sort((a, b) => a.at - b.at);
  let previous = 0;

  for (const step of sortedSteps) {
    const delta = Math.max(step.at - previous, 0);
    previous = step.at;
    await wait(delta);
    const remoteLine: TranscriptLine = {
      id: crypto.randomUUID(),
      callId,
      speaker: 'remote',
      text: step.text,
      createdAt: new Date().toISOString(),
      isFinal: true
    };
    insertTranscript(remoteLine);
    transcript.push(remoteLine);
    wsHub.broadcast({ type: 'final', data: remoteLine });
    const status = step.speaker === 'ivr' ? 'ivr' : 'human';
    wsHub.broadcast({ type: 'status', data: { callId, status } });
    messages.push({ role: 'user', content: step.text });

    const result = await llm.generate(messages, {
      callId,
      task,
      phoneNumber: options.phoneNumber
    });

    const assistantText = result.text || step.assistantResponse || 'Acknowledged.';
    messages.push({ role: 'assistant', content: assistantText });
    const assistantLine: TranscriptLine = {
      id: crypto.randomUUID(),
      callId,
      speaker: 'assistant',
      text: assistantText,
      createdAt: new Date().toISOString(),
      isFinal: true
    };
    insertTranscript(assistantLine);
    transcript.push(assistantLine);
    wsHub.broadcast({ type: 'final', data: assistantLine });
    wsHub.broadcast({ type: 'status', data: { callId, status: 'speaking' } });
    await tts.synthesize(assistantText);

    if (step.expectDigits) {
      wsHub.broadcast({ type: 'status', data: { callId, status: 'ivr', detail: `Sending ${step.expectDigits}` } });
    }
  }

  updateCall({ id: callId, status: 'completed', endAt: new Date().toISOString(), metadata: { mock: true } });
  wsHub.broadcast({ type: 'status', data: { callId, status: 'completed' } });
  const summary = await summarizeCall({ callId, task, transcript, provider: providers.llm });
  const dataDir = path.resolve(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const fixturePath = path.join(dataDir, `mock-transcript-${callId}.json`);
  await fs.writeFile(
    fixturePath,
    JSON.stringify({ callId, task, transcript, summary }, null, 2),
    'utf8'
  );
  logger.info({ callId, fixturePath }, 'Mock call finished');
  clearMockTimeline(callId);
  resetMockLlm(callId);
}
