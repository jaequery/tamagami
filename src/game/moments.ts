// ─── Daily moments + milestones (GAME.md §4 her daily surprises, §6 firsts/lasts) ─
//
// She's always up to something you might not have seen — and catching a new one
// quietly fills the codex, so the daily peek is also a collection hunt ("I finally
// caught her doing the thing"). Each day's moment is dealt deterministically from
// (real date + her seed + her stage + her mood), so it's *hers*, reproducible, and
// collectible — never Math.random.
//
// The long arc (§6) is punctuated by FIRSTS and LASTS — a first counter-jump, the
// day the jump finally fails — dealt at stage crossings. Each lands *because* it
// took real weeks to arrive; you can't rush a "last."
//
// Pure pickers here; the caught-set lives in momentCodex.ts (save-independent,
// like the event codex).

import { hashUnit } from './evolution';
import { dayIndex } from './events';
import type { LifeStage } from './types';

export type MoodBand = 'happy' | 'neutral' | 'sad';
export type MomentKind = 'daily' | 'first' | 'last';

export interface Moment {
  id: string;
  kind: MomentKind;
  text: string;
  stages?: readonly LifeStage[]; // omitted = any post-egg stage
  moods?: readonly MoodBand[];   // omitted = any mood (daily only)
}

const GROWN: readonly LifeStage[] = ['baby', 'child', 'teen', 'adult', 'elder'];

// ─── Daily behaviors (§4) — small, unscripted-feeling, charm-per-line high ──────
export const DAILY_MOMENTS: readonly Moment[] = [
  { id: 'd_sunbeam', kind: 'daily', text: 'she found the one noon sunbeam and melted into it.', moods: ['happy', 'neutral'] },
  { id: 'd_cup', kind: 'daily', text: 'she knocked a cup clean off the table and watched it go.', moods: ['happy', 'neutral'] },
  { id: 'd_sock', kind: 'daily', text: 'she dragged a single sock into her bed. it\'s hers now.' },
  { id: 'd_bug', kind: 'daily', text: 'she presented you with a bug. a gift. be grateful.', moods: ['happy', 'neutral'] },
  { id: 'd_box', kind: 'daily', text: 'a box appeared. she is inside the box. this is the law.' },
  { id: 'd_loaf', kind: 'daily', text: 'she folded into a perfect loaf and powered down.' },
  { id: 'd_window', kind: 'daily', text: 'she chattered at a bird through the glass for ten whole minutes.' },
  { id: 'd_zoom', kind: 'daily', text: 'a 3am-energy zoomie at 2pm, for no reason anyone could find.', stages: ['baby', 'child', 'teen'] },
  { id: 'd_knead', kind: 'daily', text: 'she kneaded the blanket like she was making bread.', moods: ['happy', 'neutral'] },
  { id: 'd_hide', kind: 'daily', text: 'she vanished. you found her, eventually, in the impossible spot.' },
  { id: 'd_keyboard', kind: 'daily', text: 'she walked across the keyboard and added her thoughts to your work.' },
  { id: 'd_groom', kind: 'daily', text: 'a long, dignified bath, paused only to make eye contact.' },
  { id: 'd_tail', kind: 'daily', text: 'she lost a brief but intense battle with her own tail.', stages: ['baby', 'child'] },
  { id: 'd_sulk', kind: 'daily', text: 'she sat with her back to you. you will be forgiven, in time.', moods: ['sad'] },
  { id: 'd_paperbag', kind: 'daily', text: 'she investigated a paper bag with the focus of a detective.' },
  { id: 'd_stretch', kind: 'daily', text: 'she did the long stretch — front, then back — and yawned at the day.' },
  { id: 'd_blanket', kind: 'daily', text: 'she burrowed under the blanket and became a small warm lump.', moods: ['neutral', 'sad'] },
  { id: 'd_perch', kind: 'daily', text: 'she claimed the highest point in the room and surveyed her kingdom.' },
];

// ─── Milestones (§6) — firsts you celebrate, lasts that ache ─────────────────────
// Keyed by the stage at which they become catchable. Firsts arrive as she grows
// up; lasts arrive as she slows down.
export const MILESTONES: readonly Moment[] = [
  { id: 'first_jump', kind: 'first', text: 'her first real counter-jump — she made it, and looked amazed.', stages: ['child'] },
  { id: 'first_hunt', kind: 'first', text: 'her first real hunt: a moth, caught mid-air. she\'s very proud.', stages: ['child', 'teen'] },
  { id: 'first_gift', kind: 'first', text: 'the first time she brought you something and dropped it at your feet.', stages: ['teen'] },
  { id: 'first_lap', kind: 'first', text: 'the first time she chose your lap on her own and stayed.', stages: ['teen', 'adult'] },
  { id: 'last_zoomies', kind: 'last', text: 'the last set of zoomies, though neither of you knew it yet.', stages: ['adult'] },
  { id: 'last_jump', kind: 'last', text: 'the day the counter-jump finally didn\'t make it. she pretended not to mind.', stages: ['elder'] },
  { id: 'settle_laps', kind: 'last', text: 'she picks the sunbeam over the chase now, and your lap over both.', stages: ['elder'] },
];

export const ALL_MOMENTS: readonly Moment[] = [...DAILY_MOMENTS, ...MILESTONES];

const BY_ID: Record<string, Moment> = Object.fromEntries(ALL_MOMENTS.map((m) => [m.id, m]));
export const MOMENT_IDS: readonly string[] = ALL_MOMENTS.map((m) => m.id);
export const TOTAL_MOMENTS = ALL_MOMENTS.length;

export function momentById(id: string): Moment | null {
  return BY_ID[id] ?? null;
}

export function isValidMomentId(id: string): boolean {
  return id in BY_ID;
}

function stageOk(m: Moment, stage: LifeStage): boolean {
  return m.stages === undefined ? GROWN.includes(stage) : m.stages.includes(stage);
}
function moodOk(m: Moment, mood: MoodBand): boolean {
  return m.moods === undefined || m.moods.includes(mood);
}

/**
 * Today's catchable daily moment — dealt from (date, seed, stage, mood). Stable
 * across the local day. Returns null only before she's hatched (egg).
 */
export function momentOfDay(
  now: number,
  seed: string,
  stage: LifeStage,
  mood: MoodBand,
): Moment | null {
  if (stage === 'egg') return null;
  const pool = DAILY_MOMENTS.filter((m) => stageOk(m, stage) && moodOk(m, mood));
  const usable = pool.length > 0 ? pool : DAILY_MOMENTS.filter((m) => stageOk(m, stage));
  if (usable.length === 0) return null;
  // Day-index leads the seed (FNV-1a mixes trailing bytes weakly → day-at-end keys
  // would repeat the same moment over consecutive days).
  const idx = Math.floor(hashUnit(`${dayIndex(now)}:moment:${seed}`) * usable.length) % usable.length;
  return usable[idx];
}

/**
 * The milestone (first/last) that becomes catchable on crossing INTO `stage`, if
 * any — dealt deterministically so a given life always hits the same beats in
 * order. Returns null for stages with no milestone.
 */
export function milestoneForStage(stage: LifeStage, seed: string): Moment | null {
  const pool = MILESTONES.filter((m) => m.stages !== undefined && m.stages.includes(stage));
  if (pool.length === 0) return null;
  const idx = Math.floor(hashUnit(`milestone:${seed}:${stage}`) * pool.length) % pool.length;
  return pool[idx];
}
