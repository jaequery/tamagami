import { bondLevel, bondLabel, charmFromFriends } from './social';
import { rollRarity, rollRarityWithLuck, rarityRank } from './evolution';
import { CHARM_CAP, BOND_FRIEND_MEETS, BOND_BESTIE_MEETS } from './constants';
import type { Friend, Rarity } from './types';

function friend(rarity: Rarity, meetCount = 1): Friend {
  return { id: `${rarity}-${meetCount}-${Math.floor(meetCount)}`, name: 'F', petType: 'cat', rarity, firstMetAt: 0, lastMetAt: 0, meetCount };
}

// ─── bonds ──────────────────────────────────────────────────────────────────

describe('bondLevel', () => {
  it('promotes by meet count', () => {
    expect(bondLevel(1)).toBe('acquaintance');
    expect(bondLevel(BOND_FRIEND_MEETS - 1)).toBe('acquaintance');
    expect(bondLevel(BOND_FRIEND_MEETS)).toBe('friend');
    expect(bondLevel(BOND_BESTIE_MEETS - 1)).toBe('friend');
    expect(bondLevel(BOND_BESTIE_MEETS)).toBe('bestie');
    expect(bondLevel(100)).toBe('bestie');
  });

  it('labels each level', () => {
    expect(bondLabel('acquaintance')).toBe('MET');
    expect(bondLabel('friend')).toBe('FRIEND');
    expect(bondLabel('bestie')).toBe('BESTIE');
  });
});

// ─── charm ──────────────────────────────────────────────────────────────────

describe('charmFromFriends', () => {
  it('counts only rare-or-better friends', () => {
    const friends: Friend[] = [
      friend('common', 1), friend('uncommon', 2), friend('rare', 3), friend('epic', 4),
    ];
    expect(charmFromFriends(friends)).toBe(2); // rare + epic
  });

  it('caps at CHARM_CAP', () => {
    const many = Array.from({ length: CHARM_CAP + 4 }, (_, i) => friend('secret', i + 1));
    expect(charmFromFriends(many)).toBe(CHARM_CAP);
  });

  it('is zero with no rare friends', () => {
    expect(charmFromFriends([friend('common', 9), friend('uncommon', 9)])).toBe(0);
  });
});

// ─── luck rolls ───────────────────────────────────────────────────────────────

describe('rollRarityWithLuck', () => {
  it('luck 0 equals a plain roll', () => {
    for (let i = 0; i < 50; i++) {
      const born = 1_700_000_000_000 + i * 1000;
      expect(rollRarityWithLuck(born, `p${i}`, 'cat', 0)).toBe(rollRarity(born, `p${i}`, 'cat'));
    }
  });

  it('is monotonic in luck (more luck never lowers rarity)', () => {
    for (let i = 0; i < 200; i++) {
      const born = 1_700_000_000_000 + i * 1000;
      const r0 = rarityRank(rollRarityWithLuck(born, `p${i}`, 'dog', 0));
      const r3 = rarityRank(rollRarityWithLuck(born, `p${i}`, 'dog', 3));
      expect(r3).toBeGreaterThanOrEqual(r0);
    }
  });

  it('is deterministic', () => {
    expect(rollRarityWithLuck(123, 'Pixel', 'plant', 3)).toBe(rollRarityWithLuck(123, 'Pixel', 'plant', 3));
  });

  it('lifts the average rarity over many pets', () => {
    let sum0 = 0;
    let sum3 = 0;
    for (let i = 0; i < 400; i++) {
      const born = 1_700_000_000_000 + i * 1000;
      sum0 += rarityRank(rollRarityWithLuck(born, `p${i}`, 'cat', 0));
      sum3 += rarityRank(rollRarityWithLuck(born, `p${i}`, 'cat', 3));
    }
    expect(sum3).toBeGreaterThan(sum0);
  });
});
