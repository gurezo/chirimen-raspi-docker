main();

async function main() {
  const sensorEl = document.getElementById("sensor");
  const errorEl = document.getElementById("error");

  try {
    const gpioAccess = await navigator.requestGPIOAccess();
    const port = gpioAccess.ports.get(12);
    await port.export("in");
    sensorEl.textContent = "OFF";

    port.onchange = function (event) {
      // 旧 CHIRIMEN は val そのもの。本 Runtime は { value, portNumber }
      const val = event.value;
      sensorEl.textContent = val === 1 ? "ON" : "OFF";
    };
  } catch (error) {
    errorEl.textContent =
      "GPIO に接続できません。Runtime（ws://localhost:33330/）と配線を確認してください。 " +
      (error && error.message ? error.message : String(error));
  }
}
