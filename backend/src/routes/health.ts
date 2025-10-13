import { Router } from 'express';
import os from 'os';
import { wsHub } from '../realtime/wsHub.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
    load: os.loadavg()[0],
    clients: wsHub.clientCount()
  });
});
