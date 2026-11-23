import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import type { Config } from './config.js';

export function createApp(cfg: Config) {
  const app = express();
  const logger = pino({ level: cfg.NODE_ENV === 'test' ? 'silent' : 'info', redact: ['req.headers.authorization', 'req.headers.cookie'] });

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: cfg.origins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get('/health', (_req, res) => { res.json({ ok: true }); });

  // Routes land here in Phase 1: /me, users, groups, assignments, submissions/:id/grade, lessons/:id/open ...
  app.use((_req, res) => { res.status(404).json({ error: 'not_found' }); });
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'unhandled');
    res.status(500).json({ error: 'internal_error' });
  });
  return app;
}
