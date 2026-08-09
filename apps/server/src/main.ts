import { createExpressApp } from './app/express-app.js';
import { createRuntimeContext } from './app/runtime-context.js';
import { attachWebSocketServer } from './app/websocket-server.js';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 33330;

async function main(): Promise<void> {
  const runtimeContext = await createRuntimeContext();
  const app = createExpressApp(runtimeContext);
  let shuttingDown = false;

  const server = app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });

  const ws = attachWebSocketServer(server, runtimeContext);

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(
      `[ shutdown ] received ${signal}, cleaning up sessions and GPIO`
    );

    try {
      await ws.registry.cleanupAll();
    } catch (error: unknown) {
      console.error('[ shutdown ] session cleanup failed', error);
    }

    try {
      await ws.close();
    } catch (error: unknown) {
      console.error('[ shutdown ] WebSocket server close failed', error);
    }

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
