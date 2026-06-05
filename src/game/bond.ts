// ─── The bond — felt, never metered (GAME.md §8) ───────────────────────────────
//
// The bond is the whole point of the game, and the fastest way to ruin it is to
// put a number on it. So there is NO meter. The value below is invisible: it only
// crosses thresholds that change how she *behaves* (greets you, headbutts, sleeps
// on your side), and it's named exactly once — gently, at the very end (§9), in
// the life-summary line. Early on it's barely there on purpose; it deepens the
// more you simply show up.
//
// Two rules hold the forgiving line (§4/§8):
//   • showing up GROWS it; absence only DIMS it — neglect costs you *moments*,
//     never the cat. It can't drive sickness or death.
//   • the reunion always HEALS: a long absence is met with warmth ("you came
//     back!"), never a guilt spiral.
//
// Pure + deterministic. The bond value lives on PetState (seeded low); these are
// the transitions and the read-outs.

export type BondLevel = 'wary' | 'warming' | 'bonded' | 'devoted';

// Seeded at first breath (§3): a newborn that just stopped trembling in your palm
// — present, but it doesn't know you yet.
export const BOND_SEED = 8;
export const BOND_MIN = 0;
export const BOND_MAX = 100;

// Threshold (inclusive lower bound) at which each behavior tier unlocks. Crossing
// one is what makes bonded-cat behaviors *emerge* (dealt, not toggled in a UI).
const BOND_THRESHOLDS: { level: BondLevel; at: number }[] = [
  { level: 'wary', at: 0 },
  { level: 'warming', at: 25 },
  { level: 'bonded', at: 55 },
  { level: 'devoted', at: 85 },
];

export const BOND_LEVELS: readonly BondLevel[] = ['wary', 'warming', 'bonded', 'devoted'];

export function bondLevel(value: number): BondLevel {
  let current: BondLevel = 'wary';
  for (const { level, at } of BOND_THRESHOLDS) {
    if (value >= at) current = level;
    else break;
  }
  return current;
}

function clampBond(value: number): number {
  return Math.max(BOND_MIN, Math.min(BOND_MAX, value));
}

// How much a single act of showing up adds (feed/play/hold/comfort). Small, so the
// bond is earned over weeks of presence, not bought in one session.
export const BOND_PER_CARE = 1.5;

/** Showing up — a care act deepens the bond a little. */
export function deepenBond(value: number, amount = BOND_PER_CARE): number {
  return clampBond(value + amount);
}

// ─── Reunion (the forgiving catch-up, §3/§8) ────────────────────────────────────
// "When you're gone, she'll know — and she'll be waiting." A short absence is an
// easy greeting; a long one is a wary beat your *showing up* repairs. The tiers
// are by hours away. None of them is a punishment — the warmth always returns.
export type ReunionTier = 'present' | 'missed-you' | 'where-were-you' | 'you-came-back';

const HOUR = 3600;

export function reunionTier(awaySeconds: number): ReunionTier {
  const hours = awaySeconds / HOUR;
  if (hours < 3) return 'present';
  if (hours < 12) return 'missed-you';
  if (hours < 48) return 'where-were-you';
  return 'you-came-back';
}

const REUNION_LINE: Record<ReunionTier, string> = {
  'present': '',
  'missed-you': 'she lifts her head and trots over — there you are.',
  'where-were-you': 'she watches you a moment from across the room before she comes.',
  'you-came-back': 'she freezes, then runs to you. you came back. you came back.',
};

export function reunionLine(tier: ReunionTier): string {
  return REUNION_LINE[tier];
}

// The cost of a long absence: the warmth DIMS a little (you missed her life), but
// it never breaks — and the reunion above heals the rest. Loss of moments, never
// loss of the cat.
export function dimBondForAbsence(value: number, awaySeconds: number): number {
  const tier = reunionTier(awaySeconds);
  const dim = tier === 'where-were-you' ? 3 : tier === 'you-came-back' ? 6 : 0;
  return clampBond(value - dim);
}

// ─── The closing line (named once, at the end — §8/§9) ──────────────────────────
// The bond is finally put into words on the life-summary card. The first time you
// "see" it is the moment it breaks your heart.
const BOND_SENTENCE: Record<BondLevel, string> = {
  wary: 'she was still learning to trust, and you were patient with her.',
  warming: 'she had just begun to lean into your hand.',
  bonded: 'she loved you, plainly and without reservation.',
  devoted: 'she trusted you completely, to the very last morning.',
};

export function bondSentence(value: number): string {
  return BOND_SENTENCE[bondLevel(value)];
}

// A few of the emergent behaviors each tier brings — surfaced as catchable beats,
// never as an unlock list (§8: "dealt, not unlocked").
const BOND_BEHAVIORS: Record<BondLevel, readonly string[]> = {
  wary: ['she takes the food, then keeps her distance.'],
  warming: ['she greets you at the door now.', 'a slow headbutt into your hand.'],
  bonded: ['she follows your attention room to room.', 'she brings you her best "gift."'],
  devoted: ['she sleeps on your side of the bed.', 'she chooses your lap over the sunbeam.'],
};

export function bondBehaviors(value: number): readonly string[] {
  return BOND_BEHAVIORS[bondLevel(value)];
}
