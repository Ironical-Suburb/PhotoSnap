import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/auth/LoginScreen';

const mockSignIn = jest.fn().mockResolvedValue({ error: null });
const mockSignUp = jest.fn().mockResolvedValue({ error: null });

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
    },
  },
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockSignUp.mockClear();
  });

  it('renders sign-in mode by default', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Welcome back')).toBeTruthy();
  });

  it('switches to sign-up mode', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('  Sign Up'));
    expect(getByText('Create account')).toBeTruthy();
  });

  it('switches back to sign-in mode', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('  Sign Up'));
    fireEvent.press(getByText('  Sign In'));
    expect(getByText('Welcome back')).toBeTruthy();
  });

  it('calls signInWithPassword with entered credentials', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
    );
  });

  it('calls signUp when in sign-up mode', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('  Sign Up'));
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'newpass123');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@test.com', password: 'newpass123' })
      )
    );
  });

  it('renders tagline text', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Send a photo. Let them guess when.')).toBeTruthy();
  });
});
