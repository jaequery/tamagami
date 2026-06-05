import {
  RARITIES,
  rarityRank,
  rarer,
  rollRarity,
  rollHeirRarity,
} from './evolution';
import { createInitialPet, createHeir } from './engine';
import { ancestorFrom, epitaphFor } from './lineage';

const NOW = 1_700_000_000_000;

// ─── rarity ordering ──────────────────────────────────────────────────────────

describe('rarity ordering', () => {
  it('ranks common lowest, secret highest', () => {
    expect(rarityRank('common')).toBe(0);
    expect(rarityRank('secret')).toBe(RARITIES.length - 1);
  });

  it('rarer() picks the higher tier', () => {
    expect(rarer('common', 'rare')).toBe('rare');
    expect(rarer('epic', 'rare')).toBe('epic');
    expect(rarer('secret', 'secret')).toBe('secret');
    expect(rarer('uncommon', 'common')).toBe('uncommon');
  });
});

// ─── heir inheritance ──────────────────────────────────────────────────────────

describe('rollHeirRarity', () => {
  it('is deterministic for the same inputs', () => {
    const a = rollHeirRarity(NOW, 'Pixel', 'cat', 'rare');
    const b = rollHeirRarity(NOW, 'Pixel', 'cat', 'rare');
    expect(a).toBe(b);
  });

  it('never rolls below the heir\'s own base roll (the line keeps its luck)', () => {
    for (let i = 0; i < 200; i++) {
      const born = NOW + i * 1000;
      const name = `pet${i}`;
      const base = rollRarity(born, name, 'cat');
      const heir = rollHeirRarity(born, name, 'cat', 'common');
      expect(rarityRank(heir)).toBeGreaterThanOrEqual(rarityRank(base));
    }
  });

  it('a secret bloodline reaches secret far more than a fresh roll would', () => {
    let secretHeirs = 0;
    for (let i = 0; i < 300; i++) {
      if (rollHeirRarity(NOW + i * 1000, `p${i}`, 'cat', 'secret') === 'secret') secretHeirs++;
    }
    // Base secret rate is 1%; inheritance must lift it well above that.
    expect(secretHeirs).toBeGreaterThan(15);
  });
});

// ─── createHeir ─────────────────────────────────────────────────────────────────

describe('createHeir', () => {
  it('advances the generation and keeps the family name + species', () => {
    const parent = createInitialPet('Dynasty', 'cat', NOW);
    const heir = createHeir(parent, NOW + 5000);
    expect(heir.generation).toBe(parent.generation + 1);
    expect(heir.name).toBe('Dynasty');
    expect(heir.petType).toBe('cat');
  });

  it('starts the heir fresh as its own egg', () => {
    const parent = { ...createInitialPet('Dynasty', 'cat', NOW), generation: 4, events: ['meteor'] };
    const heir = createHeir(parent, NOW + 5000);
    expect(heir.generation).toBe(5);
    expect(heir.ageSeconds).toBe(0);
    expect(heir.isDead).toBe(false);
    expect(heir.events).toEqual([]);
    expect(heir.bornAt).toBe(NOW + 5000);
  });

  it('inherits at least its own base roll', () => {
    const parent = createInitialPet('Dynasty', 'cat', NOW);
    const heir = createHeir(parent, NOW + 5000);
    const base = rollRarity(NOW + 5000, 'Dynasty', 'cat');
    expect(rarityRank(heir.rarity)).toBeGreaterThanOrEqual(rarityRank(base));
  });
});

// ─── lineage helpers ────────────────────────────────────────────────────────────

describe('ancestorFrom', () => {
  it('snapshots the pet into a grave record', () => {
    const pet = {
      ...createInitialPet('Ghost', 'cat', NOW),
      isDead: true,
      causeOfDeath: 'starvation' as const,
      ageSeconds: 3600,
      generation: 2,
      lastTick: NOW + 3_600_000,
    };
    const a = ancestorFrom(pet);
    expect(a.name).toBe('Ghost');
    expect(a.petType).toBe('cat');
    expect(a.generation).toBe(2);
    expect(a.ageSeconds).toBe(3600);
    expect(a.causeOfDeath).toBe('starvation');
    expect(a.diedAt).toBe(NOW + 3_600_000);
  });

  it('lets the caller override the time of death', () => {
    const pet = createInitialPet('Ghost', 'cat', NOW);
    expect(ancestorFrom(pet, NOW + 42).diedAt).toBe(NOW + 42);
  });
});

describe('epitaphFor', () => {
  it('is deterministic and non-empty', () => {
    const a = epitaphFor('Ghost', NOW);
    const b = epitaphFor('Ghost', NOW);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('varies by identity', () => {
    const names = new Set<string>();
    for (let i = 0; i < 20; i++) names.add(epitaphFor(`pet${i}`, NOW + i));
    expect(names.size).toBeGreaterThan(1);
  });
});
