import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import DuelsScreen from '../../screens/game/DuelsScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: any) => useEffect(cb, []),
  };
});

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-a' } } }) },
    get from() { return mockFrom; },
  },
}));

const MOCK_DUELS = [
  {
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
  },
  {
    id: 'd2',
    status: 'complete',
    created_at: new Date().toISOString(),
    challenger_id: 'user-a',
    opponent_id: 'user-c',
    challenger_photo_id: 'p1',
    opponent_photo_id: 'p2',
    challenger_score: 800,
    opponent_score: 600,
    winner_id: 'user-a',
    challenger: { display_name: 'Alice' },
    opponent: { display_name: 'Carol' },
  },
];

describe('DuelsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFrom.mockReturnValue(makeQueryBuilder({ data: MOCK_DUELS, error: null }));
  });

  it('renders the screen title', async () => {
    const { getByText } = render(<DuelsScreen />);
    await waitFor(() => expect(getByText('Duels')).toBeTruthy());
  });

  it('shows empty state when no duels', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [], error: null }));
    const { getByText } = render(<DuelsScreen />);
    await waitFor(() => expect(getByText('No duels yet')).toBeTruthy());
  });

  it('renders duel rows with player names', async () => {
    const { getAllByText, getByText } = render(<DuelsScreen />);
    await waitFor(() => {
      expect(getAllByText('Alice').length).toBeGreaterThan(0);
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText('Carol')).toBeTruthy();
    });
  });

  it('shows Pick your photo status for challenger with no photo', async () => {
    const { getByText } = render(<DuelsScreen />);
    await waitFor(() => expect(getByText('Pick your photo')).toBeTruthy());
  });

  it('shows You won! for completed duel where user won', async () => {
    const { getByText } = render(<DuelsScreen />);
    await waitFor(() => expect(getByText('You won! 🏆')).toBeTruthy());
  });

  it('navigates to Duel screen on row press', async () => {
    const { getAllByText } = render(<DuelsScreen />);
    await waitFor(() => getAllByText('vs'));
    fireEvent.press(getAllByText('vs')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('Duel', { duelId: 'd1' });
  });
});
