import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  DEVICE_FETCH_WARNING,
  buildCatalogEntries,
  deriveCatalogStatus,
  findCertifiedDevice,
  loadCertifiedDevices,
  parseDevicesPayload,
  readInventoryExamples,
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
