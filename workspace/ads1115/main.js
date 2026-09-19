main();

async function main() {
  const rawData = [];
  const voltage = [];
  for (let i = 0; i < 4; i++) {
    rawData[i] = document.getElementById("rawData" + i);
    voltage[i] = document.getElementById("voltage" + i);
  }
  const errorEl = document.getElementById("error");

  try {
    const i2cAccess = await navigator.requestI2CAccess();
    const port = i2cAccess.ports.get(1);
    const device = await port.open(0x48);

    while (true) {
      try {
        for (let channel = 0; channel < 4; channel++) {
          const value = await readAds1115Channel(device, channel);
          rawData[channel].textContent =
            "ch" + channel + ":" + (value < 0 ? "-" : "") +
            Math.abs(value).toString(16);
          voltage[channel].textContent = ads1115Voltage(value).toFixed(4) + "V";
        }
        errorEl.textContent = "";
      } catch (error) {
        errorEl.textContent =
          "ADS1115（0x48）を読めません。I2C 配線と Runtime を確認してください。ADT7410 と同じ 0x48 のため同時接続できません。 " +
          (error && error.message ? error.message : String(error));
      }
      await sleep(100);
    }
  } catch (error) {
    errorEl.textContent =
      "I2C に接続できません。Runtime（ws://localhost:33330/）と I2C1 / 0x48 を確認してください。 " +
      (error && error.message ? error.message : String(error));
  }
}

// Single-shot / AIN-GND / PGA ±4.096 V / 128 SPS。config と conversion は MSB first。
async function readAds1115Channel(device, channel) {
  const mux = 0x04 | (channel & 0x03);
  const config = 0x8000 | (mux << 12) | (0x01 << 9) | 0x0100 | (0x04 << 5) | 0x03;
  await device.writeBytes([0x01, (config >> 8) & 0xff, config & 0xff]);
  await sleep(10);
  await device.writeByte(0x00);
  const bytes = await device.readBytes(2);
  let raw = (bytes[0] << 8) | bytes[1];
  if (raw & 0x8000) {
    raw = raw - 0x10000;
  }
  return raw;
}

function ads1115Voltage(raw) {
  return (raw * 4.096) / 32768;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}
