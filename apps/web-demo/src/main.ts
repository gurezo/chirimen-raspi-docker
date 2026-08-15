import { WEB_DEMO_TITLE } from './app.js';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  const heading = document.createElement('h1');
  heading.textContent = WEB_DEMO_TITLE;
  root.append(heading);
}
