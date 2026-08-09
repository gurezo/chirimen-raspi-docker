import { randomUUID } from 'node:crypto';
import type { GpioAccess } from 'gpio';
import type { I2CAccess } from 'i2c';
import {
  createGpioSession,
  createI2cSession,
  type GpioSession,
  type I2cSession,
  type NodeRuntimeContext,
} from 'node-runtime';
import type { SessionId } from 'protocol';
import { ClientSession } from './client-session.js';

export interface ClientSessionRegistryOptions {
  readonly createSessionId?: () => SessionId;
  readonly createGpioSession?: (access: GpioAccess) => GpioSession;
  readonly createI2cSession?: (access: I2CAccess) => I2cSession;
}

function createEmptyGpioAccess(): GpioAccess {
  return {
    ports: new Map(),
    async unexportAll(): Promise<void> {
      // unavailable 環境用の no-op
    },
  };
}

function createEmptyI2CAccess(): I2CAccess {
  return {
    ports: new Map(),
  };
}

/**
 * 接続中 client session のレジストリ。
 * 旧 srv.js の `connections` Map 相当。
 */
export class ClientSessionRegistry {
  readonly #sessions = new Map<SessionId, ClientSession>();
  readonly #runtimeContext: NodeRuntimeContext;
  readonly #createSessionId: () => SessionId;
  readonly #createGpioSession: (access: GpioAccess) => GpioSession;
  readonly #createI2cSession: (access: I2CAccess) => I2cSession;

  constructor(
    runtimeContext: NodeRuntimeContext,
    options: ClientSessionRegistryOptions = {}
  ) {
    this.#runtimeContext = runtimeContext;
    this.#createSessionId = options.createSessionId ?? (() => randomUUID());
    this.#createGpioSession = options.createGpioSession ?? createGpioSession;
    this.#createI2cSession = options.createI2cSession ?? createI2cSession;
  }

  get size(): number {
    return this.#sessions.size;
  }

  get(sessionId: SessionId): ClientSession | undefined {
    return this.#sessions.get(sessionId);
  }

  /** 新規 client session を作成して登録する */
  create(): ClientSession {
    const sessionId = this.#createSessionId();
    const gpioAccess =
      this.#runtimeContext.gpio.access ?? createEmptyGpioAccess();
    const i2cAccess =
      this.#runtimeContext.i2c.access ?? createEmptyI2CAccess();

    const session = new ClientSession({
      sessionId,
      gpio: this.#createGpioSession(gpioAccess),
      i2c: this.#createI2cSession(i2cAccess),
    });

    this.#sessions.set(sessionId, session);
    return session;
  }

  /** session をレジストリから外し、GPIO / I2C を cleanup する */
  async deleteAndCleanup(sessionId: SessionId): Promise<void> {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.#sessions.delete(sessionId);
    await session.cleanup();
  }

  /** 全 session を cleanup する（server shutdown 用） */
  async cleanupAll(): Promise<void> {
    const sessions = [...this.#sessions.values()];
    this.#sessions.clear();

    for (const session of sessions) {
      await session.cleanup();
    }
  }
}

export function createClientSessionRegistry(
  runtimeContext: NodeRuntimeContext,
  options?: ClientSessionRegistryOptions
): ClientSessionRegistry {
  return new ClientSessionRegistry(runtimeContext, options);
}
