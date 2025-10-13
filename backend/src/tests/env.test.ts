import { describe, expect, it, beforeAll } from '@jest/globals';

describe('environment config', () => {
  beforeAll(() => {
    process.env.PORT = '6000';
    process.env.USE_MOCK = 'true';
    process.env.PUBLIC_WS_ORIGIN = 'http://localhost:3000';
    process.env.WS_HEARTBEAT_MS = '15000';
    process.env.AUDIO_CHUNK_MS = '250';
    process.env.MOCK_IVR_PROFILE = 'telecom-basic';
  });

  it('parses defaults and overrides', async () => {
    const { env } = await import('../env.js');
    expect(env.PORT).toBe(6000);
    expect(env.USE_MOCK).toBe(true);
    expect(env.PUBLIC_WS_ORIGIN).toBe('http://localhost:3000');
    expect(env.WS_HEARTBEAT_MS).toBe(15000);
    expect(env.AUDIO_CHUNK_MS).toBe(250);
    expect(env.MOCK_IVR_PROFILE).toBe('telecom-basic');
  });
});
