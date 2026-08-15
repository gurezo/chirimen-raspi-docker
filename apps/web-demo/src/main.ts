import { WEB_DEMO_TITLE, installWebDemoPolyfill } from './app.js';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  const heading = document.createElement('h1');
  heading.textContent = WEB_DEMO_TITLE;
  root.append(heading);
}

void installWebDemoPolyfill().catch((error: unknown) => {
  console.error('Failed to install Browser Polyfill', error);
});
