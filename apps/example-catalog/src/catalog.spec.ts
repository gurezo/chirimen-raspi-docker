import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  DEVICE_FETCH_WARNING,
  buildCatalogEntries,
  canOpenRuntimeExample,
  deriveCatalogStatus,
  filterCatalogEntries,
  findCertifiedDevice,
  loadCertifiedDevices,
  parseDevicesPayload,
  readInventoryExamples,
  runtimeExampleHref,
} from './catalog.js';

const inventoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/examples/legacy-inventory.json'
);

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as unknown;

describe('deriveCatalogStatus', () => {
  it('maps ported + verified to verified', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'ported',
        verificationStatus: 'verified',
      })
    ).toBe('verified');
  });

  it('maps ported + unverified to ported', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'ported',
        verificationStatus: 'unverified',
      })
    ).toBe('ported');
  });

  it('treats empty portingStatus as legacy', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: '',
        verificationStatus: '',
      })
    ).toBe('legacy');
  });

  it('maps explicit legacy to legacy', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'legacy',
        verificationStatus: 'unverified',
      })
    ).toBe('legacy');
  });
});

describe('readInventoryExamples', () => {
  it('reads the bundled legacy inventory', () => {
    const examples = readInventoryExamples(inventory);
    expect(examples.length).toBe(62);
    expect(examples.find((example) => example.id === 'gpio-blink')).toMatchObject({
      deviceId: 'led',
      portingStatus: 'ported',
      verificationStatus: 'verified',
      runtimeExamplePath: 'workspace/led-blink/',
    });
  });

  it('returns an empty list for invalid payloads', () => {
    expect(readInventoryExamples(null)).toEqual([]);
    expect(readInventoryExamples({})).toEqual([]);
    expect(readInventoryExamples({ examples: [{ title: 'no-id' }] })).toEqual([]);
  });
});

describe('parseDevicesPayload / loadCertifiedDevices', () => {
  it('accepts version 1 devices', () => {
    const result = parseDevicesPayload({
      version: 1,
      devices: [
        { id: 'led', meta: { model: 'LED', image: 'https://example.test/led.png' } },
        { id: '' },
      ],
    });
    expect(result.warning).toBeNull();
    expect(result.devices).toEqual([
      { id: 'led', meta: { model: 'LED', image: 'https://example.test/led.png' } },
    ]);
  });

  it('falls back when version is not 1', () => {
    expect(parseDevicesPayload({ version: 2, devices: [] })).toEqual({
      devices: [],
      warning: DEVICE_FETCH_WARNING,
    });
  });

  it('falls back on network and HTTP errors', async () => {
    const failed = await loadCertifiedDevices(
      vi.fn(async () => {
        throw new Error('network');
      }) as unknown as typeof fetch
    );
    expect(failed).toEqual({ devices: [], warning: DEVICE_FETCH_WARNING });

    const httpError = await loadCertifiedDevices(
      vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    );
    expect(httpError).toEqual({ devices: [], warning: DEVICE_FETCH_WARNING });

    const empty = await loadCertifiedDevices(
      vi.fn(async () => new Response('', { status: 200 })) as unknown as typeof fetch
    );
    expect(empty).toEqual({ devices: [], warning: DEVICE_FETCH_WARNING });

    const notJson = await loadCertifiedDevices(
      vi.fn(
        async () => new Response('<html></html>', { status: 200 })
      ) as unknown as typeof fetch
    );
    expect(notJson).toEqual({ devices: [], warning: DEVICE_FETCH_WARNING });
  });
});

describe('Device join', () => {
  const examples = readInventoryExamples(inventory);
  const gpioBlink = examples.find((example) => example.id === 'gpio-blink');
  const i2cDetect = examples.find((example) => example.id === 'i2c-detect');

  it('joins on deviceId', () => {
    expect(gpioBlink).toBeDefined();
    expect(
      findCertifiedDevice(gpioBlink as (typeof examples)[number], [
        { id: 'led', meta: { model: 'LED' } },
      ])
    ).toEqual({ id: 'led', meta: { model: 'LED' } });
  });

  it('keeps Example-only cards when deviceId is empty or missing', () => {
    expect(i2cDetect?.deviceId).toBe('');
    expect(
      findCertifiedDevice(i2cDetect as (typeof examples)[number], [
        { id: 'led' },
      ])
    ).toBeNull();
    expect(
      findCertifiedDevice({ deviceId: 'missing' }, [{ id: 'led' }])
    ).toBeNull();
  });

  it('builds catalog entries from inventory even without devices', () => {
    const entries = buildCatalogEntries(examples, []);
    expect(entries).toHaveLength(62);
    expect(entries.every((entry) => entry.certifiedDevice === null)).toBe(true);
    expect(entries.find((entry) => entry.id === 'gpio-blink')?.catalogStatus).toBe(
      'verified'
    );
    expect(
      entries.find((entry) => entry.id === 'gpio-read-gpio-value')?.catalogStatus
    ).toBe('legacy');
  });
});

describe('filterCatalogEntries', () => {
  const entries = buildCatalogEntries(readInventoryExamples(inventory), []);

  it('filters GPIO examples', () => {
    const gpio = filterCatalogEntries(entries, {
      category: 'gpio',
      status: 'all',
    });
    expect(gpio.length).toBe(6);
    expect(gpio.every((entry) => entry.category === 'gpio')).toBe(true);
  });

  it('filters I2C examples', () => {
    const i2c = filterCatalogEntries(entries, {
      category: 'i2c',
      status: 'all',
    });
    expect(i2c.length).toBe(15);
    expect(i2c.every((entry) => entry.category === 'i2c')).toBe(true);
  });

  it('filters verified status', () => {
    const verified = filterCatalogEntries(entries, {
      category: 'all',
      status: 'verified',
    });
    expect(verified.map((entry) => entry.id).sort()).toEqual([
      'gpio-blink',
      'gpio-button',
      'i2c-detect',
    ]);
  });
});

describe('runtime example links', () => {
  const entries = buildCatalogEntries(readInventoryExamples(inventory), []);

  it('allows run links only for ported examples with a runtime path', () => {
    const blink = entries.find((entry) => entry.id === 'gpio-blink');
    const unread = entries.find((entry) => entry.id === 'gpio-read-gpio-value');
    expect(blink).toBeDefined();
    expect(unread).toBeDefined();
    expect(canOpenRuntimeExample(blink as (typeof entries)[number])).toBe(true);
    expect(canOpenRuntimeExample(unread as (typeof entries)[number])).toBe(
      false
    );
    expect(
      canOpenRuntimeExample({
        portingStatus: 'ported',
        runtimeExamplePath: '',
      })
    ).toBe(false);
    expect(
      canOpenRuntimeExample({
        portingStatus: 'legacy',
        runtimeExamplePath: 'workspace/led-blink/',
      })
    ).toBe(false);
  });

  it('resolves workspace paths to the Example server URL', () => {
    expect(runtimeExampleHref('workspace/led-blink/', '127.0.0.1')).toBe(
      'http://127.0.0.1:4173/led-blink/'
    );
    expect(runtimeExampleHref('workspace/i2c-scan/', '192.168.0.10')).toBe(
      'http://192.168.0.10:4173/i2c-scan/'
    );
  });
});
