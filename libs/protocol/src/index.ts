/**
 * Browser ↔ Server 間の JSON protocol 公開 API。
 *
 * request / response / event の型、codec、legacy function id 対応を提供する。
 * Node Runtime / GPIO・I2C domain 実装への依存は持たない。
 *
 * @packageDocumentation
 */
export { PROTOCOL_PACKAGE_NAME } from './lib/protocol.js';
export type { RequestId } from './lib/request-id.js';
export { isRequestId } from './lib/request-id.js';
export type { SessionId } from './lib/session-id.js';
export {
  decodeProtocolMessage,
  encodeProtocolMessage,
} from './lib/codec.js';
export type {
  ProtocolErrorResponse,
  ProtocolEvent,
  ProtocolMessage,
  ProtocolMessageKind,
  ProtocolRequest,
  ProtocolResponse,
  ProtocolSuccessResponse,
} from './lib/messages.js';
export {
  isProtocolErrorResponse,
  isProtocolEvent,
  isProtocolMessage,
  isProtocolRequest,
  isProtocolResponse,
  isProtocolSuccessResponse,
} from './lib/messages.js';
export type {
  GpioProtocolEventOperation,
  GpioProtocolOperation,
  I2cProtocolOperation,
  ProtocolEventOperation,
  ProtocolEventPayload,
  ProtocolEventPayloadMap,
  ProtocolGpioDirection,
  ProtocolGpioValue,
  ProtocolOperation,
  ProtocolRequestPayload,
  ProtocolRequestPayloadMap,
  ProtocolSuccessPayload,
  ProtocolSuccessPayloadMap,
} from './lib/operations.js';
export {
  isGpioExportRequestPayload,
  isGpioOnChangeEventPayload,
  isGpioPortOnlyRequestPayload,
  isGpioProtocolOperation,
  isGpioWriteRequestPayload,
  isI2cPortSlaveRequestPayload,
  isI2cProtocolOperation,
  isI2cReadBytesRequestPayload,
  isI2cRegisterReadRequestPayload,
  isI2cWrite16RequestPayload,
  isI2cWrite8RequestPayload,
  isI2cWriteByteRequestPayload,
  isI2cWriteBytesRequestPayload,
  isProtocolGpioDirection,
  isProtocolGpioPortNumber,
  isProtocolGpioValue,
  isProtocolI2cByte,
  isProtocolI2cBytesLength,
  isProtocolI2cPortNumber,
  isProtocolI2cRegisterNumber,
  isProtocolI2cSlaveAddress,
  isProtocolI2cWord,
  isProtocolOperation,
} from './lib/operations.js';
export type { GpioOperationRuntimeMapping } from './lib/gpio-operation-mapping.js';
export {
  GPIO_OPERATION_RUNTIME_MAPPINGS,
  gpioOperationFromLegacyFunctionId,
  legacyFunctionIdFromGpioOperation,
} from './lib/gpio-operation-mapping.js';
export type { I2cOperationRuntimeMapping } from './lib/i2c-operation-mapping.js';
export {
  I2C_OPERATION_RUNTIME_MAPPINGS,
  i2cOperationsFromLegacyFunctionId,
  legacyFunctionIdFromI2cOperation,
} from './lib/i2c-operation-mapping.js';
export {
  LegacyFunctionId,
  LegacyMessageKind,
} from './lib/legacy-function-ids.js';
export type {
  LegacyFunctionId as LegacyFunctionIdCode,
  LegacyMessageKind as LegacyMessageKindCode,
} from './lib/legacy-function-ids.js';
