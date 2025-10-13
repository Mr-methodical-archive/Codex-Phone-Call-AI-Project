import { db } from './db.js';
import { CallRecord, CallSummary, TranscriptLine } from '../../../shared/types.js';

const insertCallStmt = db.prepare(`
  INSERT INTO calls (id, phoneNumber, userIntent, mock, providerChoices, status, startAt)
  VALUES (@id, @phoneNumber, @userIntent, @mock, @providerChoices, @status, @startAt)
`);

const updateCallStmt = db.prepare(`
  UPDATE calls SET status=@status, endAt=@endAt, metadata=@metadata WHERE id=@id
`);

const insertTranscriptStmt = db.prepare(`
  INSERT INTO transcripts (id, callId, speaker, text, createdAt, isFinal)
  VALUES (@id, @callId, @speaker, @text, @createdAt, @isFinal)
`);

const updateTranscriptFinalStmt = db.prepare(`
  UPDATE transcripts SET text=@text, isFinal=1 WHERE id=@id
`);

const upsertSummaryStmt = db.prepare(`
  INSERT INTO summaries (callId, content, createdAt)
  VALUES (@callId, @content, @createdAt)
  ON CONFLICT(callId) DO UPDATE SET content=excluded.content, createdAt=excluded.createdAt
`);

export function createCall(record: CallRecord) {
  insertCallStmt.run({
    ...record,
    mock: record.mock ? 1 : 0,
    providerChoices: JSON.stringify(record.providerChoices)
  });
}

export function updateCall(record: Pick<CallRecord, 'id' | 'status' | 'endAt' | 'metadata'>) {
  updateCallStmt.run({
    ...record,
    metadata: record.metadata ? JSON.stringify(record.metadata) : null
  });
}

export function insertTranscript(line: TranscriptLine) {
  insertTranscriptStmt.run({
    ...line,
    isFinal: line.isFinal ? 1 : 0
  });
}

export function finalizeTranscript(lineId: string, text: string) {
  updateTranscriptFinalStmt.run({ id: lineId, text });
}

export function saveSummary(summary: CallSummary) {
  upsertSummaryStmt.run(summary);
}

export function getCall(id: string): CallRecord | undefined {
  const row = db
    .prepare('SELECT * FROM calls WHERE id = ?')
    .get(id) as (CallRecord & { mock: number; providerChoices: string }) | undefined;
  if (!row) return undefined;
  return {
    ...row,
    mock: Boolean(row.mock),
    providerChoices: JSON.parse(row.providerChoices)
  };
}
