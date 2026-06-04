// ─── Social graph helpers (Phase 4) ───────────────────────────────────────────
//
// Two derived ideas on top of the friends log:
//
//  • BOND — how well you know a friend, from your distinct meet count. Crossing a
//    threshold promotes the bond (MET → FRIEND → BESTIE), shown in the list.
//  • CHARM — how lucky your next egg is. Each rare-or-better friend you've made
//    adds one extra rarity roll at the next hatch (best wins, capped). So a social
//    collector who's met rare pets breeds luckier eggs — meeting rarity is a real,
//    mechanical reward, not just a number.
//
// Pure except loadCharm, which reads the friends store.

import { BOND_FRIEND_MEETS, BOND_BESTIE_MEETS, CHARM_CAP } from './constants';
import { getFriends } from './friends';
import { rarityRank } from './evolution';
import type { Friend } from './types';

export type BondLevel = 'acquaintance' | 'friend' | 'bestie';

export function bondLevel(meetCount: number): BondLevel {
  if (meetCount >= BOND_BESTIE_MEETS) return 'bestie';
  if (meetCount >= BOND_FRIEND_MEETS) return 'friend';
  return 'acquaintance';
}

const BOND_LABEL: Record<BondLevel, string> = {
  acquaintance: 'MET',
  friend: 'FRIEND',
  bestie: 'BESTIE',
};

export function bondLabel(level: BondLevel): string {
  return BOND_LABEL[level];
}

const RARE_RANK = rarityRank('rare');

/** Charm = distinct rare-or-better friends met, capped — your next egg's bonus luck. */
export function charmFromFriends(friends: Friend[]): number {
  const rare = friends.filter((f) => rarityRank(f.rarity) >= RARE_RANK).length;
  return Math.min(rare, CHARM_CAP);
}

/** Async convenience: current charm from the persisted friends log. */
export async function loadCharm(): Promise<number> {
  return charmFromFriends(await getFriends());
}
