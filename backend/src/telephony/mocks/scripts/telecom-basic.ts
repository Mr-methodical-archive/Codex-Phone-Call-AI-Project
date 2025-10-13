import profile from '../profiles/telecom-basic.json' assert { type: 'json' };
import type { MockCallTimeline } from '../timeline.js';

export function buildTelecomBasicTimeline(task: string): MockCallTimeline {
  const steps = [
    {
      at: 0,
      speaker: 'ivr' as const,
      text: profile.introPrompt,
      expectDigits: '1',
      assistantResponse: 'Hello, selecting account services to continue.'
    },
    {
      at: 4500,
      speaker: 'ivr' as const,
      text: profile.accountMenu,
      expectDigits: '1',
      assistantResponse: 'Choosing balance information now.'
    },
    {
      at: 9000,
      speaker: 'ivr' as const,
      text: profile.balanceMenu,
      expectDigits: '0',
      assistantResponse: 'Connecting with a representative, pressing zero.'
    },
    {
      at: 13000,
      speaker: 'agent' as const,
      text: profile.agentLines[0],
      assistantResponse: `Hi Riley, I'm calling to ${task.toLowerCase()}.`
    },
    {
      at: 17000,
      speaker: 'agent' as const,
      text: profile.agentLines[1],
      assistantResponse: 'Thanks, that answers my question.'
    },
    {
      at: 21000,
      speaker: 'agent' as const,
      text: profile.agentLines[2],
      assistantResponse: 'No, that will be all today. Appreciate your help.'
    },
    {
      at: 24000,
      speaker: 'agent' as const,
      text: profile.agentLines[3],
      assistantResponse: 'Goodbye.'
    }
  ];

  return {
    steps,
    summary: profile.summaryTemplate.replace('{task}', task)
  };
}
