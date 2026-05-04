import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ChallengesScreen from '../../screens/game/ChallengesScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: any) => useEffect(cb, []),
  };
});

jest.mock('../../components/TabBar', () => () => null);
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
  photo_id: 'p1',
  created_at: new Date().toISOString(),
  photos: {
    storage_url: 'https://example.com/photo.enc',
    users: { display_name: 'Alice' },
    sender: { display_name: 'Alice' },
  },
};

describe('ChallengesScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rounds') return makeQueryBuilder({ data: [MOCK_ROUND], error: null });
      if (table === 'messages') return makeQueryBuilder({ data: [], error: null });
      if (table === 'users') return makeQueryBuilder({ data: [], error: null });
      return makeQueryBuilder({ data: null, error: null });
    });
  });

  it('renders the Inbox title', async () => {
    const { getByText } = render(<ChallengesScreen />);
    await waitFor(() => expect(getByText('Inbox')).toBeTruthy());
  });

  it('shows challenge waiting count', async () => {
    const { getByText } = render(<ChallengesScreen />);
    await waitFor(() => expect(getByText(/challenge.*waiting/)).toBeTruthy());
  });

  it('shows all caught up when no challenges', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') return makeQueryBuilder({ data: [], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const { getByText } = render(<ChallengesScreen />);
    await waitFor(() => expect(getByText('All caught up!')).toBeTruthy());
  });

  it('shows sender name in challenge row', async () => {
    const { getByText } = render(<ChallengesScreen />);
    await waitFor(() => expect(getByText('From Alice')).toBeTruthy());
  });

  it('navigates to Guess screen when challenge row pressed', async () => {
    const { getByText } = render(<ChallengesScreen />);
    await waitFor(() => getByText('From Alice'));
    fireEvent.press(getByText('From Alice'));
    expect(mockNavigate).toHaveBeenCalledWith('Guess', { roundId: 'r1' });
  });
});
