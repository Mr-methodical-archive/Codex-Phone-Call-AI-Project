import type { RequestHandler } from 'express';
import twilio from 'twilio';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

export const verifyTwilioSignature: RequestHandler = (req, res, next) => {
  if (env.USE_MOCK) {
    return next();
  }

  const signatureHeader = req.headers['x-twilio-signature'];
  if (!signatureHeader || Array.isArray(signatureHeader) || !env.TWILIO_AUTH_TOKEN) {
    logger.warn({ path: req.originalUrl }, 'Missing Twilio signature header');
    return res.status(401).send('Unauthorized');
  }

  const url = `${env.PUBLIC_BASE_URL}${req.originalUrl}`;
  const isValid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signatureHeader, url, req.body);

  if (!isValid) {
    logger.warn({ path: req.originalUrl }, 'Invalid Twilio signature');
    return res.status(401).send('Unauthorized');
  }

  return next();
};
