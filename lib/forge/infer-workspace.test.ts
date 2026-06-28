import { describe, it, expect } from 'vitest';
import { inferWorkspaceContext } from './infer-workspace';

describe('inferWorkspaceContext', () => {
  it('infers sneaker category from paste', () => {
    const r = inferWorkspaceContext({
      productName: 'Jordan 1 芝加哥',
      sellingPoints: '经典篮球鞋 上脚',
    });
    expect(r.category).toBe('sneaker');
  });
});
