import inventory from '@inventory';
import {
  buildCatalogEntries,
  loadCertifiedDevices,
  readInventoryExamples,
} from './catalog.js';
import { CATALOG_TITLE } from './constants.js';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  const heading = document.createElement('h1');
  heading.className = 'text-2xl font-semibold text-slate-900';
  heading.textContent = CATALOG_TITLE;

  const status = document.createElement('p');
  status.className = 'mt-2 text-sm text-slate-600';
  status.setAttribute('aria-live', 'polite');
  status.textContent = '読み込み中…';

  const warning = document.createElement('p');
  warning.className = 'mt-2 hidden rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900';
  warning.setAttribute('role', 'status');

  const main = document.createElement('main');
  main.className = 'mx-auto max-w-6xl px-4 py-8';
  main.append(heading, status, warning);
  root.append(main);

  const examples = readInventoryExamples(inventory);
  const entries = buildCatalogEntries(examples, []);
  status.textContent = `${String(entries.length)} 件の Example`;

  void loadCertifiedDevices(fetch).then((result) => {
    const joined = buildCatalogEntries(examples, result.devices);
    status.textContent = `${String(joined.length)} 件の Example`;
    if (result.warning) {
      warning.textContent = result.warning;
      warning.classList.remove('hidden');
    }
  });
}
