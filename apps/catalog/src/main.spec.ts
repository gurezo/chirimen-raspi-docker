import { describe, expect, it } from 'vitest';
import { CATALOG_TITLE } from './constants.js';

describe('catalog skeleton', () => {
  it('exposes the catalog title', () => {
    expect(CATALOG_TITLE).toBe('CHIRIMEN Example Catalog');
  });
});
