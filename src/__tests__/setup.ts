import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///test/',
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/test.enc' }),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mocked-hash-hex'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
}));

// Mock @expo/vector-icons — no JSX so this file stays .ts
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => {});
