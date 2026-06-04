// ─── Pet type ───────────────────────────────────────────────────────────────
// The three care archetypes. Plant is the simplified one (water only);
// cat and dog share the richer feed + play loop.
export type PetType = 'plant' | 'cat' | 'dog';

export type CauseOfDeath = 'starvation' | 'thirst' | 'neglect' | null;
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
}

export interface PetActions {
  feed(): void;                                      // cat/dog
  play(): void;                                      // cat/dog
  water(): void;                                     // plant
  socialize(): void;                                 // any — boost from meeting a nearby pet
  witnessEvent(eventId: string): void;               // any — record a live world event onto the pet
  selectType(petType: PetType, name?: string): void; // create / restart a pet
  reset(): void;                                     // clear pet → back to selection
  rename(name: string): void;
}

// ─── Social / nearby ──────────────────────────────────────────────────────────
// A pet broadcasts a tiny identity over BLE; the parts that survive iOS's
// advertisement size limits. `id` is a stable per-device id, NOT the pet save —
// renaming or restarting your pet keeps the same identity so friends persist.
export interface PeerIdentity {
  id: string;        // stable device id (8 hex chars)
  name: string;      // pet name (truncated for the air)
  petType: PetType;
}

/** A pet you've met nearby, remembered locally. Keyed by PeerIdentity.id. */
export interface Friend {
  id: string;
  name: string;
  petType: PetType;
  firstMetAt: number; // epoch ms
  lastMetAt: number;  // epoch ms
  meetCount: number;  // distinct encounters (cooldown-gated)
}

export interface UsePet {
  pet: PetState | null; // null until a type is selected (or after reset)
  actions: PetActions;
  loading: boolean;     // true during initial AsyncStorage load
  mood: Mood;           // 'neutral' when no pet
}
