// ─── Lineage (family tree) ─────────────────────────────────────────────────────
//
// The ordered roll of a bloodline's past pets — its graves. When a pet dies and
// you continue the line (or start fresh), the departed is appended here, so the
// family tree remembers every generation forever, independent of the pet save.
// Same lazy-cache + crash-safety pattern as friends.ts / codex.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LINEAGE_KEY } from './constants';
import type { CauseOfDeath, PetState, PetType, Rarity } from './types';
import { RARITIES } from './evolution';

export interface Ancestor {
  name: string;
  petType: PetType;
  rarity: Rarity;
  generation: number;
  bornAt: number;
  diedAt: number;
  ageSeconds: number;
  causeOfDeath: CauseOfDeath;
}

const PET_TYPES: readonly PetType[] = ['plant', 'cat', 'dog'];
const CAUSES: readonly (CauseOfDeath)[] = [null, 'starvation', 'thirst', 'neglect', 'oldAge', 'illness'];

function isAncestor(v: unknown): v is Ancestor {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.name === 'string' &&
    PET_TYPES.includes(a.petType as PetType) &&
    (RARITIES as readonly string[]).includes(a.rarity as string) &&
    typeof a.generation === 'number' &&
    typeof a.bornAt === 'number' &&
    typeof a.diedAt === 'number' &&
    typeof a.ageSeconds === 'number' &&
    CAUSES.includes(a.causeOfDeath as CauseOfDeath)
  );
}

/** Snapshot a (dead) pet as an ancestor record for the family tree. */
export function ancestorFrom(pet: PetState, diedAt: number = pet.lastTick): Ancestor {
  return {
    name: pet.name,
    petType: pet.petType,
    rarity: pet.rarity,
    generation: pet.generation,
    bornAt: pet.bornAt,
    diedAt,
    ageSeconds: pet.ageSeconds,
    causeOfDeath: pet.causeOfDeath,
  };
}

// ─── Epitaph ────────────────────────────────────────────────────────────────
// A deterministic one-liner for the tombstone, chosen from a small pool by a
// hash of the pet's identity — so a given grave always reads the same.
const EPITAPHS: readonly string[] = [
  'GONE BUT PIXELATED',
  'RESTING IN 8 BITS',
  'LOVED, THEN LOST',
  'A GOOD RUN',
  'GAME OVER, NOT FORGOTTEN',
  'RETURNED TO THE CARTRIDGE',
  'CONTINUE? ...NO',
  'OFFLINE FOREVER',
];

function hashIndex(seed: string, mod: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % mod;
}

export function epitaphFor(name: string, bornAt: number): string {
  return EPITAPHS[hashIndex(`${bornAt}:${name}`, EPITAPHS.length)];
}

// ─── Persistence ──────────────────────────────────────────────────────────────

let cache: Ancestor[] | null = null;

async function ensureLoaded(): Promise<Ancestor[]> {
  if (cache !== null) return cache;
  let list: Ancestor[] = [];
  try {
    const raw = await AsyncStorage.getItem(LINEAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter(isAncestor);
    }
  } catch {
    // corrupt/missing → empty line
  }
  cache = list;
  return list;
}

/** Past pets, oldest → newest. */
export async function loadLineage(): Promise<Ancestor[]> {
  return [...(await ensureLoaded())];
}

/** Append a grave to the family tree (cap the log so it can't grow unbounded). */
export async function appendAncestor(ancestor: Ancestor): Promise<void> {
  const list = await ensureLoaded();
  list.push(ancestor);
  if (list.length > 100) list.splice(0, list.length - 100);
  try {
    await AsyncStorage.setItem(LINEAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort; cache stays authoritative
  }
}

export function _resetLineageCache(): void {
  cache = null;
}
