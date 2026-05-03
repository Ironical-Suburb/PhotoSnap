export function calculateScore(actualDate: string, guessDate: string): { points: number; label: string; daysOff: number } {
  const actual = new Date(actualDate);
  const guess = new Date(guessDate);
  const daysOff = Math.abs(Math.round((actual.getTime() - guess.getTime()) / (1000 * 60 * 60 * 24)));

  // Exponential decay: 1000 at 0 days, ~500 at 10 days, ~135 at 30 days, ~18 at 60 days
  const points = Math.max(0, Math.round(1000 * Math.exp(-daysOff / 15)));

  const label =
    daysOff === 0 ? 'Perfect!' :
    points >= 700 ? 'Incredible' :
    points >= 400 ? 'Great' :
    points >= 150 ? 'Good' :
    points >= 30  ? 'Close enough' :
    'Way off!';

  return { points, label, daysOff };
}
