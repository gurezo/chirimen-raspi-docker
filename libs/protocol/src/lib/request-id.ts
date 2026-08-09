/**
 * request / response の相関 ID。
 * 旧 polyfill の session カウンタ相当。wire 上は整数 `0`–`0xffff`（#34）。
 */
export type RequestId = number;
