import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TabBar from '../../components/TabBar';
import { CommonActions } from '@react-navigation/native';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), dispatch: mockDispatch }),
  useRoute: () => ({ name: 'Feed', params: {} }),
  CommonActions: { reset: jest.fn((args: any) => ({ type: 'RESET', ...args })) },
}));

describe('TabBar', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    (CommonActions.reset as jest.Mock).mockClear();
  });

  it('renders all text tab labels', () => {
    const { getByText } = render(<TabBar />);
    expect(getByText('Feed')).toBeTruthy();
    expect(getByText('Inbox')).toBeTruthy();
    expect(getByText('Friends')).toBeTruthy();
    expect(getByText('Me')).toBeTruthy();
    // Upload/Post tab renders only an icon button, no text label
  });

  it('navigates to Feed when Feed tab is pressed', () => {
    const { getByText } = render(<TabBar />);
    fireEvent.press(getByText('Feed'));
    expect(CommonActions.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Feed' }] });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('navigates to Challenges when Inbox tab is pressed', () => {
    const { getByText } = render(<TabBar />);
    fireEvent.press(getByText('Inbox'));
    expect(CommonActions.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Challenges' }] });
  });

  it('navigates to Friends when Friends tab is pressed', () => {
    const { getByText } = render(<TabBar />);
    fireEvent.press(getByText('Friends'));
    expect(CommonActions.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Friends' }] });
  });

  it('navigates to Profile when Me tab is pressed', () => {
    const { getByText } = render(<TabBar />);
    fireEvent.press(getByText('Me'));
    expect(CommonActions.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Profile' }] });
  });

  it('shows challenge badge when challengeCount > 0', () => {
    const { getByText } = render(<TabBar challengeCount={3} />);
    expect(getByText('3')).toBeTruthy();
  });

  it('does not show badge when challengeCount is 0', () => {
    const { queryByText } = render(<TabBar challengeCount={0} />);
    expect(queryByText('0')).toBeNull();
  });
});
