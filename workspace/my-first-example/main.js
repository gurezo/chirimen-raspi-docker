async function main() {
  const gpioAccess = await navigator.requestGPIOAccess();
  const port = gpioAccess.ports.get(26);
  await port.export("out");

  while (true) {
    await port.write(1);
    await sleep(1000);
    await port.write(0);
    await sleep(1000);
  }
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

main();
