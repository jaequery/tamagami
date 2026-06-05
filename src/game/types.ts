// ─── Pet type ───────────────────────────────────────────────────────────────
// The three care archetypes. Plant is the simplified one (water only);
// cat and dog share the richer feed + play loop.
export type PetType = 'plant' | 'cat' | 'dog';

// 'oldAge' is the gentle, expected close to a long life (§9 — never a fail-state);
// 'illness' is the rare grave end of an untreated serious sickness.
export type CauseOfDeath = 'starvation' | 'thirst' | 'neglect' | 'oldAge' | 'illness' | null;
export type Mood = 'happy' | 'neutral' | 'sad' | 'dead';

// ─── Rarity ───────────────────────────────────────────────────────────────────
// Rolled once at birth and stored. Drives the pet's LCD palette and its codex
// entry. The curiosity gap: you don't learn which one you got until the egg
// hatches. See game/evolution.ts (roll + weights) and game/palettes.ts (colors).
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'secret';

// ─── Life stage ───────────────────────────────────────────────────────────────
// Derived from ageSeconds (NOT stored) so it can never drift from the clock.
// 'egg' is the pre-hatch stage; everything after is a grown form. Each crossing
// is a "reveal" the UI celebrates. See game/evolution.ts (thresholds).
export type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'elder';

/**
 * All numeric care stats. Each pet type only *uses* a subset (see PET_PROFILES):
 *  - plant  → water
 *  - cat/dog → hunger, happiness, health
 * Unused stats are held at full and never decay, so they can never affect a type
 * they don't belong to.
 */
export interface PetStats {
  hunger: number;    // 0..100  (cat/dog) — 100 = full, 0 = starving
  happiness: number; // 0..100  (cat/dog)
  health: number;    // 0..100  (cat/dog) — derived vitality; 0 = death
  water: number;     // 0..100  (plant)   — the single plant care stat; 0 = death
}

/**
 * The money layer (cat/dog only; plant care stays free). Lives on the pet so a
 * bloodline's wealth, career, and schooling persist with the save and migrate
 * tolerantly — old v3 saves are seeded with defaultEconomy(). See game/economy.ts.
 */
export interface PetEconomy {
  coins: number;             // balance (kept as a float; display floors it)
  education: number;         // completed education levels (0 = none, up to MAX_EDUCATION)
  jobId: string | null;      // current job, null = unemployed
  clockedInAt: number | null;// epoch ms the current shift started, null = off the clock
  shiftSeconds: number;      // worked+paid seconds banked this shift (≤ shift cap)
  studyId: string | null;    // education program in progress, null = not studying
  studyEndsAt: number | null;// epoch ms the current study graduates
}

export interface PetState {
  version: number;
  petType: PetType;
  rarity: Rarity;        // rolled at birth, immutable — drives palette + codex form
  name: string;
  bornAt: number;        // epoch ms
  lastTick: number;      // epoch ms of last simulate()
  stats: PetStats;
  isDead: boolean;
  causeOfDeath: CauseOfDeath;
  ageSeconds: number;    // total seconds alive
  events: string[];      // world-event ids this pet has witnessed (its aura). See game/events.ts
  generation: number;    // 1 for a founder; +1 for each heir that continues the line
  origin: string;        // her dealt origin scenario id (the §1 cold open). See game/origins.ts
  household: string;     // her dealt household id — tier:situation:nameIdx. See game/household.ts
  bond: number;          // §8 invisible affection 0..100, seeded low. See game/bond.ts
  ownerMood: number;     // §5 her person's mood 0..100, ebbs on the real clock. See game/ownerLife.ts
  lastTreatedDay: number | null; // §9 local day-index she was last treated for an ailment, or null
  economy: PetEconomy;   // currency · marketplace · jobs · education (animals only)
}

export interface PetActions {
  feed(): void;                                      // cat/dog
  play(): void;                                      // cat/dog
  water(): void;                                     // plant
  socialize(): void;                                 // any — boost from meeting a nearby pet
  witnessEvent(eventId: string): void;               // any — record a live world event onto the pet
  treat(): void;                                     // §9 — tend an ailment (rest/vet/medicine); clears today's worry
  comfortOwner(): void;                              // §5 — the cat is there for her person (deepens bond, lifts mood)
  continueLine(): void;                              // dead pet → hatch an heir that inherits the line
  selectType(petType: PetType, name?: string): void; // create / restart a pet
  reset(): void;                                     // clear pet → back to selection
  rename(name: string): void;
  // ── Economy (cat/dog) ──
  buyFood(foodId: string): void;                     // spend coins to feed
  chooseJob(jobId: string): void;                    // take a job you qualify for
  quitJob(): void;                                   // leave your job
  toggleWork(): void;                                // clock in / clock out
  enroll(): void;                                    // enroll in the next education program
}

// ─── Social / nearby ──────────────────────────────────────────────────────────
// A pet broadcasts a tiny identity over BLE; the parts that survive iOS's
// advertisement size limits. `id` is a stable per-device id, NOT the pet save —
// renaming or restarting your pet keeps the same identity so friends persist.
export interface PeerIdentity {
  id: string;        // stable device id (8 hex chars)
  name: string;      // pet name (truncated for the air)
  petType: PetType;
  rarity: Rarity;    // broadcast so meeting a rare pet is visible + lucky. See game/nearby.ts
}

/** A pet you've met nearby, remembered locally. Keyed by PeerIdentity.id. */
export interface Friend {
  id: string;
  name: string;
  petType: PetType;
  rarity: Rarity;     // rarity last seen for this peer (drives bond luck + display)
  firstMetAt: number; // epoch ms
  lastMetAt: number;  // epoch ms
  meetCount: number;  // distinct encounters (cooldown-gated) — bond strength
}

export interface UsePet {
  pet: PetState | null; // null until a type is selected (or after reset)
  actions: PetActions;
  loading: boolean;     // true during initial AsyncStorage load
  mood: Mood;           // 'neutral' when no pet
}
