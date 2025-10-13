import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CallForm } from './components/CallForm';
import { LiveTranscript } from './components/LiveTranscript';
import { CallSummary } from './components/CallSummary';
import { useCallStore } from './store/useCall';
import { initWs, updateWsCallId } from './lib/ws';
import { CallRequestBody } from '../../shared/types';

const STATUS_LABELS: Record<string, string> = {
  created: 'Ready',
  dialing: 'Dialing',
  connected: 'Connected',
  speaking: 'Speaking',
  completed: 'Done',
  failed: 'Failed',
  ivr: 'Navigating IVR',
  human: 'Talking to Human',
  'on-hold': 'On Hold'
};

const STATUS_ORDER = ['dialing', 'ivr', 'human', 'speaking', 'on-hold', 'completed'];

export default function App() {
  const [loading, setLoading] = useState(false);
  const callId = useCallStore((state) => state.callId);
  const status = useCallStore((state) => state.status);
  const statusDetail = useCallStore((state) => state.statusDetail);
  const errors = useCallStore((state) => state.errors);
  const setCallId = useCallStore((state) => state.setCallId);
  const updateStatus = useCallStore((state) => state.updateStatus);
  const mock = useCallStore((state) => state.mock);
  const pushError = useCallStore((state) => state.pushError);

  useEffect(() => {
    initWs();
  }, []);

  useEffect(() => {
    updateWsCallId(callId);
  }, [callId]);

  const statusLabel = useMemo(() => STATUS_LABELS[status] ?? status, [status]);

  const activeStatuses = useMemo(() => {
    const currentIndex = STATUS_ORDER.indexOf(status as string);
    return STATUS_ORDER.map((item, index) => ({
      key: item,
      label: STATUS_LABELS[item] ?? item,
      active: currentIndex >= 0 && index <= currentIndex
    }));
  }, [status]);

  const startCall = async (payload: CallRequestBody & { consent: boolean }) => {
    setLoading(true);
    try {
      const { consent, ...body } = payload;
      const response = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? 'Failed to start call');
      }
      const data = await response.json();
      setCallId(data.callId);
      updateStatus('dialing');
    } catch (err: any) {
      console.error(err);
      pushError(err.message ?? 'Failed to start call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-accent">AI Call Assistant</h1>
            <p className="text-sm text-slate-400">Place automated calls, see live transcripts, and capture summaries.</p>
          </div>
          <div className="flex items-center gap-3">
            {mock && (
              <span className="rounded-full border border-amber-500 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                OFFLINE SIM
              </span>
            )}
            <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1 text-sm text-slate-300">
              Status: <span className="font-semibold text-brand-accent">{statusLabel}</span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 md:grid-cols-2">
        <section className="space-y-4">
          <CallForm onStart={startCall} loading={loading} />
          <div className="flex flex-wrap gap-2">
            {activeStatuses.map((chip) => (
              <span
                key={chip.key}
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  chip.active
                    ? 'border-brand-accent bg-brand-accent/20 text-brand-accent'
                    : 'border-slate-700 bg-slate-800 text-slate-500'
                )}
              >
                {chip.label}
              </span>
            ))}
          </div>
          {statusDetail && (
            <div className="rounded-md border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300">{statusDetail}</div>
          )}
          <CallSummary />
        </section>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Live Transcript</h2>
            <LiveTranscript />
          </div>
          {errors.length > 0 && (
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={`${error}-${index}`} className="rounded-md border border-rose-500 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
