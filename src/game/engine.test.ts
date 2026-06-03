import {
  createInitialPet,
  feed,
  getMood,
  play,
  rename,
  restart,
  simulate,
  socialize,
  water,
} from './engine';
import {
  HUNGER_CRITICAL_THRESHOLD,
  MAX_CATCHUP_SECONDS,
} from './constants';
import type { PetState, PetType } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000; // fixed epoch ms

function freshPet(petType: PetType, overrides?: Partial<PetState>): PetState {
  return { ...createInitialPet('TestPet', petType, NOW), ...overrides };
}

function advanceSeconds(state: PetState, seconds: number): PetState {
  return simulate(state, state.lastTick + seconds * 1000);
}

// ─── createInitialPet ────────────────────────────────────────────────────────

describe('createInitialPet', () => {
  it.each<PetType>(['plant', 'cat', 'dog'])('creates a healthy %s with no death', (petType) => {
    const pet = createInitialPet('Pixel', petType, NOW);
    expect(pet.petType).toBe(petType);
    expect(pet.isDead).toBe(false);
    expect(pet.causeOfDeath).toBeNull();
    expect(pet.stats.health).toBe(100);
    expect(pet.stats.water).toBe(100);
    expect(pet.name).toBe('Pixel');
    expect(pet.ageSeconds).toBe(0);
  });
});

// ─── Name sanitization ───────────────────────────────────────────────────────

describe('name sanitization', () => {
  it('trims whitespace', () => {
    expect(createInitialPet('  Pixel  ', 'cat', NOW).name).toBe('Pixel');
  });

  it('clamps to 20 characters', () => {
    expect(createInitialPet('A'.repeat(30), 'cat', NOW).name.length).toBe(20);
  });

  it('strips control characters', () => {
    expect(createInitialPet('Pixel\x00\x1F\x7F', 'cat', NOW).name).toBe('Pixel');
  });

  it('falls back to Pixel for empty / whitespace-only name', () => {
    expect(createInitialPet('', 'dog', NOW).name).toBe('Pixel');
    expect(createInitialPet('   ', 'dog', NOW).name).toBe('Pixel');
  });

  it('rename sanitizes the new name', () => {
    expect(rename(freshPet('cat'), '  Tama\x00  ').name).toBe('Tama');
  });

  it('restart sanitizes the provided name', () => {
    const next = restart(freshPet('cat', { isDead: true }), NOW, undefined, '  NewPet\x1F  ');
    expect(next.name).toBe('NewPet');
  });
});

// ─── Plant: water-only model ──────────────────────────────────────────────────

describe('plant', () => {
  it('drains water over time and nothing else', () => {
    const pet = freshPet('plant');
    const advanced = advanceSeconds(pet, 3600); // 1 hour
    expect(advanced.stats.water).toBeLessThan(pet.stats.water);
    expect(advanced.stats.water).toBeGreaterThan(0);
    // Animal stats are inert for a plant
    expect(advanced.stats.hunger).toBe(pet.stats.hunger);
    expect(advanced.stats.happiness).toBe(pet.stats.happiness);
  });

  it('water() refills water and clamps at 100', () => {
    const thirsty = freshPet('plant', {
      stats: { hunger: 80, happiness: 80, health: 100, water: 20 },
    });
    const watered = water(thirsty, NOW);
    expect(watered.stats.water).toBeGreaterThan(20);

    const full = freshPet('plant', {
      stats: { hunger: 80, happiness: 80, health: 100, water: 95 },
    });
    expect(water(full, NOW).stats.water).toBeLessThanOrEqual(100);
  });

  it('dies of thirst when water hits 0', () => {
    const pet = freshPet('plant');
    const advanced = simulate(pet, pet.lastTick + MAX_CATCHUP_SECONDS * 1000);
    expect(advanced.stats.water).toBe(0);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('thirst');
  });

  it('ignores feed() and play()', () => {
    const pet = freshPet('plant', {
      stats: { hunger: 40, happiness: 40, health: 100, water: 80 },
    });
    expect(feed(pet, NOW).stats.hunger).toBe(40);
    expect(play(pet, NOW).stats.happiness).toBe(40);
  });
});

// ─── Cat / dog: feed + play model ─────────────────────────────────────────────

describe.each<PetType>(['cat', 'dog'])('%s', (petType) => {
  it('drains hunger and happiness over time', () => {
    const pet = freshPet(petType);
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.stats.hunger).toBeLessThan(pet.stats.hunger);
    expect(advanced.stats.happiness).toBeLessThan(pet.stats.happiness);
    // Water is inert for an animal
    expect(advanced.stats.water).toBe(pet.stats.water);
  });

  it('feed() increases hunger, clamped at 100', () => {
    const pet = freshPet(petType, {
      stats: { hunger: 40, happiness: 60, health: 100, water: 100 },
    });
    expect(feed(pet, NOW).stats.hunger).toBeGreaterThan(40);

    const full = freshPet(petType, {
      stats: { hunger: 95, happiness: 60, health: 100, water: 100 },
    });
    expect(feed(full, NOW).stats.hunger).toBeLessThanOrEqual(100);
  });

  it('play() increases happiness and costs hunger', () => {
    const pet = freshPet(petType, {
      stats: { hunger: 60, happiness: 40, health: 100, water: 100 },
    });
    const next = play(pet, NOW);
    expect(next.stats.happiness).toBeGreaterThan(40);
    expect(next.stats.hunger).toBeLessThan(60);
  });

  it('water() is a no-op', () => {
    const pet = freshPet(petType, {
      stats: { hunger: 60, happiness: 60, health: 100, water: 50 },
    });
    expect(water(pet, NOW).stats.water).toBe(50);
  });

  it('health regenerates when needs are met', () => {
    const pet = freshPet(petType, {
      stats: { hunger: 80, happiness: 80, health: 50, water: 100 },
    });
    expect(advanceSeconds(pet, 600).stats.health).toBeGreaterThan(50);
  });

  it('health decays toward death when starving', () => {
    const pet = freshPet(petType, {
      stats: { hunger: 0, happiness: 60, health: 2, water: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('starvation');
  });

  it('death cause is neglect when happiness — not hunger — bottomed out', () => {
    const pet = freshPet(petType, {
      stats: { hunger: 60, happiness: 0, health: 2, water: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('neglect');
  });

  it('feed / play do nothing when dead', () => {
    const dead = freshPet(petType, {
      isDead: true,
      stats: { hunger: 0, happiness: 0, health: 0, water: 100 },
    });
    expect(feed(dead, NOW).stats.hunger).toBe(0);
    expect(play(dead, NOW).stats.happiness).toBe(0);
  });
});

// ─── Offline catch-up ────────────────────────────────────────────────────────

describe('simulate — offline catch-up', () => {
  it('respects MAX_CATCHUP_SECONDS and keeps stats in range', () => {
    const pet = freshPet('cat');
    const hugeElapsed = (MAX_CATCHUP_SECONDS + 100 * 24 * 3600) * 1000;
    const advanced = simulate(pet, pet.lastTick + hugeElapsed);
    for (const key of ['hunger', 'happiness', 'health', 'water'] as const) {
      expect(advanced.stats[key]).toBeGreaterThanOrEqual(0);
      expect(advanced.stats[key]).toBeLessThanOrEqual(100);
    }
  });

  it('is a no-op when elapsed is zero', () => {
    const pet = freshPet('cat');
    expect(simulate(pet, pet.lastTick).stats.hunger).toBe(pet.stats.hunger);
  });

  it('updates lastTick and does not mutate the original', () => {
    const pet = freshPet('cat');
    const originalHunger = pet.stats.hunger;
    const target = NOW + 5000;
    const advanced = simulate(pet, target);
    expect(advanced.lastTick).toBe(target);
    expect(pet.stats.hunger).toBe(originalHunger);
  });

  it('is a no-op after death (except lastTick)', () => {
    const dead = freshPet('cat', {
      isDead: true,
      causeOfDeath: 'starvation',
      stats: { hunger: 0, happiness: 0, health: 0, water: 100 },
    });
    const target = dead.lastTick + 60_000;
    const advanced = simulate(dead, target);
    expect(advanced.lastTick).toBe(target);
    expect(advanced.isDead).toBe(true);
    expect(advanced.stats.hunger).toBe(0);
  });
});

// ─── getMood ─────────────────────────────────────────────────────────────────

describe('getMood', () => {
  it('returns dead when isDead', () => {
    expect(getMood(freshPet('cat', { isDead: true }))).toBe('dead');
  });

  it('plant mood follows water level', () => {
    expect(getMood(freshPet('plant', { stats: { hunger: 80, happiness: 80, health: 100, water: 90 } }))).toBe('happy');
    expect(getMood(freshPet('plant', { stats: { hunger: 80, happiness: 80, health: 100, water: 45 } }))).toBe('neutral');
    expect(getMood(freshPet('plant', { stats: { hunger: 80, happiness: 80, health: 100, water: 10 } }))).toBe('sad');
  });

  it('animal mood follows hunger + happiness average', () => {
    expect(getMood(freshPet('dog', { stats: { hunger: 90, happiness: 90, health: 100, water: 100 } }))).toBe('happy');
    expect(getMood(freshPet('dog', { stats: { hunger: 50, happiness: 50, health: 100, water: 100 } }))).toBe('neutral');
    expect(getMood(freshPet('dog', { stats: { hunger: 10, happiness: 10, health: 100, water: 100 } }))).toBe('sad');
  });
});

// ─── restart / selectType-style respawn ───────────────────────────────────────

describe('restart', () => {
  it('yields a fresh, healthy pet of the same type by default', () => {
    const dead = freshPet('cat', { isDead: true, causeOfDeath: 'neglect' });
    const next = restart(dead, NOW);
    expect(next.petType).toBe('cat');
    expect(next.isDead).toBe(false);
    expect(next.causeOfDeath).toBeNull();
    expect(next.stats.health).toBe(100);
  });

  it('can switch pet type', () => {
    const dead = freshPet('cat', { isDead: true });
    expect(restart(dead, NOW, 'plant').petType).toBe('plant');
  });

  it('keeps the existing name when none is given', () => {
    const dead = freshPet('dog', { isDead: true, name: 'OldPet' });
    expect(restart(dead, NOW).name).toBe('OldPet');
  });
});

// ─── socialize (nearby meet boost) ────────────────────────────────────────────

describe('socialize', () => {
  it.each<PetType>(['cat', 'dog'])('boosts %s happiness and health, clamped', (petType) => {
    const pet = freshPet(petType, {
      stats: { hunger: 60, happiness: 40, health: 50, water: 100 },
    });
    const next = socialize(pet, NOW);
    expect(next.stats.happiness).toBeGreaterThan(40);
    expect(next.stats.health).toBeGreaterThan(50);
    expect(next.stats.happiness).toBeLessThanOrEqual(100);
    expect(next.stats.health).toBeLessThanOrEqual(100);
  });

  it('boosts plant water, clamped at 100', () => {
    const pet = freshPet('plant', {
      stats: { hunger: 80, happiness: 80, health: 100, water: 40 },
    });
    expect(socialize(pet, NOW).stats.water).toBeGreaterThan(40);

    const full = freshPet('plant', {
      stats: { hunger: 80, happiness: 80, health: 100, water: 95 },
    });
    expect(socialize(full, NOW).stats.water).toBeLessThanOrEqual(100);
  });

  it('does nothing when dead', () => {
    const dead = freshPet('cat', {
      isDead: true,
      stats: { hunger: 0, happiness: 0, health: 0, water: 100 },
    });
    expect(socialize(dead, NOW).stats.happiness).toBe(0);
    expect(socialize(dead, NOW).stats.health).toBe(0);
  });
});

// ─── Sanity: critical threshold wiring ────────────────────────────────────────

describe('starvation threshold', () => {
  it('treats hunger at the critical threshold as starvation on death', () => {
    const pet = freshPet('cat', {
      stats: { hunger: HUNGER_CRITICAL_THRESHOLD, happiness: 60, health: 1, water: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('starvation');
  });
});
