// ─── Play ───────────────────────────────────────────────────────────────────
// The ways to play with the cat. PLAY is no longer one button-press; it opens a
// little menu of activities, each with its own feel:
//
//   • calm play (PET, CUDDLE) — small happiness, NO hunger cost, big bond. The
//     quiet presence that earns affection over time (§8).
//   • active play (FEATHER, LASER, YARN) — big happiness, but it tires her out
//     (hunger cost), so play feeds back into the feed loop.
//
// Pure data + lookups (no I/O, no stats). The engine's playWith() applies the
// effect; the UI (components/PlayModal) lists these and fires the animation.

import type { PetActivity } from './animations';

export interface PlayDef {
  id:        string;
  title:     string;
  glyph:     string;       // single pixel-font char shown on the menu row
  blurb:     string;       // one warm line of flavor
  happiness: number;       // +happiness restored
  hunger:    number;       // hunger COST (≥0; subtracted — active play tires her)
  bond:      number;       // bond deepen amount (calm play bonds more; see bond.ts)
  activity:  PetActivity;  // which sprite animation plays
}

// Tuned around the old single PLAY (=+25 happiness, −8 hunger, +1.5 bond), which
// FEATHER now mirrors — so the default play feel is unchanged, just one of five.
export const PLAYS: readonly PlayDef[] = [
  { id: 'pet',     title: 'PET',     glyph: '♥', blurb: 'slow strokes. a deep rumbling purr.',     happiness: 12, hunger: 0,  bond: 3,   activity: 'cheer' },
  { id: 'feather', title: 'FEATHER', glyph: '~', blurb: 'a feather wand to stalk and pounce.',     happiness: 25, hunger: 8,  bond: 1.5, activity: 'jump'  },
  { id: 'laser',   title: 'LASER',   glyph: '+', blurb: 'the red dot. the eternal, hopeless hunt.', happiness: 32, hunger: 12, bond: 1.5, activity: 'jump'  },
  { id: 'yarn',    title: 'YARN',    glyph: 'o', blurb: 'a ball of yarn, gloriously unravelled.',   happiness: 20, hunger: 6,  bond: 1.5, activity: 'dance' },
  { id: 'cuddle',  title: 'CUDDLE',  glyph: 'u', blurb: 'a warm nap curled in your lap.',           happiness: 15, hunger: 0,  bond: 4,   activity: 'cheer' },
];

export function playById(id: string): PlayDef | null {
  return PLAYS.find((p) => p.id === id) ?? null;
}
