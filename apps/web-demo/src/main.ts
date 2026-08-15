import { isChirimenError } from 'core';
import {
  WEB_DEMO_TITLE,
  connectWebDemoRuntime,
  getConnectionStatusView,
  type ConnectionStatus,
} from './app.js';
import {
  bindGpioInputCleanup,
  shouldStopGpioInputOnRoute,
} from './gpio-input-cleanup.js';
import { GpioInputSession } from './gpio-input.js';
import {
  bindLedBlinkCleanup,
  shouldStopLedBlinkOnRoute,
} from './gpio-led-blink-cleanup.js';
import { LedBlinkSession } from './gpio-led-blink.js';
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

  const blinkControls = document.createElement('div');
  blinkControls.className = 'led-blink';
  blinkControls.hidden = true;

  const blinkButtons = document.createElement('div');
  blinkButtons.className = 'led-blink__controls';

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.textContent = 'Start';

  const stopButton = document.createElement('button');
  stopButton.type = 'button';
  stopButton.textContent = 'Stop';

  blinkButtons.append(startButton, stopButton);

  const blinkStatus = document.createElement('p');
  blinkStatus.className = 'led-blink__status';

  const blinkError = document.createElement('p');
  blinkError.className = 'led-blink__error';

  blinkControls.append(blinkButtons, blinkStatus, blinkError);

  const inputControls = document.createElement('div');
  inputControls.className = 'gpio-input';
  inputControls.hidden = true;

  const inputButtons = document.createElement('div');
  inputButtons.className = 'gpio-input__controls';

  const inputStartButton = document.createElement('button');
  inputStartButton.type = 'button';
  inputStartButton.textContent = 'Start';

  const inputReadButton = document.createElement('button');
  inputReadButton.type = 'button';
  inputReadButton.textContent = 'Read';

  const inputStopButton = document.createElement('button');
  inputStopButton.type = 'button';
  inputStopButton.textContent = 'Stop';

  inputButtons.append(inputStartButton, inputReadButton, inputStopButton);

  const inputStatus = document.createElement('p');
  inputStatus.className = 'gpio-input__status';

  const inputError = document.createElement('p');
  inputError.className = 'gpio-input__error';

  inputControls.append(inputButtons, inputStatus, inputError);
  demoSection.append(
    demoTitle,
    demoDescription,
    blinkControls,
    inputControls,
    homeLink
  );
  root.append(heading, nav, statusSection, demoSection);

  let connectionStatus: ConnectionStatus = 'disconnected';
  const blinkSession = new LedBlinkSession({
    onValue: () => {
      applyBlinkUi();
    },
  });
  const inputSession = new GpioInputSession({
    onValue: () => {
      applyInputUi();
    },
  });
  const statusListeners = new Set<(status: ConnectionStatus) => void>();

  const applyBlinkUi = (): void => {
    const onGpioOutput =
      parseDemoRoute(window.location.hash) === 'gpio-output';
    blinkControls.hidden = !onGpioOutput;
    startButton.disabled =
      !onGpioOutput ||
      connectionStatus !== 'connected' ||
      blinkSession.running ||
      blinkSession.starting;
    stopButton.disabled =
      !onGpioOutput || (!blinkSession.running && !blinkSession.starting);
    if (blinkSession.running) {
      blinkStatus.textContent = blinkSession.value === 1 ? '点灯' : '消灯';
    } else {
      blinkStatus.textContent = '停止中';
    }
  };

  const stopBlink = (): Promise<void> => {
    blinkError.textContent = '';
    return blinkSession.stop().then(() => {
      applyBlinkUi();
    });
  };

  const applyInputUi = (): void => {
    const onGpioInput =
      parseDemoRoute(window.location.hash) === 'gpio-input';
    inputControls.hidden = !onGpioInput;
    inputStartButton.disabled =
      !onGpioInput ||
      connectionStatus !== 'connected' ||
      inputSession.running ||
      inputSession.starting;
    inputReadButton.disabled = !onGpioInput || !inputSession.running;
    inputStopButton.disabled =
      !onGpioInput || (!inputSession.running && !inputSession.starting);
    if (inputSession.running) {
      inputStatus.textContent = String(inputSession.value);
    } else {
      inputStatus.textContent = '停止中';
    }
  };

  const stopInput = (): Promise<void> => {
    inputError.textContent = '';
    return inputSession.stop().then(() => {
      applyInputUi();
    });
  };

  const applyRoute = (): void => {
    const routeId = parseDemoRoute(window.location.hash);
    const view = getDemoView(routeId);

    if (shouldStopLedBlinkOnRoute(routeId)) {
      void stopBlink();
    }

    if (shouldStopGpioInputOnRoute(routeId)) {
      void stopInput();
    }

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

    applyBlinkUi();
    applyInputUi();
  };

  const applyStatus = (status: ConnectionStatus): void => {
    connectionStatus = status;
    const view = getConnectionStatusView(status);
    statusSection.dataset.status = status;
    labelEl.textContent = view.label;
    urlEl.textContent = `Runtime: ${view.url}`;
    helpEl.replaceChildren();
    applyBlinkUi();
    applyInputUi();
    for (const listener of statusListeners) {
      listener(status);
    }
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

  startButton.addEventListener('click', () => {
    blinkError.textContent = '';
    void blinkSession.start().then(
      () => {
        applyBlinkUi();
      },
      (error: unknown) => {
        blinkError.textContent = isChirimenError(error)
          ? error.message
          : 'LED Blink を開始できませんでした。';
        applyBlinkUi();
      }
    );
    applyBlinkUi();
  });

  stopButton.addEventListener('click', () => {
    void stopBlink();
    applyBlinkUi();
  });

  inputStartButton.addEventListener('click', () => {
    inputError.textContent = '';
    void inputSession.start().then(
      () => {
        applyInputUi();
      },
      (error: unknown) => {
        inputError.textContent = isChirimenError(error)
          ? error.message
          : 'GPIO Input を開始できませんでした。';
        applyInputUi();
      }
    );
    applyInputUi();
  });

  inputReadButton.addEventListener('click', () => {
    inputError.textContent = '';
    void inputSession.readValue().then(
      () => {
        applyInputUi();
      },
      (error: unknown) => {
        inputError.textContent = isChirimenError(error)
          ? error.message
          : 'GPIO Input を読み取れませんでした。';
        applyInputUi();
      }
    );
  });

  inputStopButton.addEventListener('click', () => {
    void stopInput();
    applyInputUi();
  });

  applyRoute();
  window.addEventListener('hashchange', applyRoute);

  bindLedBlinkCleanup({
    stop: stopBlink,
    getRoute: () => parseDemoRoute(window.location.hash),
    addStatusListener: (listener) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
  });

  bindGpioInputCleanup({
    stop: stopInput,
    getRoute: () => parseDemoRoute(window.location.hash),
    addStatusListener: (listener) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
  });

  applyStatus('disconnected');
  void connectWebDemoRuntime({
    onStatus: applyStatus,
  });
}
