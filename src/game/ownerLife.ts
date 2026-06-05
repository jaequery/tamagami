// ─── The owner's life — the events that make every day worth checking (§5) ──────
//
// This is the engine that replaces the loot box, and it's better because it's
// real. The reason to open the app isn't "what did I roll," it's "what happened to
// her owner today?" The owner is a whole person whose life keeps moving on its own
// real-clock parallel timeline; you don't choose it, you *find out* — the way you
// find out about a friend's day. And the cat is there for all of it.
//
// Everything is dealt deterministically from (real date, owner seed, life-stage,
// situation) — reproducible, testable, no Math.random. Events are WITNESSED, not
// authored (this is not BitLife): a few dozen evocative beats create the
// "what's next?" pull without a branching life-management sim.
//
// Tone guardrail (this section needs it most): warmth and hope, always. Hard
// events exist only so the cat can be a comfort — never misery tourism, no
// self-harm specifics, no darkness without a hand reaching back toward the light.

import { hashUnit } from './evolution';
import { dayIndex } from './events';
import type { LifeSituation } from './household';

export type OwnerStage = 'child' | 'teen' | 'young_adult' | 'adult' | 'elder';
export type OwnerTone = 'quiet' | 'hard' | 'bright' | 'turning';
export type CatResponse = 'none' | 'comfort' | 'celebrate';

export const OWNER_STAGES: readonly OwnerStage[] = [
  'child', 'teen', 'young_adult', 'adult', 'elder',
];

export interface OwnerEvent {
  id: string;
  tone: OwnerTone;
  text: string;            // what you witness when they come home different
  response: CatResponse;   // what the cat can do about it
  responseText: string;    // the small real-time act (comfort / celebrate)
  moodDelta: number;       // effect on the owner's mood (the cat's response softens it)
  stages: readonly OwnerStage[]; // which life-stages this beat can land in
}

const ALL: readonly OwnerStage[] = OWNER_STAGES;
const ADULTISH: readonly OwnerStage[] = ['young_adult', 'adult', 'elder'];
const YOUNG: readonly OwnerStage[] = ['child', 'teen'];

// ─── The event table (§5 V1: ~two dozen beats across the tones) ─────────────────
export const OWNER_EVENTS: readonly OwnerEvent[] = [
  // ── Quiet days (the baseline that makes the turns land) ──
  { id: 'q_ordinary', tone: 'quiet', text: 'an ordinary day. they read a while, and you kept their feet warm.', response: 'none', responseText: '', moodDelta: 1, stages: ALL },
  { id: 'q_tea', tone: 'quiet', text: 'a slow evening — tea going cold, the radio low, you on the windowsill.', response: 'none', responseText: '', moodDelta: 1, stages: ALL },
  { id: 'q_errands', tone: 'quiet', text: 'errands, dishes, the usual. they came home and looked glad you were here.', response: 'none', responseText: '', moodDelta: 1, stages: ALL },
  { id: 'q_rain_in', tone: 'quiet', text: 'they stayed in all day. nothing happened, and it was nice.', response: 'none', responseText: '', moodDelta: 1, stages: ALL },

  // ── Hard days (the cat can comfort) ──
  { id: 'h_work', tone: 'hard', text: 'a bad day at work. they came home heavy and didn\'t say much.', response: 'comfort', responseText: 'you climbed into their lap and stayed until their shoulders dropped.', moodDelta: -8, stages: ADULTISH },
  { id: 'h_friend', tone: 'hard', text: 'a fight with a friend. they sat by the window a long time.', response: 'comfort', responseText: 'you pressed your head under their chin until they finally exhaled.', moodDelta: -7, stages: ALL },
  { id: 'h_exam', tone: 'hard', text: 'they failed the exam. the books are shut on the floor.', response: 'comfort', responseText: 'you curled on top of the closed books, right where they\'d look.', moodDelta: -6, stages: YOUNG },
  { id: 'h_money', tone: 'hard', text: 'money is tight this month. the bills are spread across the table.', response: 'comfort', responseText: 'you stepped onto the paperwork and demanded to be held instead.', moodDelta: -7, stages: ADULTISH },
  { id: 'h_breakup', tone: 'hard', text: 'a heartbreak. the apartment is very quiet tonight.', response: 'comfort', responseText: 'you slept against their back all night so they weren\'t alone in it.', moodDelta: -9, stages: ADULTISH },
  { id: 'h_loss', tone: 'hard', text: 'a loss in the family. they\'re holding the phone and not moving.', response: 'comfort', responseText: 'you stayed in their lap through the whole long evening.', moodDelta: -10, stages: ADULTISH },
  { id: 'h_lonely', tone: 'hard', text: 'a long, lonely day. no one called.', response: 'comfort', responseText: 'you decided their lap was the only place in the world to be.', moodDelta: -6, stages: ['elder'] },

  // ── Bright days (the cat can celebrate) ──
  { id: 'b_promo', tone: 'bright', text: 'a promotion! they came in grinning and couldn\'t hold it in.', response: 'celebrate', responseText: 'you did three laps of zoomies and knocked the good pen off the desk.', moodDelta: 9, stages: ADULTISH },
  { id: 'b_test', tone: 'bright', text: 'an A on the test — they stuck it to the fridge.', response: 'celebrate', responseText: 'you batted at the magnet until it was officially a celebration.', moodDelta: 7, stages: YOUNG },
  { id: 'b_date', tone: 'bright', text: 'a first date that went well. they keep smiling at nothing.', response: 'celebrate', responseText: 'you wove between their ankles in a happy figure-eight.', moodDelta: 8, stages: ADULTISH },
  { id: 'b_reunion', tone: 'bright', text: 'an old friend visited. the house was loud and warm for once.', response: 'celebrate', responseText: 'you held court on the couch and accepted all admiration.', moodDelta: 7, stages: ALL },
  { id: 'b_kindness', tone: 'bright', text: 'a stranger did them an unexpected kindness today.', response: 'celebrate', responseText: 'you trilled and rolled over, paws in the air.', moodDelta: 6, stages: ALL },
  { id: 'b_payday', tone: 'bright', text: 'they got back on their feet this month. relief, finally.', response: 'celebrate', responseText: 'you supervised the grocery unpacking with great importance.', moodDelta: 7, stages: ADULTISH },

  // ── Turning points (the big beats that reshape the home) ──
  { id: 't_newjob', tone: 'turning', text: 'a new job. everything is about to change shape.', response: 'celebrate', responseText: 'you inspected the new work bag thoroughly and approved it.', moodDelta: 8, stages: ADULTISH },
  { id: 't_move', tone: 'turning', text: 'they\'re moving. boxes everywhere, and a little fear under the excitement.', response: 'comfort', responseText: 'you claimed the biggest box immediately so it would feel like home.', moodDelta: 4, stages: ADULTISH },
  { id: 't_love', tone: 'turning', text: 'they\'re falling in love. the place feels lighter lately.', response: 'celebrate', responseText: 'you reserved judgment on the newcomer, then allowed one chin scratch.', moodDelta: 9, stages: ADULTISH },
  { id: 't_graduation', tone: 'turning', text: 'graduation. the long thing is finally finished.', response: 'celebrate', responseText: 'you sat on the cap and refused to be moved.', moodDelta: 9, stages: ['teen', 'young_adult'] },
  { id: 't_baby', tone: 'turning', text: 'a new baby is coming. the spare room is changing.', response: 'comfort', responseText: 'you appointed yourself senior advisor on all matters of the nursery.', moodDelta: 8, stages: ADULTISH },
  { id: 't_grandkid', tone: 'turning', text: 'the grandkids visited. small hands, big noise, a tired happy quiet after.', response: 'celebrate', responseText: 'you survived being loved very thoroughly by small humans.', moodDelta: 8, stages: ['elder'] },
];

const BY_ID: Record<string, OwnerEvent> = Object.fromEntries(OWNER_EVENTS.map((e) => [e.id, e]));

export function ownerEventById(id: string): OwnerEvent | null {
  return BY_ID[id] ?? null;
}

export function isValidOwnerEventId(id: string): boolean {
  return id in BY_ID;
}

// ─── Starting stage from the household situation (§2 → §5 seed) ──────────────────
const SITUATION_START_STAGE: Record<LifeSituation, OwnerStage> = {
  warm_chaos: 'adult',
  lonely_elder: 'elder',
  grieving: 'adult',
  struggling: 'young_adult',
  striver: 'adult',
  new_couple: 'young_adult',
  single_parent: 'adult',
  rebuilding: 'adult',
};

export function startOwnerStage(situation: LifeSituation): OwnerStage {
  return SITUATION_START_STAGE[situation];
}

// ─── The daily deal ──────────────────────────────────────────────────────────────
// Cadence (§5 locked decision): a meaningful turn every few days, ordinary days
// between. Most days roll quiet; ~1 day in 4 turns, and within that the tone is
// weighted toward hard/bright over the rarer turning points.
const TURN_CHANCE = 0.26;

function eventsFor(tone: OwnerTone, stage: OwnerStage): OwnerEvent[] {
  return OWNER_EVENTS.filter((e) => e.tone === tone && e.stages.includes(stage));
}

function pickTurnTone(unit: number): Exclude<OwnerTone, 'quiet'> {
  // hard 0.42 · bright 0.42 · turning 0.16 — drama you can feel, not a soap opera.
  if (unit < 0.42) return 'hard';
  if (unit < 0.84) return 'bright';
  return 'turning';
}

function pickFrom(pool: OwnerEvent[], unit: number, fallbackTone: OwnerTone, stage: OwnerStage): OwnerEvent {
  if (pool.length > 0) return pool[Math.floor(unit * pool.length) % pool.length];
  // Stage had no event of the chosen tone → fall back to a quiet beat for that stage.
  const quiet = eventsFor('quiet', stage);
  return quiet[Math.floor(unit * quiet.length) % quiet.length] ?? OWNER_EVENTS[0];
}

/**
 * The owner's event for the local day containing `now`. Stable across the day
 * (keyed on the local day index) and deterministic given the owner seed + stage.
 */
export function ownerEventAt(now: number, ownerSeed: string, stage: OwnerStage): OwnerEvent {
  const day = dayIndex(now);
  // Day-index leads each seed: FNV-1a mixes trailing bytes weakly, so a day-at-the-
  // end key clusters across the consecutive days a player actually lives.
  const turnRoll = hashUnit(`${day}:ownerturn:${ownerSeed}`);
  if (turnRoll >= TURN_CHANCE) {
    return pickFrom(eventsFor('quiet', stage), hashUnit(`${day}:ownerquiet:${ownerSeed}`), 'quiet', stage);
  }
  const tone = pickTurnTone(hashUnit(`${day}:ownertone:${ownerSeed}`));
  return pickFrom(eventsFor(tone, stage), hashUnit(`${day}:ownerpick:${ownerSeed}`), tone, stage);
}

// ─── Owner mood (0..100; the cat's response softens the blow / shares the joy) ───
export const OWNER_MOOD_SEED = 55;
export const OWNER_MOOD_NEUTRAL = 50;
const OWNER_MOOD_MIN = 0;
const OWNER_MOOD_MAX = 100;

function clampMood(v: number): number {
  return Math.max(OWNER_MOOD_MIN, Math.min(OWNER_MOOD_MAX, v));
}

/** Apply a day's event to the owner mood. If the cat responds, the blow is softer
 *  / the joy is bigger — that's the reciprocal heart of the triangle (§5). */
export function applyOwnerEvent(mood: number, event: OwnerEvent, catResponds: boolean): number {
  let delta = event.moodDelta;
  if (catResponds && event.response === 'comfort') delta = delta / 2 + 3; // comfort lifts a hard day
  if (catResponds && event.response === 'celebrate') delta += 3;          // shared joy is bigger
  return clampMood(mood + delta);
}

// Owner mood drifts back toward neutral over real time — a bad night doesn't last
// forever, a good one settles. Half-life ~ a couple of days.
const MOOD_DRIFT_PER_SECOND = (OWNER_MOOD_MAX - OWNER_MOOD_MIN) / (2 * 24 * 60 * 60);

export function driftOwnerMood(mood: number, elapsedSeconds: number): number {
  if (mood === OWNER_MOOD_NEUTRAL) return mood;
  const step = MOOD_DRIFT_PER_SECOND * elapsedSeconds;
  if (mood > OWNER_MOOD_NEUTRAL) return clampMood(Math.max(OWNER_MOOD_NEUTRAL, mood - step));
  return clampMood(Math.min(OWNER_MOOD_NEUTRAL, mood + step));
}

export type OwnerMoodBand = 'low' | 'okay' | 'good';
export function ownerMoodBand(mood: number): OwnerMoodBand {
  if (mood < 38) return 'low';
  if (mood < 68) return 'okay';
  return 'good';
}
