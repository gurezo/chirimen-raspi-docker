/**
 * request / response の相関 ID。
 * 旧 polyfill の session カウンタ相当。wire 上は整数 `0`–`0xffff`（#34）。
 */
export type RequestId = number;

/** `value` が RequestId（0–0xffff の整数）かどうか */
export function isRequestId(value: unknown): value is RequestId {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffff
  );
}
