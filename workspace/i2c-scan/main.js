// プログラムの本体となる関数です。await で扱えるよう全体を async 関数で宣言します。
async function main() {
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("addresses");

  // 非同期関数は await を付けて呼び出します。
  const i2cAccess = await navigator.requestI2CAccess(); // I2C を操作する
  const port = i2cAccess.ports.get(1); // bus 1 を走査する

  const found = [];
  // Runtime scanI2cPort / web-demo と同じ範囲。Public polyfill に scan API は無い。
  for (let addr = 0x03; addr <= 0x77; addr++) {
    try {
      const device = await port.open(addr);
      await device.writeByte(0x00); // probe。温度レジスタは読まない
      found.push(addr);
      renderAddresses(listEl, found);
    } catch {
      // 応答なし → 無視
    }
  }

  statusEl.textContent =
    found.length === 0 ? "0 件" : found.length + " 件";
}

function formatI2cSlaveAddress(addr) {
  return "0x" + addr.toString(16).padStart(2, "0");
}

function renderAddresses(listEl, addresses) {
  listEl.replaceChildren();
  for (const addr of addresses) {
    const item = document.createElement("li");
    item.textContent = formatI2cSlaveAddress(addr);
    listEl.appendChild(item);
  }
}

// 宣言した関数を実行します。このプログラムのエントリーポイントです。
main();
