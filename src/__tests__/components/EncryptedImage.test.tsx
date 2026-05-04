import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import EncryptedImage from '../../components/EncryptedImage';

const mockDecryptToLocalUri = jest.fn();

jest.mock('../../lib/crypto', () => ({
  decryptToLocalUri: (...args: any[]) => mockDecryptToLocalUri(...args),
}));

describe('EncryptedImage', () => {
  beforeEach(() => {
    mockDecryptToLocalUri.mockClear();
  });

  it('shows ActivityIndicator while decrypting', () => {
    mockDecryptToLocalUri.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId } = render(
      <EncryptedImage uri="https://example.com/photo.enc" />
    );
    expect(getByTestId('encrypted-image-loader')).toBeTruthy();
  });

  it('calls decryptToLocalUri with the provided uri', async () => {
    mockDecryptToLocalUri.mockResolvedValue('file:///cache/photo.jpg');
    render(<EncryptedImage uri="https://example.com/photo.enc" />);
    await waitFor(() => expect(mockDecryptToLocalUri).toHaveBeenCalledWith('https://example.com/photo.enc'));
  });

  it('renders Image after successful decryption', async () => {
    mockDecryptToLocalUri.mockResolvedValue('file:///cache/photo.jpg');
    const { getByTestId } = render(
      <EncryptedImage uri="https://example.com/photo.enc" />
    );
    await waitFor(() => expect(getByTestId('encrypted-image')).toBeTruthy());
  });

  it('hides loader after decryption', async () => {
    mockDecryptToLocalUri.mockResolvedValue('file:///cache/photo.jpg');
    const { queryByTestId } = render(
      <EncryptedImage uri="https://example.com/photo.enc" />
    );
    await waitFor(() => expect(queryByTestId('encrypted-image-loader')).toBeNull());
  });

  it('does not crash when decryption fails', async () => {
    mockDecryptToLocalUri.mockRejectedValue(new Error('Decrypt failed'));
    expect(() =>
      render(<EncryptedImage uri="https://example.com/bad.enc" />)
    ).not.toThrow();
  });
});
