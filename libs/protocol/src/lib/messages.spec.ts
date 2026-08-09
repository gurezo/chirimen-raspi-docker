import type {
  ProtocolEvent,
  ProtocolRequest,
  ProtocolSuccessResponse,
} from './messages.js';
import {
  isProtocolErrorResponse,
  isProtocolEvent,
  isProtocolMessage,
  isProtocolRequest,
  isProtocolResponse,
  isProtocolSuccessResponse,
} from './messages.js';
import { isProtocolOperation } from './operations.js';
import { LegacyFunctionId, LegacyMessageKind } from './legacy-function-ids.js';
import { PROTOCOL_PACKAGE_NAME } from './protocol.js';

describe('protocol', () => {
  it('exports PROTOCOL_PACKAGE_NAME', () => {
    expect(PROTOCOL_PACKAGE_NAME).toBe('protocol');
  });
});

describe('isProtocolOperation', () => {
  it('accepts known GPIO / I2C operations', () => {
    expect(isProtocolOperation('gpio.export')).toBe(true);
    expect(isProtocolOperation('i2c.read8')).toBe(true);
  });

  it('rejects unknown operations', () => {
    expect(isProtocolOperation('gpio.unknown')).toBe(false);
    expect(isProtocolOperation(0x10)).toBe(false);
  });
});

describe('message type guards', () => {
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

  const gpioOnChange: ProtocolEvent<'gpio.onchange'> = {
    kind: 'event',
    operation: 'gpio.onchange',
    payload: { portNumber: 26, value: 0 },
  };

  it('narrows GPIO export request', () => {
    expect(isProtocolRequest(gpioExportRequest)).toBe(true);
    expect(isProtocolMessage(gpioExportRequest)).toBe(true);
    expect(gpioExportRequest.payload.portNumber).toBe(26);
    expect(gpioExportRequest.payload.direction).toBe('out');
  });

  it('narrows I2C writeBytes request', () => {
    const request: ProtocolRequest<'i2c.writeBytes'> = {
      kind: 'request',
      requestId: 3,
      operation: 'i2c.writeBytes',
      payload: {
        portNumber: 1,
        slaveAddress: 0x48,
        bytes: [0x01, 0x02],
      },
    };
    expect(isProtocolRequest(request)).toBe(true);
    expect(request.payload.bytes).toEqual([0x01, 0x02]);
  });

  it('narrows success and error responses', () => {
    expect(isProtocolSuccessResponse(gpioReadSuccess)).toBe(true);
    expect(isProtocolResponse(gpioReadSuccess)).toBe(true);

    const errorResponse = {
      kind: 'response',
      requestId: 4,
      ok: false,
      operation: 'gpio.write',
      error: { code: 'DeviceUnavailable', message: 'pin busy' },
    };
    expect(isProtocolErrorResponse(errorResponse)).toBe(true);
    expect(isProtocolResponse(errorResponse)).toBe(true);
  });

  it('narrows GPIO onchange event', () => {
    expect(isProtocolEvent(gpioOnChange)).toBe(true);
    expect(isProtocolMessage(gpioOnChange)).toBe(true);
    expect(gpioOnChange.payload.value).toBe(0);
  });

  it('rejects malformed messages', () => {
    expect(isProtocolRequest({ kind: 'request' })).toBe(false);
    expect(isProtocolSuccessResponse({ kind: 'response', ok: true })).toBe(
      false
    );
    expect(isProtocolEvent({ kind: 'event' })).toBe(false);
  });
});

describe('legacy function ids', () => {
  it('keeps CHIRIMEN function id values', () => {
    expect(LegacyFunctionId.GpioExport).toBe(0x10);
    expect(LegacyFunctionId.GpioOnChange).toBe(0x14);
    expect(LegacyFunctionId.I2cRegisterRead).toBe(0x23);
    expect(LegacyMessageKind.ApiRequestResponse).toBe(1);
    expect(LegacyMessageKind.ChangeCallback).toBe(2);
  });
});
