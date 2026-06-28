import { describe, it, expect } from 'vitest';
import { hasHashtagSection, extractHashtags } from './copy-hashtags';

describe('copy-hashtags', () => {
  it('detects hashtag section with enough tags', () => {
    const md = `## 标题\nx\n## 正文\ny\n## 话题标签\n#得物 #球鞋 #OOTD`;
    expect(hasHashtagSection(md, 3)).toBe(true);
    expect(extractHashtags(md).length).toBe(3);
  });
});
