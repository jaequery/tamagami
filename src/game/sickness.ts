// ─── Sickness — a worry, not a countdown (GAME.md §9) ──────────────────────────
//
// Before any end, illness is a RECOVERABLE state, never a silent death-march. She
// gets sick — a cold, a limp, age catching up — and it shows, and you can help
// (rest, the vet, medicine). A treated illness passes. Sickness exists to make you
// *worry about her*, which is love — not to punish a missed tap. So in V1 it has
// no mechanical penalty at all: it's a worry + a tending interaction.
//
// The ailment of any given day is dealt deterministically from (her seed, the
// local day, her age) — rare, rarer when she's young, a little more present in old
// age. Treating her records the day (on PetState.lastTreatedDay), which clears the
// worry until tomorrow. Pure + testable; no Math.random, no hot-loop mutation.

import { hashUnit } from './evolution';
import { dayIndex } from './events';
import { NATURAL_LIFESPAN_SECONDS } from './lifespan';

export type AilmentId = 'cold' | 'limp' | 'tummy' | 'ache';

export interface Ailment {
  id: AilmentId;
  label: string;   // short HUD label
  text: string;    // the worry line
  care: string;    // how you helped (shown after treating)
}

export const AILMENTS: Record<AilmentId, Ailment> = {
  cold: { id: 'cold', label: 'A COLD', text: 'she\'s sneezing, and her nose is warm. a little cold.', care: 'you kept her warm and close until it passed.' },
  limp: { id: 'limp', label: 'A LIMP', text: 'she\'s favoring one paw today, stepping careful.', care: 'you rested her and checked the sore paw gently.' },
  tummy: { id: 'tummy', label: 'AN UPSET', text: 'she skipped breakfast and curled up small. an upset tummy.', care: 'you gave her quiet and the bland food until she perked up.' },
  ache: { id: 'ache', label: 'OLD ACHES', text: 'the cold morning is in her joints now. she\'s a little stiff.', care: 'you warmed her stiff joints and let her take the day slow.' },
};

export const AILMENT_IDS: readonly AilmentId[] = ['cold', 'limp', 'tummy', 'ache'];

export function ailmentById(id: string): Ailment | null {
  return (AILMENTS as Record<string, Ailment>)[id] ?? null;
}

// Base daily chance she's a little under the weather, and the extra chance that
// creeps in as she nears the end of a long life. Kept low — worry should be a rare
// visitor, not a daily chore.
const BASE_SICK_CHANCE = 0.06;
const ELDER_SICK_BONUS = 0.14;

function sickChance(ageSeconds: number): number {
  const oldness = Math.max(0, Math.min(1, ageSeconds / NATURAL_LIFESPAN_SECONDS));
  return BASE_SICK_CHANCE + ELDER_SICK_BONUS * oldness;
}

/**
 * The ailment for the local day containing `now`, or null if she's well. Stable
 * across the day; deterministic given her seed + age. The 'ache' ailment only
 * visits an older cat.
 */
export function ailmentOn(now: number, seed: string, ageSeconds: number): Ailment | null {
  const day = dayIndex(now);
  // Day-index first: FNV-1a mixes its trailing bytes weakly, so the varying part
  // must lead or consecutive days cluster (the player lives consecutive days).
  if (hashUnit(`sick:${day}:${seed}`) >= sickChance(ageSeconds)) return null;
  // Which ailment — 'ache' reserved for the back half of life.
  const old = ageSeconds >= NATURAL_LIFESPAN_SECONDS / 2;
  const pool: AilmentId[] = old ? ['cold', 'limp', 'tummy', 'ache'] : ['cold', 'limp', 'tummy'];
  const idx = Math.floor(hashUnit(`ailment:${day}:${seed}`) * pool.length) % pool.length;
  return AILMENTS[pool[idx]];
}

/**
 * The ailment she actually needs help with right now: today's ailment, unless you
 * already tended her today (lastTreatedDay === today). That's the recoverable
 * loop — help her, and the worry lifts.
 */
export function activeAilment(
  now: number,
  seed: string,
  ageSeconds: number,
  lastTreatedDay: number | null,
): Ailment | null {
  if (lastTreatedDay !== null && lastTreatedDay === dayIndex(now)) return null;
  return ailmentOn(now, seed, ageSeconds);
}

/** The day-index to stamp on PetState.lastTreatedDay when you tend her. */
export function treatedDayFor(now: number): number {
  return dayIndex(now);
}
