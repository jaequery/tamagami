import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSeenIntro, markIntroSeen, _resetIntroCache } from './intro';

beforeEach(async () => {
  _resetIntroCache();
  await AsyncStorage.clear();
});

describe('intro seen (cold-open gating)', () => {
  it('a brand-new pet has not seen its intro', async () => {
    expect(await hasSeenIntro(1_700_000_000_000)).toBe(false);
  });

  it('marking a pet seen persists and is idempotent', async () => {
    await markIntroSeen(1_700_000_000_000);
    expect(await hasSeenIntro(1_700_000_000_000)).toBe(true);
    await markIntroSeen(1_700_000_000_000); // no-op second time
    expect(await hasSeenIntro(1_700_000_000_000)).toBe(true);
  });

  it('tracks heirs independently by birth timestamp', async () => {
    await markIntroSeen(1_700_000_000_000);
    // A new heir (different bornAt) still needs to play its own cold open.
    expect(await hasSeenIntro(1_700_000_000_999)).toBe(false);
  });

  it('survives a cache reset by reloading from storage', async () => {
    await markIntroSeen(42);
    _resetIntroCache();
    expect(await hasSeenIntro(42)).toBe(true);
  });
});
