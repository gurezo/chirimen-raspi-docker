import { LegacyFunctionId } from './legacy-function-ids.js';
import type {
  GpioProtocolEventOperation,
  GpioProtocolOperation,
} from './operations.js';

/**
 * GPIO protocol operation と Node Runtime / Domain の対応記述。
 * `libs/protocol` は gpio / node-runtime に依存しないため、対応は文字列で固定する。
 *
 * @see docs/architecture/protocol.md
 */
export interface GpioOperationRuntimeMapping {
  readonly operation: GpioProtocolOperation | GpioProtocolEventOperation;
  readonly legacyFunctionId: LegacyFunctionId | null;
  /** Node Runtime 側の対応（公開 API 名） */
  readonly nodeRuntime: string;
  /** Domain `GpioPort` 側の対応。Phase 5 待ちは null */
  readonly domainPort: string | null;
  /**
   * Browser 起点の request として扱うか。
   * event や server 専用 cleanup は false。
   */
  readonly browserRequest: boolean;
}

/**
 * GPIO protocol ↔ Node Runtime の 1:1 対応表。
 * `GpioSession.releaseAll()` は切断時 cleanup 専用のため含めない。
 */
export const GPIO_OPERATION_RUNTIME_MAPPINGS: readonly GpioOperationRuntimeMapping[] =
  [
    {
      operation: 'gpio.export',
      legacyFunctionId: LegacyFunctionId.GpioExport,
      nodeRuntime: 'GpioSession.open(portNumber, direction)',
      domainPort: 'export(direction)',
      browserRequest: true,
    },
    {
      operation: 'gpio.write',
      legacyFunctionId: LegacyFunctionId.GpioWrite,
      nodeRuntime: 'GpioPort.write(value) (session-open port)',
      domainPort: 'write(value)',
      browserRequest: true,
    },
    {
      operation: 'gpio.read',
      legacyFunctionId: LegacyFunctionId.GpioRead,
      nodeRuntime: 'GpioPort.read() (session-open port)',
      domainPort: 'read()',
      browserRequest: true,
    },
    {
      operation: 'gpio.unexport',
      legacyFunctionId: LegacyFunctionId.GpioUnexport,
      nodeRuntime: 'GpioSession.release(portNumber)',
      domainPort: 'unexport()',
      browserRequest: true,
    },
    {
      operation: 'gpio.subscribe',
      legacyFunctionId: null,
      nodeRuntime: 'Phase 5 (#40) GPIO event subscribe',
      domainPort: null,
      browserRequest: true,
    },
    {
      operation: 'gpio.unsubscribe',
      legacyFunctionId: null,
      nodeRuntime: 'Phase 5 (#40) GPIO event unsubscribe',
      domainPort: null,
      browserRequest: true,
    },
    {
      operation: 'gpio.onchange',
      legacyFunctionId: LegacyFunctionId.GpioOnChange,
      nodeRuntime: 'Phase 5 server→browser GPIO onchange event',
      domainPort: null,
      browserRequest: false,
    },
  ] as const;

const GPIO_LEGACY_TO_OPERATION: ReadonlyMap<
  LegacyFunctionId,
  GpioProtocolOperation | GpioProtocolEventOperation
> = new Map([
  [LegacyFunctionId.GpioExport, 'gpio.export'],
  [LegacyFunctionId.GpioWrite, 'gpio.write'],
  [LegacyFunctionId.GpioRead, 'gpio.read'],
  [LegacyFunctionId.GpioUnexport, 'gpio.unexport'],
  [LegacyFunctionId.GpioOnChange, 'gpio.onchange'],
]);

/** Legacy GPIO function id から protocol operation（または event）へ変換する */
export function gpioOperationFromLegacyFunctionId(
  functionId: LegacyFunctionId
): GpioProtocolOperation | GpioProtocolEventOperation | undefined {
  return GPIO_LEGACY_TO_OPERATION.get(functionId);
}

/** protocol GPIO operation / event から Legacy function id を返す（subscribe 系は null） */
export function legacyFunctionIdFromGpioOperation(
  operation: GpioProtocolOperation | GpioProtocolEventOperation
): LegacyFunctionId | null {
  const mapping = GPIO_OPERATION_RUNTIME_MAPPINGS.find(
    (entry) => entry.operation === operation
  );
  return mapping?.legacyFunctionId ?? null;
}
