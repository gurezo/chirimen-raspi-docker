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
import {
  selectRuntimeBackends,
  type GpioBackendSelection,
  type I2cBackendSelection,
} from './hardware/select-runtime-backends.js';
import { mapGpioError } from './gpio/map-gpio-error.js';

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

function toGpioContext(
  selection: GpioBackendSelection
): NodeRuntimeContext['gpio'] {
  if (selection.kind === 'sysfs') {
    return {
      available: true,
      ports: toGpioPortDescriptors(selection.access),
      access: selection.access,
    };
  }
  return createUnavailableGpioContext();
}

function toI2CContext(
  selection: I2cBackendSelection
): NodeRuntimeContext['i2c'] {
  if (selection.kind === 'i2c-dev') {
    return {
      available: true,
      ports: toI2CPortDescriptors(selection.access),
      access: selection.access,
    };
  }
  return createUnavailableI2CContext();
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
 * 起動時に hardware capability を一度だけ検出し、
 * Runtime Factory で GPIO / I2C backend を選択して注入する。
 * サーバー起動後に backend は切り替えない。
 */
export async function createNodeRuntimeContext(): Promise<NodeRuntimeContext> {
  const health = createRuntimeHealth('chirimen-raspi-docker-server');
  const capabilities = detectHardwareCapabilities();
  const backends = await selectRuntimeBackends(capabilities);
  const gpio = toGpioContext(backends.gpio);
  const i2c = toI2CContext(backends.i2c);

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
