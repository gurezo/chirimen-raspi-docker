main();

async function main() {
  const temperatureDisplay = document.getElementById("temperatureDisplay");
  const humidityDisplay = document.getElementById("humidityDisplay");
  const errorEl = document.getElementById("error");

  try {
    const i2cAccess = await navigator.requestI2CAccess();
    const port = i2cAccess.ports.get(1);
    const device = await port.open(0x44);

    while (true) {
      try {
        const reading = await readSht30(device);
        temperatureDisplay.textContent = reading.temperature.toFixed(2) + " ℃";
        humidityDisplay.textContent = reading.humidity.toFixed(2) + " %";
        errorEl.textContent = "";
      } catch (error) {
        errorEl.textContent =
          "SHT30（0x44）を読めません。I2C 配線と Runtime を確認してください。 " +
          (error && error.message ? error.message : String(error));
      }
      await sleep(500);
    }
  } catch (error) {
    errorEl.textContent =
      "I2C に接続できません。Runtime（ws://localhost:33330/）と I2C1 / 0x44 を確認してください。 " +
      (error && error.message ? error.message : String(error));
  }
}

// High repeatability, clock stretching 無しのワンショット（0x2C 0x06）。
async function readSht30(device) {
  await device.writeBytes([0x2c, 0x06]);
  await sleep(20);
  const data = await device.readBytes(6);
  const rawTemp = (data[0] << 8) | data[1];
  const rawHumidity = (data[3] << 8) | data[4];
  return {
    temperature: -45 + (175 * rawTemp) / 65535,
    humidity: (100 * rawHumidity) / 65535,
  };
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}
