import { createLlmProvider } from './llm.js';
import { saveSummary } from '../store/calls.js';
import { wsHub } from '../realtime/wsHub.js';
import { TranscriptLine } from '../../../shared/types.js';

export async function summarizeCall(options: {
  callId: string;
  task: string;
  transcript: TranscriptLine[];
  provider?: 'openai-chat' | 'mock';
}) {
  const provider = createLlmProvider(options.provider);
  const conversation = options.transcript
    .map((line) => `${line.speaker === 'assistant' ? 'Assistant' : 'Customer'}: ${line.text}`)
    .join('\n');

  const result = await provider.generate(
    [
      {
        role: 'user',
        content: `Summarize the following call transcript focusing on task outcomes and follow-ups.\n${conversation}`
      }
    ],
    { callId: options.callId, task: options.task, phoneNumber: '' }
  );

  const summary = {
    callId: options.callId,
    content: result.text,
    createdAt: new Date().toISOString()
  };
  saveSummary(summary);
  wsHub.broadcast({ type: 'summary', data: summary });
  return summary;
}
