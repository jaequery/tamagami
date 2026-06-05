import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_VERSION, STORAGE_KEY } from './constants';
import { RARITIES } from './evolution';
import { isOriginId, rollOrigin } from './origins';
import { isHouseholdId, rollHousehold } from './household';
import { BOND_SEED } from './bond';
import { OWNER_MOOD_SEED } from './ownerLife';
import {
  defaultEconomy,
  jobById,
  MAX_EDUCATION,
} from './economy';
import type { PetEconomy, PetState, PetType, Rarity } from './types';

// ─── Runtime validation ───────────────────────────────────────────────────────

// Cat-only now. A legacy plant/dog save fails this check and routes to selection
// (a fresh cat) — the same intentional no-migration policy as past type changes.
const PET_TYPES: readonly PetType[] = ['cat'];
const VALID_CAUSES = [null, 'starvation', 'neglect', 'oldAge', 'illness'];

/** Returns true iff value is a finite number within [min, max] (inclusive). */
function isFiniteInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

/**
 * Coerce a parsed `economy` blob into a valid PetEconomy. Lenient by design —
 * the economy was added after v3 shipped, so a missing or partly-malformed
 * economy is repaired to sane defaults rather than invalidating the whole save
 * (which would needlessly reset the player's pet). Mirrors the events/generation
 * tolerance policy. Unknown job ids and out-of-range numbers fall back cleanly.
 */
function validateEconomy(raw: unknown): PetEconomy {
  const base = defaultEconomy();
  if (typeof raw !== 'object' || raw === null) return base;
  const e = raw as Record<string, unknown>;

  const coins = isFiniteInRange(e.coins, 0, Number.MAX_SAFE_INTEGER) ? (e.coins as number) : base.coins;
  const education = isFiniteInRange(e.education, 0, MAX_EDUCATION) ? Math.floor(e.education as number) : 0;

  // A job id is only honored if it still exists in the table.
  const jobId = typeof e.jobId === 'string' && jobById(e.jobId) !== null ? e.jobId : null;

  // Shift state is only meaningful while clocked in to a known job.
  const clockedInAt = jobId !== null && isFiniteInRange(e.clockedInAt, 0, Number.MAX_SAFE_INTEGER)
    ? (e.clockedInAt as number)
    : null;
  const shiftSeconds = clockedInAt !== null && isFiniteInRange(e.shiftSeconds, 0, Number.MAX_SAFE_INTEGER)
    ? (e.shiftSeconds as number)
    : 0;

  // Study state is only meaningful as a (id, endsAt) pair.
  const studyId = typeof e.studyId === 'string' ? e.studyId : null;
  const studyEndsAt = studyId !== null && isFiniteInRange(e.studyEndsAt, 0, Number.MAX_SAFE_INTEGER)
    ? (e.studyEndsAt as number)
    : null;
  const studyValid = studyId !== null && studyEndsAt !== null;

  return {
    coins,
    education,
    jobId,
    clockedInAt,
    shiftSeconds,
    studyId: studyValid ? studyId : null,
    studyEndsAt: studyValid ? studyEndsAt : null,
  };
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

  // ── generation: tolerant ──────────────────────────────────────────────────
  // Added with the lineage system after v3 shipped. Missing → a founder (gen 1).
  // Reject only present-but-invalid so a bad value can't break the family tree.
  let generation = 1;
  if (p.generation !== undefined) {
    if (!isFiniteInRange(p.generation, 1, Number.MAX_SAFE_INTEGER)) return null;
    generation = Math.floor(p.generation as number);
  }

  // ── origin + household: tolerant, and self-healing ────────────────────────
  // The life-story facts (GAME.md §1–2) were added after v3 shipped. Both are
  // pure deterministic rolls off the (validated) birth identity, so a missing or
  // malformed value isn't a reason to reset the player's pet — we simply re-derive
  // the exact same origin/household it would have had. No save-version bump,
  // matching the events / generation / economy tolerance policy.
  const origin = isOriginId(p.origin)
    ? (p.origin as string)
    : rollOrigin(p.bornAt as number, finalName, p.petType as PetType, p.rarity as Rarity);
  const household = isHouseholdId(p.household)
    ? (p.household as string)
    : rollHousehold(p.bornAt as number, finalName, p.petType as PetType);

  // ── bond / ownerMood / lastTreatedDay: tolerant (§3/§5/§9) ────────────────
  // Added after v3 shipped — repaired to their seeds rather than invalidating an
  // otherwise-valid save (same policy as events/generation/economy). Present-but-
  // out-of-range values are clamped to the valid window, not rejected.
  const bond = isFiniteInRange(p.bond, 0, 100) ? (p.bond as number) : BOND_SEED;
  const ownerMood = isFiniteInRange(p.ownerMood, 0, 100) ? (p.ownerMood as number) : OWNER_MOOD_SEED;
  const lastTreatedDay = isFiniteInRange(p.lastTreatedDay, 0, Number.MAX_SAFE_INTEGER)
    ? Math.floor(p.lastTreatedDay as number)
    : null;

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
    generation,
    origin,
    household,
    bond,
    ownerMood,
    lastTreatedDay,
    economy: validateEconomy(p.economy),
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
