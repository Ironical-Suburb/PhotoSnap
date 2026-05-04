import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../screens/game/HomeScreen';
import { makeQueryBuilder } from '../__mocks__/supabase';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: any) => useEffect(cb, []),
    useRoute: () => ({ name: 'Home', params: {} }),
  };
});

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    get from() { return mockFrom; },
  },
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rounds') return makeQueryBuilder({ data: null, error: null, count: 2 });
      if (table === 'users') return makeQueryBuilder({ data: { display_name: 'TestUser' }, error: null });
      return makeQueryBuilder({ data: null, error: null });
    });
  });

  it('renders a greeting', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() =>
      expect(getByText(/Good (morning|afternoon|evening)/)).toBeTruthy()
    );
  });

  it('shows the user display name', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => expect(getByText('TestUser')).toBeTruthy());
  });

  it('shows all quick-grid items', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText('League')).toBeTruthy();
      expect(getByText('Duels')).toBeTruthy();
      expect(getByText('History')).toBeTruthy();
      expect(getByText('Drafts')).toBeTruthy();
    });
  });

  it('navigates to League when League card is pressed', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => getByText('League'));
    fireEvent.press(getByText('League'));
    expect(mockNavigate).toHaveBeenCalledWith('League');
  });

  it('navigates to Duels when Duels card is pressed', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => getByText('Duels'));
    fireEvent.press(getByText('Duels'));
    expect(mockNavigate).toHaveBeenCalledWith('Duels');
  });

  it('navigates to Challenges when main card is pressed', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => getByText('CHALLENGES'));
    fireEvent.press(getByText('CHALLENGES'));
    expect(mockNavigate).toHaveBeenCalledWith('Challenges');
  });

  it('navigates to Profile when avatar is pressed', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => getByText('T')); // first letter of TestUser
    fireEvent.press(getByText('T'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });
});
