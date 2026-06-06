import type { CauseOfDeath, Mood, PetState, PetType } from './types';
import { isAnimal } from './profiles';
import { rollRarityWithLuck, rollHeirRarity, stageFor } from './evolution';
import { rollOrigin } from './origins';
import { rollHousehold, startingCoinsForHousehold, parseHouseholdId } from './household';
import { BOND_SEED, deepenBond, dimBondForAbsence } from './bond';
import {
  OWNER_MOOD_SEED,
  driftOwnerMood,
  applyOwnerEvent,
  ownerEventAt,
  startOwnerStage,
  type OwnerEvent,
} from './ownerLife';
import { ownerStageForGeneration, NATURAL_LIFESPAN_SECONDS } from './lifespan';
import { treatedDayFor, activeAilment, type Ailment } from './sickness';
import { momentOfDay, type Moment, type MoodBand } from './moments';
import {
  clockIn as econClockIn,
  clockOut as econClockOut,
  defaultEconomy,
  enroll as econEnroll,
  foodById,
  stepEconomy,
  withJob,
  withoutJob,
} from './economy';
import {
  accessoryById,
  acquireCosmetic,
  defaultCosmetics,
  ownsAccessory,
  toggleCosmetic,
} from './cosmetics';
import { playById } from './play';
import {
  CURRENT_VERSION,
  FEED_HAPPINESS_DELTA,
  FEED_HUNGER_BOOST,
  HAPPINESS_CRITICAL_THRESHOLD,
  HAPPINESS_DECAY_PER_SECOND,
  HEALTH_DECAY_CRITICAL_PER_SECOND,
  HEALTH_NEGLECT_FLOOR,
  HEALTH_REGEN_PER_SECOND,
  HUNGER_CRITICAL_THRESHOLD,
  HUNGER_DECAY_PER_SECOND,
  MAX_CATCHUP_SECONDS,
  NOTIFY_HAPPINESS_THRESHOLD,
  NOTIFY_HUNGER_THRESHOLD,
  PLAY_HAPPINESS_BOOST,
  PLAY_HUNGER_COST,
  SOCIAL_HAPPINESS_BOOST,
  SOCIAL_HEALTH_BOOST,
} from './constants';

// ─── Utility ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Strip non-printable / control characters, trim whitespace, clamp to 20 chars.
 *  Falls back to 'Pixel' for empty / whitespace-only input. */
function sanitizeName(raw: string, fallback = 'Pixel'): string {
  // Remove control characters (U+0000–U+001F, U+007F–U+009F)
  const stripped = raw.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim().slice(0, 20);
  return stripped.length > 0 ? stripped : fallback;
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialPet(name: string, petType: PetType, now: number, luck = 0, ownerName = ''): PetState {
  const cleanName = sanitizeName(name);
  // All three life-story facts are dealt off the birth identity, not chosen
  // (GAME.md's surprise-over-choice pillar). Origin is biased by the rarity it's
  // rolled against; the household sets her starting world via its material tier.
  const rarity = rollRarityWithLuck(now, cleanName, petType, luck);
  const origin = rollOrigin(now, cleanName, petType, rarity);
  const household = rollHousehold(now, cleanName, petType);
  return {
    version: CURRENT_VERSION,
    petType,
    rarity,
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
    events: [],
    generation: 1,
    origin,
    household,
    ownerName: sanitizeName(ownerName, ''), // '' until the player names themselves in the cold open
    bond: BOND_SEED,
    ownerMood: OWNER_MOOD_SEED,
    lastTreatedDay: null,
    economy: { ...defaultEconomy(), coins: startingCoinsForHousehold(household) },
    cosmetics: defaultCosmetics(),
  };
}

// ─── Owner derivation (the §5 person, on her parallel clock) ────────────────────
// The owner is the household's person, aged forward across the bloodline (§6). The
// seed namespaces the owner's event stream to this household so two players' owners
// live independent lives.
function ownerSeedFor(pet: PetState): string {
  return `owner:${pet.bornAt}:${pet.household}`;
}

/** Her person's current life-stage, given the household + this generation. */
export function ownerStageOf(pet: PetState): ReturnType<typeof startOwnerStage> {
  const parsed = parseHouseholdId(pet.household);
  const start = parsed ? startOwnerStage(parsed.situation) : 'adult';
  return ownerStageForGeneration(start, pet.generation ?? 1);
}

// ─── Screen-facing "today" reads (the daily firehoses, surfaced) ────────────────
// Thin wrappers so the UI reads the §4/§5/§9 systems off a pet without knowing the
// seed conventions. All pure + deterministic from the pet + now.

/** The per-pet seed for her own daily beats (moments, ailments). */
export function petSeed(pet: PetState): string {
  return `${pet.bornAt}:${pet.name}`;
}

/** Her person's event for the local day containing `now` (§5). */
export function ownerEventToday(pet: PetState, now: number): OwnerEvent {
  return ownerEventAt(now, ownerSeedFor(pet), ownerStageOf(pet));
}

/** Today's ailment she needs help with, or null if she's well / already tended (§9). */
export function currentAilment(pet: PetState, now: number): Ailment | null {
  return activeAilment(now, petSeed(pet), pet.ageSeconds, pet.lastTreatedDay ?? null);
}

/** Today's catchable moment for her stage + mood, or null before she's hatched (§4). */
export function momentToday(pet: PetState, now: number, mood: MoodBand): Moment | null {
  return momentOfDay(now, petSeed(pet), stageFor(pet.ageSeconds), mood);
}

/**
 * Create the heir to a (usually dead) pet: same species and family name, next
 * generation, with an inherited rarity roll that's biased toward the parent's
 * luck (see rollHeirRarity). The heir starts fresh as its own egg — death isn't
 * game-over, it's the next chapter of the line.
 */
export function createHeir(parent: PetState, now: number, luck = 0): PetState {
  const base = createInitialPet(parent.name, parent.petType, now, luck);
  const heirRarity = rollHeirRarity(now, base.name, parent.petType, parent.rarity, luck);
  // The heir comes to the SAME owner (GAME.md §9: "same owner, aged forward, new
  // kitten"), so the household carries forward — but it's a new birth, so its
  // origin is re-rolled fresh against the heir's own (inherited-luck) rarity.
  const household = parent.household && parent.household.length > 0 ? parent.household : base.household;
  return {
    ...base,
    rarity: heirRarity,
    origin: rollOrigin(now, base.name, parent.petType, heirRarity),
    household,
    // Same owner across the bloodline (§9) — the heir comes to YOU, by your name.
    ownerName: parent.ownerName ?? '',
    generation: (parent.generation ?? 1) + 1,
    // A new kitten is a new relationship → the bond starts fresh. But it comes to
    // the SAME person, so the owner's mood carries forward (the new kitten often
    // comes to comfort a grieving owner, §9).
    bond: BOND_SEED,
    ownerMood: parent.ownerMood ?? OWNER_MOOD_SEED,
    lastTreatedDay: null,
    // The heir inherits the family savings — a bequest — but starts its own
    // career and schooling from scratch.
    economy: { ...defaultEconomy(), coins: parent.economy?.coins ?? defaultEconomy().coins },
    // A new kitten is a new wardrobe: the coins carry forward, the collar doesn't.
    cosmetics: defaultCosmetics(),
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

  return simulateAnimal(state, now, elapsed, ageSeconds, rawElapsed);
}

// ── Cat: hunger + happiness drain; health follows; empty health → death ───────
function simulateAnimal(
  state: PetState,
  now: number,
  elapsed: number,
  ageSeconds: number,
  rawElapsed: number,
): PetState {
  // Advance the economy first: graduate finished study, bank shift wages, and
  // collect the happiness cost of working (negative) to fold into the mood decay.
  const { economy, happinessDelta } = stepEconomy(state.economy, now);

  const hunger = clamp(state.stats.hunger - HUNGER_DECAY_PER_SECOND * elapsed);
  const happiness = clamp(state.stats.happiness - HAPPINESS_DECAY_PER_SECOND * elapsed + happinessDelta);

  // §8 — forgiving care: neglect makes her SICK, never dead. When a need is critical,
  // health sinks toward HEALTH_NEGLECT_FLOOR (so she looks unwell + the reunion lands)
  // but can't bottom out — an 8h sleep or a long day away never ends the cat. A floored
  // pet springs straight back the moment you feed her.
  let health = state.stats.health;
  const hungerCritical = hunger <= HUNGER_CRITICAL_THRESHOLD;
  const happinessCritical = happiness <= HAPPINESS_CRITICAL_THRESHOLD;
  if (hungerCritical || happinessCritical) {
    health = Math.max(HEALTH_NEGLECT_FLOOR, health - HEALTH_DECAY_CRITICAL_PER_SECOND * elapsed);
  } else {
    health = clamp(health + HEALTH_REGEN_PER_SECOND * elapsed);
  }

  // §9 — the good death: a long life ends gently of old age. This is the natural,
  // *expected* close, never a fail-state — and now the ONLY way the care loop ends.
  let isDead = false;
  let causeOfDeath: CauseOfDeath = null;
  if (ageSeconds >= NATURAL_LIFESPAN_SECONDS) {
    isDead = true;
    causeOfDeath = 'oldAge';
  }

  // §5 — her person's mood ebbs back toward neutral on the real clock.
  const ownerMood = driftOwnerMood(state.ownerMood ?? OWNER_MOOD_SEED, elapsed);
  // §8 — a long absence dims the warmth a little (you missed her life); the reunion
  // heals the rest. Short ticks dim nothing — neglect costs moments, never the cat.
  const bond = dimBondForAbsence(state.bond ?? BOND_SEED, rawElapsed);

  return {
    ...state,
    lastTick: now,
    ageSeconds,
    isDead,
    causeOfDeath,
    stats: { ...state.stats, hunger, happiness, health },
    ownerMood,
    bond,
    economy,
  };
}

// ─── Reducers ─────────────────────────────────────────────────────────────────

export function feed(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  return {
    ...simulated,
    bond: deepenBond(simulated.bond ?? BOND_SEED), // showing up grows the bond (§8)
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
    bond: deepenBond(simulated.bond ?? BOND_SEED), // the warmth verb deepens the bond (§8)
    stats: {
      ...simulated.stats,
      happiness: clamp(simulated.stats.happiness + PLAY_HAPPINESS_BOOST),
      hunger: clamp(simulated.stats.hunger - PLAY_HUNGER_COST),
    },
  };
}

/** Play a specific way (PET, FEATHER, LASER, …). Each lifts happiness, deepens the
 *  bond, and — for active play — costs a little hunger (see game/play.ts). No-op if
 *  the play is unknown, the pet is dead, or it isn't an animal. */
export function playWith(state: PetState, playId: string, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  const def = playById(playId);
  if (def === null) return simulated;
  return {
    ...simulated,
    bond: deepenBond(simulated.bond ?? BOND_SEED, def.bond),
    stats: {
      ...simulated.stats,
      happiness: clamp(simulated.stats.happiness + def.happiness),
      hunger: clamp(simulated.stats.hunger - def.hunger),
    },
  };
}

/**
 * Social boost from meeting another TAMAGAMI cat nearby (+happiness, a little
 * +health). Cooldown gating lives in the friends layer — this reducer just
 * applies the effect.
 */
export function socialize(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      happiness: clamp(simulated.stats.happiness + SOCIAL_HAPPINESS_BOOST),
      health: clamp(simulated.stats.health + SOCIAL_HEALTH_BOOST),
    },
  };
}

/**
 * Stamp a live world event onto the pet (its permanent aura). Idempotent: a pet
 * can only carry a given event once, no matter how many times it's witnessed.
 * Simulates first so witnessing also advances the clock; a dead pet can't witness.
 */
export function witnessEvent(state: PetState, eventId: string, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || simulated.events.includes(eventId)) return simulated;
  return { ...simulated, events: [...simulated.events, eventId] };
}

/**
 * Tend today's ailment (§9 — rest / vet / medicine). Recoverable by design: this
 * just stamps today's local day on `lastTreatedDay`, which clears the worry until
 * tomorrow (see sickness.activeAilment). A small bond tick — caring is love.
 */
export function treat(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  return {
    ...simulated,
    lastTreatedDay: treatedDayFor(now),
    bond: deepenBond(simulated.bond ?? BOND_SEED),
  };
}

/**
 * The reciprocal heart (§5): the cat is there for her person. On a hard day the
 * comfort softens it; on a bright day she shares the joy — either way the owner's
 * mood lifts and the bond deepens. Driven by today's owner event so it lands on
 * the day it's about.
 */
export function comfortOwner(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  const event = ownerEventAt(now, ownerSeedFor(simulated), ownerStageOf(simulated));
  return {
    ...simulated,
    ownerMood: applyOwnerEvent(simulated.ownerMood ?? OWNER_MOOD_SEED, event, true),
    bond: deepenBond(simulated.bond ?? BOND_SEED),
  };
}

// ─── Economy reducers (cat / dog) ─────────────────────────────────────────────
// Each simulates to `now` first (so wages/study are banked up to the moment of
// the action) and then applies one economy change. All are no-ops on a dead pet,
// a plant, or an invalid/unaffordable action — guards mirror the pure economy fns.

/** Spend coins to feed. Restores hunger + a little happiness per the food def.
 *  No-op if the food is unknown or unaffordable (the shop UI gates this too). */
export function buyFood(state: PetState, foodId: string, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  const food = foodById(foodId);
  if (food === null || simulated.economy.coins < food.price) return simulated;
  return {
    ...simulated,
    stats: {
      ...simulated.stats,
      hunger: clamp(simulated.stats.hunger + food.hunger),
      happiness: clamp(simulated.stats.happiness + food.happiness),
    },
    economy: { ...simulated.economy, coins: simulated.economy.coins - food.price },
  };
}

/** Buy an accessory (and wear it). Charges coins on first purchase; re-buying
 *  something already owned just re-equips it, free. No-op if unknown, dead, or
 *  unaffordable (the shop UI gates this too). */
export function buyAccessory(state: PetState, accessoryId: string, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  const acc = accessoryById(accessoryId);
  if (acc === null) return simulated;
  const cos = simulated.cosmetics ?? defaultCosmetics();
  // Already owned → wear it, no charge.
  if (ownsAccessory(cos, accessoryId)) {
    return { ...simulated, cosmetics: acquireCosmetic(cos, accessoryId) };
  }
  if (simulated.economy.coins < acc.price) return simulated;
  return {
    ...simulated,
    economy: { ...simulated.economy, coins: simulated.economy.coins - acc.price },
    cosmetics: acquireCosmetic(cos, accessoryId),
  };
}

/** Wear / take off an owned accessory. No-op if dead or not owned. */
export function toggleAccessory(state: PetState, accessoryId: string, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;
  return { ...simulated, cosmetics: toggleCosmetic(simulated.cosmetics ?? defaultCosmetics(), accessoryId) };
}

/** Take a job you qualify for. */
export function chooseJob(state: PetState, jobId: string, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  return { ...simulated, economy: withJob(simulated.economy, jobId) };
}

/** Quit your job (and clock out). */
export function quitJob(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;
  return { ...simulated, economy: withoutJob(simulated.economy) };
}

/** Clock in to start earning. No-op if unemployed or already on the clock. */
export function clockIn(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  return { ...simulated, economy: econClockIn(simulated.economy, now) };
}

/** Clock out. Wages up to `now` were banked by the simulate() above. */
export function clockOut(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead) return simulated;
  return { ...simulated, economy: econClockOut(simulated.economy) };
}

/** Enroll in the next education program (pay tuition, start the study timer). */
export function enroll(state: PetState, now: number): PetState {
  const simulated = simulate(state, now);
  if (simulated.isDead || !isAnimal(simulated.petType)) return simulated;
  return { ...simulated, economy: econEnroll(simulated.economy, now) };
}

export function restart(state: PetState, now: number, petType?: PetType, name?: string): PetState {
  return createInitialPet(sanitizeName(name ?? state.name), petType ?? state.petType, now);
}

export function rename(state: PetState, name: string): PetState {
  return { ...state, name: sanitizeName(name) };
}

/** Set YOU — the player's name, captured in the cold open (§2). Empty defaults to "You". */
export function nameOwner(state: PetState, name: string): PetState {
  return { ...state, ownerName: sanitizeName(name, 'You') };
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function getMood(state: PetState): Mood {
  if (state.isDead) return 'dead';

  const level = (state.stats.hunger + state.stats.happiness) / 2;

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
 * Projects when each care stat (hunger + happiness) will next need attention.
 * Used by notifications.ts to schedule local push notifications.
 */
export function nextStageAt(state: PetState): NotificationProjection[] {
  if (state.isDead) return [];

  const now = state.lastTick;
  const projections: NotificationProjection[] = [];

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
