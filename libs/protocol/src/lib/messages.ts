import type { ChirimenErrorPayload } from 'core';

import type {
  ProtocolEventOperation,
  ProtocolEventPayload,
  ProtocolOperation,
  ProtocolRequestPayload,
  ProtocolSuccessPayload,
} from './operations.js';
import type { RequestId } from './request-id.js';
import type { SessionId } from './session-id.js';

/** Protocol メッセージの種別 */
export type ProtocolMessageKind = 'request' | 'response' | 'event';

/**
 * Browser → Server の操作要求。
 * `Op` を指定すると payload が operation に対応する型になる。
 */
export interface ProtocolRequest<
  Op extends ProtocolOperation = ProtocolOperation,
> {
  readonly kind: 'request';
  readonly requestId: RequestId;
  readonly sessionId?: SessionId;
  readonly operation: Op;
  readonly payload: ProtocolRequestPayload<Op>;
}

/** 成功レスポンス */
export interface ProtocolSuccessResponse<
  Op extends ProtocolOperation = ProtocolOperation,
> {
  readonly kind: 'response';
  readonly requestId: RequestId;
  readonly ok: true;
  readonly operation: Op;
  readonly payload: ProtocolSuccessPayload<Op>;
}

/** 失敗レスポンス（構造化エラー） */
export interface ProtocolErrorResponse<
  Op extends ProtocolOperation = ProtocolOperation,
> {
  readonly kind: 'response';
  readonly requestId: RequestId;
  readonly ok: false;
  readonly operation: Op;
  readonly error: ChirimenErrorPayload;
}

export type ProtocolResponse<
  Op extends ProtocolOperation = ProtocolOperation,
> = ProtocolSuccessResponse<Op> | ProtocolErrorResponse<Op>;

/**
 * Server → Browser の非同期通知。
 * 例: GPIO onchange（旧 function id 0x14）。
 */
export interface ProtocolEvent<
  Op extends ProtocolEventOperation = ProtocolEventOperation,
> {
  readonly kind: 'event';
  readonly operation: Op;
  readonly payload: ProtocolEventPayload<Op>;
}

export type ProtocolMessage =
  | ProtocolRequest
  | ProtocolResponse
  | ProtocolEvent;

/** `value` が ProtocolRequest かどうか */
export function isProtocolRequest(
  value: unknown
): value is ProtocolRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message['kind'] === 'request' &&
    typeof message['requestId'] === 'number' &&
    typeof message['operation'] === 'string' &&
    'payload' in message &&
    (message['sessionId'] === undefined ||
      typeof message['sessionId'] === 'string')
  );
}

/** `value` が ProtocolSuccessResponse かどうか */
export function isProtocolSuccessResponse(
  value: unknown
): value is ProtocolSuccessResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message['kind'] === 'response' &&
    message['ok'] === true &&
    typeof message['requestId'] === 'number' &&
    typeof message['operation'] === 'string' &&
    'payload' in message
  );
}

/** `value` が ProtocolErrorResponse かどうか */
export function isProtocolErrorResponse(
  value: unknown
): value is ProtocolErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  if (
    message['kind'] !== 'response' ||
    message['ok'] !== false ||
    typeof message['requestId'] !== 'number' ||
    typeof message['operation'] !== 'string' ||
    typeof message['error'] !== 'object' ||
    message['error'] === null
  ) {
    return false;
  }
  const error = message['error'] as Record<string, unknown>;
  return typeof error['code'] === 'string' && typeof error['message'] === 'string';
}

/** `value` が ProtocolResponse かどうか */
export function isProtocolResponse(
  value: unknown
): value is ProtocolResponse {
  return isProtocolSuccessResponse(value) || isProtocolErrorResponse(value);
}

/** `value` が ProtocolEvent かどうか */
export function isProtocolEvent(value: unknown): value is ProtocolEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message['kind'] === 'event' &&
    typeof message['operation'] === 'string' &&
    'payload' in message
  );
}

/** `value` が ProtocolMessage かどうか */
export function isProtocolMessage(
  value: unknown
): value is ProtocolMessage {
  return (
    isProtocolRequest(value) ||
    isProtocolResponse(value) ||
    isProtocolEvent(value)
  );
}
