// ─── Growing up — two lives, two clocks (GAME.md §6) ───────────────────────────
//
// She ages on real-world time (the aging *is* the realism — no speed slider). We
// split DISPLAYED age (cat-years, for the story) from the REAL cadence (~4 weeks,
// so nobody waits years and nobody fast-forwards). And she doesn't age alone — her
// owner ages too, on a much slower clock (~one life-stage per cat-life), so across
// the cats who come after, you watch a whole human grow old.
//
// All pure + deterministic. The stage thresholds live in evolution.ts; this maps
// them to cat-facing names + a believable displayed age, and advances the owner.

import type { LifeStage } from './types';
import { OWNER_STAGES, type OwnerStage } from './ownerLife';

// The cat-facing name for each internal stage (the §6 reveal names).
const CAT_STAGE_LABEL: Record<LifeStage, string> = {
  egg: 'NEWBORN',
  baby: 'KITTEN',
  child: 'ADOLESCENT',
  teen: 'ADULT',
  adult: 'SENIOR',
  elder: 'ELDER',
};

export function catStageLabel(stage: LifeStage): string {
  return CAT_STAGE_LABEL[stage];
}

// A one-line behavior signature per stage (most of the realism is behavior, §6).
const CAT_STAGE_BLURB: Record<LifeStage, string> = {
  egg: 'not quite here yet.',
  baby: 'clumsy pounces, gets stuck, sleeps mid-step.',
  child: 'zoomies, knocks things off shelves, fearless.',
  teen: 'composed, deliberate — the lap-settler, fully herself.',
  adult: 'picks the sunbeam over the chase, slower to the bowl, extra affectionate.',
  elder: 'sleeps most of the day, wants you close, precious.',
};

export function catStageBlurb(stage: LifeStage): string {
  return CAT_STAGE_BLURB[stage];
}

// ─── Displayed age (real seconds → cat-years) ────────────────────────────────────
// Anchored to the §6 table: displayed age moves fast early (kitten months) then
// settles into years. Piecewise-linear between anchors, so it's smooth, monotonic,
// deterministic and testable. A full life ≈ 28 days ≈ ~16 cat-years.
const DAY = 86_400;
const AGE_ANCHORS: readonly { atSeconds: number; years: number }[] = [
  { atSeconds: 0, years: 0 },
  { atSeconds: 4 * DAY, years: 0.5 },   // ~6 months
  { atSeconds: 9 * DAY, years: 2 },
  { atSeconds: 16 * DAY, years: 8 },    // her prime
  { atSeconds: 22 * DAY, years: 13 },
  { atSeconds: 28 * DAY, years: 16 },   // a long, full life
];

/** Displayed cat-age in years (float), interpolated along the §6 curve. */
export function displayedAgeYears(ageSeconds: number): number {
  const a = Math.max(0, ageSeconds);
  const anchors = AGE_ANCHORS;
  if (a >= anchors[anchors.length - 1].atSeconds) {
    // Past a full life: keep creeping up slowly so an ancient cat still ages.
    const last = anchors[anchors.length - 1];
    return last.years + (a - last.atSeconds) / (4 * DAY);
  }
  for (let i = 1; i < anchors.length; i++) {
    const lo = anchors[i - 1];
    const hi = anchors[i];
    if (a < hi.atSeconds) {
      const t = (a - lo.atSeconds) / (hi.atSeconds - lo.atSeconds);
      return lo.years + t * (hi.years - lo.years);
    }
  }
  return 0;
}

/** Human-readable displayed age — months under a year, then whole years. */
export function displayedAgeLabel(ageSeconds: number): string {
  const years = displayedAgeYears(ageSeconds);
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} MO`;
  }
  return `${Math.round(years)} YR`;
}

// ─── The owner's slow clock ──────────────────────────────────────────────────────
// The owner ages ~one life-stage per cat-life (§6 locked decision), advanced
// across generations (§9 lineage). A single cat's whole life is just one season of
// the owner's; across ~4–5 cats you watch them go from one stage to elder.
export function ownerStageForGeneration(start: OwnerStage, generation: number): OwnerStage {
  const startIdx = OWNER_STAGES.indexOf(start);
  const advanced = startIdx + Math.max(0, generation - 1);
  const idx = Math.min(advanced, OWNER_STAGES.length - 1);
  return OWNER_STAGES[idx];
}

// ─── Natural lifespan (forward to §9 — the good death, old age) ──────────────────
// The end of the curve. Old age is the natural, peaceful, *expected* close to a
// long life — not a fail-state. Neglect/illness deaths stay rare and softened.
export const NATURAL_LIFESPAN_SECONDS = 28 * DAY;

/** How close she is to the natural end of a long life, in [0, 1]. */
export function lifeProgress(ageSeconds: number): number {
  return Math.max(0, Math.min(1, ageSeconds / NATURAL_LIFESPAN_SECONDS));
}
