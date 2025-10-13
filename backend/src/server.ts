import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import { callRouter } from './routes/call.js';
import { healthRouter } from './routes/health.js';
import { voiceRouter } from './telephony/voiceWebhook.js';
import { wsHub } from './realtime/wsHub.js';
import { attachMediaStreamServer } from './telephony/mediaStream.js';
import './store/db.js';
import { closeDb } from './store/db.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.PUBLIC_WS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  pinoHttp({
    logger,
    genReqId: () => crypto.randomUUID()
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use('/api', healthRouter);
app.use('/api', callRouter);
app.use('/twilio', voiceRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const mediaServer = attachMediaStreamServer(server);
wsHub.attach(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Backend listening');
});

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close();
  await wsHub.close();
  await mediaServer.close();
  closeDb();
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    void shutdown(sig);
  });
});
