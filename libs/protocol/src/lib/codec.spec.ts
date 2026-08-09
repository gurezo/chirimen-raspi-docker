import { ChirimenError } from 'core';

import {
  decodeProtocolMessage,
  encodeProtocolMessage,
} from './codec.js';
import type {
  ProtocolErrorResponse,
  ProtocolEvent,
  ProtocolRequest,
  ProtocolSuccessResponse,
} from './messages.js';
import { isRequestId } from './request-id.js';

describe('isRequestId', () => {
  it('accepts integers in 0..0xffff', () => {
    expect(isRequestId(0)).toBe(true);
    expect(isRequestId(1)).toBe(true);
    expect(isRequestId(0xffff)).toBe(true);
  });

  it('rejects out-of-range or non-integer values', () => {
    expect(isRequestId(-1)).toBe(false);
    expect(isRequestId(0x10000)).toBe(false);
    expect(isRequestId(1.5)).toBe(false);
    expect(isRequestId('1')).toBe(false);
  });
});

describe('encodeProtocolMessage / decodeProtocolMessage', () => {
  const gpioExportRequest: ProtocolRequest<'gpio.export'> = {
    kind: 'request',
    requestId: 1,
    sessionId: 'conn-1',
    operation: 'gpio.export',
    payload: { portNumber: 26, direction: 'out' },
  };

  const gpioReadSuccess: ProtocolSuccessResponse<'gpio.read'> = {
    kind: 'response',
    requestId: 2,
    ok: true,
    operation: 'gpio.read',
    payload: { value: 1 },
  };

  const gpioWriteError: ProtocolErrorResponse<'gpio.write'> = {
    kind: 'response',
    requestId: 3,
    ok: false,
    operation: 'gpio.write',
    error: { code: 'InvalidArgument', message: 'bad value' },
  };

  const gpioOnChange: ProtocolEvent<'gpio.onchange'> = {
    kind: 'event',
    operation: 'gpio.onchange',
    payload: { portNumber: 26, value: 0 },
  };

  const i2cRead8Request: ProtocolRequest<'i2c.read8'> = {
    kind: 'request',
    requestId: 4,
    operation: 'i2c.read8',
    payload: {
      portNumber: 1,
      slaveAddress: 0x48,
      registerNumber: 0x10,
    },
  };

  const i2cWriteBytesSuccess: ProtocolSuccessResponse<'i2c.writeBytes'> = {
    kind: 'response',
    requestId: 5,
    ok: true,
    operation: 'i2c.writeBytes',
    payload: { bytes: [0x01, 0x02, 0x03] },
  };

  it.each([
    ['gpio.export request', gpioExportRequest],
    ['gpio.read success', gpioReadSuccess],
    ['gpio.write error', gpioWriteError],
    ['gpio.onchange event', gpioOnChange],
    ['i2c.read8 request', i2cRead8Request],
    ['i2c.writeBytes success', i2cWriteBytesSuccess],
  ] as const)('round-trips %s', (_label, message) => {
    const encoded = encodeProtocolMessage(message);
    expect(typeof encoded).toBe('string');
    expect(decodeProtocolMessage(encoded)).toEqual(message);
  });

  it('rejects malformed JSON', () => {
    expect(() => decodeProtocolMessage('{')).toThrow(ChirimenError);
    try {
      decodeProtocolMessage('{');
    } catch (error) {
      expect(error).toMatchObject({
        name: 'ChirimenError',
        code: 'InvalidArgument',
      });
    }
  });

  it('rejects unknown operation', () => {
    const wire = JSON.stringify({
      kind: 'request',
      requestId: 1,
      operation: 'gpio.unknown',
      payload: { portNumber: 26 },
    });
    expect(() => decodeProtocolMessage(wire)).toThrow(ChirimenError);
    try {
      decodeProtocolMessage(wire);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'InvalidArgument',
      });
    }
  });

  it('rejects invalid request payload', () => {
    const wire = JSON.stringify({
      kind: 'request',
      requestId: 1,
      operation: 'gpio.export',
      payload: { portNumber: 26, direction: 'sideways' },
    });
    expect(() => decodeProtocolMessage(wire)).toThrow(ChirimenError);
  });

  it('rejects out-of-range requestId', () => {
    const wire = JSON.stringify({
      ...gpioExportRequest,
      requestId: 0x10000,
    });
    expect(() => decodeProtocolMessage(wire)).toThrow(ChirimenError);
    expect(() =>
      encodeProtocolMessage({
        ...gpioExportRequest,
        requestId: 0x10000,
      })
    ).toThrow(ChirimenError);
  });

  it('rejects invalid error payload', () => {
    const wire = JSON.stringify({
      kind: 'response',
      requestId: 1,
      ok: false,
      operation: 'gpio.read',
      error: { code: 'NotACode', message: 'nope' },
    });
    expect(() => decodeProtocolMessage(wire)).toThrow(ChirimenError);
  });
});
