import express, { type Express } from 'express';
import type { NodeRuntimeContext } from './runtime-context.js';

/**
 * Express application を生成し、health 系ルートを登録する。
 */
export function createExpressApp(runtimeContext: NodeRuntimeContext): Express {
  const app = express();

  app.get('/', (_req, res) => {
    res.json({
      name: runtimeContext.health.name,
      status: runtimeContext.health.status,
    });
  });

  app.get('/health', (_req, res) => {
    res.json(runtimeContext.health);
  });

  return app;
}
