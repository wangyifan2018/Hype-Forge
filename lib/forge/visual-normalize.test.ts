import { describe, it, expect } from 'vitest';
import { normalizeVisualPrompts } from './visual-normalize';

describe('normalizeVisualPrompts', () => {
  it('pads imagePlaybook to at least 4 steps', () => {
    const result = normalizeVisualPrompts({
      doubaoPromptZh: '保留商品主体不变，3:4 竖图',
      doubaoSop: [
        { step: 1, tool: '豆包', action: '打开', detail: 'a' },
        { step: 2, tool: '豆包', action: '上传', detail: 'b' },
        { step: 3, tool: '豆包', action: '粘贴', detail: 'c' },
      ],
      fluxEn: 'test',
      bgRedrawZh: 'test',
      creativeConcept: 'c',
      moodKeywords: ['a', 'b', 'c'],
      shotList: ['s1', 's2', 's3'],
      imagePlaybook: [
        { step: 1, tool: '豆包', action: 'x', detail: 'y' },
      ],
      coverTip: 'tip',
      avoidList: ['no watermark'],
    });
    expect(result.imagePlaybook.length).toBeGreaterThanOrEqual(4);
    expect(result.doubaoSop.length).toBeGreaterThanOrEqual(3);
    expect(result.doubaoPromptVariants.length).toBeGreaterThanOrEqual(3);
    expect(result.doubaoPromptVariants[0]!.shots.length).toBeGreaterThanOrEqual(2);
    expect(result.dewuFeedStoryboard.length).toBeGreaterThanOrEqual(4);
    expect(result.doubaoPromptZh).toMatch(/水印|无文字|logo/i);
  });
});
