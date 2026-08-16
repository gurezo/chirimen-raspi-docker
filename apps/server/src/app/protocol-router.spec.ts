import type { GpioAccess, GpioPort } from 'gpio';
import type { I2CAccess, I2CPort, I2CSlaveDevice } from 'i2c';
import {
  createGpioSession,
  createI2cSession,
  type GpioSession,
  type I2cSession,
} from 'node-runtime';
import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  type ProtocolEvent,
  type ProtocolResponse,
} from 'protocol';
import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import {
  createClientSessionRegistry,
  type ClientSessionRegistry,
} from './client-session-registry.js';
import { createGpioProtocolMessageHandler } from './protocol-router.js';

function createPortMock(portNumber: number): GpioPort {
  let exported = false;
  let direction: 'in' | 'out' = 'out';
  let value: 0 | 1 = 0;
  let onchange: GpioPort['onchange'] = null;

  return {
    portNumber,
    portName: `GPIO${portNumber}`,
    pinName: `PIN${portNumber}`,
    get exported() {
      return exported;
    },
    get direction() {
      return direction;
    },
    get onchange() {
      return onchange;
    },
    set onchange(handler) {
      onchange = handler;
    },
    export: vi.fn(async (nextDirection: 'in' | 'out') => {
      direction = nextDirection;
      exported = true;
    }),
    unexport: vi.fn(async () => {
      exported = false;
      onchange = null;
    }),
    read: vi.fn(async () => value),
    write: vi.fn(async (nextValue: 0 | 1) => {
      value = nextValue;
    }),
  };
}

function createRegistryWithPort(port: GpioPort): {
  registry: ClientSessionRegistry;
  getSessionGpio: () => GpioSession;
} {
  let gpioSession: GpioSession | undefined;
  const access: GpioAccess = {
    ports: new Map([[port.portNumber, port]]),
    unexportAll: vi.fn(async () => {
      // no-op
    }),
  };

  const registry = createClientSessionRegistry(
    {
      health: { name: 'test', status: 'ok', version: '0.0.1' },
      capabilities: {
        gpio: { backend: 'sysfs' },
        i2c: { backend: 'unavailable' },
      },
      gpio: { available: true, ports: [port.portNumber], access },
      i2c: { available: false, ports: [] },
      cleanup: vi.fn(async () => {
        // no-op
      }),
    },
    {
      createSessionId: () => 'session-1',
      createGpioSession: (gpioAccess) => {
        gpioSession = createGpioSession(gpioAccess);
        return gpioSession;
      },
    }
  );

  return {
    registry,
    getSessionGpio: () => {
      if (!gpioSession) {
        throw new Error('gpio session not created');
      }
      return gpioSession;
    },
  };
}

function createI2cSlaveDeviceMock(slaveAddress: number): I2CSlaveDevice {
  return {
    slaveAddress,
    read8: vi.fn(async () => 0),
    read16: vi.fn(async () => 0),
    write8: vi.fn(async () => {
      // no-op for unit tests
    }),
    write16: vi.fn(async () => {
      // no-op for unit tests
    }),
    readByte: vi.fn(async () => 0),
    writeByte: vi.fn(async () => {
      // no-op for unit tests
    }),
    readBytes: vi.fn(async () => new Uint8Array()),
    writeBytes: vi.fn(async (bytes) => new Uint8Array(bytes)),
  };
}

function createI2cPortMock(portNumber: number): I2CPort {
  return {
    portNumber,
    portName: `I2C${portNumber}`,
    pinName: `PIN${portNumber}`,
    open: vi.fn(async (slaveAddress: number) =>
      createI2cSlaveDeviceMock(slaveAddress)
    ),
  };
}

function createRegistryWithI2cPort(port: I2CPort): {
  registry: ClientSessionRegistry;
  getSessionI2c: () => I2cSession;
} {
  let i2cSession: I2cSession | undefined;
  const access: I2CAccess = {
    ports: new Map([[port.portNumber, port]]),
  };

  const registry = createClientSessionRegistry(
    {
      health: { name: 'test', status: 'ok', version: '0.0.1' },
      capabilities: {
        gpio: { backend: 'unavailable' },
        i2c: { backend: 'i2c-dev' },
      },
      gpio: { available: false, ports: [] },
      i2c: { available: true, ports: [port.portNumber], access },
      cleanup: vi.fn(async () => {
        // no-op
      }),
    },
    {
      createSessionId: () => 'session-1',
      createI2cSession: (i2cAccess) => {
        i2cSession = createI2cSession(i2cAccess);
        return i2cSession;
      },
    }
  );

  return {
    registry,
    getSessionI2c: () => {
      if (!i2cSession) {
        throw new Error('i2c session not created');
      }
      return i2cSession;
    },
  };
}

function createSocketMock() {
  const messages: string[] = [];
  const socket = {
    readyState: WebSocket.OPEN,
    OPEN: WebSocket.OPEN,
    send: vi.fn((data: string) => {
      messages.push(data);
    }),
  };
  return { socket: socket as unknown as WebSocket, messages };
}

describe('createGpioProtocolMessageHandler', () => {
  it('routes gpio.export / read / write / unexport', async () => {
    const port = createPortMock(26);
    const { registry } = createRegistryWithPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'gpio.export',
        payload: { portNumber: 26, direction: 'out' },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));
    expect(decodeProtocolMessage(messages[0]!)).toMatchObject({
      kind: 'response',
      requestId: 1,
      ok: true,
      operation: 'gpio.export',
    });

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 2,
        operation: 'gpio.write',
        payload: { portNumber: 26, value: 1 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(2));
    expect(port.write).toHaveBeenCalledWith(1);

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 3,
        operation: 'gpio.unexport',
        payload: { portNumber: 26 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(3));

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 4,
        operation: 'gpio.export',
        payload: { portNumber: 26, direction: 'in' },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(4));

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 5,
        operation: 'gpio.read',
        payload: { portNumber: 26 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(5));
    const readResponse = decodeProtocolMessage(
      messages[4]!
    ) as ProtocolResponse<'gpio.read'>;
    expect(readResponse).toMatchObject({
      kind: 'response',
      ok: true,
      operation: 'gpio.read',
      payload: { value: 1 },
    });
  });

  it('emits gpio.onchange only while subscribed', async () => {
    const port = createPortMock(26);
    const { registry } = createRegistryWithPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'gpio.export',
        payload: { portNumber: 26, direction: 'in' },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));

    port.onchange?.({ value: 1, portNumber: 26 });
    expect(messages.length).toBe(1);

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 2,
        operation: 'gpio.subscribe',
        payload: { portNumber: 26 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(2));
    expect(decodeProtocolMessage(messages[1]!)).toMatchObject({
      ok: true,
      operation: 'gpio.subscribe',
    });

    port.onchange?.({ value: 1, portNumber: 26 });
    await vi.waitFor(() => expect(messages.length).toBe(3));
    const event = decodeProtocolMessage(messages[2]!) as ProtocolEvent<'gpio.onchange'>;
    expect(event).toEqual({
      kind: 'event',
      operation: 'gpio.onchange',
      payload: { portNumber: 26, value: 1 },
    });

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 3,
        operation: 'gpio.unsubscribe',
        payload: { portNumber: 26 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(4));

    port.onchange?.({ value: 0, portNumber: 26 });
    expect(messages.length).toBe(4);
  });

  it('returns error response when subscribe target is not open', async () => {
    const port = createPortMock(26);
    const { registry } = createRegistryWithPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'gpio.subscribe',
        payload: { portNumber: 26 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));

    expect(decodeProtocolMessage(messages[0]!)).toMatchObject({
      kind: 'response',
      requestId: 1,
      ok: false,
      operation: 'gpio.subscribe',
      error: {
        code: 'InvalidAccess',
        message: 'GPIO port 26 is not open in this session',
      },
    });
  });
});

describe('I2C scan protocol routing', () => {
  it('routes i2c.open then i2c.writeByte', async () => {
    const port = createI2cPortMock(1);
    const { registry, getSessionI2c } = createRegistryWithI2cPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'i2c.open',
        payload: { portNumber: 1, slaveAddress: 0x48 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));
    expect(decodeProtocolMessage(messages[0]!)).toMatchObject({
      kind: 'response',
      requestId: 1,
      ok: true,
      operation: 'i2c.open',
    });
    expect(port.open).toHaveBeenCalledWith(0x48);
    expect(getSessionI2c().isOpen(1, 0x48)).toBe(true);

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 2,
        operation: 'i2c.writeByte',
        payload: { portNumber: 1, slaveAddress: 0x48, value: 0x00 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(2));
    expect(decodeProtocolMessage(messages[1]!)).toMatchObject({
      kind: 'response',
      requestId: 2,
      ok: true,
      operation: 'i2c.writeByte',
    });
    expect(getSessionI2c().getOpenedDevice(1, 0x48).writeByte).toHaveBeenCalledWith(
      0x00
    );
  });

  it('treats a second i2c.open of the same address as success', async () => {
    const port = createI2cPortMock(1);
    const { registry } = createRegistryWithI2cPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'i2c.open',
        payload: { portNumber: 1, slaveAddress: 0x48 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 2,
        operation: 'i2c.open',
        payload: { portNumber: 1, slaveAddress: 0x48 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(2));
    expect(decodeProtocolMessage(messages[1]!)).toMatchObject({
      kind: 'response',
      requestId: 2,
      ok: true,
      operation: 'i2c.open',
    });
    expect(port.open).toHaveBeenCalledTimes(1);
  });

  it('returns error when writeByte target is not open', async () => {
    const port = createI2cPortMock(1);
    const { registry } = createRegistryWithI2cPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'i2c.writeByte',
        payload: { portNumber: 1, slaveAddress: 0x48, value: 0x00 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));

    expect(decodeProtocolMessage(messages[0]!)).toMatchObject({
      kind: 'response',
      requestId: 1,
      ok: false,
      operation: 'i2c.writeByte',
      error: {
        code: 'InvalidAccess',
        message:
          'I2C device 72 on port 1 is not open in this session',
      },
    });
  });

  it('rejects I2C operations other than open and writeByte', async () => {
    const port = createI2cPortMock(1);
    const { registry } = createRegistryWithI2cPort(port);
    registry.create();
    const handler = createGpioProtocolMessageHandler(registry);
    const { socket, messages } = createSocketMock();

    handler(
      socket,
      encodeProtocolMessage({
        kind: 'request',
        requestId: 1,
        operation: 'i2c.readByte',
        payload: { portNumber: 1, slaveAddress: 0x48 },
      }),
      'session-1'
    );
    await vi.waitFor(() => expect(messages.length).toBe(1));

    expect(decodeProtocolMessage(messages[0]!)).toMatchObject({
      kind: 'response',
      requestId: 1,
      ok: false,
      operation: 'i2c.readByte',
      error: {
        code: 'InvalidArgument',
        message: 'Unsupported protocol operation: i2c.readByte',
      },
    });
    expect(port.open).not.toHaveBeenCalled();
  });
});
