import { FormEvent, useEffect, useState } from 'react';
import { CallRequestBody } from '../../../shared/types';
import { useCallStore } from '../store/useCall';

interface CallFormProps {
  onStart: (payload: CallRequestBody & { consent: boolean }) => Promise<void>;
  loading: boolean;
}

const MOCK_PROFILES = [{ value: 'telecom-basic', label: 'Telecom Demo' }];

export function CallForm({ onStart, loading }: CallFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [task, setTask] = useState('Check my ExampleTel account balance.');
  const [useMock, setUseMock] = useState(true);
  const [mockProfile, setMockProfile] = useState('telecom-basic');
  const [consent, setConsent] = useState(false);
  const [stt, setStt] = useState<'openai-whisper' | 'google-stt' | 'mock'>('mock');
  const [tts, setTts] = useState<'elevenlabs' | 'google-tts' | 'mock'>('mock');
  const [llm, setLlm] = useState<'openai-chat' | 'mock'>('mock');
  const setMock = useCallStore((state) => state.setMock);

  useEffect(() => {
    setMock(useMock);
    if (useMock) {
      setStt('mock');
      setTts('mock');
      setLlm('mock');
    } else {
      setStt((current) => (current === 'mock' ? 'openai-whisper' : current));
      setTts((current) => (current === 'mock' ? 'elevenlabs' : current));
      setLlm((current) => (current === 'mock' ? 'openai-chat' : current));
    }
  }, [useMock, setMock]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) return;
    await onStart({
      phoneNumber,
      task,
      mock: useMock,
      mockProfile,
      providers: { stt, tts, llm },
      consent
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {useMock && (
        <div className="rounded-md border border-amber-500 bg-amber-500/10 p-3 text-sm text-amber-200">
          Offline simulation is enabled. No external APIs will be called.
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-slate-300">Phone Number</label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+15551234567"
          required={!useMock}
          disabled={useMock}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 focus:outline-none focus:ring focus:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-300">Task</label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 focus:outline-none focus:ring focus:ring-brand-accent"
          rows={3}
        />
      </div>
      {useMock && (
        <label className="flex flex-col text-sm text-slate-300">
          Mock IVR Profile
          <select
            value={mockProfile}
            onChange={(e) => setMockProfile(e.target.value)}
            className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
          >
            {MOCK_PROFILES.map((profile) => (
              <option key={profile.value} value={profile.value}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col text-sm text-slate-300">
          STT Provider
          <select
            value={stt}
            onChange={(e) => setStt(e.target.value as typeof stt)}
            className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
          >
            <option value="mock">Mock</option>
            <option value="openai-whisper">OpenAI Whisper</option>
            <option value="google-stt">Google STT</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-slate-300">
          TTS Provider
          <select
            value={tts}
            onChange={(e) => setTts(e.target.value as typeof tts)}
            className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
          >
            <option value="mock">Mock</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="google-tts">Google TTS</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-slate-300">
          LLM Provider
          <select
            value={llm}
            onChange={(e) => setLlm(e.target.value as typeof llm)}
            className="mt-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
          >
            <option value="mock">Mock</option>
            <option value="openai-chat">OpenAI Chat</option>
          </select>
        </label>
      </div>
      <label className="flex items-center space-x-2 text-sm text-slate-300">
        <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
        <span>Use Mock Mode (no external APIs)</span>
      </label>
      <label className="flex items-center space-x-2 text-xs text-slate-400">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>I consent to automated calling and understand this may incur carrier costs.</span>
      </label>
      <button
        type="submit"
        disabled={loading || !consent}
        className="w-full rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {loading ? 'Starting…' : 'Start Call'}
      </button>
    </form>
  );
}
