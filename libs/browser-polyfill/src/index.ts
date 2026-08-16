/**
 * Browser 向け Web GPIO / Web I2C polyfill の公開 API。
 *
 * `installBrowserPolyfill` で WebSocket 経由の protocol 通信を張り、
 * `navigator.requestGPIOAccess` / `requestI2CAccess` を提供する。
 *
 * @packageDocumentation
 */
export {
  BROWSER_POLYFILL_PACKAGE_NAME,
  BROWSER_POLYFILL_PROTOCOL_PACKAGE,
} from './lib/browser/polyfill/polyfill.js';
export { BrowserGpioAccess } from './lib/browser/gpio/gpio-access.js';
export { BrowserGpioPort } from './lib/browser/gpio/gpio-port.js';
export { BrowserI2CAccess } from './lib/browser/i2c/i2c-access.js';
export { BrowserI2CPort } from './lib/browser/i2c/i2c-port.js';
export { BrowserI2CSlaveDevice } from './lib/browser/i2c/i2c-slave-device.js';
export { CHIRIMEN_GPIO_PORTS } from './lib/gpio-ports.js';
export { CHIRIMEN_I2C_PORTS } from './lib/i2c-ports.js';
export {
  installBrowserPolyfill,
  isBrowserPolyfillInstalled,
  requestGPIOAccess,
  requestI2CAccess,
} from './lib/polyfill/navigator.js';
export {
  DEFAULT_RECONNECT_INTERVAL_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  WebSocketClientTransport,
  type ConnectionStatus,
  type ConnectionStatusListener,
  type ProtocolEventListener,
  type ReconnectListener,
  type WebSocketClientTransportOptions,
  type WebSocketConstructor,
} from './lib/websocket/client/transport.js';
