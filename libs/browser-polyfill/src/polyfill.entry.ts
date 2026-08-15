/**
 * 旧 CHIRIMEN `polyfill.js` 相当の IIFE エントリ。
 * script tag で読み込むと navigator API と `installBrowserPolyfill` を登録する。
 */
import { attachScriptPolyfill } from './lib/script-polyfill.js';
import { installBrowserPolyfill } from './lib/navigator-polyfill.js';

attachScriptPolyfill();

export { installBrowserPolyfill };
