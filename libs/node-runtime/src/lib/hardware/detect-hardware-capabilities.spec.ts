import { describe, expect, it } from 'vitest';
import {
  classifyHardwareCapabilities,
  detectHardwareCapabilities,
  probeHardwarePaths,
  type HardwareProbeFs,
} from './detect-hardware-capabilities.js';

function createFsMock(options: {
  paths?: Record<string, boolean>;
  devEntries?: string[];
  throwOnExists?: boolean;
  throwOnReaddir?: boolean;
}): HardwareProbeFs {
  const paths = options.paths ?? {};
  const devEntries = options.devEntries ?? [];

  return {
    existsSync(path: string): boolean {
      if (options.throwOnExists) {
        throw new Error('existsSync failed');
      }
      if (path in paths) {
        return paths[path] ?? false;
      }
      if (path === '/dev') {
        return true;
      }
      return false;
    },
    readdirSync(path: string): string[] {
      if (options.throwOnReaddir) {
        throw new Error('readdirSync failed');
      }
      if (path === '/dev') {
        return [...devEntries];
      }
      return [];
    },
  };
}

describe('probeHardwarePaths', () => {
  it('probes sysfs, gpiomem*, gpiochip*, and i2c-1', () => {
    const findings = probeHardwarePaths(
      createFsMock({
        paths: {
          '/sys/class/gpio': true,
          '/dev/i2c-1': true,
          '/dev': true,
        },
        devEntries: ['gpiomem', 'gpiochip0', 'null'],
      })
    );

    expect(findings).toEqual({
      sysfsGpio: true,
      gpiomemDevices: ['/dev/gpiomem'],
      gpiochipDevices: ['/dev/gpiochip0'],
      i2cDev: true,
    });
  });

  it('returns empty findings when paths are missing', () => {
    const findings = probeHardwarePaths(
      createFsMock({
        paths: { '/dev': false },
        devEntries: [],
      })
    );

    expect(findings).toEqual({
      sysfsGpio: false,
      gpiomemDevices: [],
      gpiochipDevices: [],
      i2cDev: false,
    });
  });
});

describe('classifyHardwareCapabilities', () => {
  it('prefers sysfs over gpiochip', () => {
    expect(
      classifyHardwareCapabilities({
        sysfsGpio: true,
        gpiomemDevices: ['/dev/gpiomem'],
        gpiochipDevices: ['/dev/gpiochip0'],
        i2cDev: true,
      })
    ).toEqual({
      gpio: { backend: 'sysfs' },
      i2c: { backend: 'i2c-dev' },
    });
  });

  it('selects gpiochip when sysfs is absent', () => {
    expect(
      classifyHardwareCapabilities({
        sysfsGpio: false,
        gpiomemDevices: [],
        gpiochipDevices: ['/dev/gpiochip0'],
        i2cDev: false,
      })
    ).toEqual({
      gpio: { backend: 'gpiochip' },
      i2c: { backend: 'unavailable' },
    });
  });

  it('marks gpio unavailable when neither sysfs nor gpiochip exists', () => {
    expect(
      classifyHardwareCapabilities({
        sysfsGpio: false,
        gpiomemDevices: ['/dev/gpiomem'],
        gpiochipDevices: [],
        i2cDev: false,
      })
    ).toEqual({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });
  });
});

describe('detectHardwareCapabilities', () => {
  it('detects sysfs and i2c-dev backends', () => {
    expect(
      detectHardwareCapabilities(
        createFsMock({
          paths: {
            '/sys/class/gpio': true,
            '/dev/i2c-1': true,
            '/dev': true,
          },
          devEntries: ['gpiomem'],
        })
      )
    ).toEqual({
      gpio: { backend: 'sysfs' },
      i2c: { backend: 'i2c-dev' },
    });
  });

  it('detects gpiochip when only gpiochip devices exist', () => {
    expect(
      detectHardwareCapabilities(
        createFsMock({
          paths: { '/dev': true },
          devEntries: ['gpiochip0', 'gpiochip1'],
        })
      )
    ).toEqual({
      gpio: { backend: 'gpiochip' },
      i2c: { backend: 'unavailable' },
    });
  });

  it('returns unavailable when hardware paths are absent', () => {
    expect(
      detectHardwareCapabilities(
        createFsMock({
          paths: { '/dev': false },
        })
      )
    ).toEqual({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });
  });

  it('does not throw when existsSync fails', () => {
    expect(
      detectHardwareCapabilities(createFsMock({ throwOnExists: true }))
    ).toEqual({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });
  });

  it('does not throw when readdirSync fails', () => {
    expect(
      detectHardwareCapabilities(
        createFsMock({
          paths: { '/dev': true },
          throwOnReaddir: true,
        })
      )
    ).toEqual({
      gpio: { backend: 'unavailable' },
      i2c: { backend: 'unavailable' },
    });
  });
});
