import { describe, expect, it } from '@jest/globals';
import { trimMessages, LlmMessage } from '../services/llm.js';

describe('trimMessages', () => {
  it('keeps the latest turns and the last system prompt', () => {
    const messages: LlmMessage[] = [
      { role: 'system', content: 'sys1' },
      { role: 'system', content: 'sys2' },
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' }
    ];

    const trimmed = trimMessages(messages, 3);
    expect(trimmed).toEqual([
      { role: 'system', content: 'sys2' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' }
    ]);
  });
});
