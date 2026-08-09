/** Chirimen runtime / hardware エラーの種別 */
export type ChirimenErrorCode =
  | 'InvalidAccess'
  | 'InvalidArgument'
  | 'DeviceUnavailable'
  | 'PermissionDenied'
  | 'ResourceBusy'
  | 'Operation'
  | 'Unknown';

const CHIRIMEN_ERROR_CODES: readonly ChirimenErrorCode[] = [
  'InvalidAccess',
  'InvalidArgument',
  'DeviceUnavailable',
  'PermissionDenied',
  'ResourceBusy',
  'Operation',
  'Unknown',
] as const;

/** `value` が ChirimenErrorCode かどうか */
export function isChirimenErrorCode(value: unknown): value is ChirimenErrorCode {
  return (
    typeof value === 'string' &&
    (CHIRIMEN_ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * ドメイン横断で扱うハードウェア／ランタイムエラー。
 * Node 固有の例外をここに正規化する。
 */
export class ChirimenError extends Error {
  readonly code: ChirimenErrorCode;

  constructor(
    code: ChirimenErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ChirimenError';
    this.code = code;
  }
}

/** `value` が ChirimenError かどうか */
export function isChirimenError(value: unknown): value is ChirimenError {
  return value instanceof ChirimenError;
}

/**
 * 未知の例外を ChirimenError へ正規化する。
 * 既に ChirimenError ならそのまま返す。
 */
export function toChirimenError(
  error: unknown,
  fallbackMessage = 'Unknown error'
): ChirimenError {
  if (error instanceof ChirimenError) {
    return error;
  }

  if (error instanceof Error) {
    return new ChirimenError('Unknown', error.message || fallbackMessage, {
      cause: error,
    });
  }

  return new ChirimenError('Unknown', fallbackMessage, { cause: error });
}
