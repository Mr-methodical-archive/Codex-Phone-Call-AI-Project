import { describe, expect, it, beforeAll } from '@jest/globals';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

beforeAll(() => {
  process.env.USE_MOCK = 'false';
  process.env.PUBLIC_BASE_URL = 'http://localhost:5000';
  process.env.TWILIO_AUTH_TOKEN = 'secret';
});

function createSignature(url: string, params: Record<string, string>, token: string) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
}

describe('verifyTwilioSignature middleware', () => {
  it('allows requests with valid signatures', async () => {
    const params = { CallSid: 'CA123' };
    const signature = createSignature('http://localhost:5000/twilio/status', params, 'secret');
    const req = {
      headers: { 'x-twilio-signature': signature },
      originalUrl: '/twilio/status',
      body: params
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    const { verifyTwilioSignature } = await import('../middleware/verifyTwilioSignature.js');
    verifyTwilioSignature(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects requests with invalid signatures', async () => {
    const req = {
      headers: { 'x-twilio-signature': 'invalid' },
      originalUrl: '/twilio/status',
      body: {}
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    const { verifyTwilioSignature } = await import('../middleware/verifyTwilioSignature.js');
    verifyTwilioSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
