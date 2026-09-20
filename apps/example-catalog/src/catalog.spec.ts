import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  DEVICE_FETCH_WARNING,
  EDITOR_WORKSPACE_FOLDER,
  NO_IMAGE_URL,
  REFERENCE_EXAMPLES,
  RUNTIME_DIAGNOSTICS_DOC_URL,
  RUNTIME_HEALTH_PORT,
  buildCatalogEntries,
  canOpenRuntimeExample,
  catalogCardActions,
  catalogImageUrl,
  deriveCatalogStatus,
  editorWorkspaceHref,
  emptyVerificationByModel,
  filterCatalogEntries,
  findCertifiedDevice,
  isFullyVerifiedByModel,
  isPlaceholderImageUrl,
  loadCertifiedDevices,
  modelVerificationLabel,
  parseDevicesPayload,
  readInventoryExamples,
  readVerificationByModel,
  runtimeExampleHref,
  runtimeHealthHref,
  workspaceExampleDir,
} from './catalog.js';

const inventoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/examples/legacy-inventory.json'
);

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as unknown;

describe('deriveCatalogStatus', () => {
  it('maps ported + all models verified to verified', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'ported',
        verificationByModel: {
          '3': 'verified',
          '4': 'verified',
          '5': 'verified',
        },
      })
    ).toBe('verified');
  });

  it('maps ported + unverified models to ported', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'ported',
        verificationByModel: emptyVerificationByModel(),
      })
    ).toBe('ported');
  });

  it('keeps mixed model results as ported', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'ported',
        verificationByModel: {
          '3': 'verified',
          '4': 'unverified',
          '5': 'verified',
        },
      })
    ).toBe('ported');
  });

  it('keeps a failed model as ported', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'ported',
        verificationByModel: {
          '3': 'verified',
          '4': 'verified',
          '5': 'failed',
        },
      })
    ).toBe('ported');
  });

  it('treats empty portingStatus as legacy', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: '',
        verificationByModel: emptyVerificationByModel(),
      })
    ).toBe('legacy');
  });

  it('maps explicit legacy to legacy', () => {
    expect(
      deriveCatalogStatus({
        portingStatus: 'legacy',
        verificationByModel: emptyVerificationByModel(),
      })
    ).toBe('legacy');
  });
});

describe('verificationByModel', () => {
  it('defaults missing or invalid values to unverified', () => {
    expect(readVerificationByModel(undefined)).toEqual(emptyVerificationByModel());
    expect(readVerificationByModel({ '3': 'verified', '4': 'nope' })).toEqual({
      '3': 'verified',
      '4': 'unverified',
      '5': 'unverified',
    });
  });

  it('requires all three models for full verification', () => {
    expect(
      isFullyVerifiedByModel({
        '3': 'verified',
        '4': 'verified',
        '5': 'verified',
      })
    ).toBe(true);
    expect(
      isFullyVerifiedByModel({
        '3': 'verified',
        '4': 'verified',
        '5': 'unverified',
      })
    ).toBe(false);
  });

  it('labels chips without calling unverified models verified', () => {
    expect(modelVerificationLabel('3', 'verified')).toBe('Pi 3 verified');
    expect(modelVerificationLabel('4', 'unverified')).toBe('Pi 4 unverified');
    expect(modelVerificationLabel('5', 'failed')).toBe('Pi 5 failed');
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
      verificationByModel: {
        '3': 'verified',
        '4': 'verified',
        '5': 'verified',
      },
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

  it('filters ported status for Phase 2 examples', () => {
    const ported = filterCatalogEntries(entries, {
      category: 'all',
      status: 'ported',
    });
    expect(ported.map((entry) => entry.id).sort()).toEqual([
      'gpio-pir-sensor',
      'i2c-ads1115',
      'i2c-adt7410',
      'i2c-sht30',
    ]);
  });
});

describe('runtime example links', () => {
  const entries = buildCatalogEntries(readInventoryExamples(inventory), []);

  it('allows run and edit links only for ported examples with a runtime path', () => {
    const blink = entries.find((entry) => entry.id === 'gpio-blink');
    const button = entries.find((entry) => entry.id === 'gpio-button');
    const scan = entries.find((entry) => entry.id === 'i2c-detect');
    const unread = entries.find((entry) => entry.id === 'gpio-read-gpio-value');
    const pir = entries.find((entry) => entry.id === 'gpio-pir-sensor');
    const adt7410 = entries.find((entry) => entry.id === 'i2c-adt7410');
    const sht30 = entries.find((entry) => entry.id === 'i2c-sht30');
    const ads1115 = entries.find((entry) => entry.id === 'i2c-ads1115');
    expect(blink).toBeDefined();
    expect(button).toBeDefined();
    expect(scan).toBeDefined();
    expect(unread).toBeDefined();
    expect(pir).toBeDefined();
    expect(adt7410).toBeDefined();
    expect(sht30).toBeDefined();
    expect(ads1115).toBeDefined();
    expect(canOpenRuntimeExample(blink as (typeof entries)[number])).toBe(true);
    expect(canOpenRuntimeExample(button as (typeof entries)[number])).toBe(
      true
    );
    expect(canOpenRuntimeExample(scan as (typeof entries)[number])).toBe(true);
    expect(canOpenRuntimeExample(unread as (typeof entries)[number])).toBe(
      false
    );
    expect(canOpenRuntimeExample(pir as (typeof entries)[number])).toBe(true);
    expect(canOpenRuntimeExample(adt7410 as (typeof entries)[number])).toBe(
      true
    );
    expect(canOpenRuntimeExample(sht30 as (typeof entries)[number])).toBe(true);
    expect(canOpenRuntimeExample(ads1115 as (typeof entries)[number])).toBe(
      true
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
    expect(workspaceExampleDir('workspace/led-blink/')).toBe('led-blink/');
    expect(runtimeExampleHref('workspace/led-blink/', '127.0.0.1')).toBe(
      'http://127.0.0.1:4173/led-blink/'
    );
    expect(runtimeExampleHref('workspace/i2c-scan/', '192.168.0.10')).toBe(
      'http://192.168.0.10:4173/i2c-scan/'
    );
    expect(runtimeExampleHref('workspace/pir-sensor/')).toBe(
      'http://127.0.0.1:4173/pir-sensor/'
    );
    expect(runtimeExampleHref('workspace/adt7410/')).toBe(
      'http://127.0.0.1:4173/adt7410/'
    );
    expect(runtimeExampleHref('workspace/sht30/')).toBe(
      'http://127.0.0.1:4173/sht30/'
    );
    expect(runtimeExampleHref('workspace/ads1115/')).toBe(
      'http://127.0.0.1:4173/ads1115/'
    );
  });

  it('opens the existing Editor workspace root, not a nested folder', () => {
    expect(editorWorkspaceHref('127.0.0.1')).toBe(
      `http://127.0.0.1:8080/?folder=${EDITOR_WORKSPACE_FOLDER}`
    );
    expect(editorWorkspaceHref('192.168.0.10')).toBe(
      `http://192.168.0.10:8080/?folder=${EDITOR_WORKSPACE_FOLDER}`
    );
  });

  it('lists Reference Examples for Runtime diagnostics', () => {
    expect(REFERENCE_EXAMPLES.map((example) => example.id)).toEqual([
      'gpio-blink',
      'gpio-button',
      'i2c-detect',
    ]);
    expect(
      REFERENCE_EXAMPLES.map((example) =>
        runtimeExampleHref(example.runtimeExamplePath, '127.0.0.1')
      )
    ).toEqual([
      'http://127.0.0.1:4173/led-blink/',
      'http://127.0.0.1:4173/button/',
      'http://127.0.0.1:4173/i2c-scan/',
    ]);
  });

  it('resolves Runtime health and diagnostics documentation URLs', () => {
    expect(RUNTIME_HEALTH_PORT).toBe(33330);
    expect(runtimeHealthHref()).toBe('http://127.0.0.1:33330/health');
    expect(runtimeHealthHref('192.168.0.10')).toBe(
      'http://192.168.0.10:33330/health'
    );
    expect(RUNTIME_DIAGNOSTICS_DOC_URL).toContain(
      'docs/guides/runtime-diagnostics.md'
    );
  });
});

describe('catalogCardActions', () => {
  const entries = buildCatalogEntries(readInventoryExamples(inventory), []);
  const isLegacyGcDemoHref = (href: string): boolean =>
    /^https?:\/\/(www\.)?chirimen\.org\/.*\/$/.test(href) ||
    href === 'https://chirimen.org/chirimen-micro-bit/';

  it('keeps schematic links and never emits Legacy Example demo URLs', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const actions = catalogCardActions(entry);
      expect(actions.map((action) => action.label)).not.toContain(
        'Legacy Example'
      );
      expect(actions.every((action) => !isLegacyGcDemoHref(action.href))).toBe(
        true
      );
      if (entry.schematicUrl !== '') {
        expect(actions).toContainEqual({
          href: entry.schematicUrl,
          label: '回路図',
          kind: 'external',
          ariaLabel: '回路図（外部リンク）',
        });
      } else {
        expect(actions.every((action) => action.label !== '回路図')).toBe(true);
      }
    }
  });

  it('keeps run and edit links for ported examples with a runtime path', () => {
    const blink = entries.find((entry) => entry.id === 'gpio-blink');
    expect(blink).toBeDefined();
    const actions = catalogCardActions(
      blink as (typeof entries)[number],
      '127.0.0.1'
    );
    expect(actions.map((action) => action.label)).toEqual([
      '回路図',
      '実行',
      '編集',
    ]);
    expect(actions[1]).toMatchObject({
      href: 'http://127.0.0.1:4173/led-blink/',
      label: '実行',
      kind: 'service',
    });
    expect(actions[2]).toMatchObject({
      href: `http://127.0.0.1:8080/?folder=${EDITOR_WORKSPACE_FOLDER}`,
      label: '編集',
      kind: 'service',
    });
  });

  it('shows only schematic for unported examples that have a circuit diagram', () => {
    const unread = entries.find(
      (entry) => entry.id === 'gpio-read-gpio-value'
    );
    expect(unread).toBeDefined();
    expect(unread?.schematicUrl).not.toBe('');
    const actions = catalogCardActions(unread as (typeof entries)[number]);
    expect(actions).toEqual([
      {
        href: unread?.schematicUrl,
        label: '回路図',
        kind: 'external',
        ariaLabel: '回路図（外部リンク）',
      },
    ]);
  });

  it('does not substitute a demo page when schematic is missing', () => {
    const unportedWithoutSchematic = entries.find(
      (entry) => entry.id === 'gpio-multi-blink-all'
    );
    expect(unportedWithoutSchematic).toBeDefined();
    expect(unportedWithoutSchematic?.schematicUrl).toBe('');
    expect(unportedWithoutSchematic?.portingStatus).not.toBe('ported');
    expect(
      catalogCardActions(unportedWithoutSchematic as (typeof entries)[number])
    ).toEqual([]);
  });
});

describe('catalog images', () => {
  it('uses the device image when present', () => {
    expect(
      catalogImageUrl({
        id: 'led',
        meta: { image: 'https://example.test/led.png' },
      })
    ).toBe('https://example.test/led.png');
  });

  it('falls back to no_image.png when the device image is missing', () => {
    expect(catalogImageUrl(null)).toBe(NO_IMAGE_URL);
    expect(catalogImageUrl({ id: 'led' })).toBe(NO_IMAGE_URL);
    expect(catalogImageUrl({ id: 'led', meta: { image: '' } })).toBe(
      NO_IMAGE_URL
    );
    expect(isPlaceholderImageUrl(NO_IMAGE_URL)).toBe(true);
    expect(
      isPlaceholderImageUrl('http://localhost:4200/no_image.png')
    ).toBe(true);
    expect(isPlaceholderImageUrl('https://example.test/led.png')).toBe(false);
  });
});
