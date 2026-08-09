import {
  GPIO_OPERATION_RUNTIME_MAPPINGS,
  gpioOperationFromLegacyFunctionId,
  legacyFunctionIdFromGpioOperation,
} from './gpio-operation-mapping.js';
import { LegacyFunctionId } from './legacy-function-ids.js';
import type {
  ProtocolEvent,
  ProtocolRequest,
} from './messages.js';
import {
  isGpioExportRequestPayload,
  isGpioOnChangeEventPayload,
  isGpioPortOnlyRequestPayload,
  isGpioProtocolOperation,
  isGpioWriteRequestPayload,
  isProtocolGpioDirection,
  isProtocolGpioPortNumber,
  isProtocolGpioValue,
  isProtocolOperation,
} from './operations.js';

describe('GPIO protocol operations', () => {
  it('lists all GPIO request operations', () => {
    expect(isGpioProtocolOperation('gpio.export')).toBe(true);
    expect(isGpioProtocolOperation('gpio.read')).toBe(true);
    expect(isGpioProtocolOperation('gpio.write')).toBe(true);
    expect(isGpioProtocolOperation('gpio.unexport')).toBe(true);
    expect(isGpioProtocolOperation('gpio.subscribe')).toBe(true);
    expect(isGpioProtocolOperation('gpio.unsubscribe')).toBe(true);
    expect(isGpioProtocolOperation('gpio.onchange')).toBe(false);
    expect(isGpioProtocolOperation('i2c.open')).toBe(false);
  });

  it('accepts GPIO direction / value / portNumber guards', () => {
    expect(isProtocolGpioDirection('in')).toBe(true);
    expect(isProtocolGpioDirection('out')).toBe(true);
    expect(isProtocolGpioDirection('inout')).toBe(false);

    expect(isProtocolGpioValue(0)).toBe(true);
    expect(isProtocolGpioValue(1)).toBe(true);
    expect(isProtocolGpioValue(2)).toBe(false);

    expect(isProtocolGpioPortNumber(26)).toBe(true);
    expect(isProtocolGpioPortNumber(-1)).toBe(false);
    expect(isProtocolGpioPortNumber(1.5)).toBe(false);
  });

  it('validates GPIO request and event payloads', () => {
    expect(
      isGpioExportRequestPayload({ portNumber: 26, direction: 'out' })
    ).toBe(true);
    expect(isGpioExportRequestPayload({ portNumber: 26 })).toBe(false);

    expect(isGpioPortOnlyRequestPayload({ portNumber: 17 })).toBe(true);
    expect(isGpioPortOnlyRequestPayload({ portNumber: -1 })).toBe(false);

    expect(isGpioWriteRequestPayload({ portNumber: 26, value: 1 })).toBe(true);
    expect(isGpioWriteRequestPayload({ portNumber: 26, value: 2 })).toBe(false);

    expect(
      isGpioOnChangeEventPayload({ portNumber: 26, value: 0 })
    ).toBe(true);
    expect(isGpioOnChangeEventPayload({ portNumber: 26 })).toBe(false);
  });

  it('narrows typed GPIO request / event samples', () => {
    const exportRequest: ProtocolRequest<'gpio.export'> = {
      kind: 'request',
      requestId: 1,
      operation: 'gpio.export',
      payload: { portNumber: 26, direction: 'out' },
    };
    const writeRequest: ProtocolRequest<'gpio.write'> = {
      kind: 'request',
      requestId: 2,
      operation: 'gpio.write',
      payload: { portNumber: 26, value: 1 },
    };
    const unexportRequest: ProtocolRequest<'gpio.unexport'> = {
      kind: 'request',
      requestId: 3,
      operation: 'gpio.unexport',
      payload: { portNumber: 26 },
    };
    const subscribeRequest: ProtocolRequest<'gpio.subscribe'> = {
      kind: 'request',
      requestId: 4,
      operation: 'gpio.subscribe',
      payload: { portNumber: 26 },
    };
    const unsubscribeRequest: ProtocolRequest<'gpio.unsubscribe'> = {
      kind: 'request',
      requestId: 5,
      operation: 'gpio.unsubscribe',
      payload: { portNumber: 26 },
    };
    const onChange: ProtocolEvent<'gpio.onchange'> = {
      kind: 'event',
      operation: 'gpio.onchange',
      payload: { portNumber: 26, value: 0 },
    };

    expect(isProtocolOperation(exportRequest.operation)).toBe(true);
    expect(isGpioExportRequestPayload(exportRequest.payload)).toBe(true);
    expect(isGpioWriteRequestPayload(writeRequest.payload)).toBe(true);
    expect(isGpioPortOnlyRequestPayload(unexportRequest.payload)).toBe(true);
    expect(isGpioPortOnlyRequestPayload(subscribeRequest.payload)).toBe(true);
    expect(isGpioPortOnlyRequestPayload(unsubscribeRequest.payload)).toBe(
      true
    );
    expect(isGpioOnChangeEventPayload(onChange.payload)).toBe(true);
  });
});

describe('GPIO operation runtime mapping', () => {
  it('covers export / read / write / unexport / subscribe / unsubscribe / onchange', () => {
    const operations = GPIO_OPERATION_RUNTIME_MAPPINGS.map(
      (entry) => entry.operation
    );
    expect(operations).toEqual([
      'gpio.export',
      'gpio.write',
      'gpio.read',
      'gpio.unexport',
      'gpio.subscribe',
      'gpio.unsubscribe',
      'gpio.onchange',
    ]);
  });

  it('maps legacy GPIO function ids to protocol operations', () => {
    expect(gpioOperationFromLegacyFunctionId(LegacyFunctionId.GpioExport)).toBe(
      'gpio.export'
    );
    expect(gpioOperationFromLegacyFunctionId(LegacyFunctionId.GpioWrite)).toBe(
      'gpio.write'
    );
    expect(gpioOperationFromLegacyFunctionId(LegacyFunctionId.GpioRead)).toBe(
      'gpio.read'
    );
    expect(
      gpioOperationFromLegacyFunctionId(LegacyFunctionId.GpioUnexport)
    ).toBe('gpio.unexport');
    expect(
      gpioOperationFromLegacyFunctionId(LegacyFunctionId.GpioOnChange)
    ).toBe('gpio.onchange');
    expect(
      gpioOperationFromLegacyFunctionId(LegacyFunctionId.I2cOpenClose)
    ).toBeUndefined();
  });

  it('maps protocol GPIO operations back to legacy ids where applicable', () => {
    expect(legacyFunctionIdFromGpioOperation('gpio.export')).toBe(
      LegacyFunctionId.GpioExport
    );
    expect(legacyFunctionIdFromGpioOperation('gpio.subscribe')).toBeNull();
    expect(legacyFunctionIdFromGpioOperation('gpio.unsubscribe')).toBeNull();
    expect(legacyFunctionIdFromGpioOperation('gpio.onchange')).toBe(
      LegacyFunctionId.GpioOnChange
    );
  });

  it('documents Node Runtime open/release for export/unexport', () => {
    const exportMapping = GPIO_OPERATION_RUNTIME_MAPPINGS.find(
      (entry) => entry.operation === 'gpio.export'
    );
    const unexportMapping = GPIO_OPERATION_RUNTIME_MAPPINGS.find(
      (entry) => entry.operation === 'gpio.unexport'
    );

    expect(exportMapping?.nodeRuntime).toContain('GpioSession.open');
    expect(exportMapping?.domainPort).toBe('export(direction)');
    expect(unexportMapping?.nodeRuntime).toContain('GpioSession.release');
    expect(unexportMapping?.domainPort).toBe('unexport()');
  });

  it('marks onchange as non-browser-request event', () => {
    const onChange = GPIO_OPERATION_RUNTIME_MAPPINGS.find(
      (entry) => entry.operation === 'gpio.onchange'
    );
    expect(onChange?.browserRequest).toBe(false);
  });
});
