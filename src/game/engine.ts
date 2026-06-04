import type { CauseOfDeath, Mood, PetState, PetType } from './types';
import { isAnimal } from './profiles';
import { rollRarity } from './evolution';
import {
  CURRENT_VERSION,
  FEED_HAPPINESS_DELTA,
  FEED_HUNGER_BOOST,
  HAPPINESS_CRITICAL_THRESHOLD,
  HAPPINESS_DECAY_PER_SECOND,
  HEALTH_DECAY_CRITICAL_PER_SECOND,
  HEALTH_REGEN_PER_SECOND,
  HUNGER_CRITICAL_THRESHOLD,
  HUNGER_DECAY_PER_SECOND,
  MAX_CATCHUP_SECONDS,
  NOTIFY_HAPPINESS_THRESHOLD,
  NOTIFY_HUNGER_THRESHOLD,
  NOTIFY_WATER_THRESHOLD,
  PLAY_HAPPINESS_BOOST,
  PLAY_HUNGER_COST,
  SOCIAL_HAPPINESS_BOOST,
  SOCIAL_HEALTH_BOOST,
  SOCIAL_WATER_BOOST,
  WATER_BOOST,
  WATER_DECAY_PER_SECOND,
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

export function createInitialPet(name: string, petType: PetType, now: number): PetState {
  const cleanName = sanitizeName(name);
  return {
    version: CURRENT_VERSION,
    petType,
    rarity: rollRarity(now, cleanName, petType),
    name: cleanName,
    bornAt: now,
    lastTick: now,
    stats: {
      hunger: 80,
      happiness: 80,
      health: 100,
      water: 100,
    },
    isDead: false,
    causeOfDeath: null,
    ageSeconds: 0,
  };
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

  const ageSeconds = state.ageSeconds + elapsed;

  return isAnimal(state.petType)
    ? simulateAnimal(state, now, elapsed, ageSeconds)
    : simulatePlant(state, now, elapsed, ageSeconds);
}

// ── Plant: a single water stat that drains slowly; empty → wilted (thirst) ────
function simulatePlant(state: PetState, now: number, elapsed: number, ageSeconds: number): PetState {
  const water = clamp(state.stats.water - WATER_DECAY_PER_SECOND * elapsed);

  let isDead = false;
  let causeOfDeath: CauseOfDeath = null;
  if (water === 0) {
    isDead = true;
    causeOfDeath = 'thirst';
  }

  return {
    ...state,
    lastTick: now,
    ageSeconds,
    isDead,
    causeOfDeath,
    stats: { ...state.stats, water },
  };
}

// ── Cat / dog: hunger + happiness drain; health follows; empty health → death ─
function simulateAnimal(state: PetState, now: number, elapsed: number, ageSeconds: number): PetState {
  const hunger = clamp(state.stats.hunger - HUNGER_DECAY_PER_SECOND * elapsed);
  const happiness = clamp(state.stats.happiness - HAPPINESS_DECAY_PER_SECOND * elapsed);

  let health = state.stats.health;
  const hungerCritical = hunger <= HUNGER_CRITICAL_THRESHOLD;
  const happinessCritical = happiness <= HAPPINESS_CRITICAL_THRESHOLD;
  if (hungerCritical || happinessCritical) {
    health -= HEALTH_DECAY_CRITICAL_PER_SECOND * elapsed;
  } else {
    health += HEALTH_REGEN_PER_SECOND * elapsed;
  }
  health = clamp(health);

  let isDead = false;
  let causeOfDeath: CauseOfDeath = null;
  if (health === 0) {
    isDead = true;
    causeOfDeath = hungerCritical ? 'starvation' : 'neglect';
  }

  return {
    ...state,
    lastTick: now,
    ageSeconds,
    isDead,
    causeOfDeath,
    stats: { ...state.stats, hunger, happiness, health },
  };
}

// ─── Reducers ─────────────────────────────────────────────────────────────────

export function feed(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
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
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      happiness: clamp(simulated.stats.happiness + PLAY_HAPPINESS_BOOST),
      hunger: clamp(simulated.stats.hunger - PLAY_HUNGER_COST),
    },
  };
}

export function water(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || simulated.petType !== 'plant') return simulated;
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      water: clamp(simulated.stats.water + WATER_BOOST),
    },
  };
}

/**
 * Social boost from meeting another TAMAGAMI pet nearby. Animals cheer up
 * (+happiness, a little +health); a plant gets a small +water. Cooldown gating
 * lives in the friends layer — this reducer just applies the effect.
 */
export function socialize(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;

  if (isAnimal(simulated.petType)) {
    return {
      ...simulated,
      stats: {
        ...simulated.stats,
        happiness: clamp(simulated.stats.happiness + SOCIAL_HAPPINESS_BOOST),
        health: clamp(simulated.stats.health + SOCIAL_HEALTH_BOOST),
      },
    };
  }

  // plant
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      water: clamp(simulated.stats.water + SOCIAL_WATER_BOOST),
    },
  };
}

export function restart(state: PetState, now: number, petType?: PetType, name?: string): PetState {
  return createInitialPet(sanitizeName(name ?? state.name), petType ?? state.petType, now);
}

export function rename(state: PetState, name: string): PetState {
  return { ...state, name: sanitizeName(name) };
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function getMood(state: PetState): Mood {
  if (state.isDead) return 'dead';

  const level = state.petType === 'plant'
    ? state.stats.water
    : (state.stats.hunger + state.stats.happiness) / 2;

  if (level >= 60) return 'happy';
  if (level >= 30) return 'neutral';
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
 * Projects when each *relevant* stat will need attention based on current state.
 * Plant projects water; cat/dog project hunger + happiness.
 * Used by notifications.ts to schedule local push notifications.
 */
export function nextStageAt(state: PetState): NotificationProjection[] {
  if (state.isDead) return [];

  const now = state.lastTick;
  const projections: NotificationProjection[] = [];

  if (state.petType === 'plant') {
    const waterCross = projectCrossTime(state.stats.water, NOTIFY_WATER_THRESHOLD, WATER_DECAY_PER_SECOND, now);
    if (waterCross !== null) {
      projections.push({ stat: 'water', label: `${state.name} is thirsty! 💧`, triggerAtMs: waterCross });
    }
    return projections;
  }

  const hungerCross = projectCrossTime(state.stats.hunger, NOTIFY_HUNGER_THRESHOLD, HUNGER_DECAY_PER_SECOND, now);
  if (hungerCross !== null) {
    projections.push({ stat: 'hunger', label: `${state.name} is hungry! 🍔`, triggerAtMs: hungerCross });
  }

  const happinessCross = projectCrossTime(state.stats.happiness, NOTIFY_HAPPINESS_THRESHOLD, HAPPINESS_DECAY_PER_SECOND, now);
  if (happinessCross !== null) {
    projections.push({ stat: 'happiness', label: `${state.name} wants to play! 🎮`, triggerAtMs: happinessCross });
  }

  return projections;
}
