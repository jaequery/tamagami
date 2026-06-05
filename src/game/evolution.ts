// ─── Evolution: rarity + life stages ─────────────────────────────────────────
//
// The "new + mysterious" engine layered on top of the care loop. Two ideas:
//
//  1. RARITY — rolled once at birth from a stable seed, then hidden inside the
//     egg until it hatches. Drives the pet's LCD palette (game/palettes.ts) and
//     its codex entry. The roll is DETERMINISTIC (a hash of the birth identity),
//     so it never changes across reloads and the engine stays pure/testable —
//     but it's unpredictable to the player, which is all "random" needs to mean.
//
//  2. LIFE STAGE — derived purely from ageSeconds, never stored, so it can't
//     drift from the clock. Each crossing (egg→baby→…) is a reveal the UI
//     celebrates. The egg hatches fast (EGG threshold) so a brand-new player
//     feels the first "what did I get?!" gasp inside their first session; later
//     stages stretch out to give long-term players something to keep alive for.
//
// Both pieces are local-only and deterministic — no backend, no Math.random.

import type { LifeStage, PetType, Rarity } from './types';

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'secret'];

// ─── Rarity weights ───────────────────────────────────────────────────────────
// Probability mass per rarity (must sum to 1). Tuned so common is the default
// experience, rare feels like a real find, and secret is a once-in-a-hundred
// "you have to show someone" moment — the share trigger.
const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 0.6,
  uncommon: 0.25,
  rare: 0.1,
  epic: 0.04,
  secret: 0.01,
};

// ─── Deterministic seed hash (FNV-1a, 32-bit) → unit float in [0, 1) ──────────
// Small, fast, dependency-free, well-distributed for short string seeds. Exported
// so the other deterministic life-story engines (origins.ts, household.ts) roll
// off the same primitive — one hash, no Math.random anywhere.
export function hashUnit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts (stays in JS safe integer range)
    h = Math.imul(h, 0x01000193);
  }
  // h is a signed 32-bit int; fold to unsigned then normalize to [0, 1)
  return (h >>> 0) / 0x100000000;
}

/**
 * The stable seed for a pet's rarity roll. Built from the birth identity so two
 * pets born at the same instant with the same name/type still differ rarely, and
 * a given pet always re-rolls to the same rarity. Restarting (a new bornAt) is a
 * fresh roll — that's the lineage tease: the next egg might be the rare one.
 */
export function raritySeed(bornAt: number, name: string, petType: PetType): string {
  return `${bornAt}:${petType}:${name}`;
}

/** Map a unit float (or a seed string) to a weighted rarity bucket. */
export function rarityFromUnit(unit: number): Rarity {
  let acc = 0;
  for (const r of RARITIES) {
    acc += RARITY_WEIGHTS[r];
    if (unit < acc) return r;
  }
  return 'common'; // float-rounding safety net
}

export function rollRarity(bornAt: number, name: string, petType: PetType): Rarity {
  return rarityFromUnit(hashUnit(raritySeed(bornAt, name, petType)));
}

// ─── Rarity ordering + inheritance ────────────────────────────────────────────

/** 0 (common) … 4 (secret). */
export function rarityRank(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}

/** The rarer of two rarities. */
export function rarer(a: Rarity, b: Rarity): Rarity {
  return rarityRank(a) >= rarityRank(b) ? a : b;
}

/**
 * Rarity roll with `luck` extra independent rolls — the best wins. luck 0 is a
 * plain single roll (identical to rollRarity), so this is a drop-in. Each point
 * of luck comes from a rare-or-better friend (the social charm), so a collector
 * who's met rare pets breeds luckier eggs. Deterministic given (seed, luck).
 */
export function rollRarityWithLuck(
  bornAt: number,
  name: string,
  petType: PetType,
  luck: number,
): Rarity {
  let best = rollRarity(bornAt, name, petType);
  for (let i = 0; i < luck; i++) {
    best = rarer(best, rarityFromUnit(hashUnit(`luck${i}:${bornAt}:${petType}:${name}`)));
  }
  return best;
}

/**
 * Heir rarity for a continued bloodline. The line "remembers its luck": the heir
 * takes the rarer of two independent rolls (its base roll already includes any
 * social charm via `luck`), and 25% of the time also floors at the parent's
 * rarity — so a line that once reached a rare form is much likelier to see it
 * again, and a secret line stays special. Deterministic.
 */
export function rollHeirRarity(
  bornAt: number,
  name: string,
  petType: PetType,
  parentRarity: Rarity,
  luck = 0,
): Rarity {
  const a = rollRarityWithLuck(bornAt, name, petType, luck);
  const b = rarityFromUnit(hashUnit(`heir:${bornAt}:${petType}:${name}`));
  let best = rarer(a, b);
  if (hashUnit(`inherit:${bornAt}:${name}`) < 0.25) best = rarer(best, parentRarity);
  return best;
}

// ─── Life-stage thresholds ────────────────────────────────────────────────────
// Lower bound (in ageSeconds) at which each stage begins. EGG hatches at 45s on
// purpose: the birth reveal (§1) must land in the opening session or the hook
// never sets. After that the stages are retuned to GAME.md §6's ~4-week cat-life
// curve (long enough to grieve, short enough to meet the next one). The internal
// ids map onto the cat stage names in lifespan.ts:
//   baby = KITTEN · child = ADOLESCENT · teen = ADULT · adult = SENIOR · elder = ELDER
const DAY = 24 * 60 * 60;
export const STAGE_THRESHOLDS: { stage: LifeStage; atSeconds: number }[] = [
  { stage: 'egg', atSeconds: 0 },
  { stage: 'baby', atSeconds: 45 },         // birth → kitten
  { stage: 'child', atSeconds: 4 * DAY },   // adolescent
  { stage: 'teen', atSeconds: 9 * DAY },    // adult (her prime)
  { stage: 'adult', atSeconds: 16 * DAY },  // senior
  { stage: 'elder', atSeconds: 22 * DAY },  // elder
];

export const STAGE_ORDER: readonly LifeStage[] = [
  'egg', 'baby', 'child', 'teen', 'adult', 'elder',
];

/** Highest stage whose threshold the pet's age has reached. */
export function stageFor(ageSeconds: number): LifeStage {
  let current: LifeStage = 'egg';
  for (const { stage, atSeconds } of STAGE_THRESHOLDS) {
    if (ageSeconds >= atSeconds) current = stage;
    else break;
  }
  return current;
}

/** Seconds remaining until the egg hatches, or 0 once hatched. */
export function secondsUntilHatch(ageSeconds: number): number {
  const hatchAt = STAGE_THRESHOLDS[1].atSeconds; // 'baby'
  return Math.max(0, Math.ceil(hatchAt - ageSeconds));
}

export function isHatched(stage: LifeStage): boolean {
  return stage !== 'egg';
}

// ─── Form catalog (codex) ─────────────────────────────────────────────────────
// A "form" is one collectible variant: a pet type at a rarity. The codex shows
// every form as a silhouette until you've hatched one — that locked grid is the
// curiosity gap. formId is the stable key used in codex persistence.

export type FormId = string; // `${petType}:${rarity}`

export function formIdFor(petType: PetType, rarity: Rarity): FormId {
  return `${petType}:${rarity}`;
}

// Palette epithet per rarity — the collectible adjective ("AMBER CAT").
const RARITY_EPITHET: Record<Rarity, string> = {
  common: 'MOSS',
  uncommon: 'STONE',
  rare: 'AMBER',
  epic: 'ROYAL',
  secret: 'LUNAR',
};

const TYPE_NOUN: Record<PetType, string> = { plant: 'PLANT', cat: 'CAT', dog: 'DOG' };

export function rarityEpithet(rarity: Rarity): string {
  return RARITY_EPITHET[rarity];
}

export function rarityLabel(rarity: Rarity): string {
  return rarity.toUpperCase();
}

/** Display name for a form, e.g. "AMBER CAT". */
export function formName(petType: PetType, rarity: Rarity): string {
  return `${RARITY_EPITHET[rarity]} ${TYPE_NOUN[petType]}`;
}

export interface FormEntry {
  id: FormId;
  petType: PetType;
  rarity: Rarity;
  name: string;
}

const PET_TYPES: readonly PetType[] = ['plant', 'cat', 'dog'];

/** Every collectible form, ordered type-major then by rarity. Drives the codex grid. */
export const ALL_FORMS: readonly FormEntry[] = PET_TYPES.flatMap((petType) =>
  RARITIES.map((rarity) => ({
    id: formIdFor(petType, rarity),
    petType,
    rarity,
    name: formName(petType, rarity),
  })),
);

export const TOTAL_FORMS = ALL_FORMS.length;
