// ─── Living world: timed events ───────────────────────────────────────────────
//
// Rare, time-boxed phenomena driven entirely by the device clock — so they're
// deterministic AND shareable ("the eclipse is live RIGHT NOW, go look"). A pet
// that's present during an event can *witness* it (engine.witnessEvent), which
// stamps the pet with an aura and adds the event to the permanent event codex.
// This is the curiosity drip: there's always something you might be missing.
//
// Windows are intentionally legible so players can learn them (Animal Crossing
// taught everyone to chase the clock):
//   • METEOR SHOWER — every night, 21:00–05:00 (easy to catch)
//   • 3AM VISITOR   — daily, 03:00–03:59 (you have to be up, or cheat the clock)
//   • SOLAR ECLIPSE — rare: ~1 day in 6, 12:00–12:59 (the "did you get it?" flex)
//
// Only one event is active at a time; rarer beats commoner (eclipse > visitor >
// meteor). Pure: every function takes `now`.

import { hourOf } from './world';

export interface GameEvent {
  id: string;
  name: string;   // display name
  short: string;  // ≤7-char codex label
  glyph: string;  // single Press Start 2P-safe char for the banner
  blurb: string;  // one-line flavor for the reveal
}

export const EVENT_CATALOG: readonly GameEvent[] = [
  { id: 'eclipse',  name: 'SOLAR ECLIPSE',  short: 'ECLIPSE', glyph: 'O', blurb: 'NOON GOES DARK AS NIGHT.' },
  { id: 'visitor',  name: '3AM VISITOR',    short: 'VISITOR', glyph: '?', blurb: 'SOMETHING WATCHES FROM THE DARK.' },
  { id: 'meteor',   name: 'METEOR SHOWER',  short: 'METEOR',  glyph: '*', blurb: 'FALLING STARS STREAK THE SKY.' },
];

const BY_ID: Record<string, GameEvent> = Object.fromEntries(
  EVENT_CATALOG.map((e) => [e.id, e]),
);

export const EVENT_IDS: readonly string[] = EVENT_CATALOG.map((e) => e.id);
export const TOTAL_EVENTS = EVENT_CATALOG.length;

export function eventById(id: string): GameEvent | null {
  return BY_ID[id] ?? null;
}

export function isValidEventId(id: string): boolean {
  return id in BY_ID;
}

/** Local day index (days since epoch in local time) — the eclipse calendar key. */
export function dayIndex(now: number): number {
  const d = new Date(now);
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.floor(localMidnight / 86_400_000);
}

/** Deterministic: is today an eclipse day? ~1 in 6 days, stable for everyone. */
export function isEclipseDay(now: number): boolean {
  return ((dayIndex(now) % 6) + 6) % 6 === 3;
}

/** The single event active at `now`, or null. Rarer events win. */
export function activeEventAt(now: number): GameEvent | null {
  const h = hourOf(now);
  if (isEclipseDay(now) && h === 12) return BY_ID.eclipse;
  if (h === 3) return BY_ID.visitor;
  if (h >= 21 || h < 5) return BY_ID.meteor;
  return null;
}
