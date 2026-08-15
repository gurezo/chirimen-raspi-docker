/** LED Blink が使う GPIO port（BCM 番号）。回路仕様は `../gpio-led-blink.md` */
const LED_GPIO_PORT = 26;

/** hello-real-world / 旧 LEDblink と同じ点滅間隔（ms） */
const LED_BLINK_INTERVAL_MS = 1000;

let running = true;

/**
 * Browser Polyfill の `navigator.requestGPIOAccess` で GPIO26 を点滅させる。
 *
 * 旧 CHIRIMEN LEDblink と同じ API flow:
 * requestGPIOAccess → ports.get(26) → export('out') → write(1/0)
 *
 * 画面離脱時は pagehide で write(0) → unexport する。
 */
async function main() {
  const gpioAccess = await navigator.requestGPIOAccess();
  const port = gpioAccess.ports.get(LED_GPIO_PORT);
  if (port === undefined) {
    throw new Error(`GPIO port ${LED_GPIO_PORT} is not available`);
  }

  await port.export('out');

  const release = async () => {
    running = false;
    try {
      await port.write(0);
    } catch {
      // 離脱時は write 失敗でも unexport を続ける
    }
    try {
      await port.unexport();
    } catch {
      // 離脱時は best-effort
    }
  };

  window.addEventListener('pagehide', () => {
    void release();
  });

  while (running) {
    await port.write(1);
    await sleep(LED_BLINK_INTERVAL_MS);
    if (!running) {
      break;
    }
    await port.write(0);
    await sleep(LED_BLINK_INTERVAL_MS);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

void main().catch((error) => {
  const message = document.createElement('p');
  message.textContent =
    error instanceof Error ? error.message : 'LED Blink を開始できませんでした。';
  document.body.append(message);
});
