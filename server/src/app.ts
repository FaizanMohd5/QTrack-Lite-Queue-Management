import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/client';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ownerRoutes } from './routes/ownerRoutes';
import { publicRoutes } from './routes/publicRoutes';

export const app = express();

app.set('trust proxy', env.NODE_ENV === 'production' || env.TRUST_PROXY === 'true' ? 1 : false);
app.disable('x-powered-by');
app.use(
  pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} completed with ${res.statusCode}`;
    },
    customErrorMessage(req, res) {
      return `${req.method} ${req.url} failed with ${res.statusCode}`;
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
});

app.use('/api/v1', publicRoutes);
app.use('/api/v1/owner', ownerRoutes);

if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const clientIndex = path.join(clientDist, 'index.html');

  if (!existsSync(clientIndex)) {
    logger.warn(
      { event: 'frontend.assets_missing', clientDist },
      'React production build was not found; API routes remain available',
    );
  } else {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(clientIndex);
    });
  }
}

app.use(notFoundHandler);
app.use(errorHandler);
