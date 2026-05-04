import { toLocalDateString, localMidnight } from '../lib/dates';

describe('toLocalDateString', () => {
  it('formats a Date to YYYY-MM-DD', () => {
    const d = new Date(2023, 5, 7); // June 7 2023 (month is 0-indexed)
    expect(toLocalDateString(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toLocalDateString(d)).toBe('2023-06-07');
  });

  it('zero-pads month and day', () => {
    const d = new Date(2024, 0, 5); // Jan 5
    expect(toLocalDateString(d)).toBe('2024-01-05');
  });

  it('handles Dec 31', () => {
    const d = new Date(2023, 11, 31);
    expect(toLocalDateString(d)).toBe('2023-12-31');
  });

  it('accepts a string date', () => {
    const result = toLocalDateString(new Date('2021-08-20'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('localMidnight', () => {
  it('returns a Date with time set to 00:00:00.000', () => {
    const input = new Date(2023, 4, 15, 14, 30, 45, 500);
    const result = localMidnight(input);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('preserves the date', () => {
    const input = new Date(2023, 4, 15, 23, 59, 59);
    const result = localMidnight(input);
    expect(result.getFullYear()).toBe(2023);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(15);
  });

  it('uses today when called with no args', () => {
    const result = localMidnight();
    const today = new Date();
    expect(result.getFullYear()).toBe(today.getFullYear());
    expect(result.getMonth()).toBe(today.getMonth());
    expect(result.getDate()).toBe(today.getDate());
  });
});
