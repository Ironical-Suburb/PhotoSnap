import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../../screens/game/HistoryScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (cb: any) => useEffect(cb, []) };
});

jest.mock('../../components/EncryptedImage', () => {
  const { View } = require('react-native');
  return ({ style }: any) => <View style={style} />;
});

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    get from() { return mockFrom; },
  },
}));

const MOCK_ROUND = {
  id: 'r1',
  guess_date: '2020-06-10',
  score: 850,
  resolved_at: new Date().toISOString(),
  photo_id: 'p1',
};

const MOCK_PHOTO = {
  id: 'p1',
  storage_url: 'https://example.com/photo.enc',
  actual_date: '2020-06-12',
  caption: 'Old memory',
  sender_id: 'user-x',
  sender: { display_name: 'Alice' },
};

describe('HistoryScreen', () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rounds') return makeQueryBuilder({ data: [MOCK_ROUND], error: null });
      if (table === 'photos') return makeQueryBuilder({ data: [MOCK_PHOTO], error: null });
      return makeQueryBuilder({ data: null, error: null });
    });
  });

  it('renders History title', async () => {
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => expect(getByText('History')).toBeTruthy());
  });

  it('shows empty state when no history', async () => {
    mockFrom.mockImplementation(() => makeQueryBuilder({ data: [], error: null }));
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => expect(getByText('No rounds yet')).toBeTruthy());
  });

  it('shows rounds played count', async () => {
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => expect(getByText(/rounds played/)).toBeTruthy());
  });
});
