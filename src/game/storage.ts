import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_VERSION, STORAGE_KEY } from './constants';
import { RARITIES } from './evolution';
import type { PetState, PetType, Rarity } from './types';

// ─── Runtime validation ───────────────────────────────────────────────────────

const PET_TYPES: readonly PetType[] = ['plant', 'cat', 'dog'];
const VALID_CAUSES = [null, 'starvation', 'thirst', 'neglect'];

/** Returns true iff value is a finite number within [min, max] (inclusive). */
function isFiniteInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

/**
 * Validates every field of a parsed JSON value as a well-formed PetState.
 * Returns the validated state or null if ANY field is invalid.
 * This prevents NaN/corrupt stats from poisoning the engine and rejects
 * pre-v2 saves (whose version/shape won't match), routing them to selection.
 */
function validatePetState(parsed: unknown): PetState | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  const p = parsed as Record<string, unknown>;

  // ── Top-level scalar fields ───────────────────────────────────────────────
  if (typeof p.version !== 'number' || p.version !== CURRENT_VERSION) return null;
  if (!PET_TYPES.includes(p.petType as PetType)) return null;
  if (!RARITIES.includes(p.rarity as Rarity)) return null;
  if (typeof p.name !== 'string') return null;
  if (!isFiniteInRange(p.bornAt, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!isFiniteInRange(p.lastTick, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!isFiniteInRange(p.ageSeconds, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (typeof p.isDead !== 'boolean') return null;

  // causeOfDeath: null | 'starvation' | 'thirst' | 'neglect'
  if (!VALID_CAUSES.includes(p.causeOfDeath as string | null)) return null;

  // ── stats object ─────────────────────────────────────────────────────────
  if (typeof p.stats !== 'object' || p.stats === null) return null;
  const s = p.stats as Record<string, unknown>;

  for (const key of ['hunger', 'happiness', 'health', 'water'] as const) {
    if (!isFiniteInRange(s[key], 0, 100)) return null;
  }

  // ── Name sanitization (defensive, mirrors engine sanitizeName) ────────────
  const cleanedName = (p.name as string).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().slice(0, 20);
  const finalName = cleanedName.length > 0 ? cleanedName : 'Pixel';

  // ── events: tolerant ──────────────────────────────────────────────────────
  // The world-event aura was added after v3 shipped. Older v3 saves simply have
  // no `events` key → treat as empty rather than invalidating the save (so we
  // don't reset players twice). Reject only present-but-malformed data.
  let events: string[] = [];
  if (p.events !== undefined) {
    if (!Array.isArray(p.events)) return null;
    for (const e of p.events) {
      if (typeof e !== 'string') return null;
    }
    events = (p.events as string[]).slice(0, 50);
  }

  // All fields valid — construct the typed return value without an unsafe cast
  return {
    version: p.version as number,
    petType: p.petType as PetType,
    rarity: p.rarity as Rarity,
    name: finalName,
    bornAt: p.bornAt as number,
    lastTick: p.lastTick as number,
    ageSeconds: p.ageSeconds as number,
    isDead: p.isDead as boolean,
    causeOfDeath: p.causeOfDeath as PetState['causeOfDeath'],
    events,
    stats: {
      hunger: s.hunger as number,
      happiness: s.happiness as number,
      health: s.health as number,
      water: s.water as number,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadPet(): Promise<PetState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    return validatePetState(parsed);
  } catch {
    // Corrupt data or parse error — caller will show the selection screen
    return null;
  }
}

export async function savePet(state: PetState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort: storage errors are non-fatal
  }
}

export async function clearPet(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort: storage errors are non-fatal
  }
}
