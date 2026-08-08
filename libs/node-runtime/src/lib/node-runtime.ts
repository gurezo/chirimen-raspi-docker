import { createRuntimeHealth, type RuntimeHealth } from 'core';
import {
  isGpioDirection,
  type GpioAccess,
  type GpioPortDescriptor,
} from 'gpio';
import { mapGpioError } from './gpio/map-gpio-error.js';
import { requestNodeGpioAccess } from './gpio/request-node-gpio-access.js';

export interface NodeRuntimeContext {
  health: RuntimeHealth;
  gpio: {
    available: boolean;
    ports: GpioPortDescriptor[];
    access?: GpioAccess;
  };
  cleanup(): Promise<void>;
}

function toGpioPortDescriptors(access: GpioAccess): GpioPortDescriptor[] {
  const descriptors: GpioPortDescriptor[] = [];
  for (const [portNumber, port] of access.ports) {
    const descriptor: GpioPortDescriptor = { portNumber };
    if (isGpioDirection(port.direction)) {
      descriptor.direction = port.direction;
    }
    descriptors.push(descriptor);
  }
  return descriptors;
}

function createUnavailableGpioContext(): NodeRuntimeContext['gpio'] {
  return {
    available: false,
    ports: [],
  };
}

async function cleanupGpioAccess(access?: GpioAccess): Promise<void> {
  if (!access) {
    return;
  }

  try {
    await access.unexportAll();
  } catch (error) {
    throw mapGpioError(error);
  }
}

/**
 * Node Runtime コンテキストを生成する。
 * GPIO が利用可能な環境では port 一覧を取得し、失敗時は unavailable stub にフォールバックする。
 */
export async function createNodeRuntimeContext(): Promise<NodeRuntimeContext> {
  const health = createRuntimeHealth('chirimen-raspi-docker-server');

  try {
    const access = await requestNodeGpioAccess();
    return {
      health,
      gpio: {
        available: true,
        ports: toGpioPortDescriptors(access),
        access,
      },
      async cleanup() {
        await cleanupGpioAccess(access);
      },
    };
  } catch {
    return {
      health,
      gpio: createUnavailableGpioContext(),
      async cleanup() {
        await cleanupGpioAccess();
      },
    };
  }
}
