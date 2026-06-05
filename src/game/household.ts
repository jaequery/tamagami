// ─── Household: the hands that found you (GAME.md §2 — your person & household) ──
//
// Where she *lands*. Rolled deterministically off the birth identity, a household
// is a MATERIAL TIER (touches the economy — her starting world) crossed with a
// LIFE-SITUATION (touches the heart — her person's state). The two roll
// independently and on purpose: the drama of §2 is the *contrast* between where
// she came from (her origin, §1) and who she got, so we never correlate them —
// a lucky window-kitten can still land in a big, silent house.
//
// The household is the SAME owner across a bloodline (§9: "same owner, aged
// forward, new kitten"), so an heir carries its parent's household forward while
// re-rolling a fresh origin. Stored as a compact id (`tier:situation:nameIdx`)
// so it round-trips through the save and reconstructs the whole person.
//
// Tone guardrail (GAME.md §2, non-negotiable): the struggling / grieving / lonely
// homes are warmth and hope, never misery tourism. The arc is always toward
// connection — the cat is a small light, not a witness to suffering.

import { hashUnit } from './evolution';
import { STARTING_COINS } from './constants';
import type { PetType } from './types';
import type { OriginId } from './origins';

// ─── The two axes ────────────────────────────────────────────────────────────────

export type MaterialTier = 'wealthy' | 'comfortable' | 'getting_by' | 'scraping';

export type LifeSituation =
  | 'warm_chaos'
  | 'lonely_elder'
  | 'grieving'
  | 'struggling'
  | 'striver'
  | 'new_couple'
  | 'single_parent'
  | 'rebuilding';

export const MATERIAL_TIERS: readonly MaterialTier[] = [
  'wealthy', 'comfortable', 'getting_by', 'scraping',
];

export const LIFE_SITUATIONS: readonly LifeSituation[] = [
  'warm_chaos', 'lonely_elder', 'grieving', 'struggling',
  'striver', 'new_couple', 'single_parent', 'rebuilding',
];

export interface Household {
  id: string;             // `${tier}:${situation}:${nameIdx}` — the stored key
  tier: MaterialTier;
  situation: LifeSituation;
  person: string;         // "Marisol" / "the Okafors"
  homeLine: string;       // §2 Beat 1: the wordless pan of the home (set by tier)
  personLine: string;     // §2 Beat 2: the line that names the person (set by situation)
  summary: string;        // life-summary fragment: "Marisol, alone in a big quiet house"
}

// ─── Weights ─────────────────────────────────────────────────────────────────────
// Tier: a believable spread, most homes in the middle. Situation: roughly even,
// nudged toward the warm/full homes so the heavier ones (grieving, struggling)
// stay rarer and land harder when they come (GAME.md §5: rarity makes them matter).
const TIER_WEIGHTS: Record<MaterialTier, number> = {
  wealthy: 12,
  comfortable: 33,
  getting_by: 35,
  scraping: 20,
};

const SITUATION_WEIGHTS: Record<LifeSituation, number> = {
  warm_chaos: 18,
  lonely_elder: 14,
  grieving: 9,
  struggling: 10,
  striver: 15,
  new_couple: 14,
  single_parent: 12,
  rebuilding: 8,
};

// ─── Copy ────────────────────────────────────────────────────────────────────────
// Beat 1 (the home) reads the MATERIAL TIER — the room tells you the money before
// any number does.
const HOME_LINE: Record<MaterialTier, string> = {
  wealthy: 'a big house — plastic still on one couch, every room a little too quiet.',
  comfortable: 'a warm, lived-in place: books, a worn rug, a window with good light.',
  getting_by: 'a small apartment, mismatched chairs, a calendar crowded with handwriting.',
  scraping: 'a mattress on the floor, one lamp, a guitar leaning in the corner.',
};

// Beat 2 (the person) reads the LIFE-SITUATION — one line names their truth, gently.
const PERSON_LINE: Record<LifeSituation, (person: string) => string> = {
  warm_chaos: (p) => `this is ${p}. not enough of anything but love, and love spilling everywhere.`,
  lonely_elder: (p) => `this is ${p}. the house is big, and very, very quiet. you'll become the whole day.`,
  grieving: (p) => `this is ${p}. there's one chair no one sits in anymore.`,
  struggling: (p) => `this is ${p}. some mornings are hard. you might be the reason for the next one.`,
  striver: (p) => `this is ${p}. always working, loving you in guilty fragments — but meaning every one.`,
  new_couple: (p) => `this is ${p}. they're just starting out, and you're their first.`,
  single_parent: (p) => `this is ${p}. stretched paper-thin, and you're the kids' whole joy.`,
  rebuilding: (p) => `this is ${p}. coming back from something. you're the quiet anchor.`,
};

// Short situational tail for the life-summary fragment.
const SITUATION_TAIL: Record<LifeSituation, string> = {
  warm_chaos: 'in a loud house full of love',
  lonely_elder: 'alone in a big quiet house',
  grieving: 'to a home with one empty chair',
  struggling: 'who needed a reason to get up',
  striver: 'who worked all hours and loved you anyway',
  new_couple: 'just starting their life together',
  single_parent: 'and a houseful of kids',
  rebuilding: 'rebuilding, one quiet day at a time',
};

// Name pools. Family-shaped situations get a surname ("the Okafors"); solo people
// a first name. Picked deterministically by a third hash so two same-tier,
// same-situation homes can still feel like different people.
const FAMILY_NAMES = ['the Okafors', 'the Reyes', 'the Nguyens', 'the Halloways', 'the Castros'];
const SOLO_NAMES_BY_SITUATION: Record<LifeSituation, string[]> = {
  warm_chaos: FAMILY_NAMES,
  lonely_elder: ['Marisol', 'Walter', 'Edith', 'Sam', 'Nadia'],
  grieving: ['Dev', 'Joan', 'Henry', 'Priya', 'Tomas'],
  struggling: ['Alex', 'Mara', 'Eli', 'Cass', 'June'],
  striver: ['Dana', 'Marcus', 'Wei', 'Renata', 'Kofi'],
  new_couple: ['Sam & Rae', 'Jo & Andre', 'Mina & Paul', 'Lia & Cole'],
  single_parent: ['the Okafors', 'the Reyes', 'Aisha & kids', 'Tariq & kids', 'the Floreses'],
  rebuilding: ['Quinn', 'Noor', 'Beto', 'Hana', 'Ray'],
};

// ─── Roll ────────────────────────────────────────────────────────────────────────

function pickWeighted<T extends string>(
  options: readonly T[],
  weights: Record<T, number>,
  unit: number,
): T {
  const total = options.reduce((sum, o) => sum + weights[o], 0);
  const target = unit * total;
  let acc = 0;
  for (const o of options) {
    acc += weights[o];
    if (target < acc) return o;
  }
  return options[options.length - 1]; // float-rounding safety net
}

export function householdSeed(bornAt: number, name: string, petType: PetType): string {
  return `household:${bornAt}:${petType}:${name}`;
}

/** Roll a household id, deterministically and once, off the birth identity. */
export function rollHousehold(bornAt: number, name: string, petType: PetType): string {
  const seed = householdSeed(bornAt, name, petType);
  const tier = pickWeighted(MATERIAL_TIERS, TIER_WEIGHTS, hashUnit(`tier:${seed}`));
  const situation = pickWeighted(LIFE_SITUATIONS, SITUATION_WEIGHTS, hashUnit(`sit:${seed}`));
  const pool = SOLO_NAMES_BY_SITUATION[situation];
  const nameIdx = Math.floor(hashUnit(`name:${seed}`) * pool.length);
  return householdId(tier, situation, nameIdx);
}

// ─── Id encode / decode ──────────────────────────────────────────────────────────

export function householdId(tier: MaterialTier, situation: LifeSituation, nameIdx: number): string {
  return `${tier}:${situation}:${nameIdx}`;
}

function isMaterialTier(v: string): v is MaterialTier {
  return (MATERIAL_TIERS as readonly string[]).includes(v);
}
function isLifeSituation(v: string): v is LifeSituation {
  return (LIFE_SITUATIONS as readonly string[]).includes(v);
}

/** Parse a stored household id back to its parts, or null if malformed. */
export function parseHouseholdId(
  id: unknown,
): { tier: MaterialTier; situation: LifeSituation; nameIdx: number } | null {
  if (typeof id !== 'string') return null;
  const parts = id.split(':');
  if (parts.length !== 3) return null;
  const [tier, situation, idxRaw] = parts;
  if (!isMaterialTier(tier) || !isLifeSituation(situation)) return null;
  const idx = Number(idxRaw);
  const pool = SOLO_NAMES_BY_SITUATION[situation];
  if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length) return null;
  return { tier, situation, nameIdx: idx };
}

export function isHouseholdId(value: unknown): boolean {
  return parseHouseholdId(value) !== null;
}

/** Reconstruct the full Household from a stored id, or null if malformed. */
export function householdFromId(id: string): Household | null {
  const parsed = parseHouseholdId(id);
  if (parsed === null) return null;
  const { tier, situation, nameIdx } = parsed;
  const person = SOLO_NAMES_BY_SITUATION[situation][nameIdx];
  return {
    id,
    tier,
    situation,
    person,
    homeLine: HOME_LINE[tier],
    personLine: PERSON_LINE[situation](person),
    summary: `${person}, ${SITUATION_TAIL[situation]}`,
  };
}

// ─── Economy hook ────────────────────────────────────────────────────────────────
// Material tier sets her starting world (GAME.md §2: tier "just sets STARTING_COINS
// and early shop access"). Scraping is never a fail-state — the free FORAGER job
// prevents any soft-lock — so a lean start is a *story*, not a difficulty spike.
const TIER_COIN_MULTIPLIER: Record<MaterialTier, number> = {
  wealthy: 2.5,
  comfortable: 1.5,
  getting_by: 1,
  scraping: 0.5,
};

export function startingCoinsForTier(tier: MaterialTier): number {
  return Math.round(STARTING_COINS * TIER_COIN_MULTIPLIER[tier]);
}

/** Starting coins for a stored household id (falls back to the flat default). */
export function startingCoinsForHousehold(id: string): number {
  const parsed = parseHouseholdId(id);
  return parsed === null ? STARTING_COINS : startingCoinsForTier(parsed.tier);
}

// ─── The contrast (GAME.md §2: the game names the gap, because the gap is the feeling) ─
// Classify the origin by fortune and the household by warmth, then name the gap.
type Fortune = 'lucky' | 'humble' | 'peril';
const ORIGIN_FORTUNE: Record<OriginId, Fortune> = {
  the_window: 'lucky',
  midnight_litter: 'lucky',
  hay_and_sun: 'humble',
  long_wait: 'humble',
  cardboard_box: 'peril',
  storm_drain: 'peril',
};

// Households that are materially full/bright vs. quiet/lonely vs. struggling.
type HomeWarmth = 'full' | 'quiet' | 'tender';
const SITUATION_WARMTH: Record<LifeSituation, HomeWarmth> = {
  warm_chaos: 'full',
  single_parent: 'full',
  new_couple: 'full',
  lonely_elder: 'quiet',
  grieving: 'tender',
  struggling: 'tender',
  striver: 'quiet',
  rebuilding: 'tender',
};

/**
 * The one line that names the gap between where she came from and who she got.
 * Pure (no roll) — a function of the two already-dealt facts.
 */
export function contrastLine(origin: OriginId, household: Household): string {
  const fortune = ORIGIN_FORTUNE[origin];
  const warmth = SITUATION_WARMTH[household.situation];

  if (fortune === 'lucky' && warmth === 'quiet') {
    return 'the prettiest cat in the world — and the only soul in the room.';
  }
  if (fortune === 'peril' && warmth === 'full') {
    return 'she came from nothing. now she can\'t find a lap that isn\'t taken.';
  }
  if (fortune === 'lucky' && warmth === 'tender') {
    return 'a small miracle, sent exactly where one was needed.';
  }
  if (fortune === 'peril' && warmth === 'tender') {
    return 'two broken-open things, learning to mend each other.';
  }
  if (fortune === 'peril' && warmth === 'quiet') {
    return 'she had nothing, and neither did the quiet — so they filled it together.';
  }
  if (fortune === 'humble' && warmth === 'full') {
    return 'an ordinary start, dropped into the middle of everything.';
  }
  if (fortune === 'lucky' && warmth === 'full') {
    return 'lucky twice over — and she\'ll never know how rare that is.';
  }
  // humble × quiet / tender
  return 'a plain little life, landing exactly where it could matter most.';
}
