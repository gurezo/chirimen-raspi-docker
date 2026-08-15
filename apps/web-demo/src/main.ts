import {
  WEB_DEMO_TITLE,
  connectWebDemoRuntime,
  getConnectionStatusView,
  type ConnectionStatus,
} from './app.js';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  const heading = document.createElement('h1');
  heading.textContent = WEB_DEMO_TITLE;

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
  root.append(heading, statusSection);

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

  applyStatus('disconnected');
  void connectWebDemoRuntime({
    onStatus: applyStatus,
  });
}
