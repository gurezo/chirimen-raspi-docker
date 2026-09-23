import type { Server as HttpServer } from 'node:http';
import type { NodeRuntimeContext } from 'node-runtime';
import {
  WebSocketServer,
  type RawData,
  type WebSocket,
} from 'ws';
import {
  createClientSessionRegistry,
  type ClientSessionRegistry,
  type ClientSessionRegistryOptions,
} from './client-session-registry.js';

export type WebSocketMessageHandler = (
  socket: WebSocket,
  data: RawData,
  sessionId: string
) => void;

export interface AttachWebSocketServerOptions {
  readonly registryOptions?: ClientSessionRegistryOptions;
  /** protocol ルーティング用。未指定時は no-op */
  readonly onMessage?: WebSocketMessageHandler;
  /**
   * registry 生成後に message handler を構築する。
   * `onMessage` より優先される。
   */
  readonly createMessageHandler?: (
    registry: ClientSessionRegistry
  ) => WebSocketMessageHandler;
}

export interface AttachedWebSocketServer {
  readonly wss: WebSocketServer;
  readonly registry: ClientSessionRegistry;
  close(): Promise<void>;
}

/**
 * 既存 HTTP server に WebSocket server を接続し、
 * client session の作成・切断 cleanup を配線する。
 */
export function attachWebSocketServer(
  httpServer: HttpServer,
  runtimeContext: NodeRuntimeContext,
  options: AttachWebSocketServerOptions = {}
): AttachedWebSocketServer {
  const registry = createClientSessionRegistry(
    runtimeContext,
    options.registryOptions
  );
  const wss = new WebSocketServer({ server: httpServer });
  const onMessage =
    options.createMessageHandler?.(registry) ?? options.onMessage;

  wss.on('connection', (socket) => {
    const session = registry.create();
    const { sessionId } = session;
    console.log(
      `[ ws ] connected session=${sessionId} clients=${registry.size}`
    );

    socket.on('message', (data) => {
      onMessage?.(socket, data, sessionId);
    });

    const cleanup = (): void => {
      void registry.deleteAndCleanup(sessionId).then(() => {
        console.log(
          `[ ws ] disconnected session=${sessionId} clients=${registry.size}`
        );
      });
    };

    socket.on('close', cleanup);
    socket.on('error', (error: Error) => {
      console.error(`[ ws ] error session=${sessionId}`, error);
      socket.terminate();
    });
  });

  return {
    wss,
    registry,
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        wss.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
