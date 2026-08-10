export * from './lib/node-runtime.js';
export {
  classifyHardwareCapabilities,
  detectHardwareCapabilities,
  probeHardwarePaths,
  type HardwareProbeFindings,
  type HardwareProbeFs,
} from './lib/hardware/detect-hardware-capabilities.js';
export { requestNodeGpioAccess } from './lib/gpio/request-node-gpio-access.js';
export { NodeWebGpioAccessAdapter } from './lib/gpio/gpio-access-adapter.js';
export { NodeWebGpioPortAdapter } from './lib/gpio/gpio-port-adapter.js';
export { mapGpioError } from './lib/gpio/map-gpio-error.js';
export { GpioSession, createGpioSession } from './lib/gpio/gpio-session.js';
export { requestNodeI2CAccess } from './lib/i2c/request-node-i2c-access.js';
export { NodeWebI2CAccessAdapter } from './lib/i2c/i2c-access-adapter.js';
export { NodeWebI2CPortAdapter } from './lib/i2c/i2c-port-adapter.js';
export { NodeWebI2CSlaveDeviceAdapter } from './lib/i2c/i2c-slave-device-adapter.js';
export { mapI2cError } from './lib/i2c/map-i2c-error.js';
export { I2cSession, createI2cSession } from './lib/i2c/i2c-session.js';
export {
  I2C_SCAN_ADDRESS_MAX,
  I2C_SCAN_ADDRESS_MIN,
  scanI2cPort,
} from './lib/i2c/scan-i2c-port.js';
