import { createExpressApp } from './app/express-app.js';
import { createRuntimeContext } from './app/runtime-context.js';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 33330;

async function main(): Promise<void> {
  const runtimeContext = await createRuntimeContext();
  const app = createExpressApp(runtimeContext);
  let shuttingDown = false;

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
