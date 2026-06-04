// ─── Event codex (lifetime witnessed events) ──────────────────────────────────
//
// Permanent, save-independent record of every world event the player has ever
// witnessed — the "EVENTS" page of the collection. Same lazy-cache pattern and
// crash-safety as codex.ts / friends.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENT_CODEX_KEY } from './constants';
import { EVENT_IDS, isValidEventId } from './events';

const VALID = new Set<string>(EVENT_IDS);

let cache: Set<string> | null = null;

async function ensureLoaded(): Promise<Set<string>> {
  if (cache !== null) return cache;
  const set = new Set<string>();
  try {
    const raw = await AsyncStorage.getItem(EVENT_CODEX_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && VALID.has(item)) set.add(item);
        }
      }
    }
  } catch {
    // corrupt/missing → empty
  }
  cache = set;
  return set;
}

async function flush(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENT_CODEX_KEY, JSON.stringify([...set]));
  } catch {
    // best-effort
  }
}

export async function loadWitnessed(): Promise<Set<string>> {
  return new Set(await ensureLoaded());
}

/** Record a witnessed event. Returns true iff newly witnessed (first time ever). */
export async function recordWitnessed(eventId: string): Promise<boolean> {
  if (!isValidEventId(eventId)) return false;
  const set = await ensureLoaded();
  if (set.has(eventId)) return false;
  set.add(eventId);
  await flush(set);
  return true;
}

export function _resetEventCodexCache(): void {
  cache = null;
}
