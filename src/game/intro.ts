// ─── Intro seen (cold-open gating, §1–3) ───────────────────────────────────────
//
// Tracks which pets (by birth timestamp) have already played their cold-open birth
// cinematic, so it plays exactly once per pet — at first adoption and again for
// each new heir — while returning users skip straight to their pet. Save-
// independent + crash-safe, mirroring the codex caches.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { INTRO_SEEN_KEY } from './constants';

let cache: Set<number> | null = null;

async function ensureLoaded(): Promise<Set<number>> {
  if (cache !== null) return cache;
  const set = new Set<number>();
  try {
    const raw = await AsyncStorage.getItem(INTRO_SEEN_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'number' && isFinite(item)) set.add(item);
        }
      }
    }
  } catch {
    // corrupt/missing → empty
  }
  cache = set;
  return set;
}

export async function hasSeenIntro(bornAt: number): Promise<boolean> {
  return (await ensureLoaded()).has(bornAt);
}

/** Mark a pet's cold open as seen. Caps the log so it can't grow unbounded. */
export async function markIntroSeen(bornAt: number): Promise<void> {
  const set = await ensureLoaded();
  if (set.has(bornAt)) return;
  set.add(bornAt);
  // Keep only the most recent 50 birth stamps — far more than any live lineage.
  const trimmed = [...set].slice(-50);
  cache = new Set(trimmed);
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, JSON.stringify(trimmed));
  } catch {
    // best-effort; cache stays authoritative
  }
}

export function _resetIntroCache(): void {
  cache = null;
}
