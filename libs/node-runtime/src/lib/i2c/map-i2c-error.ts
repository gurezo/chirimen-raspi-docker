import { ChirimenError, isChirimenError, toChirimenError } from 'core';
import { OperationError } from 'node-web-i2c';

/**
 * node-web-i2c の例外を ChirimenError へ変換する。
 */
export function mapI2cError(error: unknown): ChirimenError {
  if (isChirimenError(error)) {
    return error;
  }

  if (error instanceof OperationError) {
    return new ChirimenError('Operation', error.message, { cause: error });
  }

  return toChirimenError(error, 'I2C operation failed');
}
