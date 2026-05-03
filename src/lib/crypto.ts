import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoCrypto from 'expo-crypto';
import * as aesjs from 'aes-js';
import { supabase } from './supabase';

// ─── Base64 helpers (chunked to avoid stack overflow on large files) ───────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Key management ───────────────────────────────────────────────────────────
// Fixed app-level key derived from SHA-256 of a constant seed.
// All users share the same key so photos are viewable across devices.

let _cachedKey: Uint8Array | null = null;

export async function getOrCreateKey(): Promise<Uint8Array> {
  if (_cachedKey) return _cachedKey;
  const hex = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    'PhotoSnapV1AppSharedKey2025FixedForAllUsers',
  );
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  _cachedKey = bytes;
  return bytes;
}

export async function backupKey(_userId: string): Promise<void> {}
export async function restoreKeyFromBackup(_userId: string): Promise<boolean> { return true; }
export async function hasLocalKey(): Promise<boolean> { return true; }

// ─── Encrypt ──────────────────────────────────────────────────────────────────

function pkcs7Pad(bytes: Uint8Array): Uint8Array {
  const pad = 16 - (bytes.length % 16);
  const padded = new Uint8Array(bytes.length + pad);
  padded.set(bytes);
  padded.fill(pad, bytes.length);
  return padded;
}

function pkcs7Strip(bytes: Uint8Array): Uint8Array {
  const pad = bytes[bytes.length - 1];
  return bytes.slice(0, bytes.length - pad);
}

export async function encryptFileToBase64(localUri: string): Promise<string> {
  const key = await getOrCreateKey();

  const b64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64' as any,
  });
  const plainBytes = base64ToBytes(b64);
  const padded = pkcs7Pad(plainBytes);

  const iv = await ExpoCrypto.getRandomBytesAsync(16);

  const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
  const encrypted = aesCbc.encrypt(padded);

  const combined = new Uint8Array(16 + encrypted.length);
  combined.set(iv, 0);
  combined.set(encrypted, 16);

  return bytesToBase64(combined);
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

const decryptCache = new Map<string, string>();

export async function decryptToLocalUri(storageUrl: string): Promise<string> {
  // Return from in-memory cache first
  if (decryptCache.has(storageUrl)) return decryptCache.get(storageUrl)!;

  const key = await getOrCreateKey();

  // Stable cache filename based on URL hash
  const urlHash = storageUrl.replace(/[^a-zA-Z0-9]/g, '').slice(-32);
  const cachedPath = `${FileSystem.cacheDirectory}ps_dec_${urlHash}.jpg`;

  const info = await FileSystem.getInfoAsync(cachedPath);
  if (info.exists) {
    decryptCache.set(storageUrl, cachedPath);
    return cachedPath;
  }

  // Download encrypted file — try signed URL first to support private buckets
  const tempPath = `${FileSystem.cacheDirectory}ps_enc_${Date.now()}.bin`;
  const storagePath = storageUrl.match(/\/Photos\/(.+)$/)?.[1];
  let downloadUrl = storageUrl;
  if (storagePath) {
    const { data: signed } = await supabase.storage.from('Photos').createSignedUrl(storagePath, 3600);
    if (signed?.signedUrl) downloadUrl = signed.signedUrl;
  }
  const dlResult = await FileSystem.downloadAsync(downloadUrl, tempPath);
  if (dlResult.status !== 200) throw new Error(`Download failed: ${dlResult.status}`);

  const b64 = await FileSystem.readAsStringAsync(tempPath, {
    encoding: 'base64' as any,
  });
  await FileSystem.deleteAsync(tempPath, { idempotent: true });

  const combined = base64ToBytes(b64);

  // Extract IV and ciphertext
  const iv = combined.slice(0, 16);
  const cipherBytes = combined.slice(16);

  // Decrypt
  const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
  const decryptedPadded = aesCbc.decrypt(cipherBytes);
  const decrypted = pkcs7Strip(decryptedPadded);

  // Write decrypted image to cache
  await FileSystem.writeAsStringAsync(cachedPath, bytesToBase64(decrypted), {
    encoding: 'base64' as any,
  });

  decryptCache.set(storageUrl, cachedPath);
  return cachedPath;
}

export function clearDecryptCache() {
  decryptCache.clear();
}
