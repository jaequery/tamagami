// ─── Pet profiles ─────────────────────────────────────────────────────────────
// One source of truth for what each pet type *cares about*: which stat bars it
// shows, which action buttons it offers, and the copy on its selection card.
// HomeScreen, PetSelectionScreen, notifications, and the Swift widget all derive
// their behavior from this — keep the Swift mirror (Engine.swift / index.swift)
// in sync when this changes.

import type { PetType } from './types';

export type StatKey = 'hunger' | 'happiness' | 'health';
export type ActionKey = 'feed' | 'play';

export interface StatDescriptor {
  key: StatKey;
  label: string; // short bar label (≤ 6 chars renders cleanly)
}

export interface PetProfile {
  type: PetType;
  title: string;       // 'CAT'
  tagline: string;     // one-line care description
  stats: StatDescriptor[];
  actions: ActionKey[];
}

export const PET_TYPES: readonly PetType[] = ['cat'];

const CAT_STATS: StatDescriptor[] = [
  { key: 'hunger', label: 'HUNGER' },
  { key: 'happiness', label: 'HAPPY' },
  { key: 'health', label: 'HEALTH' },
];

export const PET_PROFILES: Record<PetType, PetProfile> = {
  cat: {
    type: 'cat',
    title: 'CAT',
    tagline: 'Feed her and play to keep her purring.',
    stats: CAT_STATS,
    actions: ['feed', 'play'],
  },
};

export function profileFor(type: PetType): PetProfile {
  return PET_PROFILES[type];
}

/** Cat-only now — kept so the (formerly type-gated) call sites still read clearly. */
export function isAnimal(type: PetType): boolean {
  return type === 'cat';
}
