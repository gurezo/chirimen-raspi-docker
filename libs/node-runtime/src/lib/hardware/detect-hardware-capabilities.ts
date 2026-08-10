import { existsSync, readdirSync } from 'node:fs';
import type { HardwareCapabilities } from 'core';

const SYSFS_GPIO_PATH = '/sys/class/gpio';
const I2C_DEV_PATH = '/dev/i2c-1';
const DEV_DIR = '/dev';

export interface HardwareProbeFs {
  existsSync(path: string): boolean;
  readdirSync(path: string): string[];
}

/** パス探査の生結果。backend 分類と startup 診断に使う。 */
export interface HardwareProbeFindings {
  sysfsGpio: boolean;
  gpiomemDevices: string[];
  gpiochipDevices: string[];
  i2cDev: boolean;
}

const defaultFs: HardwareProbeFs = {
  existsSync,
  readdirSync: (path) => readdirSync(path),
};

function listDevEntriesMatching(
  prefix: string,
  fs: HardwareProbeFs
): string[] {
  try {
    if (!fs.existsSync(DEV_DIR)) {
      return [];
    }
    return fs
      .readdirSync(DEV_DIR)
      .filter((name) => name.startsWith(prefix))
      .map((name) => `${DEV_DIR}/${name}`);
  } catch {
    return [];
  }
}

function pathExists(path: string, fs: HardwareProbeFs): boolean {
  try {
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

/**
 * Issue 指定パスを探査する。
 * `/sys/class/gpio`, `/dev/gpiomem*`, `/dev/gpiochip*`, `/dev/i2c-1`
 */
export function probeHardwarePaths(
  fs: HardwareProbeFs = defaultFs
): HardwareProbeFindings {
  return {
    sysfsGpio: pathExists(SYSFS_GPIO_PATH, fs),
    gpiomemDevices: listDevEntriesMatching('gpiomem', fs),
    gpiochipDevices: listDevEntriesMatching('gpiochip', fs),
    i2cDev: pathExists(I2C_DEV_PATH, fs),
  };
}

/**
 * 探査結果から GPIO / I2C backend を分類する。
 * GPIO 優先順位: sysfs → gpiochip → unavailable（親 Issue #96）
 */
export function classifyHardwareCapabilities(
  findings: HardwareProbeFindings
): HardwareCapabilities {
  let gpioBackend: HardwareCapabilities['gpio']['backend'] = 'unavailable';
  if (findings.sysfsGpio) {
    gpioBackend = 'sysfs';
  } else if (findings.gpiochipDevices.length > 0) {
    gpioBackend = 'gpiochip';
  }

  return {
    gpio: { backend: gpioBackend },
    i2c: { backend: findings.i2cDev ? 'i2c-dev' : 'unavailable' },
  };
}

/**
 * Raspberry Pi 上で利用可能な GPIO / I2C interface をパス探査で検出する。
 * Server 起動時に一度だけ呼び出す想定。ハードウェアが無い環境でも throw しない。
 */
export function detectHardwareCapabilities(
  fs: HardwareProbeFs = defaultFs
): HardwareCapabilities {
  return classifyHardwareCapabilities(probeHardwarePaths(fs));
}
