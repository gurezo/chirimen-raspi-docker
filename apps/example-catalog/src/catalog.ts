export const DEVICES_JSON_URL =
  'https://raw.githubusercontent.com/gurezo/chirimen-certified-devices/main/generated/devices.json';

export const DEVICE_FETCH_WARNING =
  'Device metadata を取得できませんでした。Example 情報のみ表示します。';

export const DEVICE_DASHBOARD_URL =
  'https://github.com/gurezo/chirimen-device-dashboard';

export const EXAMPLE_SERVER_PORT = 4173;
export const EDITOR_PORT = 8080;
export const EDITOR_WORKSPACE_FOLDER = '/home/coder/project';

export type CatalogStatus = 'legacy' | 'ported' | 'verified';

export type InventoryExample = {
  id: string;
  title: string;
  category: string;
  deviceId: string;
  device: string;
  legacyUrl: string;
  legacySourceUrl: string;
  schematicUrl: string;
  runtimeExamplePath: string;
  portingStatus: string;
  verificationStatus: string;
  supportedRaspberryPi: string[];
  interface: string;
  notes: string;
};

export type LegacyInventory = {
  examples: InventoryExample[];
};

export type DeviceMeta = {
  model?: string;
  category?: string;
  image?: string;
  description?: string;
  packages?: unknown[];
  examples?: Array<{ driver?: string }>;
};

export type CertifiedDevice = {
  id: string;
  meta?: DeviceMeta;
};

export type CatalogEntry = InventoryExample & {
  catalogStatus: CatalogStatus;
  certifiedDevice: CertifiedDevice | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

export const deriveCatalogStatus = (
  example: Pick<InventoryExample, 'portingStatus' | 'verificationStatus'>
): CatalogStatus => {
  if (example.portingStatus === 'ported') {
    if (example.verificationStatus === 'verified') {
      return 'verified';
    }
    return 'ported';
  }
  return 'legacy';
};

export const readInventoryExamples = (data: unknown): InventoryExample[] => {
  if (!isRecord(data) || !Array.isArray(data['examples'])) {
    return [];
  }

  return data['examples'].flatMap((item) => {
    if (!isRecord(item) || asString(item['id']) === '') {
      return [];
    }

    return [
      {
        id: asString(item['id']),
        title: asString(item['title']),
        category: asString(item['category']),
        deviceId: asString(item['deviceId']),
        device: asString(item['device']),
        legacyUrl: asString(item['legacyUrl']),
        legacySourceUrl: asString(item['legacySourceUrl']),
        schematicUrl: asString(item['schematicUrl']),
        runtimeExamplePath: asString(item['runtimeExamplePath']),
        portingStatus: asString(item['portingStatus']),
        verificationStatus: asString(item['verificationStatus']),
        supportedRaspberryPi: asStringArray(item['supportedRaspberryPi']),
        interface: asString(item['interface']),
        notes: asString(item['notes']),
      },
    ];
  });
};

export const parseDevicesPayload = (
  data: unknown
): { devices: CertifiedDevice[]; warning: string | null } => {
  if (!isRecord(data) || data['version'] !== 1 || !Array.isArray(data['devices'])) {
    return { devices: [], warning: DEVICE_FETCH_WARNING };
  }

  const devices = data['devices'].flatMap((item) => {
    if (!isRecord(item) || asString(item['id']) === '') {
      return [];
    }

    const meta = isRecord(item['meta']) ? (item['meta'] as DeviceMeta) : undefined;
    return [{ id: asString(item['id']), meta }];
  });

  return { devices, warning: null };
};

export const loadCertifiedDevices = async (
  fetchImpl: typeof fetch,
  url = DEVICES_JSON_URL
): Promise<{ devices: CertifiedDevice[]; warning: string | null }> => {
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      return { devices: [], warning: DEVICE_FETCH_WARNING };
    }

    const text = await response.text();
    if (text.trim() === '') {
      return { devices: [], warning: DEVICE_FETCH_WARNING };
    }

    return parseDevicesPayload(JSON.parse(text) as unknown);
  } catch {
    return { devices: [], warning: DEVICE_FETCH_WARNING };
  }
};

export const findCertifiedDevice = (
  example: Pick<InventoryExample, 'deviceId'>,
  devices: CertifiedDevice[]
): CertifiedDevice | null => {
  if (example.deviceId === '') {
    return null;
  }
  return devices.find((device) => device.id === example.deviceId) ?? null;
};

export const buildCatalogEntries = (
  examples: InventoryExample[],
  devices: CertifiedDevice[]
): CatalogEntry[] =>
  examples.map((example) => ({
    ...example,
    catalogStatus: deriveCatalogStatus(example),
    certifiedDevice: findCertifiedDevice(example, devices),
  }));

export const deviceModel = (device: CertifiedDevice | null): string =>
  asString(device?.meta?.model);

export const deviceDescription = (device: CertifiedDevice | null): string =>
  asString(device?.meta?.description);

export const deviceImageUrl = (device: CertifiedDevice | null): string =>
  asString(device?.meta?.image);

export type CategoryFilter =
  | 'all'
  | 'gpio'
  | 'i2c'
  | 'advanced'
  | 'remote'
  | 'other';

export type StatusFilter = 'all' | CatalogStatus;

export type CatalogFilters = {
  category: CategoryFilter;
  status: StatusFilter;
};

export const CATEGORY_FILTERS: ReadonlyArray<{
  id: CategoryFilter;
  label: string;
}> = [
  { id: 'all', label: 'すべて' },
  { id: 'gpio', label: 'GPIO' },
  { id: 'i2c', label: 'I2C' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'remote', label: 'Remote' },
  { id: 'other', label: 'Other' },
];

export const STATUS_FILTERS: ReadonlyArray<{
  id: StatusFilter;
  label: string;
}> = [
  { id: 'all', label: 'すべて' },
  { id: 'legacy', label: 'legacy' },
  { id: 'ported', label: 'ported' },
  { id: 'verified', label: 'verified' },
];

export const filterCatalogEntries = (
  entries: CatalogEntry[],
  filters: CatalogFilters
): CatalogEntry[] =>
  entries.filter((entry) => {
    const categoryOk =
      filters.category === 'all' || entry.category === filters.category;
    const statusOk =
      filters.status === 'all' || entry.catalogStatus === filters.status;
    return categoryOk && statusOk;
  });

export const canOpenRuntimeExample = (
  example: Pick<InventoryExample, 'portingStatus' | 'runtimeExamplePath'>
): boolean =>
  example.portingStatus === 'ported' && example.runtimeExamplePath.trim() !== '';

export const workspaceExampleDir = (runtimeExamplePath: string): string => {
  const withoutWorkspace = runtimeExamplePath.replace(/^workspace\//, '');
  const trimmed = withoutWorkspace.replace(/^\/+/, '');
  if (trimmed === '') {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

export const runtimeExampleHref = (
  runtimeExamplePath: string,
  hostname = '127.0.0.1',
  port = EXAMPLE_SERVER_PORT
): string => {
  const path = workspaceExampleDir(runtimeExamplePath);
  return `http://${hostname}:${String(port)}/${path}`;
};

export const editorWorkspaceHref = (
  hostname = '127.0.0.1',
  port = EDITOR_PORT,
  folder = EDITOR_WORKSPACE_FOLDER
): string => `http://${hostname}:${String(port)}/?folder=${folder}`;
