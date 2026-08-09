import { ChirimenError, isChirimenErrorCode } from 'core';

import type {
  ProtocolErrorResponse,
  ProtocolEvent,
  ProtocolMessage,
  ProtocolRequest,
  ProtocolSuccessResponse,
} from './messages.js';
import {
  isGpioExportRequestPayload,
  isGpioOnChangeEventPayload,
  isGpioPortOnlyRequestPayload,
  isGpioWriteRequestPayload,
  isI2cPortSlaveRequestPayload,
  isI2cReadBytesRequestPayload,
  isI2cRegisterReadRequestPayload,
  isI2cWrite16RequestPayload,
  isI2cWrite8RequestPayload,
  isI2cWriteByteRequestPayload,
  isI2cWriteBytesRequestPayload,
  isProtocolGpioValue,
  isProtocolI2cByte,
  isProtocolI2cBytesLength,
  isProtocolI2cWord,
  isProtocolOperation,
  type ProtocolEventOperation,
  type ProtocolOperation,
} from './operations.js';
import { isRequestId } from './request-id.js';

function invalidMessage(detail: string): ChirimenError {
  return new ChirimenError('InvalidArgument', `Invalid protocol message: ${detail}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmptyPayload(value: unknown): boolean {
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function isProtocolI2cByteArray(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    isProtocolI2cBytesLength(value.length) &&
    value.every((entry) => isProtocolI2cByte(entry))
  );
}

function isProtocolEventOperation(
  value: unknown
): value is ProtocolEventOperation {
  return value === 'gpio.onchange';
}

function isValidRequestPayload(
  operation: ProtocolOperation,
  payload: unknown
): boolean {
  switch (operation) {
    case 'gpio.export':
      return isGpioExportRequestPayload(payload);
    case 'gpio.read':
    case 'gpio.unexport':
    case 'gpio.subscribe':
    case 'gpio.unsubscribe':
      return isGpioPortOnlyRequestPayload(payload);
    case 'gpio.write':
      return isGpioWriteRequestPayload(payload);
    case 'i2c.open':
    case 'i2c.close':
    case 'i2c.readByte':
      return isI2cPortSlaveRequestPayload(payload);
    case 'i2c.read8':
    case 'i2c.read16':
      return isI2cRegisterReadRequestPayload(payload);
    case 'i2c.write8':
      return isI2cWrite8RequestPayload(payload);
    case 'i2c.write16':
      return isI2cWrite16RequestPayload(payload);
    case 'i2c.writeByte':
      return isI2cWriteByteRequestPayload(payload);
    case 'i2c.readBytes':
      return isI2cReadBytesRequestPayload(payload);
    case 'i2c.writeBytes':
      return isI2cWriteBytesRequestPayload(payload);
    default: {
      const _exhaustive: never = operation;
      return _exhaustive;
    }
  }
}

function isValidSuccessPayload(
  operation: ProtocolOperation,
  payload: unknown
): boolean {
  switch (operation) {
    case 'gpio.export':
    case 'gpio.write':
    case 'gpio.unexport':
    case 'gpio.subscribe':
    case 'gpio.unsubscribe':
    case 'i2c.open':
    case 'i2c.close':
    case 'i2c.write8':
    case 'i2c.write16':
    case 'i2c.writeByte':
      return isEmptyPayload(payload);
    case 'gpio.read':
      return (
        isPlainObject(payload) && isProtocolGpioValue(payload['value'])
      );
    case 'i2c.read8':
    case 'i2c.readByte':
      return isPlainObject(payload) && isProtocolI2cByte(payload['value']);
    case 'i2c.read16':
      return isPlainObject(payload) && isProtocolI2cWord(payload['value']);
    case 'i2c.readBytes':
    case 'i2c.writeBytes':
      return (
        isPlainObject(payload) && isProtocolI2cByteArray(payload['bytes'])
      );
    default: {
      const _exhaustive: never = operation;
      return _exhaustive;
    }
  }
}

function isValidEventPayload(
  operation: ProtocolEventOperation,
  payload: unknown
): boolean {
  switch (operation) {
    case 'gpio.onchange':
      return isGpioOnChangeEventPayload(payload);
    default: {
      const _exhaustive: never = operation;
      return _exhaustive;
    }
  }
}

function assertValidProtocolMessage(value: unknown): ProtocolMessage {
  if (!isPlainObject(value)) {
    throw invalidMessage('expected a plain object');
  }

  const kind = value['kind'];

  if (kind === 'request') {
    if (!isRequestId(value['requestId'])) {
      throw invalidMessage('requestId must be an integer in 0..0xffff');
    }
    if (
      value['sessionId'] !== undefined &&
      typeof value['sessionId'] !== 'string'
    ) {
      throw invalidMessage('sessionId must be a string when present');
    }
    if (!isProtocolOperation(value['operation'])) {
      throw invalidMessage('unknown request operation');
    }
    if (!isValidRequestPayload(value['operation'], value['payload'])) {
      throw invalidMessage(
        `invalid request payload for ${value['operation']}`
      );
    }
    return value as unknown as ProtocolRequest;
  }

  if (kind === 'response') {
    if (!isRequestId(value['requestId'])) {
      throw invalidMessage('requestId must be an integer in 0..0xffff');
    }
    if (!isProtocolOperation(value['operation'])) {
      throw invalidMessage('unknown response operation');
    }
    if (value['ok'] === true) {
      if (!isValidSuccessPayload(value['operation'], value['payload'])) {
        throw invalidMessage(
          `invalid success payload for ${value['operation']}`
        );
      }
      return value as unknown as ProtocolSuccessResponse;
    }
    if (value['ok'] === false) {
      if (!isPlainObject(value['error'])) {
        throw invalidMessage('error response requires an error object');
      }
      const error = value['error'];
      if (
        !isChirimenErrorCode(error['code']) ||
        typeof error['message'] !== 'string'
      ) {
        throw invalidMessage('invalid error payload');
      }
      return value as unknown as ProtocolErrorResponse;
    }
    throw invalidMessage('response.ok must be true or false');
  }

  if (kind === 'event') {
    if (!isProtocolEventOperation(value['operation'])) {
      throw invalidMessage('unknown event operation');
    }
    if (!isValidEventPayload(value['operation'], value['payload'])) {
      throw invalidMessage(`invalid event payload for ${value['operation']}`);
    }
    return value as unknown as ProtocolEvent;
  }

  throw invalidMessage('kind must be request, response, or event');
}

/**
 * {@link ProtocolMessage} を JSON テキスト（wire format）へ変換する。
 * 不正な message は ChirimenError（InvalidArgument）を throw する。
 *
 * @param message - エンコード対象のメッセージ
 */
export function encodeProtocolMessage(message: ProtocolMessage): string {
  assertValidProtocolMessage(message);
  return JSON.stringify(message);
}

/**
 * JSON テキスト（wire format）を {@link ProtocolMessage} へ変換する。
 * 不正な入力は ChirimenError（InvalidArgument）を throw する。
 *
 * @param data - JSON 文字列
 */
export function decodeProtocolMessage(data: string): ProtocolMessage {
  if (typeof data !== 'string') {
    throw invalidMessage('wire data must be a string');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data) as unknown;
  } catch (cause) {
    throw new ChirimenError(
      'InvalidArgument',
      'Invalid protocol message: malformed JSON',
      { cause }
    );
  }

  return assertValidProtocolMessage(parsed);
}
