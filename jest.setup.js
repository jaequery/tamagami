// Provide an in-memory AsyncStorage so modules that import it at load time
// (e.g. src/game/nearby.ts, src/game/friends.ts) can be unit-tested.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
