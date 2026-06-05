// ─── Moment codex (lifetime caught moments, §4 catch-and-keep) ─────────────────
//
// Permanent, save-independent record of every daily moment / milestone the player
// has ever caught — the collection hunt that makes the daily peek pay off. Same
// lazy-cache + crash-safety pattern as eventCodex.ts / codex.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOMENT_CODEX_KEY } from './constants';
import { MOMENT_IDS, isValidMomentId } from './moments';

const VALID = new Set<string>(MOMENT_IDS);

let cache: Set<string> | null = null;

async function ensureLoaded(): Promise<Set<string>> {
  if (cache !== null) return cache;
  const set = new Set<string>();
  try {
    const raw = await AsyncStorage.getItem(MOMENT_CODEX_KEY);
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
    await AsyncStorage.setItem(MOMENT_CODEX_KEY, JSON.stringify([...set]));
  } catch {
    // best-effort
  }
}

export async function loadCaughtMoments(): Promise<Set<string>> {
  return new Set(await ensureLoaded());
}

/** Record a caught moment. Returns true iff newly caught (first time ever). */
export async function recordCaughtMoment(momentId: string): Promise<boolean> {
  if (!isValidMomentId(momentId)) return false;
  const set = await ensureLoaded();
  if (set.has(momentId)) return false;
  set.add(momentId);
  await flush(set);
  return true;
}

export function _resetMomentCodexCache(): void {
  cache = null;
}
