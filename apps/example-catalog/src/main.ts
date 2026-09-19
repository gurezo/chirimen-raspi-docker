import { CATALOG_TITLE } from './constants.js';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  const heading = document.createElement('h1');
  heading.className = 'text-2xl font-semibold text-slate-900';
  heading.textContent = CATALOG_TITLE;

  const main = document.createElement('main');
  main.className = 'mx-auto max-w-6xl px-4 py-8';
  main.append(heading);
  root.append(main);
}
