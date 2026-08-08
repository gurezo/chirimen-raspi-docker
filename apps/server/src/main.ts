import express from 'express';
import { createNodeRuntimeContext } from 'node-runtime';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 33330;

async function main(): Promise<void> {
  const app = express();
  const runtimeContext = await createNodeRuntimeContext();
  let shuttingDown = false;

  app.get('/', (req, res) => {
    res.json({
      name: runtimeContext.health.name,
      status: runtimeContext.health.status,
    });
  });

  app.get('/health', (req, res) => {
    res.json(runtimeContext.health);
  });

  const server = app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[ shutdown ] received ${signal}, cleaning up GPIO`);

    try {
      await runtimeContext.cleanup();
    } catch (error: unknown) {
      console.error('[ shutdown ] GPIO cleanup failed', error);
    }

    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error: unknown) => {
  console.error('[ fatal ] failed to start server', error);
  process.exit(1);
});
