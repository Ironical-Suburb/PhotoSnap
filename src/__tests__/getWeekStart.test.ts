import { getWeekStart } from '../screens/game/LeagueScreen';

describe('getWeekStart', () => {
  it('returns a valid ISO string', () => {
    const result = getWeekStart();
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).toISOString()).toBe(result);
  });

  it('always returns a Monday at 00:00:00', () => {
    const result = getWeekStart();
    const d = new Date(result);
    expect(d.getDay()).toBe(1); // 1 = Monday
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('returned date is on or before today', () => {
    const result = new Date(getWeekStart());
    const today = new Date();
    expect(result.getTime()).toBeLessThanOrEqual(today.getTime());
  });

  it('returned date is within the last 7 days', () => {
    const result = new Date(getWeekStart());
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    expect(result.getTime()).toBeGreaterThan(sevenDaysAgo.getTime());
  });
});
