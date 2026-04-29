import { ScoreTier } from '../types';

export const SCORE_TIERS: ScoreTier[] = [
  { maxDaysOff: 0,   points: 1000, label: 'Perfect!' },
  { maxDaysOff: 7,   points: 800,  label: 'Incredible' },
  { maxDaysOff: 30,  points: 500,  label: 'Great' },
  { maxDaysOff: 90,  points: 300,  label: 'Good' },
  { maxDaysOff: 365, points: 100,  label: 'Close enough' },
];

export const FALLBACK_SCORE = 0;
export const FALLBACK_LABEL = 'Way off!';

export function calculateScore(actualDate: string, guessDate: string): { points: number; label: string; daysOff: number } {
  const actual = new Date(actualDate);
  const guess = new Date(guessDate);
  const daysOff = Math.abs(Math.round((actual.getTime() - guess.getTime()) / (1000 * 60 * 60 * 24)));

  const tier = SCORE_TIERS.find((t) => daysOff <= t.maxDaysOff);
  return {
    points: tier?.points ?? FALLBACK_SCORE,
    label: tier?.label ?? FALLBACK_LABEL,
    daysOff,
  };
}
