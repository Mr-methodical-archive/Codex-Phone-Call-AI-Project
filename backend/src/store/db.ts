import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../env.js';

const dbPath = path.resolve(process.cwd(), env.DATABASE_URL);
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    phoneNumber TEXT,
    userIntent TEXT,
    mock INTEGER,
    providerChoices TEXT,
    status TEXT,
    startAt TEXT,
    endAt TEXT,
    metadata TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    callId TEXT,
    speaker TEXT,
    text TEXT,
    createdAt TEXT,
    isFinal INTEGER,
    FOREIGN KEY(callId) REFERENCES calls(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS summaries (
    callId TEXT PRIMARY KEY,
    content TEXT,
    createdAt TEXT,
    FOREIGN KEY(callId) REFERENCES calls(id)
  );
`);

export function closeDb() {
  try {
    db.close();
  } catch {
    // ignore
  }
}
