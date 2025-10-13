import { useMemo } from 'react';
import { useCallStore } from '../store/useCall';
import clsx from 'clsx';

export function LiveTranscript() {
  const transcript = useCallStore((state) => state.transcript);
  const sorted = useMemo(() => [...transcript].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [transcript]);

  return (
    <div className="h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-inner">
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">Transcript will appear here once the call begins.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((line) => (
            <li
              key={line.id}
              className={clsx('rounded-md p-3 text-sm', {
                'bg-slate-800 text-slate-300': line.speaker === 'remote',
                'bg-brand-accent/20 text-brand-accent': line.speaker === 'assistant'
              })}
            >
              <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>{line.speaker === 'assistant' ? 'Assistant' : 'Contact'}</span>
                <span>{new Date(line.createdAt).toLocaleTimeString()}</span>
              </div>
              <p>{line.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
