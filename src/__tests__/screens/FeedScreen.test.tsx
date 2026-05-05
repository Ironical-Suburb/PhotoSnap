import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import FeedScreen from '../../screens/game/FeedScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: any) => useEffect(cb, []),
    useRoute: () => ({ name: 'Feed', params: {} }),
  };
});

jest.mock('../../components/EncryptedImage', () => {
  const { View } = require('react-native');
  return ({ style }: any) => <View style={style} />;
});

const mockFrom = jest.fn();
const mockChannel = { on: jest.fn().mockReturnThis(), subscribe: jest.fn() };

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    get from() { return mockFrom; },
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}));

const MOCK_POST = {
  id: 'post-1',
  sender_id: 'user-x',
  storage_url: 'https://example.com/photo.enc',
  actual_date: '2020-06-15',
  challenge_type: 'date',
  created_at: new Date(Date.now() - 3600000).toISOString(),
  is_post: true,
  caption: 'Hello world',
  sender: { id: 'user-x', display_name: 'Alice', avatar_url: null, current_streak: 3 },
  post_likes: [],
  post_reactions: [],
};

function setupMocks(photosData: any[] = [MOCK_POST]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'friendships') return makeQueryBuilder({ data: [], error: null });
    if (table === 'daily_moments') return makeQueryBuilder({ data: null, error: null });
    if (table === 'photos') return makeQueryBuilder({ data: photosData, error: null });
    if (table === 'rounds') return makeQueryBuilder({ data: [], error: null, count: 0 });
    return makeQueryBuilder({ data: null, error: null });
  });
}

describe('FeedScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setupMocks();
  });

  it('renders feed posts with sender name', async () => {
    const { getAllByText } = render(<FeedScreen />);
    // 'Alice' appears in both the stories strip and the card header
    await waitFor(() => expect(getAllByText('Alice').length).toBeGreaterThan(0));
  });

  it('shows post caption', async () => {
    const { getByText } = render(<FeedScreen />);
    await waitFor(() => expect(getByText('Hello world')).toBeTruthy());
  });

  it('shows streak badge when sender has an active streak', async () => {
    const { getByText } = render(<FeedScreen />);
    // streak count rendered as separate Text node alongside 🔥 fire
    await waitFor(() => expect(getByText('3')).toBeTruthy());
  });

  it('shows empty state when there are no posts', async () => {
    setupMocks([]);
    const { getByText } = render(<FeedScreen />);
    await waitFor(() => expect(getByText('Nothing here yet')).toBeTruthy());
  });

  it('shows date challenge badge on post', async () => {
    const { getByText } = render(<FeedScreen />);
    await waitFor(() => expect(getByText('Guess the date')).toBeTruthy());
  });

  it('shows reaction emoji buttons', async () => {
    const { getAllByText } = render(<FeedScreen />);
    // 🔥 appears in both streak pill and reaction row
    await waitFor(() => {
      expect(getAllByText('🔥').length).toBeGreaterThan(0);
      expect(getAllByText('😂').length).toBeGreaterThan(0);
    });
  });

  it('shows location challenge badge for location posts', async () => {
    setupMocks([{ ...MOCK_POST, challenge_type: 'location' }]);
    const { getByText } = render(<FeedScreen />);
    await waitFor(() => expect(getByText('Guess the location')).toBeTruthy());
  });
});
