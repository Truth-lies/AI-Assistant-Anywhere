/**
 * MessageBubble 辅助函数单元测试
 */
import { stripMarkdownImages } from '../../src/components/MessageBubble';

describe('stripMarkdownImages', () => {
  it('移除单个 Markdown 图片语法', () => {
    const input = '这里有张图 ![alt text](https://example.com/img.png) 文字';
    const result = stripMarkdownImages(input);
    expect(result).toBe('这里有张图  文字');
  });

  it('移除多个 Markdown 图片语法', () => {
    const input = '![a](url1) 文字 ![b](url2)';
    const result = stripMarkdownImages(input);
    expect(result).not.toContain('![');
  });

  it('不修改无图片的普通文本', () => {
    const input = '这是一段普通文本，没有图片';
    expect(stripMarkdownImages(input)).toBe(input);
  });

  it('不移除普通 Markdown 链接语法', () => {
    const input = '点击[这里](https://example.com)查看';
    const result = stripMarkdownImages(input);
    expect(result).toContain('[这里](https://example.com)');
  });

  it('trim 首尾空白', () => {
    const input = '  ![img](url)  ';
    const result = stripMarkdownImages(input);
    expect(result).toBe('');
  });

  it('处理空字符串', () => {
    expect(stripMarkdownImages('')).toBe('');
  });

  it('保留图片前后的其他内容', () => {
    const input = '开头内容\n![img](url)\n结尾内容';
    const result = stripMarkdownImages(input);
    expect(result).toContain('开头内容');
    expect(result).toContain('结尾内容');
    expect(result).not.toContain('![img](url)');
  });
});
