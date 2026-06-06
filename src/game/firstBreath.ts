// ─── The first breath — naming, and the clock wakes up (GAME.md §3) ────────────
//
// The calm beat right after the §1 birth, where attachment is sealed. Two things
// happen here and nowhere else: she becomes *named* (the shipped name step), and
// the game's one true promise — she lives on your real-world clock — is made out
// loud, by being *demonstrated*: the newborn reads the actual device hour and
// reacts to it. No tutorial says so; she just does it.
//
// Pure presentation copy + a phase→reaction read. The reaction reuses world.ts
// phaseOfDay, so it's the first surfacing of the real-clock wedge (and a direct
// foreshadow of the lock-screen widget, §7).

import { phaseOfDay, type DayPhase } from './world';

// The newborn pose to play with the reaction. The wake/settle/sleep poses are the
// flagged sprite-art task (Sprite.swift has only happy/neutral/sad/dead today).
export type WakePose = 'wake' | 'settle' | 'sleep';

export interface WakeReaction {
  pose: WakePose;
  line: string;
}

// Map the four day-phases onto the three newborn reactions (§3 beat 3).
const PHASE_REACTION: Record<DayPhase, WakeReaction> = {
  dawn: { pose: 'wake', line: 'it\'s morning where you are. {name} stretches and blinks at the light.' },
  day: { pose: 'wake', line: 'it\'s daytime where you are. {name} is wide awake, taking it all in.' },
  dusk: { pose: 'settle', line: 'it\'s getting late where you are. {name} is winding down.' },
  night: { pose: 'sleep', line: 'it\'s the middle of the night where you are. she\'s already curling into your palm.' },
};

/** Fill the {name} slot in a copy template. */
export function withName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

/**
 * How the just-named newborn reacts to the REAL current hour — the first and most
 * important demonstration of the whole game (§3 beat 3).
 */
export function wakeReaction(now: number, name: string): WakeReaction {
  const base = PHASE_REACTION[phaseOfDay(now)];
  return { pose: base.pose, line: withName(base.line, name) };
}

// ─── The fixed ceremony copy (§3 beats 1–5) ─────────────────────────────────────

// Beat 1 — it opens its eyes.
export const EYES_OPEN_LINES: readonly string[] = [
  'it doesn\'t know what you are yet.',
  'but it stopped trembling.',
];

// §2 pre-birth — the player names THEMSELVES (YOU), before her eyes open.
export const OWNER_NAME_PROMPT_LINES: readonly string[] = [
  'before any of this —',
  'what\'s your name?',
];

// §2 the meeting — bond-only (no household / family / situation). She arrives, and
// the first thing in the world is you.
export function meetingLines(owner: string): string[] {
  return ['and then there was a door,', `and behind it — ${owner}.`];
}

// §2 the naming ceremony — YOU give her her name.
export function ownerNamesYouLines(owner: string): string[] {
  return [`${owner} looks at you a long moment.`, `${owner} will name you…`];
}

// Beat 2 — the naming ask (a ceremony, not a label field).
export const NAMING_PROMPT_LINES: readonly string[] = [
  'the small ones become someone the moment they\'re named.',
  'what\'s hers?',
];

/** The held beat right after the name is confirmed. */
export function namedConfirmation(name: string): string[] {
  return [`${name}.`, 'she knows it now.'];
}

// Beat 3 — the promise (devotion, never surveillance).
export function clockPromiseLines(name: string): string[] {
  return [
    `from now on, ${name} lives on your time.`,
    'when you sleep, she sleeps. when you\'re gone — she\'ll know, and she\'ll be waiting.',
  ];
}

// Beat 4 — the first need, asked as a gentle bid (never a flashing alarm).
export const FIRST_FEED_BID = 'she\'s hungry. she keeps looking from you to her empty bowl.';

// Beat 5 — home.
export const HOME_LINE = 'this is home now.';
