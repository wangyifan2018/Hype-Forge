import { describe, it, expect } from 'vitest';
import { parseProductPaste } from './parse-product-paste';

describe('parseProductPaste', () => {
  it('extracts title from first line and rest as selling points', () => {
    const r = parseProductPaste('Nike Air Max\n透气网面\n缓震中底', 'https://dewu.com/x');
    expect(r.productName).toBe('Nike Air Max');
    expect(r.sellingPoints).toContain('透气网面');
    expect(r.dewuProductUrl).toBe('https://dewu.com/x');
    expect(r.referenceCopy).toContain('Nike Air Max');
  });

  it('allows empty paste with link only', () => {
    const r = parseProductPaste('', 'https://link');
    expect(r.productName).toBe('商品');
    expect(r.dewuProductUrl).toBe('https://link');
  });
});
