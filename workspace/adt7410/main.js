main();

async function main() {
  const headEl = document.getElementById("head");
  const errorEl = document.getElementById("error");

  try {
    const i2cAccess = await navigator.requestI2CAccess();
    const port = i2cAccess.ports.get(1);
    const device = await port.open(0x48);

    while (true) {
      try {
        const value = await readAdt7410Temperature(device);
        headEl.textContent = value.toFixed(2) + " ℃";
        errorEl.textContent = "";
      } catch (error) {
        headEl.textContent = "Measurement failure";
        errorEl.textContent =
          "ADT7410（0x48）を読めません。I2C 配線と Runtime を確認してください。 " +
          (error && error.message ? error.message : String(error));
      }
      await sleep(1000);
    }
  } catch (error) {
    headEl.textContent = "接続失敗";
    errorEl.textContent =
      "I2C に接続できません。Runtime（ws://localhost:33330/）と I2C1 / 0x48 を確認してください。 " +
      (error && error.message ? error.message : String(error));
  }
}

// 温度レジスタ 0x00 を MSB first で 2 byte 読む。既定 13-bit は 16-bit 左詰めなので /128。
async function readAdt7410Temperature(device) {
  await device.writeByte(0x00);
  const bytes = await device.readBytes(2);
  let raw = (bytes[0] << 8) | bytes[1];
  if (raw & 0x8000) {
    raw = raw - 0x10000;
  }
  return raw / 128;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}
