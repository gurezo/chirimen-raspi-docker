import { ChirimenError, isChirimenError, toChirimenError } from 'core';
import { InvalidAccessError, OperationError } from 'node-web-gpio';

/**
 * node-web-gpio の例外を ChirimenError へ変換する。
 */
export function mapGpioError(error: unknown): ChirimenError {
  if (isChirimenError(error)) {
    return error;
  }

  if (error instanceof InvalidAccessError) {
    return new ChirimenError('InvalidAccess', error.message, { cause: error });
  }

  if (error instanceof OperationError) {
    return new ChirimenError('Operation', error.message, { cause: error });
  }

  return toChirimenError(error, 'GPIO operation failed');
}
