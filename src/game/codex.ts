// ─── Codex (collection) persistence ───────────────────────────────────────────
//
// A permanent local record of every form (petType × rarity) the player has ever
// hatched. Stored separately from the pet save so it survives reset/restart and
// death — your collection is forever, which is the whole point of collecting.
//
// Mirrors the friends.ts pattern: an in-memory cache loaded lazily, kept
// authoritative thereafter, so the hot path (recording a hatch) doesn't re-read
// AsyncStorage. Fully crash-safe: storage errors degrade to an empty/unsaved
// codex rather than throwing into the UI.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CODEX_KEY } from './constants';
import { ALL_FORMS, type FormId } from './evolution';

const VALID_FORM_IDS = new Set<FormId>(ALL_FORMS.map((f) => f.id));

let cache: Set<FormId> | null = null;

async function ensureLoaded(): Promise<Set<FormId>> {
  if (cache !== null) return cache;
  const set = new Set<FormId>();
  try {
    const raw = await AsyncStorage.getItem(CODEX_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && VALID_FORM_IDS.has(item)) set.add(item);
        }
      }
    }
  } catch {
    // corrupt/missing → start empty
  }
  cache = set;
  return set;
}

async function flush(set: Set<FormId>): Promise<void> {
  try {
    await AsyncStorage.setItem(CODEX_KEY, JSON.stringify([...set]));
  } catch {
    // best-effort; cache stays authoritative in-memory until next launch
  }
}

/** All discovered form ids (a copy — callers may freely read/iterate). */
export async function loadDiscovered(): Promise<Set<FormId>> {
  return new Set(await ensureLoaded());
}

/**
 * Record a hatched form. Returns true iff it was newly discovered (so the UI can
 * flash "NEW!" only the first time you see a form).
 */
export async function recordDiscovered(formId: FormId): Promise<boolean> {
  if (!VALID_FORM_IDS.has(formId)) return false;
  const set = await ensureLoaded();
  if (set.has(formId)) return false;
  set.add(formId);
  await flush(set);
  return true;
}

/** Test/dev helper: drop the in-memory cache so the next load re-reads storage. */
export function _resetCodexCache(): void {
  cache = null;
}
