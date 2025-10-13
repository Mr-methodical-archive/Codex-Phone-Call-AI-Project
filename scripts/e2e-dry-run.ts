import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { setTimeout as delay } from 'timers/promises';
import WebSocket from 'ws';

process.env.USE_MOCK = 'true';
process.env.PORT = process.env.PORT ?? '5000';

const backend = spawn('node', ['--loader', 'ts-node/esm', 'src/server.ts'], {
  cwd: path.resolve('backend'),
  env: { ...process.env, USE_MOCK: 'true' },
  stdio: 'inherit'
});

async function waitForHealth() {
  const base = `http://localhost:${process.env.PORT}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch (err) {
      await delay(500);
    }
    await delay(500);
  }
  throw new Error('Backend did not become healthy in time');
}

async function run() {
  await waitForHealth();
  const base = `http://localhost:${process.env.PORT}`;
  const callResponse = await fetch(`${base}/api/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '+15550000000',
      task: 'Check account balance',
      mock: true,
      mockProfile: 'telecom-basic'
    })
  });

  if (!callResponse.ok) {
    const error = await callResponse.text();
    throw new Error(`Failed to start call: ${error}`);
  }

  const { callId } = (await callResponse.json()) as { callId: string };
  if (!callId) throw new Error('No callId returned');

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${process.env.PORT}/ws?callId=${callId}`);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timed out waiting for call completion'));
    }, 30000);

    ws.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'status' && message.data?.status === 'completed') {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const fixturePath = path.resolve('backend', 'data', `mock-transcript-${callId}.json`);
  const file = await fs.readFile(fixturePath, 'utf8');
  const payload = JSON.parse(file) as { transcript: unknown[]; summary: { content: string } };
  if (!Array.isArray(payload.transcript) || payload.transcript.length === 0) {
    throw new Error('Transcript not recorded');
  }
  if (!payload.summary?.content) {
    throw new Error('Summary missing');
  }
  console.log('E2E dry run completed successfully');
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    backend.kill('SIGINT');
  });
