// ─── Gift (deep-link welcome luck) ─────────────────────────────────────────────
//
// When someone shares their pet, the message carries a deep link like
//   tamagami://hatch?type=cat&rarity=rare
// Tapping it (after install) opens the app and leaves a one-time "gift": extra
// rarity luck on the recipient's NEXT hatch, scaled by the shared pet's rarity.
// That's the payoff that closes the loop — you don't just install, you arrive to
// a luckier first egg because a friend's rare pet blessed it.
//
// Stored in AsyncStorage so it survives the cold-open gap between tapping the
// link and hatching, and is consumed exactly once.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GIFT_KEY, GIFT_LUCK_CAP } from './constants';
import { rarityRank } from './evolution';
import type { Rarity } from './types';

/**
 * Luck a shared pet of `rarity` gifts the recipient's next egg. Always at least
 * 1 (a friendly "welcome" bump for clicking through), capped so it stays a nudge.
 */
export function giftLuckFromRarity(rarity: Rarity): number {
  return Math.min(Math.max(rarityRank(rarity), 1), GIFT_LUCK_CAP);
}

export async function setPendingGiftLuck(luck: number): Promise<void> {
  const n = Math.max(0, Math.floor(luck));
  try {
    await AsyncStorage.setItem(GIFT_KEY, String(n));
  } catch {
    // best-effort — a missed gift just means a normal hatch
  }
}

/** Read and clear the pending gift luck (0 if none). One-shot. */
export async function consumeGiftLuck(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(GIFT_KEY);
    if (raw === null) return 0;
    await AsyncStorage.removeItem(GIFT_KEY);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
