import express from 'express';
import { createNodeRuntimeContext } from 'node-runtime';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 33330;

async function main(): Promise<void> {
  const app = express();
  const runtimeContext = await createNodeRuntimeContext();

  app.get('/', (req, res) => {
    res.json({
      name: runtimeContext.health.name,
      status: runtimeContext.health.status,
    });
  });

  app.get('/health', (req, res) => {
    res.json(runtimeContext.health);
  });

  app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });
}

main().catch((error: unknown) => {
  console.error('[ fatal ] failed to start server', error);
  process.exit(1);
});
