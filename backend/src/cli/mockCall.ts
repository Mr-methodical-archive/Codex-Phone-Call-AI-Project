import crypto from 'crypto';
import path from 'path';
import { createCall } from '../store/calls.js';
import { runMockScenario } from '../telephony/mocks/runner.js';
import { ProviderChoice } from '../../../shared/types.js';

process.env.USE_MOCK = process.env.USE_MOCK ?? 'true';

const { env } = await import('../env.js');

const args = process.argv.slice(2);
const taskIndex = args.indexOf('--task');
const profileIndex = args.indexOf('--profile');
const task = taskIndex !== -1 ? args[taskIndex + 1] : 'Check account balance';
const profile = profileIndex !== -1 ? args[profileIndex + 1] : env.MOCK_IVR_PROFILE;

const callId = crypto.randomUUID();
const providers: ProviderChoice = { stt: 'mock', tts: 'mock', llm: 'mock' };

createCall({
  id: callId,
  phoneNumber: '+15550000000',
  userIntent: task,
  mock: true,
  providerChoices: providers,
  status: 'dialing',
  startAt: new Date().toISOString()
});

runMockScenario({
  callId,
  task,
  phoneNumber: '+15550000000',
  providers,
  profile
})
  .then(() => {
    const outputPath = path.resolve(process.cwd(), `data/mock-transcript-${callId}.json`);
    console.log(`Mock call complete. Transcript saved to ${outputPath}`);
  })
  .catch((err) => {
    console.error('Mock call failed', err);
    process.exitCode = 1;
  });
