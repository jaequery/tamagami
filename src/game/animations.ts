// ─── Pet activities: animated actions & movement ──────────────────────────────
//
// The pet is more than a static sprite: it idles, walks, jumps, dances, eats,
// sleeps and cheers. This module is the PURE, deterministic source of truth for
// WHAT activities exist and WHEN the idle scheduler picks them. It holds no
// React / Animated code — `components/usePetAnimation.ts` turns these specs into
// running transform animations, and `components/PetSprite.tsx` renders the
// overlay glyphs. Keeping the rules here makes them unit-testable without a
// renderer.
//
// Two trigger paths feed off this:
//   1. Idle scheduler — every `nextIdleDelayMs()` an ambient activity is picked
//      (weighted, night-aware) so the pet feels alive on its own.
//   2. User interaction — feed/play/water/socialize fire a specific activity.

/** Every distinct thing the pet can be seen doing. `idle` is the resting state. */
export type PetActivity =
  | 'idle'   // gentle breathing bob — the default resting state
  | 'walk'   // ambles side to side
  | 'jump'   // springs up and lands
  | 'dance'  // wiggles and rotates to music notes
  | 'eat'    // quick happy chomps with crumbs (feed / water)
  | 'sleep'  // slow breathing under floating Zzz (ambient, night-only)
  | 'cheer'; // excited squash-and-spin with hearts (play / socialize)

/** Floating glyph layered above the sprite while an activity plays. */
export type OverlayGlyph = 'none' | 'zzz' | 'note' | 'heart' | 'crumb' | 'spark';

export interface ActivitySpec {
  key: PetActivity;
  /** One cycle in ms. Looped activities repeat this until interrupted. */
  durationMs: number;
  /** Sleep loops until something else is played; one-shots animate once. */
  loop: boolean;
  /** Eligible for the periodic idle scheduler (user-only activities are false). */
  ambient: boolean;
  /** Relative pick weight among ambient activities (higher = more frequent). */
  weight: number;
  /** Glyph that floats above the sprite during this activity. */
  overlay: OverlayGlyph;
  /** When true the idle scheduler only picks it during night hours (sleep). */
  nightOnly?: boolean;
}

// Order here is also the canonical iteration order for ALL_ACTIVITIES.
export const ACTIVITIES: Record<PetActivity, ActivitySpec> = {
  idle:  { key: 'idle',  durationMs: 1200, loop: true,  ambient: false, weight: 0, overlay: 'none' },
  walk:  { key: 'walk',  durationMs: 1800, loop: false, ambient: true,  weight: 5, overlay: 'none' },
  jump:  { key: 'jump',  durationMs: 700,  loop: false, ambient: true,  weight: 4, overlay: 'none' },
  dance: { key: 'dance', durationMs: 1600, loop: false, ambient: true,  weight: 3, overlay: 'note' },
  eat:   { key: 'eat',   durationMs: 900,  loop: false, ambient: false, weight: 0, overlay: 'crumb' },
  sleep: { key: 'sleep', durationMs: 2600, loop: true,  ambient: true,  weight: 6, overlay: 'zzz', nightOnly: true },
  cheer: { key: 'cheer', durationMs: 1000, loop: false, ambient: false, weight: 0, overlay: 'heart' },
};

export const ALL_ACTIVITIES: readonly PetActivity[] = Object.keys(ACTIVITIES) as PetActivity[];

export function activitySpec(key: PetActivity): ActivitySpec {
  return ACTIVITIES[key];
}

export function overlayFor(key: PetActivity): OverlayGlyph {
  return ACTIVITIES[key].overlay;
}

// ─── Idle scheduler ───────────────────────────────────────────────────────────
// After each ambient activity finishes, the pet rests for a randomized beat
// before the next one, so movement feels organic rather than metronomic.

export const IDLE_MIN_MS = 4000;
export const IDLE_MAX_MS = 9000;

/** A random rest delay in [IDLE_MIN_MS, IDLE_MAX_MS]. `rng` ∈ [0, 1). */
export function nextIdleDelayMs(rng: () => number): number {
  const span = IDLE_MAX_MS - IDLE_MIN_MS;
  return IDLE_MIN_MS + Math.floor(clampUnit(rng()) * (span + 1));
}

// ─── Weighted ambient pick ──────────────────────────────────────────────────
// `night` gates the night-only activities (sleep): the pet only dozes off after
// dark, and during the day those activities are simply not in the pool.

/** The ambient activities available right now, honoring the night gate. */
export function ambientPool(opts: { night?: boolean } = {}): PetActivity[] {
  const night = opts.night ?? false;
  return ALL_ACTIVITIES.filter((k) => {
    const spec = ACTIVITIES[k];
    if (!spec.ambient) return false;
    if (spec.nightOnly && !night) return false;
    return true;
  });
}

/**
 * Deterministically pick an ambient activity weighted by `spec.weight`, using a
 * single `rng()` draw ∈ [0, 1). Night-only activities are excluded unless
 * `opts.night` is set. Falls back to 'idle' if the pool is somehow empty.
 */
export function pickAmbient(rng: () => number, opts: { night?: boolean } = {}): PetActivity {
  const pool = ambientPool(opts);
  if (pool.length === 0) return 'idle';

  const total = pool.reduce((sum, k) => sum + ACTIVITIES[k].weight, 0);
  if (total <= 0) return pool[0];

  let roll = clampUnit(rng()) * total;
  for (const k of pool) {
    roll -= ACTIVITIES[k].weight;
    if (roll < 0) return k;
  }
  return pool[pool.length - 1];
}

function clampUnit(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n >= 1) return 0.999999;
  return n;
}
