import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_VERSION, STORAGE_KEY } from './constants';
import type { LifeStage, PetState } from './types';

// ─── Runtime validation ───────────────────────────────────────────────────────

const LIFE_STAGES: readonly LifeStage[] = ['egg', 'baby', 'child', 'teen', 'adult'];

/** Returns true iff value is a finite number within [min, max] (inclusive). */
function isFiniteInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

/** Returns true iff value is a non-negative finite integer. */
function isNonNegativeInt(value: unknown): boolean {
  return typeof value === 'number' && isFinite(value) && value >= 0 && Math.floor(value) === value;
}

/**
 * Validates every field of a parsed JSON value as a well-formed PetState.
 * Returns the validated state or null if ANY field is invalid.
 * This prevents NaN/corrupt stats from poisoning the engine.
 */
function validatePetState(parsed: unknown): PetState | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  const p = parsed as Record<string, unknown>;

  // ── Top-level scalar fields ───────────────────────────────────────────────
  if (typeof p.version !== 'number' || p.version !== CURRENT_VERSION) return null;
  if (typeof p.name !== 'string') return null;
  if (!isFiniteInRange(p.bornAt, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!isFiniteInRange(p.lastTick, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!isFiniteInRange(p.ageSeconds, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (typeof p.isSick !== 'boolean') return null;
  if (typeof p.isSleeping !== 'boolean') return null;
  if (typeof p.isDead !== 'boolean') return null;

  // causeOfDeath: null | 'starvation' | 'sickness' | 'neglect'
  const validCauses = [null, 'starvation', 'sickness', 'neglect'];
  if (!validCauses.includes(p.causeOfDeath as string | null)) return null;

  // stage must be a known LifeStage
  if (!LIFE_STAGES.includes(p.stage as LifeStage)) return null;

  // poops: finite, non-negative integer
  if (!isNonNegativeInt(p.poops)) return null;

  // ── stats object ─────────────────────────────────────────────────────────
  if (typeof p.stats !== 'object' || p.stats === null) return null;
  const s = p.stats as Record<string, unknown>;

  for (const key of ['hunger', 'happiness', 'energy', 'hygiene', 'health'] as const) {
    if (!isFiniteInRange(s[key], 0, 100)) return null;
  }

  // ── Name sanitization (defensive, mirrors engine sanitizeName) ────────────
  const cleanedName = (p.name as string).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().slice(0, 20);
  const finalName = cleanedName.length > 0 ? cleanedName : 'Pixel';

  // All fields valid — construct the typed return value without an unsafe cast
  return {
    version: p.version as number,
    name: finalName,
    bornAt: p.bornAt as number,
    lastTick: p.lastTick as number,
    ageSeconds: p.ageSeconds as number,
    isSick: p.isSick as boolean,
    isSleeping: p.isSleeping as boolean,
    isDead: p.isDead as boolean,
    causeOfDeath: p.causeOfDeath as PetState['causeOfDeath'],
    stage: p.stage as LifeStage,
    poops: p.poops as number,
    stats: {
      hunger: s.hunger as number,
      happiness: s.happiness as number,
      energy: s.energy as number,
      hygiene: s.hygiene as number,
      health: s.health as number,
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
    // Corrupt data or parse error — caller will hatch a fresh pet
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
