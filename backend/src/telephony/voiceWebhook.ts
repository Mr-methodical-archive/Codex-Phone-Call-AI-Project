import { Router } from 'express';
import { twilioService } from '../services/twilio.js';
import { logger } from '../utils/logger.js';
import { wsHub } from '../realtime/wsHub.js';
import { verifyTwilioSignature } from '../middleware/verifyTwilioSignature.js';

export const voiceRouter = Router();

voiceRouter.use(verifyTwilioSignature);

voiceRouter.post('/voice', (req, res) => {
  const callId = (req.query.callId as string) ?? req.body.CallSid;
  if (!callId) {
    logger.warn('Voice webhook missing call identifier');
    return res.status(400).send('Missing callId');
  }
  wsHub.broadcast({ type: 'status', data: { callId, status: 'connected' } });
  const twiml = twilioService.buildVoiceResponse(callId);
  res.type('text/xml').send(twiml);
});

voiceRouter.post('/status', (req, res) => {
  const callId = (req.query.callId as string) ?? req.body.CallSid;
  if (!callId) {
    logger.warn('Status webhook missing call identifier');
    return res.status(400).send('Missing callId');
  }
  const callStatus = req.body.CallStatus ?? 'unknown';
  wsHub.broadcast({ type: 'status', data: { callId, status: callStatus } });
  res.status(200).send('ok');
});
