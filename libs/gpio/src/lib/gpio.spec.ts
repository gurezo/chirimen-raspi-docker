import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isGpioDirection,
  isGpioEdge,
  isGpioPortNumber,
  isGpioValue,
  type GpioAccess,
  type GpioDirection,
  type GpioPort,
  type GpioValue,
} from '../index.js';

describe('gpio domain guards', () => {
  it('accepts valid directions', () => {
    expect(isGpioDirection('in')).toBe(true);
    expect(isGpioDirection('out')).toBe(true);
    expect(isGpioDirection('up')).toBe(false);
  });

  it('accepts valid values', () => {
    expect(isGpioValue(0)).toBe(true);
    expect(isGpioValue(1)).toBe(true);
    expect(isGpioValue(2)).toBe(false);
  });

  it('accepts valid edges', () => {
    expect(isGpioEdge('none')).toBe(true);
    expect(isGpioEdge('rising')).toBe(true);
    expect(isGpioEdge('falling')).toBe(true);
    expect(isGpioEdge('both')).toBe(true);
    expect(isGpioEdge('high')).toBe(false);
  });

  it('accepts non-negative integer port numbers', () => {
    expect(isGpioPortNumber(0)).toBe(true);
    expect(isGpioPortNumber(26)).toBe(true);
    expect(isGpioPortNumber(-1)).toBe(false);
    expect(isGpioPortNumber(1.5)).toBe(false);
  });
});

describe('GpioPort contract', () => {
  it('supports export, write, read, and unexport via a mock port', async () => {
    const port = createMockGpioPort(26);

    await port.export('out');
    expect(port.exported).toBe(true);
    expect(port.direction).toBe('out');

    await port.write(1);
    expect(await port.read()).toBe(1);

    await port.unexport();
    expect(port.exported).toBe(false);
  });
});

describe('GpioAccess contract', () => {
  it('unexports all ports', async () => {
    const portA = createMockGpioPort(17);
    const portB = createMockGpioPort(27);
    await portA.export('out');
    await portB.export('in');

    const access: GpioAccess = {
      ports: new Map([
        [17, portA],
        [27, portB],
      ]),
      async unexportAll() {
        await Promise.all(
          [...this.ports.values()].map((port) =>
            port.exported ? port.unexport() : Promise.resolve()
          )
        );
      },
    };

    await access.unexportAll();
    expect(portA.exported).toBe(false);
    expect(portB.exported).toBe(false);
  });
});

describe('gpio package independence', () => {
  it('does not depend on Node hardware libraries', () => {
    const packageJsonPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../package.json'
    );
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const dependencyNames = Object.keys(pkg.dependencies ?? {});

    expect(dependencyNames).not.toContain('node-web-gpio');
    expect(dependencyNames).not.toContain('onoff');
    expect(dependencyNames).toEqual(['tslib']);
  });
});

function createMockGpioPort(portNumber: number): GpioPort {
  let exported = false;
  let direction: GpioDirection = 'in';
  let value: GpioValue = 0;

  return {
    portNumber,
    get portName() {
      return `gpio${portNumber}`;
    },
    get pinName() {
      return '';
    },
    get exported() {
      return exported;
    },
    get direction() {
      return direction;
    },
    async export(nextDirection) {
      direction = nextDirection;
      exported = true;
    },
    async unexport() {
      exported = false;
    },
    async read() {
      return value;
    },
    async write(nextValue) {
      value = nextValue;
    },
  };
}
