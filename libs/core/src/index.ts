export * from './lib/core.js';
export type {
  GpioBackendKind,
  HardwareCapabilities,
  I2cBackendKind,
} from './lib/hardware-capabilities.js';
export type { ChirimenErrorCode, ChirimenErrorPayload } from './lib/errors.js';
export {
  ChirimenError,
  isChirimenError,
  isChirimenErrorCode,
  toChirimenError,
  toChirimenErrorPayload,
} from './lib/errors.js';
