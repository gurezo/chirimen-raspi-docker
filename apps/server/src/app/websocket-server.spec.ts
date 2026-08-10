import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { NodeRuntimeContext } from 'node-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { attachWebSocketServer } from './websocket-server.js';

function createRuntimeContextMock(): NodeRuntimeContext {
  return {
    health: { name: 'test', status: 'ok', version: '0.0.1' },
    capabilities: {
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    },
    gpio: {
      available: false,
      ports: [],
    },
    i2c: {
      available: false,
      ports: [],
    },
    cleanup: vi.fn(async () => {
      // no-op
    }),
  };
}

async function listen(): Promise<HttpServer> {
  const server = createServer((_req, res) => {
    res.statusCode = 200;
    res.end('ok');
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  return server;
}

function serverUrl(server: HttpServer): string {
  const { port } = server.address() as AddressInfo;
  return `ws://127.0.0.1:${port}`;
}

describe('attachWebSocketServer', () => {
  let server: HttpServer | undefined;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    server = undefined;
  });

  it('registers a session on connect and removes it on disconnect', async () => {
    server = await listen();
    const attached = attachWebSocketServer(server, createRuntimeContextMock(), {
      registryOptions: {
        createSessionId: () => 'ws-session-1',
      },
    });

    const socket = new WebSocket(serverUrl(server));
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });

    expect(attached.registry.size).toBe(1);
    expect(attached.registry.get('ws-session-1')).toBeDefined();

    socket.close();
    await new Promise<void>((resolve) => {
      socket.once('close', () => resolve());
    });

    await vi.waitFor(() => {
      expect(attached.registry.size).toBe(0);
    });

    await attached.close();
  });

  it('cleans up remaining sessions via registry.cleanupAll', async () => {
    server = await listen();
    let nextId = 0;
    const attached = attachWebSocketServer(server, createRuntimeContextMock(), {
      registryOptions: {
        createSessionId: () => `ws-session-${nextId++}`,
      },
    });

    const sockets = await Promise.all(
      [0, 1].map(async () => {
        const socket = new WebSocket(serverUrl(server as HttpServer));
        await new Promise<void>((resolve, reject) => {
          socket.once('open', () => resolve());
          socket.once('error', reject);
        });
        return socket;
      })
    );

    expect(attached.registry.size).toBe(2);

    await attached.registry.cleanupAll();
    expect(attached.registry.size).toBe(0);

    for (const socket of sockets) {
      socket.close();
    }
    await attached.close();
  });
});
