/**
 * 时间工具函数单元测试
 */
import {
  getTimeSnapshot,
  buildTimeContextLine,
  detectTimeIntent,
  formatTimeToolAnswer,
} from '../../src/utils/time';

describe('getTimeSnapshot', () => {
  it('返回完整的时间快照对象', () => {
    const now = new Date('2025-06-15T14:30:00.000Z');
    const snap = getTimeSnapshot(now);

    expect(snap).toHaveProperty('timestamp');
    expect(snap).toHaveProperty('iso');
    expect(snap).toHaveProperty('locale');
    expect(snap).toHaveProperty('date');
    expect(snap).toHaveProperty('time');
    expect(snap).toHaveProperty('weekDay');
    expect(snap).toHaveProperty('timezone');
  });

  it('timestamp 与传入的 Date 对象一致', () => {
    const now = new Date(1_700_000_000_000);
    const snap = getTimeSnapshot(now);
    expect(snap.timestamp).toBe(1_700_000_000_000);
  });

  it('iso 字段为标准 ISO 格式', () => {
    const now = new Date('2025-01-01T00:00:00.000Z');
    const snap = getTimeSnapshot(now);
    expect(snap.iso).toBe('2025-01-01T00:00:00.000Z');
  });

  it('weekDay 为中文星期', () => {
    const snap = getTimeSnapshot();
    const validWeekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    expect(validWeekdays).toContain(snap.weekDay);
  });
});

describe('buildTimeContextLine', () => {
  it('包含"当前时间锚点"标识', () => {
    const line = buildTimeContextLine();
    expect(line).toContain('当前时间锚点');
  });

  it('包含星期信息', () => {
    const line = buildTimeContextLine();
    const validWeekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    expect(validWeekdays.some((d) => line.includes(d))).toBe(true);
  });

  it('包含 Unix 时间戳（数字）', () => {
    const line = buildTimeContextLine();
    expect(/\d{10,13}/.test(line)).toBe(true);
  });
});

describe('detectTimeIntent', () => {
  it('识别"现在几点"', () => {
    expect(detectTimeIntent('现在几点了')).toBe(true);
  });

  it('识别"今天几号"', () => {
    expect(detectTimeIntent('今天几号')).toBe(true);
  });

  it('识别"星期几"', () => {
    expect(detectTimeIntent('今天星期几')).toBe(true);
  });

  it('识别时间戳查询', () => {
    expect(detectTimeIntent('当前Unix时间戳是多少')).toBe(true);
  });

  it('识别英文时间查询', () => {
    expect(detectTimeIntent('what time is it')).toBe(true);
  });

  it('不误触发普通问题', () => {
    expect(detectTimeIntent('帮我写一首诗')).toBe(false);
    expect(detectTimeIntent('DeepSeek 是什么')).toBe(false);
    expect(detectTimeIntent('')).toBe(false);
  });
});

describe('formatTimeToolAnswer', () => {
  it('包含当前时间、日期、时区、时间戳', () => {
    const answer = formatTimeToolAnswer();
    expect(answer).toContain('现在时间');
    expect(answer).toContain('今天日期');
    expect(answer).toContain('时区');
    expect(answer).toContain('Unix 时间戳');
  });
});
