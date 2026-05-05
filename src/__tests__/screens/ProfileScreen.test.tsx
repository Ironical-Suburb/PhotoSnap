import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

jest.mock('../../components/TabBar', () => () => null);
jest.mock('../../components/EncryptedImage', () => () => null);

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: any) => useEffect(cb, []),
  };
});

const mockFrom = jest.fn();
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } });

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      get getUser() { return mockGetUser; },
    },
    get from() { return mockFrom; },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } }),
      }),
    },
  },
}));

jest.mock('../../lib/crypto', () => ({ backupKey: jest.fn().mockResolvedValue(undefined) }));

const MOCK_PROFILE = {
  id: 'u1', display_name: 'TestUser', email: 'test@test.com',
  avatar_url: null, push_token: null, created_at: new Date().toISOString(),
  backup_enabled: false, current_streak: 5,
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return makeQueryBuilder({ data: MOCK_PROFILE, error: null });
      if (table === 'photos') return makeQueryBuilder({ data: [], error: null });
      if (table === 'friendships') return makeQueryBuilder({ data: null, error: null, count: 3 });
      return makeQueryBuilder({ data: null, error: null });
    });
  });

  it('shows the user display name', async () => {
    const { getAllByText } = render(<ProfileScreen />);
    await waitFor(() => expect(getAllByText('TestUser').length).toBeGreaterThan(0));
  });

  it('shows streak stat', async () => {
    const { getByText } = render(<ProfileScreen />);
    await waitFor(() => expect(getByText('Streak')).toBeTruthy());
  });

  it('shows posts stat label', async () => {
    const { getByText } = render(<ProfileScreen />);
    await waitFor(() => expect(getByText('Posts')).toBeTruthy());
  });

  it('shows friends stat label', async () => {
    const { getByText } = render(<ProfileScreen />);
    await waitFor(() => expect(getByText('Friends')).toBeTruthy());
  });

  it('shows Me title in top bar', async () => {
    const { getByText } = render(<ProfileScreen />);
    await waitFor(() => expect(getByText('Me')).toBeTruthy());
  });
});
