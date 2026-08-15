import {
  WEB_DEMO_TITLE,
  connectWebDemoRuntime,
  getConnectionStatusView,
  type ConnectionStatus,
} from './app.js';
import {
  DEMO_NAV_ITEMS,
  HOME_HREF,
  getDemoView,
  parseDemoRoute,
} from './navigation.js';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  const heading = document.createElement('h1');
  heading.textContent = WEB_DEMO_TITLE;

  const nav = document.createElement('nav');
  nav.className = 'demo-nav';
  nav.setAttribute('aria-label', 'GPIO / I2C demos');

  const navList = document.createElement('ul');
  navList.className = 'demo-nav__list';
  const navLinks = new Map<string, HTMLAnchorElement>();

  for (const item of DEMO_NAV_ITEMS) {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    link.className = 'demo-nav__link';
    navLinks.set(item.id, link);
    listItem.append(link);
    navList.append(listItem);
  }
  nav.append(navList);

  const statusSection = document.createElement('section');
  statusSection.className = 'connection-status';
  statusSection.setAttribute('aria-live', 'polite');
  statusSection.setAttribute('aria-label', 'Runtime connection status');

  const labelEl = document.createElement('p');
  labelEl.className = 'connection-status__label';

  const urlEl = document.createElement('p');
  urlEl.className = 'connection-status__url';

  const helpEl = document.createElement('div');
  helpEl.className = 'connection-status__help';

  statusSection.append(labelEl, urlEl, helpEl);

  const demoSection = document.createElement('section');
  demoSection.className = 'demo-view';
  demoSection.setAttribute('aria-live', 'polite');

  const demoTitle = document.createElement('h2');
  demoTitle.className = 'demo-view__title';

  const demoDescription = document.createElement('p');
  demoDescription.className = 'demo-view__description';

  const homeLink = document.createElement('a');
  homeLink.href = HOME_HREF;
  homeLink.textContent = 'Home に戻る';
  homeLink.className = 'demo-view__home';

  demoSection.append(demoTitle, demoDescription, homeLink);
  root.append(heading, nav, statusSection, demoSection);

  const applyRoute = (): void => {
    const routeId = parseDemoRoute(window.location.hash);
    const view = getDemoView(routeId);

    demoSection.dataset.route = routeId;
    demoTitle.textContent = view.title;
    demoTitle.hidden = view.title.length === 0;
    demoDescription.textContent = view.description;
    homeLink.hidden = !view.showHomeLink;

    for (const item of DEMO_NAV_ITEMS) {
      const link = navLinks.get(item.id);
      if (!link) {
        continue;
      }
      if (item.id === routeId) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  };

  const applyStatus = (status: ConnectionStatus): void => {
    const view = getConnectionStatusView(status);
    statusSection.dataset.status = status;
    labelEl.textContent = view.label;
    urlEl.textContent = `Runtime: ${view.url}`;
    helpEl.replaceChildren();
    if (view.helpLines.length === 0) {
      return;
    }
    const intro = document.createElement('p');
    intro.textContent = view.helpLines[0] ?? '';
    const list = document.createElement('ul');
    for (const line of view.helpLines.slice(1)) {
      const item = document.createElement('li');
      item.textContent = line;
      list.append(item);
    }
    helpEl.append(intro, list);
  };

  applyRoute();
  window.addEventListener('hashchange', applyRoute);

  applyStatus('disconnected');
  void connectWebDemoRuntime({
    onStatus: applyStatus,
  });
}
