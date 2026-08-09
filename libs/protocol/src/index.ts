export { PROTOCOL_PACKAGE_NAME } from './lib/protocol.js';
export type { RequestId } from './lib/request-id.js';
export type { SessionId } from './lib/session-id.js';
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
export { isProtocolOperation } from './lib/operations.js';
export {
  LegacyFunctionId,
  LegacyMessageKind,
} from './lib/legacy-function-ids.js';
export type {
  LegacyFunctionId as LegacyFunctionIdCode,
  LegacyMessageKind as LegacyMessageKindCode,
} from './lib/legacy-function-ids.js';
