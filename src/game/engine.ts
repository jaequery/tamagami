import type { LifeStage, Mood, PetState } from './types';
import {
  CLEAN_HYGIENE_RESTORE,
  CURRENT_VERSION,
  ENERGY_DECAY_PER_SECOND,
  ENERGY_RECOVER_PER_SECOND,
  FEED_HAPPINESS_DELTA,
  FEED_HUNGER_BOOST,
  HAPPINESS_DECAY_PER_SECOND,
  HEAL_HEALTH_BOOST,
  HEALTH_DECAY_CRITICAL_HUNGER_PER_SECOND,
  HEALTH_DECAY_SICK_PER_SECOND,
  HEALTH_REGEN_PER_SECOND,
  HUNGER_CRITICAL_THRESHOLD,
  HUNGER_DECAY_PER_SECOND,
  HYGIENE_DECAY_PER_SECOND,
  HYGIENE_DRAIN_PER_POOP_PER_SECOND,
  HYGIENE_OVERFLOW_DRAIN_PER_SECOND,
  MAX_CATCHUP_SECONDS,
  NOTIFY_ENERGY_THRESHOLD,
  NOTIFY_HAPPINESS_THRESHOLD,
  NOTIFY_HUNGER_THRESHOLD,
  NOTIFY_HYGIENE_THRESHOLD,
  PLAY_ENERGY_COST,
  PLAY_HAPPINESS_BOOST,
  PLAY_HUNGER_COST,
  POOP_INTERVAL_SECONDS,
  POOP_OVERFLOW_THRESHOLD,
  SLEEP_HAPPINESS_DECAY_MULTIPLIER,
  SLEEP_HUNGER_DECAY_MULTIPLIER,
  SLEEP_HYGIENE_DECAY_MULTIPLIER,
  STAGE_BABY_TO_CHILD_SECONDS,
  STAGE_CHILD_TO_TEEN_SECONDS,
  STAGE_EGG_HATCH_SECONDS,
  STAGE_TEEN_TO_ADULT_SECONDS,
} from './constants';

// ─── Utility ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Strip non-printable / control characters, trim whitespace, clamp to 20 chars.
 *  Falls back to 'Pixel' for empty / whitespace-only input. */
function sanitizeName(raw: string): string {
  // Remove control characters (U+0000–U+001F, U+007F–U+009F)
  const stripped = raw.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().slice(0, 20);
  return stripped.length > 0 ? stripped : 'Pixel';
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialPet(name: string, now: number): PetState {
  return {
    version: CURRENT_VERSION,
    name: sanitizeName(name),
    bornAt: now,
    lastTick: now,
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 100,
      hygiene: 100,
      health: 100,
    },
    stage: 'egg',
    isSleeping: false,
    isSick: false,
    poops: 0,
    isDead: false,
    causeOfDeath: null,
    ageSeconds: 0,
  };
}

// ─── Stage resolution ─────────────────────────────────────────────────────────

function resolveStage(ageSeconds: number): LifeStage {
  if (ageSeconds < STAGE_EGG_HATCH_SECONDS) return 'egg';
  if (ageSeconds < STAGE_BABY_TO_CHILD_SECONDS) return 'baby';
  if (ageSeconds < STAGE_CHILD_TO_TEEN_SECONDS) return 'child';
  if (ageSeconds < STAGE_TEEN_TO_ADULT_SECONDS) return 'teen';
  return 'adult';
}

// ─── Sickness cause check ─────────────────────────────────────────────────────

/**
 * Returns true while at least one cause for sickness is still present.
 * Used by simulate() to both SET and CLEAR isSick based on current stat values.
 *
 * Gameplay rule (for UI agent alignment):
 *  - Sickness triggers on: hunger === 0 OR hygiene === 0 OR poops > POOP_OVERFLOW_THRESHOLD
 *  - Sickness CLEARS automatically on the next tick once ALL causes are resolved
 *    (hunger > 0, hygiene > 0, poops <= POOP_OVERFLOW_THRESHOLD).
 *  - heal() provides an INSTANT cure regardless of cause state, plus a health bump.
 *  - Net effect: clean() clears poop-driven sickness on the next tick; heal()
 *    clears it immediately and restores health.
 */
function hasSicknessCause(hunger: number, hygiene: number, poops: number): boolean {
  return hunger === 0 || hygiene === 0 || poops > POOP_OVERFLOW_THRESHOLD;
}

// ─── simulate ────────────────────────────────────────────────────────────────

export function simulate(state: PetState, now: number): PetState {
  // Keep lastTick current even if dead — prevents time debt accumulation
  if (state.isDead) {
    return { ...state, lastTick: now };
  }

  const rawElapsed = (now - state.lastTick) / 1000; // seconds
  const elapsed = Math.min(rawElapsed, MAX_CATCHUP_SECONDS);

  if (elapsed <= 0) {
    return { ...state, lastTick: now };
  }

  let { hunger, happiness, energy, hygiene, health } = state.stats;
  let { poops, isSick, causeOfDeath, ageSeconds } = state;
  let isDead: boolean = state.isDead;
  const isSleeping = state.isSleeping;

  // ── Age ──────────────────────────────────────────────────────────────────
  ageSeconds += elapsed;

  // ── Stat decay ───────────────────────────────────────────────────────────
  if (isSleeping) {
    hunger -= HUNGER_DECAY_PER_SECOND * SLEEP_HUNGER_DECAY_MULTIPLIER * elapsed;
    happiness -= HAPPINESS_DECAY_PER_SECOND * SLEEP_HAPPINESS_DECAY_MULTIPLIER * elapsed;
    energy = Math.min(100, energy + ENERGY_RECOVER_PER_SECOND * elapsed);
    hygiene -= HYGIENE_DECAY_PER_SECOND * SLEEP_HYGIENE_DECAY_MULTIPLIER * elapsed;
  } else {
    hunger -= HUNGER_DECAY_PER_SECOND * elapsed;
    happiness -= HAPPINESS_DECAY_PER_SECOND * elapsed;
    energy -= ENERGY_DECAY_PER_SECOND * elapsed;
    hygiene -= HYGIENE_DECAY_PER_SECOND * elapsed;
  }

  // ── Poop accumulation ────────────────────────────────────────────────────
  // Poops don't accumulate while the egg hasn't hatched yet
  if (state.stage !== 'egg') {
    const newPoopCount = Math.floor(ageSeconds / POOP_INTERVAL_SECONDS);
    const oldPoopCount = Math.floor(state.ageSeconds / POOP_INTERVAL_SECONDS);
    poops += newPoopCount - oldPoopCount;
  }

  // ── Hygiene drag from poops ───────────────────────────────────────────────
  if (poops > 0) {
    hygiene -= HYGIENE_DRAIN_PER_POOP_PER_SECOND * poops * elapsed;
  }
  if (poops >= POOP_OVERFLOW_THRESHOLD) {
    hygiene -= HYGIENE_OVERFLOW_DRAIN_PER_SECOND * elapsed;
  }

  // ── Clamp stats before sickness logic ────────────────────────────────────
  hunger = clamp(hunger);
  happiness = clamp(happiness);
  energy = clamp(energy);
  hygiene = clamp(hygiene);

  // ── Sickness onset / recovery ─────────────────────────────────────────────
  // isSick is SET when a cause appears AND CLEARED when all causes are resolved.
  // heal() provides instant cure outside simulate(); this rule keeps the
  // simulation coherent so clean() alone resolves poop-driven sickness.
  if (hasSicknessCause(hunger, hygiene, poops)) {
    isSick = true;
  } else {
    // All causes resolved — allow natural recovery (isSick → false).
    // heal() can still be used for an instant cure + health bump.
    isSick = false;
  }

  // ── Health changes ────────────────────────────────────────────────────────
  if (isSick) {
    health -= HEALTH_DECAY_SICK_PER_SECOND * elapsed;
  } else if (hunger <= HUNGER_CRITICAL_THRESHOLD) {
    health -= HEALTH_DECAY_CRITICAL_HUNGER_PER_SECOND * elapsed;
  } else if (hunger > HUNGER_CRITICAL_THRESHOLD && hygiene > 0 && happiness > 0) {
    // All needs reasonably satisfied — slow regen
    health += HEALTH_REGEN_PER_SECOND * elapsed;
  }
  health = clamp(health);

  // ── Death ─────────────────────────────────────────────────────────────────
  if (health === 0 && !isDead) {
    isDead = true;
    if (hunger <= HUNGER_CRITICAL_THRESHOLD) {
      causeOfDeath = 'starvation';
    } else if (isSick) {
      causeOfDeath = 'sickness';
    } else {
      causeOfDeath = 'neglect';
    }
  }

  // ── Life stage ────────────────────────────────────────────────────────────
  const stage = resolveStage(ageSeconds);

  return {
    ...state,
    lastTick: now,
    ageSeconds,
    stage,
    isSleeping,
    isSick,
    poops,
    isDead,
    causeOfDeath,
    stats: {
      hunger: clamp(hunger),
      happiness: clamp(happiness),
      energy: clamp(energy),
      hygiene: clamp(hygiene),
      health: clamp(health),
    },
  };
}

// ─── Reducers ─────────────────────────────────────────────────────────────────

export function feed(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || simulated.isSleeping) return simulated;
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      hunger: clamp(simulated.stats.hunger + FEED_HUNGER_BOOST),
      happiness: clamp(simulated.stats.happiness + FEED_HAPPINESS_DELTA),
    },
  };
}

export function play(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || simulated.isSleeping) return simulated;
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      happiness: clamp(simulated.stats.happiness + PLAY_HAPPINESS_BOOST),
      energy: clamp(simulated.stats.energy - PLAY_ENERGY_COST),
      hunger: clamp(simulated.stats.hunger - PLAY_HUNGER_COST),
    },
  };
}

export function toggleSleep(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;
  return {
    ...simulated,
    isSleeping: !simulated.isSleeping,
  };
}

export function clean(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;
  return {
    ...simulated,
    poops: 0,
    stats: {
      ...simulated.stats,
      hygiene: CLEAN_HYGIENE_RESTORE,
    },
  };
}

export function heal(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !simulated.isSick) return simulated;
  return {
    ...simulated,
    isSick: false,
    stats: {
      ...simulated.stats,
      health: clamp(simulated.stats.health + HEAL_HEALTH_BOOST),
    },
  };
}

export function restart(state: PetState, now: number, name?: string): PetState {
  return createInitialPet(sanitizeName(name ?? state.name), now);
}

export function rename(state: PetState, name: string): PetState {
  return { ...state, name: sanitizeName(name) };
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function getMood(state: PetState): Mood {
  if (state.isDead) return 'dead';
  if (state.isSleeping) return 'sleeping';
  if (state.isSick) return 'sick';

  const { hunger, happiness, energy } = state.stats;
  const avg = (hunger + happiness) / 2;

  if (energy <= NOTIFY_ENERGY_THRESHOLD) return 'sad';
  if (avg >= 60) return 'happy';
  if (avg >= 30) return 'neutral';
  return 'sad';
}

// ─── Notification projection helper ──────────────────────────────────────────

/**
 * Returns the epoch-ms timestamp at which a stat that is currently decaying
 * linearly at `ratePerSecond` will cross `threshold`.
 * Returns null if the stat is already below threshold or the rate is 0.
 */
function projectCrossTime(
  currentValue: number,
  threshold: number,
  ratePerSecond: number,
  fromMs: number,
): number | null {
  if (currentValue <= threshold || ratePerSecond <= 0) return null;
  const secondsUntilThreshold = (currentValue - threshold) / ratePerSecond;
  return fromMs + secondsUntilThreshold * 1000;
}

export interface NotificationProjection {
  stat: string;
  label: string;
  triggerAtMs: number;
}

/**
 * Projects when each stat will need attention based on current state.
 * Used by notifications.ts to schedule local push notifications.
 */
export function nextStageAt(state: PetState): NotificationProjection[] {
  if (state.isDead || state.isSleeping) return [];

  const { hunger, happiness, energy, hygiene } = state.stats;
  const now = state.lastTick;
  const projections: NotificationProjection[] = [];

  const hungerCross = projectCrossTime(hunger, NOTIFY_HUNGER_THRESHOLD, HUNGER_DECAY_PER_SECOND, now);
  if (hungerCross !== null) {
    projections.push({ stat: 'hunger', label: `${state.name} is hungry! 🍔`, triggerAtMs: hungerCross });
  }

  const happinessCross = projectCrossTime(happiness, NOTIFY_HAPPINESS_THRESHOLD, HAPPINESS_DECAY_PER_SECOND, now);
  if (happinessCross !== null) {
    projections.push({ stat: 'happiness', label: `${state.name} is feeling lonely! 🎮`, triggerAtMs: happinessCross });
  }

  const energyCross = projectCrossTime(energy, NOTIFY_ENERGY_THRESHOLD, ENERGY_DECAY_PER_SECOND, now);
  if (energyCross !== null) {
    projections.push({ stat: 'energy', label: `${state.name} is exhausted! 💤`, triggerAtMs: energyCross });
  }

  // Fix #5: effective hygiene rate includes poop drain so notification fires before threshold.
  const effectiveHygieneRate =
    HYGIENE_DECAY_PER_SECOND +
    HYGIENE_DRAIN_PER_POOP_PER_SECOND * state.poops +
    (state.poops >= POOP_OVERFLOW_THRESHOLD ? HYGIENE_OVERFLOW_DRAIN_PER_SECOND : 0);

  const hygieneCross = projectCrossTime(hygiene, NOTIFY_HYGIENE_THRESHOLD, effectiveHygieneRate, now);
  if (hygieneCross !== null) {
    projections.push({ stat: 'hygiene', label: `${state.name} needs a bath! 🛁`, triggerAtMs: hygieneCross });
  }

  return projections;
}
