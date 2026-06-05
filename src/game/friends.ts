// ─── Friends (met-nearby) persistence ─────────────────────────────────────────
//
// A local log of pets you've met over BLE, keyed by their stable device id.
// Stored separately from the pet save so it survives pet reset/restart.
//
// Cooldown model: `lastMetAt` records the last *boost-eligible* meet, not every
// 5-second sighting. A peer can only re-trigger a social boost once per
// SOCIAL_COOLDOWN_MS — so two phones left side-by-side don't farm infinite
// happiness, but bumping into the same friend tomorrow counts again.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FRIENDS_KEY, SOCIAL_COOLDOWN_MS } from './constants';
import { RARITIES } from './evolution';
import type { Friend, PeerIdentity, PetType, Rarity } from './types';

const PET_TYPES: readonly PetType[] = ['cat'];

/** Coerce a possibly-missing/invalid stored rarity to a valid one (legacy → common). */
function coerceRarity(value: unknown): Rarity {
  return (RARITIES as readonly string[]).includes(value as string) ? (value as Rarity) : 'common';
}

/**
 * Shape-check the non-rarity fields. Rarity is added after launch, so older
 * stored friends won't have it — it's normalized separately (coerceRarity) rather
 * than rejected here, so a pre-rarity friends log survives the upgrade.
 */
function isFriendish(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.id === 'string' &&
    f.id.length > 0 &&
    typeof f.name === 'string' &&
    PET_TYPES.includes(f.petType as PetType) &&
    typeof f.firstMetAt === 'number' &&
    typeof f.lastMetAt === 'number' &&
    typeof f.meetCount === 'number'
  );
}

function toFriend(value: unknown): Friend {
  const f = value as Record<string, unknown>;
  return {
    id: f.id as string,
    name: f.name as string,
    petType: f.petType as PetType,
    rarity: coerceRarity(f.rarity),
    firstMetAt: f.firstMetAt as number,
    lastMetAt: f.lastMetAt as number,
    meetCount: f.meetCount as number,
  };
}

// In-memory cache so the hot path (a sighting every few seconds) doesn't hit
// AsyncStorage on every event. Loaded lazily, kept authoritative thereafter.
let cache: Map<string, Friend> | null = null;

async function ensureLoaded(): Promise<Map<string, Friend>> {
  if (cache !== null) return cache;
  const map = new Map<string, Friend>();
  try {
    const raw = await AsyncStorage.getItem(FRIENDS_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isFriendish(item)) {
            const friend = toFriend(item);
            map.set(friend.id, friend);
          }
        }
      }
    }
  } catch {
    // corrupt/missing → start empty
  }
  cache = map;
  return map;
}

async function persist(map: Map<string, Friend>): Promise<void> {
  try {
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify([...map.values()]));
  } catch {
    // best-effort
  }
}

/** All friends, most-recently-met first. */
export async function getFriends(): Promise<Friend[]> {
  const map = await ensureLoaded();
  return [...map.values()].sort((a, b) => b.lastMetAt - a.lastMetAt);
}

export interface EncounterResult {
  friend: Friend;
  isNew: boolean;
  /** True when this meet is outside the cooldown → caller should apply a boost. */
  shouldBoost: boolean;
}

/**
 * Record a sighting of `peer`. Inserts a new friend or, if the cooldown has
 * elapsed, counts a fresh encounter. Sightings inside the cooldown are a no-op
 * (no write, no boost) so the call is cheap to spam.
 */
export async function recordEncounter(peer: PeerIdentity, now: number): Promise<EncounterResult> {
  const map = await ensureLoaded();
  const existing = map.get(peer.id);

  if (existing === undefined) {
    const friend: Friend = {
      id: peer.id,
      name: peer.name,
      petType: peer.petType,
      rarity: peer.rarity,
      firstMetAt: now,
      lastMetAt: now,
      meetCount: 1,
    };
    map.set(peer.id, friend);
    await persist(map);
    return { friend, isNew: true, shouldBoost: true };
  }

  if (now - existing.lastMetAt < SOCIAL_COOLDOWN_MS) {
    // Still in cooldown — surface the friend but don't boost or write.
    return { friend: existing, isNew: false, shouldBoost: false };
  }

  const friend: Friend = {
    ...existing,
    name: peer.name,         // refresh in case they renamed
    petType: peer.petType,
    rarity: peer.rarity,     // refresh — their pet may have hatched/evolved since
    lastMetAt: now,
    meetCount: existing.meetCount + 1,
  };
  map.set(peer.id, friend);
  await persist(map);
  return { friend, isNew: false, shouldBoost: true };
}

/** Test/diagnostic helper — drops the in-memory cache so the next read reloads. */
export function __resetFriendsCacheForTest(): void {
  cache = null;
}
