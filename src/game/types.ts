// ─── Pet type ───────────────────────────────────────────────────────────────
// The three care archetypes. Plant is the simplified one (water only);
// cat and dog share the richer feed + play loop.
export type PetType = 'plant' | 'cat' | 'dog';

export type CauseOfDeath = 'starvation' | 'thirst' | 'neglect' | null;
export type Mood = 'happy' | 'neutral' | 'sad' | 'dead';

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
  name: string;
  bornAt: number;        // epoch ms
  lastTick: number;      // epoch ms of last simulate()
  stats: PetStats;
  isDead: boolean;
  causeOfDeath: CauseOfDeath;
  ageSeconds: number;    // total seconds alive
}

export interface PetActions {
  feed(): void;                                      // cat/dog
  play(): void;                                      // cat/dog
  water(): void;                                     // plant
  selectType(petType: PetType, name?: string): void; // create / restart a pet
  reset(): void;                                     // clear pet → back to selection
  rename(name: string): void;
}

export interface UsePet {
  pet: PetState | null; // null until a type is selected (or after reset)
  actions: PetActions;
  loading: boolean;     // true during initial AsyncStorage load
  mood: Mood;           // 'neutral' when no pet
}
