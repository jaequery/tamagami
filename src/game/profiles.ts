// ─── Pet profiles ─────────────────────────────────────────────────────────────
// One source of truth for what each pet type *cares about*: which stat bars it
// shows, which action buttons it offers, and the copy on its selection card.
// HomeScreen, PetSelectionScreen, notifications, and the Swift widget all derive
// their behavior from this — keep the Swift mirror (Engine.swift / index.swift)
// in sync when this changes.

import type { PetType } from './types';

export type StatKey = 'hunger' | 'happiness' | 'health' | 'water';
export type ActionKey = 'feed' | 'play' | 'water';

export interface StatDescriptor {
  key: StatKey;
  label: string; // short bar label (≤ 6 chars renders cleanly)
}

export interface PetProfile {
  type: PetType;
  title: string;       // 'PLANT' | 'CAT' | 'DOG'
  tagline: string;     // one-line care description on the selection card
  stats: StatDescriptor[];
  actions: ActionKey[];
}

export const PET_TYPES: readonly PetType[] = ['plant', 'cat', 'dog'];

const ANIMAL_STATS: StatDescriptor[] = [
  { key: 'hunger', label: 'HUNGER' },
  { key: 'happiness', label: 'HAPPY' },
  { key: 'health', label: 'HEALTH' },
];

export const PET_PROFILES: Record<PetType, PetProfile> = {
  plant: {
    type: 'plant',
    title: 'PLANT',
    tagline: 'Just add water. The easy one.',
    stats: [{ key: 'water', label: 'WATER' }],
    actions: ['water'],
  },
  cat: {
    type: 'cat',
    title: 'CAT',
    tagline: 'Feed it and play to keep it purring.',
    stats: ANIMAL_STATS,
    actions: ['feed', 'play'],
  },
  dog: {
    type: 'dog',
    title: 'DOG',
    tagline: 'Feed it and play to keep its tail wagging.',
    stats: ANIMAL_STATS,
    actions: ['feed', 'play'],
  },
};

export function profileFor(type: PetType): PetProfile {
  return PET_PROFILES[type];
}

/** True for the feed + play archetypes (cat, dog). */
export function isAnimal(type: PetType): boolean {
  return type === 'cat' || type === 'dog';
}
