import { getTimeLeft, timeAgo } from '../screens/game/FeedScreen';

describe('getTimeLeft', () => {
  const hoursAgo = (h: number) =>
    new Date(Date.now() - h * 3600000).toISOString();
  const hoursFromNow = (h: number) =>
    new Date(Date.now() + h * 3600000).toISOString();

  it('expired: created > 24h ago', () => {
    const result = getTimeLeft(hoursAgo(25));
    expect(result.expired).toBe(true);
    expect(result.label).toBe('Ended');
    expect(result.urgent).toBe(false);
  });

  it('not expired and no label when > 6h remain', () => {
    // Created 16h ago → 8h left
    const result = getTimeLeft(hoursAgo(16));
    expect(result.expired).toBe(false);
    expect(result.label).toBe('');
    expect(result.urgent).toBe(false);
  });

  it('shows label but not urgent between 2–6h left', () => {
    // Created 20h ago → 4h left
    const result = getTimeLeft(hoursAgo(20));
    expect(result.expired).toBe(false);
    expect(result.label).toMatch(/h \d+m left/);
    expect(result.urgent).toBe(false);
  });

  it('urgent when < 2h remain', () => {
    // Created 23h ago → 1h left
    const result = getTimeLeft(hoursAgo(23));
    expect(result.expired).toBe(false);
    expect(result.urgent).toBe(true);
    expect(result.label).toMatch(/h \d+m left|^\d+m left/);
  });

  it('shows minutes when < 1h remain', () => {
    // Created 23h 45m ago → ~15m left
    const createdAt = new Date(Date.now() - (23 * 3600 + 45 * 60) * 1000).toISOString();
    const result = getTimeLeft(createdAt);
    expect(result.expired).toBe(false);
    expect(result.urgent).toBe(true);
    expect(result.label).toMatch(/^\d+m left$/);
  });

  it('exactly 0 remaining is expired', () => {
    const createdAt = new Date(Date.now() - 86400000).toISOString();
    const result = getTimeLeft(createdAt);
    expect(result.expired).toBe(true);
  });
});

describe('timeAgo', () => {
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

  it('returns "just now" for < 1 min', () => {
    expect(timeAgo(new Date(Date.now() - 30000).toISOString())).toBe('just now');
  });

  it('returns Xm ago for minutes', () => {
    expect(timeAgo(minutesAgo(5))).toBe('5m ago');
    expect(timeAgo(minutesAgo(59))).toBe('59m ago');
  });

  it('returns Xh ago for hours', () => {
    expect(timeAgo(minutesAgo(120))).toBe('2h ago');
    expect(timeAgo(minutesAgo(23 * 60))).toBe('23h ago');
  });

  it('returns Xd ago for days < 7', () => {
    expect(timeAgo(minutesAgo(2 * 24 * 60))).toBe('2d ago');
  });

  it('returns formatted date for > 7 days', () => {
    // Use a local date to avoid UTC-vs-local timezone mismatch
    const d = new Date(2024, 0, 15); // Jan 15 local time
    expect(timeAgo(d.toISOString())).toMatch(/Jan (14|15)/);
  });
});
