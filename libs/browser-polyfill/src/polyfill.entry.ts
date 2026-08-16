/**
 * 旧 CHIRIMEN `polyfill.js` 相当の IIFE エントリ。
 * script tag で読み込むと navigator API と `installBrowserPolyfill` を登録する。
 */
import { attachScriptPolyfill } from './lib/polyfill/script.js';
import { installBrowserPolyfill } from './lib/polyfill/navigator.js';

attachScriptPolyfill();

export { installBrowserPolyfill };
