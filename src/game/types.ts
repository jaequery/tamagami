export type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';
export type CauseOfDeath = 'starvation' | 'sickness' | 'neglect' | null;
export type Mood = 'happy' | 'neutral' | 'sad' | 'sick' | 'sleeping' | 'dead';

export interface PetStats {
  hunger: number;    // 0..100  (100 = full, 0 = starving)
  happiness: number; // 0..100
  energy: number;    // 0..100
  hygiene: number;   // 0..100
  health: number;    // 0..100
}

export interface PetState {
  version: number;
  name: string;
  bornAt: number;        // epoch ms
  lastTick: number;      // epoch ms of last simulate()
  stats: PetStats;
  stage: LifeStage;
  isSleeping: boolean;
  isSick: boolean;
  poops: number;         // poops currently on screen
  isDead: boolean;
  causeOfDeath: CauseOfDeath;
  ageSeconds: number;    // total seconds alive
}

export interface PetActions {
  feed(): void;
  play(): void;
  toggleSleep(): void;
  clean(): void;
  heal(): void;
  restart(name?: string): void; // hatch a new pet after death
  rename(name: string): void;
}

export interface UsePet {
  pet: PetState;
  actions: PetActions;
  loading: boolean;   // true during initial AsyncStorage load
  mood: Mood;
}
