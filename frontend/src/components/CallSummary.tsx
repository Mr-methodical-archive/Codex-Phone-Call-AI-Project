import { useCallback } from 'react';
import { useCallStore } from '../store/useCall';

export function CallSummary() {
  const summary = useCallStore((state) => state.summary);
  const transcript = useCallStore((state) => state.transcript);
  const callId = useCallStore((state) => state.callId);

  const handleDownload = useCallback(() => {
    if (!callId) return;
    const blob = new Blob([JSON.stringify({ callId, transcript, summary }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `call-${callId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [callId, transcript, summary]);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.content).catch(() => {
      // ignore clipboard failures
    });
  }, [summary]);

  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Summary</h3>
        <p className="mt-2 text-sm text-slate-500">A summary will appear once the call completes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Summary</h3>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleCopy}
            className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Copy Summary
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md border border-brand-accent px-3 py-1 text-xs font-semibold text-brand-accent hover:bg-brand-accent/20"
          >
            Download JSON
          </button>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-300">{summary.content}</p>
    </div>
  );
}
