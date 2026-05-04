import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import LeagueScreen from '../../screens/game/LeagueScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
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

describe('LeagueScreen', () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friendships') return makeQueryBuilder({ data: [], error: null });
      if (table === 'rounds') return makeQueryBuilder({ data: [], error: null });
      if (table === 'users') return makeQueryBuilder({ data: [{ id: 'user-a', display_name: 'Alice' }], error: null });
      return makeQueryBuilder({ data: null, error: null });
    });
  });

  it('renders the Accuracy League title', async () => {
    const { getByText } = render(<LeagueScreen />);
    await waitFor(() => expect(getByText('Accuracy League')).toBeTruthy());
  });

  it('renders all four tier names in the legend', async () => {
    const { getAllByText } = render(<LeagueScreen />);
    await waitFor(() => {
      // Diamond/Gold/Silver/Bronze appear in legend and in hero card — getAllByText is fine
      expect(getAllByText('Diamond').length).toBeGreaterThan(0);
      expect(getAllByText('Gold').length).toBeGreaterThan(0);
      expect(getAllByText('Silver').length).toBeGreaterThan(0);
      expect(getAllByText('Bronze').length).toBeGreaterThan(0);
    });
  });

  it('shows FRIENDS THIS WEEK section', async () => {
    const { getByText } = render(<LeagueScreen />);
    await waitFor(() => expect(getByText('FRIENDS THIS WEEK')).toBeTruthy());
  });

  it('shows unranked prompt when user has no rounds this week', async () => {
    const { getByText } = render(<LeagueScreen />);
    await waitFor(() =>
      expect(getByText('Make a guess this week to rank')).toBeTruthy()
    );
  });

  it('shows Unranked tier when rounds === 0', async () => {
    const { getAllByText } = render(<LeagueScreen />);
    await waitFor(() => expect(getAllByText('Unranked').length).toBeGreaterThan(0));
  });

  it('shows player in standings list', async () => {
    const { getByText } = render(<LeagueScreen />);
    await waitFor(() => expect(getByText('Alice (you)')).toBeTruthy());
  });

  it('renders tier ranges in legend', async () => {
    const { getByText } = render(<LeagueScreen />);
    await waitFor(() => expect(getByText('800+ avg')).toBeTruthy());
  });
});
