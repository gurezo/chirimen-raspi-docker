main();

async function main() {
  const gpioAccess = await navigator.requestGPIOAccess();
  const ledPort = gpioAccess.ports.get(26); // LEDの付いているポート
  await ledPort.export("out");
  const switchPort = gpioAccess.ports.get(5); // タクトスイッチの付いているポート
  await switchPort.export("in");
  switchPort.onchange = function (event) {
    // スイッチはPullupで離すと1なので反転させる
    // 旧 CHIRIMEN は val そのもの。本 Runtime は { value, portNumber }
    const val = event.value;
    ledPort.write(val === 0 ? 1 : 0);
  };
}
