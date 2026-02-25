/**
 * 向量搜索工具单元测试
 */
import { cosineSimilarity, findTopK } from '../../src/utils/vectorSearch';

describe('cosineSimilarity', () => {
  it('相同向量的余弦相似度为 1', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it('正交向量的余弦相似度为 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('完全相反向量的余弦相似度为 -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('长度不一致时返回 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('空向量时返回 0', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('零向量时返回 0', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('findTopK', () => {
  const chunks = [
    { id: 'a', content: '内容A', embedding: [1, 0, 0] },
    { id: 'b', content: '内容B', embedding: [0, 1, 0] },
    { id: 'c', content: '内容C', embedding: [0.9, 0.1, 0] },
  ];

  it('返回正确数量的结果', () => {
    const result = findTopK([1, 0, 0], chunks, 2);
    expect(result).toHaveLength(2);
  });

  it('按相似度降序排列', () => {
    const result = findTopK([1, 0, 0], chunks, 3);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it('最相似的结果排在第一位', () => {
    const result = findTopK([1, 0, 0], chunks, 3);
    expect(result[0].id).toBe('a');
  });

  it('空 chunks 时返回空数组', () => {
    expect(findTopK([1, 0, 0], [], 5)).toEqual([]);
  });

  it('过滤掉相似度为零的向量（仅返回 score > 0 的结果）', () => {
    // chunk b 与查询向量正交（相似度=0），应被过滤掉
    const result = findTopK([1, 0, 0], chunks, 100);
    expect(result.every((r) => r.score > 0)).toBe(true);
    expect(result.find((r) => r.id === 'b')).toBeUndefined();
  });
});
