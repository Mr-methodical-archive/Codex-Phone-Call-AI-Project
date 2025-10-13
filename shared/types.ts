export type ProviderChoice = {
  stt?: 'openai-whisper' | 'google-stt' | 'mock';
  tts?: 'elevenlabs' | 'google-tts' | 'mock';
  llm?: 'openai-chat' | 'mock';
};

export interface CallRequestBody {
  phoneNumber: string;
  task: string;
  mock?: boolean;
  mockProfile?: string;
  providers?: ProviderChoice;
}

export interface TranscriptLine {
  id: string;
  callId: string;
  speaker: 'assistant' | 'remote';
  text: string;
  createdAt: string;
  isFinal: boolean;
}

export interface CallSummary {
  callId: string;
  content: string;
  createdAt: string;
}

export interface CallRecord {
  id: string;
  phoneNumber: string;
  userIntent: string;
  mock: boolean;
  providerChoices: ProviderChoice;
  status: 'created' | 'dialing' | 'connected' | 'completed' | 'failed' | 'speaking' | 'ivr' | 'human' | 'on-hold';
  startAt: string;
  endAt?: string;
  metadata?: Record<string, unknown>;
}

export type WsBroadcast =
  | { type: 'status'; data: { callId: string; status: CallRecord['status']; detail?: string } }
  | { type: 'partial'; data: TranscriptLine }
  | { type: 'final'; data: TranscriptLine }
  | { type: 'summary'; data: CallSummary }
  | { type: 'error'; data: { callId: string; message: string } };
