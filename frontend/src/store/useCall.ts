import { create } from 'zustand';
import { CallRecord, CallSummary, TranscriptLine, WsBroadcast } from '../../../shared/types';

export type CallStatus = CallRecord['status'] | 'speaking';

interface CallState {
  callId?: string;
  status: CallStatus;
  statusDetail?: string;
  transcript: TranscriptLine[];
  summary?: CallSummary;
  mock: boolean;
  errors: string[];
  setCallId: (callId: string) => void;
  updateStatus: (status: CallStatus, detail?: string) => void;
  addTranscript: (line: TranscriptLine) => void;
  setSummary: (summary: CallSummary) => void;
  setMock: (mock: boolean) => void;
  pushError: (message: string) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  callId: undefined,
  status: 'created',
  statusDetail: undefined,
  transcript: [],
  summary: undefined,
  mock: false,
  errors: [],
  setCallId: (callId) => set({ callId, transcript: [], summary: undefined, errors: [] }),
  updateStatus: (status, detail) => set({ status, statusDetail: detail }),
  addTranscript: (line) =>
    set((state) => {
      const existingIndex = state.transcript.findIndex((t) => t.id === line.id);
      if (existingIndex !== -1) {
        const updated = [...state.transcript];
        updated[existingIndex] = line;
        return { transcript: updated };
      }
      return { transcript: [...state.transcript, line] };
    }),
  setSummary: (summary) => set({ summary }),
  setMock: (mock) => set({ mock }),
  pushError: (message) => set((state) => ({ errors: [...state.errors, message] })),
  reset: () => set({ callId: undefined, status: 'created', transcript: [], summary: undefined, errors: [], statusDetail: undefined })
}));

export function handleWsMessage(message: WsBroadcast) {
  const store = useCallStore.getState();
  switch (message.type) {
    case 'status': {
      if (message.data.callId && store.callId !== message.data.callId) return;
      useCallStore.getState().updateStatus(message.data.status as CallStatus, message.data.detail);
      break;
    }
    case 'partial':
    case 'final': {
      if (message.data.callId && store.callId !== message.data.callId) return;
      useCallStore.getState().addTranscript(message.data);
      break;
    }
    case 'summary': {
      if (message.data.callId && store.callId !== message.data.callId) return;
      useCallStore.getState().setSummary(message.data);
      break;
    }
    case 'error': {
      if (message.data.callId && store.callId !== message.data.callId) return;
      useCallStore.getState().pushError(message.data.message);
      break;
    }
    default:
      break;
  }
}
