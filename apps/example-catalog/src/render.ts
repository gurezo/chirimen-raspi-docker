import {
  CATEGORY_FILTERS,
  DEVICE_DASHBOARD_URL,
  STATUS_FILTERS,
  canOpenRuntimeExample,
  deviceDescription,
  deviceImageUrl,
  deviceModel,
  runtimeExampleHref,
  type CatalogEntry,
  type CatalogFilters,
  type CatalogStatus,
  type CategoryFilter,
  type StatusFilter,
} from './catalog.js';

const STATUS_BADGE_CLASS: Record<CatalogStatus, string> = {
  legacy: 'bg-slate-100 text-slate-700',
  ported: 'bg-sky-100 text-sky-800',
  verified: 'bg-emerald-100 text-emerald-800',
};

const FILTER_BUTTON_BASE =
  'rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

const FILTER_BUTTON_ACTIVE = 'border-slate-900 bg-slate-900 text-white';
const FILTER_BUTTON_INACTIVE =
  'border-slate-300 bg-white text-slate-700 hover:border-slate-500';

const LINK_CLASS =
  'inline-flex items-center rounded-md text-sm font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

export const createExternalLink = (
  href: string,
  label: string
): HTMLAnchorElement => {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = LINK_CLASS;
  link.setAttribute('aria-label', `${label}（外部リンク）`);
  link.append(document.createTextNode(label));
  const mark = document.createElement('span');
  mark.className = 'ml-1 text-xs font-normal text-slate-500 no-underline';
  mark.textContent = '外部';
  mark.setAttribute('aria-hidden', 'true');
  link.append(mark);
  return link;
};

export const renderHeaderLinks = (parent: HTMLElement): void => {
  const nav = document.createElement('p');
  nav.className = 'mt-3';
  nav.append(createExternalLink(DEVICE_DASHBOARD_URL, 'Device Dashboard'));
  parent.append(nav);
};

const renderCardLinks = (
  parent: HTMLElement,
  entry: CatalogEntry,
  hostname: string
): void => {
  const actions = document.createElement('div');
  actions.className = 'mt-auto flex flex-wrap gap-x-3 gap-y-2 pt-3';

  if (entry.schematicUrl !== '') {
    actions.append(createExternalLink(entry.schematicUrl, '回路図'));
  }
  if (entry.legacyUrl !== '') {
    actions.append(createExternalLink(entry.legacyUrl, 'Legacy Example'));
  }
  if (canOpenRuntimeExample(entry)) {
    const run = document.createElement('a');
    run.href = runtimeExampleHref(entry.runtimeExamplePath, hostname);
    run.className = `${LINK_CLASS} font-semibold`;
    run.textContent = '実行';
    actions.append(run);
  }

  if (actions.childElementCount > 0) {
    parent.append(actions);
  }
};

const createFilterButton = (
  label: string,
  pressed: boolean,
  onSelect: () => void
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  button.className = `${FILTER_BUTTON_BASE} ${
    pressed ? FILTER_BUTTON_ACTIVE : FILTER_BUTTON_INACTIVE
  }`;
  button.addEventListener('click', onSelect);
  return button;
};

export const renderFilterGroup = (
  parent: HTMLElement,
  label: string,
  buttons: HTMLButtonElement[]
): void => {
  const group = document.createElement('div');
  group.className = 'flex flex-wrap gap-2';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  group.append(...buttons);
  parent.append(group);
};

export const renderFilters = (
  parent: HTMLElement,
  filters: CatalogFilters,
  onChange: (next: CatalogFilters) => void
): void => {
  parent.replaceChildren();

  const categoryButtons = CATEGORY_FILTERS.map((item) =>
    createFilterButton(item.label, filters.category === item.id, () => {
      onChange({ ...filters, category: item.id });
    })
  );
  const statusButtons = STATUS_FILTERS.map((item) =>
    createFilterButton(item.label, filters.status === item.id, () => {
      onChange({ ...filters, status: item.id });
    })
  );

  renderFilterGroup(parent, 'カテゴリ', categoryButtons);
  renderFilterGroup(parent, '状態', statusButtons);
};

const appendPiModels = (
  card: HTMLElement,
  models: string[]
): void => {
  if (models.length === 0) {
    return;
  }
  const pi = document.createElement('p');
  pi.className = 'mt-2 text-xs text-slate-500';
  pi.textContent = `ピン互換: Pi ${models.join(' / ')}`;
  card.append(pi);
};

export const renderExampleCard = (entry: CatalogEntry): HTMLElement => {
  const card = document.createElement('article');
  card.className =
    'flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm';
  card.dataset.exampleId = entry.id;
  card.dataset.status = entry.catalogStatus;

  const imageUrl = deviceImageUrl(entry.certifiedDevice);
  if (imageUrl !== '') {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = deviceModel(entry.certifiedDevice) || entry.device || entry.title;
    image.className = 'h-36 w-full object-contain bg-slate-50 p-3';
    image.addEventListener('error', () => {
      image.remove();
    });
    card.append(image);
  }

  const body = document.createElement('div');
  body.className = 'flex flex-1 flex-col gap-2 p-4';

  const badge = document.createElement('span');
  badge.className = `inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[entry.catalogStatus]}`;
  badge.textContent = entry.catalogStatus;

  const title = document.createElement('h2');
  title.className = 'text-base font-semibold text-slate-900';
  title.textContent = entry.title;

  body.append(badge, title);

  if (entry.device !== '') {
    const deviceLabel = document.createElement('p');
    deviceLabel.className = 'text-sm text-slate-600';
    deviceLabel.textContent = entry.device;
    body.append(deviceLabel);
  }

  const model = deviceModel(entry.certifiedDevice);
  if (model !== '' && model !== entry.device) {
    const modelEl = document.createElement('p');
    modelEl.className = 'text-sm text-slate-600';
    modelEl.textContent = model;
    body.append(modelEl);
  }

  const description = deviceDescription(entry.certifiedDevice);
  if (description !== '') {
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'text-sm text-slate-500';
    descriptionEl.textContent = description;
    body.append(descriptionEl);
  }

  if (entry.notes !== '') {
    const notes = document.createElement('p');
    notes.className = 'text-xs text-slate-500';
    notes.textContent = entry.notes;
    body.append(notes);
  }

  appendPiModels(body, entry.supportedRaspberryPi);
  renderCardLinks(body, entry, window.location.hostname || '127.0.0.1');
  card.append(body);
  return card;
};

export const renderCatalogCards = (
  parent: HTMLElement,
  entries: CatalogEntry[]
): void => {
  parent.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-sm text-slate-500';
    empty.textContent = '条件に一致する Example はありません。';
    parent.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';
  for (const entry of entries) {
    list.append(renderExampleCard(entry));
  }
  parent.append(list);
};

export type { CategoryFilter, StatusFilter };
