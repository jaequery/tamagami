// ─── Origins: the journey to you (GAME.md §1 — the cold open's dramatic branch) ─
//
// Every pet's life opens on a birth and a rescue. Which rescue is rolled ONCE,
// deterministically, off the same birth identity the rarity roll uses — so it is
// *this* pet's true story forever (reproducible, testable, shareable), never
// Math.random. The roll is biased by rarity: luckier pets drift toward the
// luckier origins (the bright window), commoner pets toward the everyday perils
// (the storm drain) — which sets up the origin × household contrast in §2.
//
// The ★ midnight litter is the secret origin: it is exactly the existing 1%
// `secret` rarity, dramatized (GAME.md: "the secret origin = the existing 1%
// secret rarity"). So a secret-rarity pet always carries the midnight origin, and
// nothing else can — it stays a genuine 1-in-100 reveal.
//
// Recorded permanently on the pet (and re-surfaced on the life-summary card at the
// end), an origin is the first beat of the "a life, dealt not chosen" pillar.

import { hashUnit, rarityRank } from './evolution';
import type { PetType, Rarity } from './types';

export type OriginId =
  | 'storm_drain'
  | 'cardboard_box'
  | 'long_wait'
  | 'hay_and_sun'
  | 'the_window'
  | 'midnight_litter';

export interface Origin {
  id: OriginId;
  title: string;     // marquee card title, e.g. "THE STORM DRAIN"
  tone: string;      // sealed-share fragment (withholds the form): "rescued from a storm drain"
  beats: string[];   // ~3 short interactive-fiction beats (the dramatized journey to you)
  summary: string;   // life-summary line, past tense: "the storm-drain runt who almost didn't make it"
  secret: boolean;   // the ★ 1% origin
}

// The constant hand-off that ends every origin and passes to §2 (naming/home).
export const HANDOFF_LINES: readonly string[] = [
  '…and a pair of hands reached down for you.',
  'they were yours.',
];

// ─── The origin catalog ────────────────────────────────────────────────────────
// Tonally distinct on purpose, so heirs and restarts feel like new lives.
export const ORIGINS: Record<OriginId, Origin> = {
  storm_drain: {
    id: 'storm_drain',
    title: 'THE STORM DRAIN',
    tone: 'rescued from a storm drain',
    beats: [
      'rain. a concrete drain. the litter is cold, and you are the smallest.',
      'you can barely breathe. the crying is mostly the others.',
      'then footsteps stop. someone kneels in the rain, and lifts the littlest one — you — into a dry coat.',
    ],
    summary: 'the storm-drain runt who almost didn\'t make it',
    secret: false,
  },
  cardboard_box: {
    id: 'cardboard_box',
    title: 'THE CARDBOARD BOX',
    tone: 'found in a "FREE" box on the sidewalk',
    beats: [
      'a box on the sidewalk outside a shop. "FREE" scrawled on the flap.',
      'people walk past in the cold. no one slows down.',
      'then a small face peers over the edge — a child — and a finger points. "that one."',
    ],
    summary: 'the free-box kitten a child pointed to and chose',
    secret: false,
  },
  long_wait: {
    id: 'long_wait',
    title: 'THE LONG WAIT',
    tone: 'the shelter cat who waited',
    beats: [
      'born behind glass at a shelter. bright lights, a steady hum.',
      'one by one your siblings are carried out, smiling. the cage empties.',
      'you wait. and wait. until the day the hands finally stop at your glass.',
    ],
    summary: 'the shelter cat who waited, and waited, and was finally chosen',
    secret: false,
  },
  hay_and_sun: {
    id: 'hay_and_sun',
    title: 'THE HAY AND THE SUN',
    tone: 'born in a barn in a square of morning light',
    beats: [
      'a warm barn. straw, and a square of morning light laid across it.',
      'you wobble into the sun and blink up at the dust turning gold.',
      'a neighbor comes by, cups you in two hands, and carries you home down a dirt road.',
    ],
    summary: 'born in the hay, carried home down a dirt road',
    secret: false,
  },
  the_window: {
    id: 'the_window',
    title: 'THE WINDOW',
    tone: 'chosen first from the bright shop window',
    beats: [
      'the bright pet-shop window. warm glass, a small crowd outside.',
      'you are the liveliest of the litter — tumbling, fearless, showing off.',
      'you are chosen first, before you even understand what choosing is.',
    ],
    summary: 'the window-kitten, chosen first of all',
    secret: false,
  },
  midnight_litter: {
    id: 'midnight_litter',
    title: 'THE MIDNIGHT LITTER',
    tone: 'born at 3 a.m. under a sky doing something it shouldn\'t',
    beats: [
      '3:00 a.m. the sky is doing something it shouldn\'t — a moon too close, a hush over everything.',
      'the other kittens sleep. your eyes open early, and they are the wrong, wonderful color.',
      'no one quite remembers how you reached the hands that found you.',
    ],
    summary: 'the impossible one, born at 3 a.m. under a wrong, wonderful sky',
    secret: true,
  },
};

export const ORIGIN_IDS: readonly OriginId[] = Object.keys(ORIGINS) as OriginId[];

/** The five everyday origins (everything but the ★ secret), in catalog order. */
const EVERYDAY_IDS: readonly Exclude<OriginId, 'midnight_litter'>[] = [
  'storm_drain', 'cardboard_box', 'long_wait', 'hay_and_sun', 'the_window',
];

// Weight of each everyday origin at rarity rank 0..3 (common·uncommon·rare·epic).
// secret (rank 4) never reaches here — it always rolls the midnight litter. Peril
// origins fade as rarity climbs; the lucky window rises sharply — so a luckier pet
// tends to a luckier start, and the §2 household roll supplies the contrast.
const EVERYDAY_WEIGHTS: Record<Exclude<OriginId, 'midnight_litter'>, [number, number, number, number]> = {
  storm_drain:   [35, 26, 16, 8],
  cardboard_box: [28, 24, 18, 11],
  long_wait:     [22, 22, 21, 17],
  hay_and_sun:   [12, 17, 22, 24],
  the_window:    [3, 11, 23, 40],
};

export function isOriginId(value: unknown): value is OriginId {
  return typeof value === 'string' && value in ORIGINS;
}

/** The stable seed for a pet's origin roll — distinct namespace from the rarity seed. */
export function originSeed(bornAt: number, name: string, petType: PetType): string {
  return `origin:${bornAt}:${petType}:${name}`;
}

/**
 * Roll this pet's origin, deterministically and once. The ★ midnight litter is
 * reserved for `secret` rarity (the 1% reveal, dramatized); every other rarity
 * draws from the five everyday origins, weighted by how lucky the pet is.
 */
export function rollOrigin(
  bornAt: number,
  name: string,
  petType: PetType,
  rarity: Rarity,
): OriginId {
  if (rarity === 'secret') return 'midnight_litter';

  const rank = rarityRank(rarity); // 0..3 for non-secret
  const total = EVERYDAY_IDS.reduce((sum, id) => sum + EVERYDAY_WEIGHTS[id][rank], 0);
  const target = hashUnit(originSeed(bornAt, name, petType)) * total;

  let acc = 0;
  for (const id of EVERYDAY_IDS) {
    acc += EVERYDAY_WEIGHTS[id][rank];
    if (target < acc) return id;
  }
  return 'long_wait'; // float-rounding safety net
}

export function originById(id: OriginId): Origin {
  return ORIGINS[id];
}
