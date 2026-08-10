import {
  createRuntimeHealth,
  type HardwareCapabilities,
  type RuntimeHealth,
} from 'core';
import {
  isGpioDirection,
  type GpioAccess,
  type GpioPortDescriptor,
} from 'gpio';
import type { I2CAccess, I2CPortNumber } from 'i2c';
import { detectHardwareCapabilities } from './hardware/detect-hardware-capabilities.js';
import { mapGpioError } from './gpio/map-gpio-error.js';
import { requestNodeGpioAccess } from './gpio/request-node-gpio-access.js';
import { requestNodeI2CAccess } from './i2c/request-node-i2c-access.js';

export interface I2CPortDescriptor {
  portNumber: I2CPortNumber;
  portName: string;
}

export interface NodeRuntimeContext {
  health: RuntimeHealth;
  /** 起動時に一度だけ検出した hardware capability */
  capabilities: HardwareCapabilities;
  gpio: {
    available: boolean;
    ports: GpioPortDescriptor[];
    access?: GpioAccess;
  };
  i2c: {
    available: boolean;
    ports: I2CPortDescriptor[];
    access?: I2CAccess;
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

function toI2CPortDescriptors(access: I2CAccess): I2CPortDescriptor[] {
  const descriptors: I2CPortDescriptor[] = [];
  for (const [portNumber, port] of access.ports) {
    descriptors.push({
      portNumber,
      portName: port.portName,
    });
  }
  return descriptors;
}

function createUnavailableGpioContext(): NodeRuntimeContext['gpio'] {
  return {
    available: false,
    ports: [],
  };
}

function createUnavailableI2CContext(): NodeRuntimeContext['i2c'] {
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

async function resolveGpioContext(): Promise<NodeRuntimeContext['gpio']> {
  try {
    const access = await requestNodeGpioAccess();
    return {
      available: true,
      ports: toGpioPortDescriptors(access),
      access,
    };
  } catch {
    return createUnavailableGpioContext();
  }
}

async function resolveI2CContext(): Promise<NodeRuntimeContext['i2c']> {
  try {
    const access = await requestNodeI2CAccess();
    return {
      available: true,
      ports: toI2CPortDescriptors(access),
      access,
    };
  } catch {
    return createUnavailableI2CContext();
  }
}

/**
 * Node Runtime コンテキストを生成する。
 * 起動時に hardware capability を一度だけ検出し、GPIO / I2C が利用可能な環境では port 一覧を取得する。
 * 失敗時は unavailable stub にフォールバックする。
 */
export async function createNodeRuntimeContext(): Promise<NodeRuntimeContext> {
  const health = createRuntimeHealth('chirimen-raspi-docker-server');
  const capabilities = detectHardwareCapabilities();
  const gpio = await resolveGpioContext();
  const i2c = await resolveI2CContext();

  return {
    health,
    capabilities,
    gpio,
    i2c,
    async cleanup() {
      await cleanupGpioAccess(gpio.access);
    },
  };
}
