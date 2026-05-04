import { statusLabel } from '../screens/game/DuelsScreen';
import type { DuelRow } from '../screens/game/DuelsScreen';

const BASE: DuelRow = {
  id: 'd1',
  status: 'pending',
  created_at: new Date().toISOString(),
  challenger_id: 'user-a',
  opponent_id: 'user-b',
  challenger_photo_id: null,
  opponent_photo_id: null,
  challenger_score: null,
  opponent_score: null,
  winner_id: null,
  challenger: { display_name: 'Alice' },
  opponent: { display_name: 'Bob' },
};

describe('statusLabel — pending', () => {
  it('challenger with no photo → Pick your photo', () => {
    const { text } = statusLabel({ ...BASE, challenger_photo_id: null }, 'user-a');
    expect(text).toBe('Pick your photo');
  });

  it('opponent → Your turn to accept', () => {
    const { text } = statusLabel(BASE, 'user-b');
    expect(text).toBe('Your turn to accept');
  });

  it('challenger after picking photo → Waiting for opponent', () => {
    const { text } = statusLabel({ ...BASE, challenger_photo_id: 'photo-1' }, 'user-a');
    expect(text).toBe('Waiting for opponent');
  });
});

describe('statusLabel — active', () => {
  it('returns Guess in progress for both players', () => {
    const duel = { ...BASE, status: 'active' };
    expect(statusLabel(duel, 'user-a').text).toBe('Guess in progress');
    expect(statusLabel(duel, 'user-b').text).toBe('Guess in progress');
  });
});

describe('statusLabel — complete', () => {
  it('winner sees You won! 🏆', () => {
    const duel = { ...BASE, status: 'complete', winner_id: 'user-a' };
    expect(statusLabel(duel, 'user-a').text).toBe('You won! 🏆');
  });

  it('loser sees You lost', () => {
    const duel = { ...BASE, status: 'complete', winner_id: 'user-a' };
    expect(statusLabel(duel, 'user-b').text).toBe('You lost');
  });

  it('draw (no winner) shows Draw', () => {
    const duel = { ...BASE, status: 'complete', winner_id: null };
    expect(statusLabel(duel, 'user-a').text).toBe('Draw');
  });
});

describe('statusLabel — rejected', () => {
  it('returns Declined', () => {
    const duel = { ...BASE, status: 'rejected' };
    expect(statusLabel(duel, 'user-a').text).toBe('Declined');
    expect(statusLabel(duel, 'user-b').text).toBe('Declined');
  });
});
