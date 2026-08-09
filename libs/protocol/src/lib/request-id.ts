/**
 * request / response の相関 ID。
 * 旧 polyfill の session カウンタ相当。wire 表現（0..0xffff など）は #34 で確定する。
 */
export type RequestId = number;
