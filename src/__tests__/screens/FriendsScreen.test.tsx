import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import FriendsScreen from '../../screens/friends/FriendsScreen';
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

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    get from() { return mockFrom; },
  },
}));

const MOCK_FRIENDSHIP = { id: 'f1', sender_id: 'u1', receiver_id: 'user-b' };
const MOCK_USER = {
  id: 'user-b', display_name: 'Bob', avatar_url: null,
  email: 'bob@test.com', created_at: new Date().toISOString(), push_token: null,
};

describe('FriendsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friendships') return makeQueryBuilder({ data: [MOCK_FRIENDSHIP], error: null, count: 0 });
      if (table === 'users') return makeQueryBuilder({ data: [MOCK_USER], error: null });
      if (table === 'duels') return makeQueryBuilder({ data: { id: 'duel-1' }, error: null });
      return makeQueryBuilder({ data: null, error: null });
    });
  });

  it('renders Friends title', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('Friends')).toBeTruthy());
  });

  it('shows a friend in the list', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('Bob')).toBeTruthy());
  });

  it('shows empty state when no friends', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friendships') return makeQueryBuilder({ data: [], error: null, count: 0 });
      return makeQueryBuilder({ data: null, error: null });
    });
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('No friends yet')).toBeTruthy());
  });

  it('navigates to FriendSearch when add button pressed', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => getByText('Friends'));
    fireEvent.press(getByText('+ Add'));
    expect(mockNavigate).toHaveBeenCalledWith('FriendSearch');
  });
});
