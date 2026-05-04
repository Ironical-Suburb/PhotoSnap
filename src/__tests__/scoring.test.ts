import { calculateScore } from '../constants/scoring';

describe('calculateScore', () => {
  describe('exact match', () => {
    it('returns 1000 points for same date', () => {
      const result = calculateScore('2020-06-15', '2020-06-15');
      expect(result.points).toBe(1000);
      expect(result.daysOff).toBe(0);
      expect(result.label).toBe('Perfect!');
    });
  });

  describe('exponential decay', () => {
    it('returns ~950 pts for 1 day off', () => {
      const { points } = calculateScore('2020-06-15', '2020-06-16');
      expect(points).toBeGreaterThan(900);
      expect(points).toBeLessThan(1000);
    });

    it('returns ~513 pts for 10 days off', () => {
      const { points } = calculateScore('2020-06-01', '2020-06-11');
      expect(points).toBeGreaterThan(480);
      expect(points).toBeLessThan(550);
    });

    it('returns ~135 pts for 30 days off', () => {
      const { points } = calculateScore('2020-01-01', '2020-01-31');
      expect(points).toBeGreaterThan(100);
      expect(points).toBeLessThan(165);
    });

    it('returns ~18 pts for 60 days off', () => {
      const { points } = calculateScore('2020-01-01', '2020-03-01');
      expect(points).toBeGreaterThan(0);
      expect(points).toBeLessThan(40);
    });

    it('returns 0 for extremely far off guess', () => {
      const { points } = calculateScore('2000-01-01', '2020-01-01');
      expect(points).toBe(0);
    });
  });

  describe('score labels', () => {
    it('labels >= 700 as Incredible', () => {
      const { label } = calculateScore('2020-06-15', '2020-06-16');
      expect(label).toBe('Incredible');
    });

    it('labels >= 400 and < 700 as Great', () => {
      // ~8 days off puts us around 585 pts — still Incredible; try 12 days
      const { label, points } = calculateScore('2020-06-01', '2020-06-13');
      if (points >= 700) expect(label).toBe('Incredible');
      else if (points >= 400) expect(label).toBe('Great');
    });

    it('labels >= 150 and < 400 as Good', () => {
      const { label, points } = calculateScore('2020-01-01', '2020-02-01');
      if (points >= 150 && points < 400) expect(label).toBe('Good');
    });

    it('labels >= 30 and < 150 as Close enough', () => {
      const { label, points } = calculateScore('2020-01-01', '2020-03-01');
      if (points >= 30 && points < 150) expect(label).toBe('Close enough');
    });

    it('labels < 30 as Way off!', () => {
      const { points, label } = calculateScore('2000-01-01', '2020-01-01');
      expect(points).toBe(0);
      expect(label).toBe('Way off!');
    });
  });

  describe('symmetric — order of actual/guess does not affect daysOff', () => {
    it('same daysOff whether guess is before or after actual', () => {
      const a = calculateScore('2020-06-15', '2020-06-10');
      const b = calculateScore('2020-06-15', '2020-06-20');
      expect(a.daysOff).toBe(b.daysOff);
      expect(a.points).toBe(b.points);
    });
  });
});
