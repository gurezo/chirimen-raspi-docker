import { ChirimenError, toChirimenErrorPayload } from 'core';
import type { GpioChangeEventHandler } from 'gpio';
import { isI2CPortNumber, isI2CSlaveAddress } from 'i2c';
import type { GpioSession, I2cSession } from 'node-runtime';
import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  isGpioProtocolOperation,
  isProtocolRequest,
  type ProtocolErrorResponse,
  type ProtocolOperation,
  type ProtocolRequest,
  type ProtocolSuccessResponse,
} from 'protocol';
import type { RawData, WebSocket } from 'ws';
import type { ClientSession } from './client-session.js';
import type { ClientSessionRegistry } from './client-session-registry.js';
import type { WebSocketMessageHandler } from './websocket-server.js';

type SessionSubscriptionMap = Map<number, GpioChangeEventHandler>;

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }
  return Buffer.from(data).toString('utf8');
}

function sendJson(socket: WebSocket, message: string): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(message);
  }
}

function errorResponse(
  request: Pick<ProtocolRequest, 'requestId' | 'operation'>,
  error: unknown
): ProtocolErrorResponse {
  return {
    kind: 'response',
    requestId: request.requestId,
    ok: false,
    operation: request.operation,
    error: toChirimenErrorPayload(error),
  };
}

function successResponse<Op extends ProtocolOperation>(
  request: ProtocolRequest<Op>,
  payload: ProtocolSuccessResponse<Op>['payload']
): ProtocolSuccessResponse<Op> {
  return {
    kind: 'response',
    requestId: request.requestId,
    ok: true,
    operation: request.operation,
    payload,
  };
}

function getSubscriptions(
  store: WeakMap<ClientSession, SessionSubscriptionMap>,
  session: ClientSession
): SessionSubscriptionMap {
  let map = store.get(session);
  if (!map) {
    map = new Map();
    store.set(session, map);
  }
  return map;
}

function isI2cScanProtocolOperation(
  operation: ProtocolOperation
): operation is 'i2c.open' | 'i2c.writeByte' {
  return operation === 'i2c.open' || operation === 'i2c.writeByte';
}

/**
 * ClientSessionRegistry を用いた GPIO / I2C Scan protocol request ハンドラを生成する。
 * I2C は Scan に必要な `i2c.open` / `i2c.writeByte` のみ routing する。
 */
export function createGpioProtocolMessageHandler(
  registry: ClientSessionRegistry
): WebSocketMessageHandler {
  const subscriptionsBySession = new WeakMap<
    ClientSession,
    SessionSubscriptionMap
  >();

  return (socket, data, sessionId) => {
    void handleProtocolMessage(
      registry,
      subscriptionsBySession,
      socket,
      data,
      sessionId
    );
  };
}

async function handleProtocolMessage(
  registry: ClientSessionRegistry,
  subscriptionsBySession: WeakMap<ClientSession, SessionSubscriptionMap>,
  socket: WebSocket,
  data: RawData,
  sessionId: string
): Promise<void> {
  let request: ProtocolRequest | undefined;

  try {
    const message = decodeProtocolMessage(rawDataToString(data));
    if (!isProtocolRequest(message)) {
      console.error(
        `[ protocol ] session=${sessionId} ignored non-request message`
      );
      return;
    }
    request = message;

    if (
      !isGpioProtocolOperation(request.operation) &&
      !isI2cScanProtocolOperation(request.operation)
    ) {
      sendJson(
        socket,
        encodeProtocolMessage(
          errorResponse(
            request,
            new ChirimenError(
              'InvalidArgument',
              `Unsupported protocol operation: ${request.operation}`
            )
          )
        )
      );
      return;
    }

    const session = registry.get(sessionId);
    if (!session) {
      sendJson(
        socket,
        encodeProtocolMessage(
          errorResponse(
            request,
            new ChirimenError(
              'DeviceUnavailable',
              `Unknown session: ${sessionId}`
            )
          )
        )
      );
      return;
    }

    const response = isGpioProtocolOperation(request.operation)
      ? await dispatchGpioRequest(
          session.gpio,
          request,
          socket,
          getSubscriptions(subscriptionsBySession, session)
        )
      : await dispatchI2cRequest(session.i2c, request);
    sendJson(socket, encodeProtocolMessage(response));
  } catch (error: unknown) {
    if (request) {
      sendJson(socket, encodeProtocolMessage(errorResponse(request, error)));
      return;
    }
    console.error(
      `[ protocol ] session=${sessionId} decode/handle failed`,
      error
    );
  }
}

async function dispatchGpioRequest(
  gpio: GpioSession,
  request: ProtocolRequest,
  socket: WebSocket,
  subscriptions: SessionSubscriptionMap
): Promise<ProtocolSuccessResponse | ProtocolErrorResponse> {
  try {
    switch (request.operation) {
      case 'gpio.export': {
        const { portNumber, direction } = request.payload as {
          portNumber: number;
          direction: 'in' | 'out';
        };
        await gpio.open(portNumber, direction);
        return successResponse(
          request as ProtocolRequest<'gpio.export'>,
          {}
        );
      }
      case 'gpio.read': {
        const { portNumber } = request.payload as { portNumber: number };
        const value = await gpio.getOpenedPort(portNumber).read();
        return successResponse(request as ProtocolRequest<'gpio.read'>, {
          value,
        });
      }
      case 'gpio.write': {
        const { portNumber, value } = request.payload as {
          portNumber: number;
          value: 0 | 1;
        };
        await gpio.getOpenedPort(portNumber).write(value);
        return successResponse(
          request as ProtocolRequest<'gpio.write'>,
          {}
        );
      }
      case 'gpio.unexport': {
        const { portNumber } = request.payload as { portNumber: number };
        subscriptions.delete(portNumber);
        await gpio.release(portNumber);
        return successResponse(
          request as ProtocolRequest<'gpio.unexport'>,
          {}
        );
      }
      case 'gpio.subscribe': {
        const { portNumber } = request.payload as { portNumber: number };
        const existing = subscriptions.get(portNumber);
        if (existing) {
          await gpio.unsubscribe(portNumber, existing);
        }

        const listener: GpioChangeEventHandler = (event) => {
          sendJson(
            socket,
            encodeProtocolMessage({
              kind: 'event',
              operation: 'gpio.onchange',
              payload: {
                portNumber: event.portNumber,
                value: event.value,
              },
            })
          );
        };

        await gpio.subscribe(portNumber, listener);
        subscriptions.set(portNumber, listener);
        return successResponse(
          request as ProtocolRequest<'gpio.subscribe'>,
          {}
        );
      }
      case 'gpio.unsubscribe': {
        const { portNumber } = request.payload as { portNumber: number };
        const listener = subscriptions.get(portNumber);
        await gpio.unsubscribe(portNumber, listener);
        subscriptions.delete(portNumber);
        return successResponse(
          request as ProtocolRequest<'gpio.unsubscribe'>,
          {}
        );
      }
      default:
        return errorResponse(
          request,
          new ChirimenError(
            'InvalidArgument',
            `Unsupported GPIO operation: ${String(request.operation)}`
          )
        );
    }
  } catch (error: unknown) {
    return errorResponse(request, error);
  }
}

async function dispatchI2cRequest(
  i2c: I2cSession,
  request: ProtocolRequest
): Promise<ProtocolSuccessResponse | ProtocolErrorResponse> {
  try {
    switch (request.operation) {
      case 'i2c.open': {
        const { portNumber, slaveAddress } = request.payload as {
          portNumber: number;
          slaveAddress: number;
        };
        if (
          isI2CPortNumber(portNumber) &&
          isI2CSlaveAddress(slaveAddress) &&
          i2c.isOpen(portNumber, slaveAddress)
        ) {
          return successResponse(request as ProtocolRequest<'i2c.open'>, {});
        }
        await i2c.open(portNumber, slaveAddress);
        return successResponse(request as ProtocolRequest<'i2c.open'>, {});
      }
      case 'i2c.writeByte': {
        const { portNumber, slaveAddress, value } = request.payload as {
          portNumber: number;
          slaveAddress: number;
          value: number;
        };
        await i2c
          .getOpenedDevice(portNumber, slaveAddress)
          .writeByte(value);
        return successResponse(
          request as ProtocolRequest<'i2c.writeByte'>,
          {}
        );
      }
      default:
        return errorResponse(
          request,
          new ChirimenError(
            'InvalidArgument',
            `Unsupported I2C operation: ${String(request.operation)}`
          )
        );
    }
  } catch (error: unknown) {
    return errorResponse(request, error);
  }
}
