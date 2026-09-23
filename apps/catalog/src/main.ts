import inventory from '@inventory';
import {
  buildCatalogEntries,
  filterCatalogEntries,
  loadCertifiedDevices,
  readInventoryExamples,
  type CatalogEntry,
  type CatalogFilters,
} from './catalog.js';
import { CATALOG_TITLE } from './constants.js';
import {
  renderCatalogCards,
  renderFilters,
  renderHeaderLinks,
  renderRuntimeDiagnostics,
} from './render.js';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  const heading = document.createElement('h1');
  heading.className = 'text-2xl font-semibold text-slate-900';
  heading.textContent = CATALOG_TITLE;

  const lead = document.createElement('p');
  lead.className = 'mt-2 text-sm text-slate-600';
  lead.textContent =
    'Legacy CHIRIMEN Example と新 Runtime 向け Example の一覧です。';

  const headerLinks = document.createElement('div');
  renderHeaderLinks(headerLinks);

  const diagnostics = document.createElement('div');
  renderRuntimeDiagnostics(
    diagnostics,
    globalThis.location?.hostname || '127.0.0.1'
  );

  const warning = document.createElement('p');
  warning.className =
    'mt-3 hidden rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900';
  warning.setAttribute('role', 'status');

  const filterBar = document.createElement('div');
  filterBar.className = 'mt-6 flex flex-col gap-3';

  const count = document.createElement('p');
  count.className = 'mt-4 text-sm text-slate-600';
  count.setAttribute('aria-live', 'polite');

  const cards = document.createElement('div');
  cards.className = 'mt-4';

  const main = document.createElement('main');
  main.className = 'mx-auto max-w-6xl px-4 py-8';
  main.append(heading, lead, headerLinks, diagnostics, warning, filterBar, count, cards);
  root.append(main);

  const examples = readInventoryExamples(inventory);
  let entries: CatalogEntry[] = buildCatalogEntries(examples, []);
  let filters: CatalogFilters = { category: 'all', status: 'all' };

  const apply = (): void => {
    const visible = filterCatalogEntries(entries, filters);
    count.textContent = `${String(visible.length)} / ${String(entries.length)} 件`;
    renderFilters(filterBar, filters, (next) => {
      filters = next;
      apply();
    });
    renderCatalogCards(cards, visible);
  };

  apply();

  void loadCertifiedDevices(fetch).then((result) => {
    entries = buildCatalogEntries(examples, result.devices);
    if (result.warning) {
      warning.textContent = result.warning;
      warning.classList.remove('hidden');
    }
    apply();
  });
}
