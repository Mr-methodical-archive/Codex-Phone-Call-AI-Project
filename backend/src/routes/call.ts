import { Router } from 'express';
import { z } from 'zod';
import { twilioService } from '../services/twilio.js';
import { redactPII } from '../utils/redact.js';
import { logger } from '../utils/logger.js';

const callSchema = z
  .object({
    phoneNumber: z.string().min(7, 'Phone number is required for live calls').or(z.literal('')),
    task: z.string().min(3),
    mock: z.boolean().optional(),
    mockProfile: z.string().optional(),
    providers: z
      .object({
        stt: z.enum(['openai-whisper', 'google-stt', 'mock']).optional(),
        tts: z.enum(['elevenlabs', 'google-tts', 'mock']).optional(),
        llm: z.enum(['openai-chat', 'mock']).optional()
      })
      .optional()
  })
  .superRefine((data, ctx) => {
    if (!data.mock && (!data.phoneNumber || data.phoneNumber.length < 7)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone number required when mock mode is off', path: ['phoneNumber'] });
    }
  });

export const callRouter = Router();

callRouter.post('/call', async (req, res) => {
  try {
    const parsed = callSchema.parse(req.body);
    const result = await twilioService.initiateCall({ body: parsed });
    logger.info({ callId: result.callId, phoneNumber: redactPII(parsed.phoneNumber) }, 'Call initiated');
    res.status(201).json({ callId: result.callId });
  } catch (err: any) {
    logger.error({ err }, 'Failed to initiate call');
    res.status(400).json({ error: err.message ?? 'Unable to start call' });
  }
});
