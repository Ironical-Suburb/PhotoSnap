module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/navigation/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^react-native-safe-area-context$':
      '<rootDir>/src/__tests__/__mocks__/react-native-safe-area-context.ts',
    '^expo-linking$':
      '<rootDir>/src/__tests__/__mocks__/expo-linking.ts',
    '^@react-native-firebase/app$':
      '<rootDir>/src/__tests__/__mocks__/firebase-app.ts',
    '^@react-native-firebase/messaging$':
      '<rootDir>/src/__tests__/__mocks__/firebase-messaging.ts',
  },
};
