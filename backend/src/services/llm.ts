import OpenAI from 'openai';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import { MockTimelineLlmProvider } from './llm.mock.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmToolCall {
  type: 'dtmf';
  digits: string;
  reason?: string;
}

export interface LlmResult {
  text: string;
  toolCalls: LlmToolCall[];
  tokenUsage?: number;
}

export interface LlmProvider {
  generate(messages: LlmMessage[], options: { callId: string; task: string; phoneNumber: string }): Promise<LlmResult>;
  maxTurns: number;
}

export const SYSTEM_PROMPT = `You are "Atlas", an expert phone assistant focused on completing the user's task: {task}.
- Detect IVR prompts versus human conversation.
- When IVR menus are detected, choose the most relevant option and trigger the DTMF tool with the digits to press.
- When speaking with a human, respond in short, polite sentences. Stay confident, concise, and never mention you are an AI unless asked directly.
- Confirm task completion before ending the call. If you cannot proceed due to authentication or confusion, escalate to the user and wrap up gracefully.
- Keep responses under 25 words when possible.`;

function buildOpenAiClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for live LLM mode.');
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

function parseToolCalls(choice: any): LlmToolCall[] {
  const calls: LlmToolCall[] = [];
  const toolCalls = choice.message?.tool_calls ?? [];
  for (const call of toolCalls) {
    if (call.type === 'function' && call.function?.name === 'emit_dtmf') {
      try {
        const args = JSON.parse(call.function.arguments ?? '{}');
        if (typeof args.digits === 'string' && args.digits.trim().length > 0) {
          calls.push({ type: 'dtmf', digits: args.digits.trim(), reason: args.reason ?? undefined });
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to parse DTMF tool arguments');
      }
    }
  }
  return calls;
}

export function trimMessages(messages: LlmMessage[], maxTurns: number): LlmMessage[] {
  if (messages.length <= maxTurns) return messages;
  const systemMessages = messages.filter((m) => m.role === 'system');
  const convo = messages.filter((m) => m.role !== 'system');
  const trimmed = convo.slice(-maxTurns);
  return [...systemMessages.slice(-1), ...trimmed];
}

class OpenAiChatProvider implements LlmProvider {
  maxTurns = 12;
  private client = buildOpenAiClient();

  async generate(messages: LlmMessage[], options: { callId: string; task: string; phoneNumber: string }): Promise<LlmResult> {
    const systemPrompt = SYSTEM_PROMPT.replace('{task}', options.task);
    const history = trimMessages([{ role: 'system', content: systemPrompt }, ...messages], this.maxTurns + 1);

    const response = await this.client.chat.completions.create({
      model: env.OPENAI_CHAT_MODEL,
      temperature: 0.6,
      messages: history,
      tools: [
        {
          type: 'function',
          function: {
            name: 'emit_dtmf',
            description: 'Send DTMF digits to navigate IVR menus',
            parameters: {
              type: 'object',
              properties: {
                digits: {
                  type: 'string',
                  description: 'Digits to send, e.g. "1" or "12#"'
                },
                reason: { type: 'string', description: 'Optional note about the choice.' }
              },
              required: ['digits']
            }
          }
        }
      ]
    });

    const choice = response.choices[0];
    const text = choice.message?.content ?? '';
    return {
      text,
      toolCalls: parseToolCalls(choice),
      tokenUsage: response.usage?.total_tokens
    };
  }
}

export function createLlmProvider(kind: 'openai-chat' | 'mock' = env.USE_MOCK ? 'mock' : 'openai-chat'): LlmProvider {
  if (kind === 'mock') {
    return new MockTimelineLlmProvider();
  }
  return new OpenAiChatProvider();
}
