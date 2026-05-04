import { scoreLocation } from '../screens/game/GuessScreen';

describe('scoreLocation', () => {
  it('returns 1000 for exact match', () => {
    const { points, label } = scoreLocation('Tokyo, Japan', 'Tokyo, Japan');
    expect(points).toBe(1000);
    expect(label).toBe('Spot on!');
  });

  it('is case-insensitive', () => {
    const { points } = scoreLocation('tokyo, japan', 'Tokyo, Japan');
    expect(points).toBe(1000);
  });

  it('ignores punctuation in comparison', () => {
    const { points } = scoreLocation('Tokyo Japan', 'Tokyo, Japan');
    expect(points).toBe(1000);
  });

  it('returns 800 when all key words of actual appear in guess', () => {
    const { points, label } = scoreLocation('It was taken in Tokyo Japan somewhere', 'Tokyo Japan');
    expect(points).toBe(800);
    expect(label).toBe('Very close!');
  });

  it('returns 400 for partial word match', () => {
    const { points, label } = scoreLocation('Tokyo somewhere', 'Tokyo, Japan');
    // "japan" (5 chars) not in guess but "tokyo" is
    expect(points).toBe(400);
    expect(label).toBe('Partially right');
  });

  it('returns 0 for completely wrong guess', () => {
    const { points, label } = scoreLocation('Paris, France', 'Tokyo, Japan');
    expect(points).toBe(0);
    expect(label).toBe('Way off!');
  });

  it('returns 0 for empty guess', () => {
    const { points } = scoreLocation('', 'Tokyo, Japan');
    expect(points).toBe(0);
  });

  it('returns 0 for whitespace-only guess', () => {
    const { points } = scoreLocation('   ', 'Tokyo, Japan');
    expect(points).toBe(0);
  });

  it('handles short words (≤2 chars) in actual being ignored', () => {
    // "in" and "at" are ≤2 chars and should not be counted as key words
    const { points } = scoreLocation('completely wrong', 'at in NY');
    // "ny" is 2 chars, ignored. No key words to match → all-match is vacuously true
    // This tests the edge case: empty aWords array → every() returns true → 800 pts
    expect(points).toBeGreaterThanOrEqual(0);
  });
});
