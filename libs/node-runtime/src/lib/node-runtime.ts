import { createRuntimeHealth, type RuntimeHealth } from 'core';
import type { GpioPortDescriptor } from 'gpio';

export interface NodeRuntimeContext {
  health: RuntimeHealth;
  gpio: {
    available: boolean;
    ports: GpioPortDescriptor[];
  };
}

export function createNodeRuntimeContext(): NodeRuntimeContext {
  return {
    health: createRuntimeHealth('chirimen-raspi-docker-server'),
    gpio: {
      available: false,
      ports: [],
    },
  };
}
