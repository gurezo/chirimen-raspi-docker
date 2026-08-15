/** Home の hash ルート */
export const HOME_HREF = '#/' as const;

/** web-demo の画面 ID */
export type DemoRouteId = 'home' | 'gpio-output' | 'gpio-input' | 'i2c-scan';

/** ナビ 1 件（Home は含まない） */
export interface DemoNavItem {
  readonly id: Exclude<DemoRouteId, 'home'>;
  readonly href: `#/${Exclude<DemoRouteId, 'home'>}`;
  readonly label: string;
}

/** Issue #104 で指定された GPIO / I2C demo 導線 */
export const DEMO_NAV_ITEMS = [
  { id: 'gpio-output', href: '#/gpio-output', label: 'GPIO Output' },
  { id: 'gpio-input', href: '#/gpio-input', label: 'GPIO Input' },
  { id: 'i2c-scan', href: '#/i2c-scan', label: 'I2C Scan' },
] as const satisfies readonly DemoNavItem[];

/** 画面表示用の view model */
export interface DemoView {
  readonly id: DemoRouteId;
  readonly title: string;
  readonly description: string;
  readonly showHomeLink: boolean;
}

const DEMO_VIEWS: Record<DemoRouteId, DemoView> = {
  home: {
    id: 'home',
    title: '',
    description:
      'GPIO Output / GPIO Input / I2C Scan から demo を選んでください。実 example は #50 / #51 / #52 で実装します。',
    showHomeLink: false,
  },
  'gpio-output': {
    id: 'gpio-output',
    title: 'GPIO Output',
    description: 'GPIO LED Blink example（#50）を後続で実装する。',
    showHomeLink: true,
  },
  'gpio-input': {
    id: 'gpio-input',
    title: 'GPIO Input',
    description: 'GPIO Input example（#51）を後続で実装する。',
    showHomeLink: true,
  },
  'i2c-scan': {
    id: 'i2c-scan',
    title: 'I2C Scan',
    description: 'I2C Scan example（#52）を後続で実装する。',
    showHomeLink: true,
  },
};

const KNOWN_HASHES: Readonly<Record<string, DemoRouteId>> = {
  '': 'home',
  '#': 'home',
  '#/': 'home',
  '#/gpio-output': 'gpio-output',
  '#/gpio-input': 'gpio-input',
  '#/i2c-scan': 'i2c-scan',
};

/**
 * location.hash を画面 ID に変換する。未知 hash は Home にする。
 */
export function parseDemoRoute(hash: string): DemoRouteId {
  return KNOWN_HASHES[hash] ?? 'home';
}

/**
 * 画面 ID に対応する見出し・説明を返す。
 */
export function getDemoView(id: DemoRouteId): DemoView {
  return DEMO_VIEWS[id];
}
