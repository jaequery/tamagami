import {
  boop,
  buyAccessory,
  comfortOwner,
  createHeir,
  createInitialPet,
  feed,
  getMood,
  nameOwner,
  play,
  playWith,
  rename,
  restart,
  simulate,
  socialize,
  toggleAccessory,
  treat,
} from './engine';
import { accessoryById } from './cosmetics';
import { playById } from './play';
import { NATURAL_LIFESPAN_SECONDS } from './lifespan';
import { bondLevel } from './bond';
import { dayIndex } from './events';
import {
  HEALTH_NEGLECT_FLOOR,
  HUNGER_CRITICAL_THRESHOLD,
  MAX_CATCHUP_SECONDS,
} from './constants';
import { isOriginId } from './origins';
import { isHouseholdId, startingCoinsForHousehold } from './household';
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
  it('creates a healthy cat with no death', () => {
    const pet = createInitialPet('Pixel', 'cat', NOW);
    expect(pet.petType).toBe('cat');
    expect(pet.isDead).toBe(false);
    expect(pet.causeOfDeath).toBeNull();
    expect(pet.stats.health).toBe(100);
    expect(pet.name).toBe('Pixel');
    expect(pet.ageSeconds).toBe(0);
  });
});

// ─── Life story: origin + household (GAME.md §1–2) ─────────────────────────────

describe('createInitialPet — life story', () => {
  it('deals a valid origin and household, and seeds coins from the household tier', () => {
    const pet = createInitialPet('Pixel', 'cat', NOW);
    expect(isOriginId(pet.origin)).toBe(true);
    expect(isHouseholdId(pet.household)).toBe(true);
    expect(pet.economy.coins).toBe(startingCoinsForHousehold(pet.household));
  });

  it('is deterministic — same birth identity, same life story', () => {
    const a = createInitialPet('Pixel', 'cat', NOW);
    const b = createInitialPet('Pixel', 'cat', NOW);
    expect(a.origin).toBe(b.origin);
    expect(a.household).toBe(b.household);
  });
});

describe('createHeir — same owner, new birth', () => {
  it('carries the household forward (same owner) but re-rolls the origin (new birth)', () => {
    const parent = { ...createInitialPet('Maple', 'cat', NOW), isDead: true };
    const heir = createHeir(parent, NOW + 1000);
    // Same owner → same household.
    expect(heir.household).toBe(parent.household);
    // New birth → a freshly-dealt (valid) origin, and the next generation.
    expect(isOriginId(heir.origin)).toBe(true);
    expect(heir.generation).toBe(parent.generation + 1);
  });

  it('starts the bond fresh but carries the owner mood (a new kitten for the same person)', () => {
    const parent = { ...createInitialPet('Maple', 'cat', NOW), isDead: true, bond: 90, ownerMood: 22 };
    const heir = createHeir(parent, NOW + 1000);
    expect(heir.bond).toBeLessThan(parent.bond); // new relationship
    expect(heir.ownerMood).toBe(22);             // same person, same grief/joy
  });
});

// ─── §8 bond + §9 the end ──────────────────────────────────────────────────────

describe('bond grows with care', () => {
  it('feeding and playing deepen the (invisible) bond', () => {
    const pet = createInitialPet('Sol', 'cat', NOW);
    const after = play(feed(pet, NOW), NOW);
    expect(after.bond).toBeGreaterThan(pet.bond);
  });
});

describe('old-age death (§9 — the good death)', () => {
  it('a cat that reaches the natural lifespan dies gently of old age', () => {
    const pet = { ...createInitialPet('Elder', 'cat', NOW), ageSeconds: NATURAL_LIFESPAN_SECONDS - 5 };
    // Advance past the natural lifespan.
    const after = simulate(pet, NOW + 10_000);
    expect(after.isDead).toBe(true);
    expect(after.causeOfDeath).toBe('oldAge');
  });

  it('a young, well-cared-for cat does not die', () => {
    const pet = createInitialPet('Kit', 'cat', NOW);
    const after = simulate(pet, NOW + 60_000);
    expect(after.isDead).toBe(false);
  });
});

describe('treat (§9 — tending an ailment)', () => {
  it('stamps today and nudges the bond', () => {
    const pet = createInitialPet('Patch', 'cat', NOW);
    const after = treat(pet, NOW);
    expect(after.lastTreatedDay).toBe(dayIndex(NOW));
    expect(after.bond).toBeGreaterThan(pet.bond);
  });

  it('is a no-op on a dead pet', () => {
    const dead = { ...createInitialPet('Patch', 'cat', NOW), isDead: true };
    expect(treat(dead, NOW).lastTreatedDay).toBeNull();
  });
});

describe('comfortOwner (§5 — the reciprocal heart)', () => {
  it('lifts the owner mood and deepens the bond', () => {
    const pet = { ...createInitialPet('Biscuit', 'cat', NOW), ownerMood: 30 };
    const after = comfortOwner(pet, NOW);
    expect(after.ownerMood).toBeGreaterThanOrEqual(30);
    expect(after.bond).toBeGreaterThan(pet.bond);
  });
});

describe('bond level read-out', () => {
  it('a fresh pet is wary; a maxed bond is devoted', () => {
    expect(bondLevel(createInitialPet('x', 'cat', NOW).bond)).toBe('wary');
    expect(bondLevel(100)).toBe('devoted');
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
    expect(createInitialPet('', 'cat', NOW).name).toBe('Pixel');
    expect(createInitialPet('   ', 'cat', NOW).name).toBe('Pixel');
  });

  it('rename sanitizes the new name', () => {
    expect(rename(freshPet('cat'), '  Tama\x00  ').name).toBe('Tama');
  });

  it('restart sanitizes the provided name', () => {
    const next = restart(freshPet('cat', { isDead: true }), NOW, undefined, '  NewPet\x1F  ');
    expect(next.name).toBe('NewPet');
  });
});

describe('ownerName (§2 — YOU)', () => {
  it('a fresh pet starts with no owner name (filled in by the cold open)', () => {
    expect(createInitialPet('Pixel', 'cat', NOW).ownerName).toBe('');
  });

  it('createInitialPet stores a provided owner name', () => {
    expect(createInitialPet('Pixel', 'cat', NOW, 0, '  Dave  ').ownerName).toBe('Dave');
  });

  it('nameOwner sets + sanitizes the player name', () => {
    expect(nameOwner(freshPet('cat'), '  Dave\x00  ').ownerName).toBe('Dave');
  });

  it('nameOwner defaults a blank entry to "You"', () => {
    expect(nameOwner(freshPet('cat'), '   ').ownerName).toBe('You');
  });

  it('the heir comes to the SAME owner (carries ownerName forward)', () => {
    const parent = { ...createInitialPet('Dynasty', 'cat', NOW), ownerName: 'Dave', isDead: true };
    expect(createHeir(parent, NOW + 5000).ownerName).toBe('Dave');
  });
});

// ─── Cat: feed + play model ───────────────────────────────────────────────────

describe('cat', () => {
  it('drains hunger and happiness over time', () => {
    const pet = freshPet('cat');
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.stats.hunger).toBeLessThan(pet.stats.hunger);
    expect(advanced.stats.happiness).toBeLessThan(pet.stats.happiness);
  });

  it('feed() increases hunger, clamped at 100', () => {
    const pet = freshPet('cat', {
      stats: { hunger: 40, happiness: 60, health: 100, water: 100 },
    });
    expect(feed(pet, NOW).stats.hunger).toBeGreaterThan(40);

    const full = freshPet('cat', {
      stats: { hunger: 95, happiness: 60, health: 100, water: 100 },
    });
    expect(feed(full, NOW).stats.hunger).toBeLessThanOrEqual(100);
  });

  it('play() increases happiness and costs hunger', () => {
    const pet = freshPet('cat', {
      stats: { hunger: 60, happiness: 40, health: 100, water: 100 },
    });
    const next = play(pet, NOW);
    expect(next.stats.happiness).toBeGreaterThan(40);
    expect(next.stats.hunger).toBeLessThan(60);
  });

  it('health regenerates when needs are met', () => {
    const pet = freshPet('cat', {
      stats: { hunger: 80, happiness: 80, health: 50, water: 100 },
    });
    expect(advanceSeconds(pet, 600).stats.health).toBeGreaterThan(50);
  });

  it('starving sinks health to the floor but never kills (forgiving care)', () => {
    const pet = freshPet('cat', {
      stats: { hunger: 0, happiness: 60, health: 2, water: 100 },
    });
    const advanced = advanceSeconds(pet, 24 * 3600); // a full day ignored
    expect(advanced.isDead).toBe(false);
    expect(advanced.causeOfDeath).toBeNull();
    expect(advanced.stats.health).toBe(HEALTH_NEGLECT_FLOOR);
  });

  it('an 8h sleep never ends the cat, even starting hungry', () => {
    const pet = freshPet('cat', {
      stats: { hunger: 20, happiness: 30, health: 100, water: 100 },
    });
    const advanced = advanceSeconds(pet, 8 * 3600);
    expect(advanced.isDead).toBe(false);
    expect(advanced.stats.health).toBeGreaterThanOrEqual(HEALTH_NEGLECT_FLOOR);
  });

  it('a floored, neglected cat springs back the moment you feed her', () => {
    const neglected = advanceSeconds(
      freshPet('cat', { stats: { hunger: 0, happiness: 0, health: 100, water: 100 } }),
      24 * 3600,
    );
    expect(neglected.stats.health).toBe(HEALTH_NEGLECT_FLOOR);
    const fed = play(feed(neglected, neglected.lastTick), neglected.lastTick);
    expect(fed.stats.hunger).toBeGreaterThan(neglected.stats.hunger);
    expect(fed.stats.happiness).toBeGreaterThan(neglected.stats.happiness);
    // needs back above critical → health now regenerates instead of floored
    expect(advanceSeconds(fed, 600).stats.health).toBeGreaterThan(HEALTH_NEGLECT_FLOOR);
  });

  it('feed / play do nothing when dead', () => {
    const dead = freshPet('cat', {
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

  it('mood follows the hunger + happiness average', () => {
    expect(getMood(freshPet('cat', { stats: { hunger: 90, happiness: 90, health: 100, water: 100 } }))).toBe('happy');
    expect(getMood(freshPet('cat', { stats: { hunger: 50, happiness: 50, health: 100, water: 100 } }))).toBe('neutral');
    expect(getMood(freshPet('cat', { stats: { hunger: 10, happiness: 10, health: 100, water: 100 } }))).toBe('sad');
  });
});

// ─── restart / selectType-style respawn ───────────────────────────────────────

describe('restart', () => {
  it('yields a fresh, healthy cat by default', () => {
    const dead = freshPet('cat', { isDead: true, causeOfDeath: 'neglect' });
    const next = restart(dead, NOW);
    expect(next.petType).toBe('cat');
    expect(next.isDead).toBe(false);
    expect(next.causeOfDeath).toBeNull();
    expect(next.stats.health).toBe(100);
  });

  it('keeps the existing name when none is given', () => {
    const dead = freshPet('cat', { isDead: true, name: 'OldPet' });
    expect(restart(dead, NOW).name).toBe('OldPet');
  });
});

// ─── socialize (nearby meet boost) ────────────────────────────────────────────

describe('socialize', () => {
  it('boosts happiness and health, clamped', () => {
    const pet = freshPet('cat', {
      stats: { hunger: 60, happiness: 40, health: 50, water: 100 },
    });
    const next = socialize(pet, NOW);
    expect(next.stats.happiness).toBeGreaterThan(40);
    expect(next.stats.health).toBeGreaterThan(50);
    expect(next.stats.happiness).toBeLessThanOrEqual(100);
    expect(next.stats.health).toBeLessThanOrEqual(100);
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

describe('critical threshold', () => {
  it('hunger at the critical threshold sickens (floors health), never kills', () => {
    const pet = freshPet('cat', {
      stats: { hunger: HUNGER_CRITICAL_THRESHOLD, happiness: 60, health: 1, water: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.isDead).toBe(false);
    expect(advanced.stats.health).toBe(HEALTH_NEGLECT_FLOOR);
  });
});

// ─── Play: the ways to play ────────────────────────────────────────────────────

describe('playWith', () => {
  it('a specific play lifts happiness, deepens the bond, and (if active) costs hunger', () => {
    const feather = playById('feather')!;
    const pet = freshPet('cat', {
      bond: 10,
      stats: { hunger: 60, happiness: 40, health: 100, water: 100 },
    });
    const after = playWith(pet, 'feather', NOW);
    expect(after.stats.happiness).toBe(40 + feather.happiness);
    expect(after.stats.hunger).toBe(60 - feather.hunger);
    expect(after.bond).toBeGreaterThan(10);
  });

  it('calm play (PET) costs no hunger', () => {
    const pet = freshPet('cat', { stats: { hunger: 50, happiness: 30, health: 100, water: 100 } });
    const after = playWith(pet, 'pet', NOW);
    expect(after.stats.hunger).toBe(50); // no cost
    expect(after.stats.happiness).toBeGreaterThan(30);
  });

  it('clamps happiness at 100 and hunger at 0', () => {
    const high = playWith(freshPet('cat', { stats: { hunger: 100, happiness: 95, health: 100, water: 100 } }), 'laser', NOW);
    expect(high.stats.happiness).toBeLessThanOrEqual(100);
    const low = playWith(freshPet('cat', { stats: { hunger: 3, happiness: 50, health: 100, water: 100 } }), 'laser', NOW);
    expect(low.stats.hunger).toBe(0);
  });

  it('is a no-op for an unknown play or a dead cat', () => {
    const pet = freshPet('cat', { stats: { hunger: 50, happiness: 50, health: 100, water: 100 } });
    expect(playWith(pet, 'nope', NOW).stats.happiness).toBe(50);
    const dead = freshPet('cat', { isDead: true, stats: { hunger: 50, happiness: 50, health: 0, water: 100 } });
    expect(playWith(dead, 'feather', NOW).stats.happiness).toBe(50);
  });
});

// ─── boop (tap the cat directly — a quick touch) ───────────────────────────────

describe('boop', () => {
  it('lifts happiness and deepens the bond, with no hunger cost', () => {
    const pet = freshPet('cat', {
      bond: 10,
      stats: { hunger: 60, happiness: 40, health: 100, water: 100 },
    });
    const after = boop(pet, NOW);
    expect(after.stats.happiness).toBeGreaterThan(40);
    expect(after.stats.hunger).toBe(60); // touch never tires her
    expect(after.bond).toBeGreaterThan(10);
  });

  it('is lighter than a full PET play session (delight, not a stat farm)', () => {
    const pet = freshPet('cat', { bond: 10, stats: { hunger: 60, happiness: 40, health: 100, water: 100 } });
    const tapped = boop(pet, NOW);
    const played = playWith(pet, 'pet', NOW);
    expect(tapped.stats.happiness).toBeLessThan(played.stats.happiness);
    expect(tapped.bond).toBeLessThan(played.bond);
  });

  it('clamps happiness at 100', () => {
    const high = boop(freshPet('cat', { stats: { hunger: 100, happiness: 99, health: 100, water: 100 } }), NOW);
    expect(high.stats.happiness).toBeLessThanOrEqual(100);
  });

  it('repeats: a second tap keeps lifting happiness', () => {
    const pet = freshPet('cat', { stats: { hunger: 60, happiness: 40, health: 100, water: 100 } });
    const once = boop(pet, NOW);
    const twice = boop(once, NOW);
    expect(twice.stats.happiness).toBeGreaterThan(once.stats.happiness);
  });

  it('is a no-op when dead', () => {
    const dead = freshPet('cat', { isDead: true, stats: { hunger: 50, happiness: 50, health: 0, water: 100 } });
    expect(boop(dead, NOW).stats.happiness).toBe(50);
  });
});

// ─── Cosmetics: buy + wear ─────────────────────────────────────────────────────

describe('buyAccessory / toggleAccessory', () => {
  const COLLAR = accessoryById('collar')!;

  it('buying spends coins, records ownership, and auto-wears it', () => {
    const pet = freshPet('cat', { economy: { ...freshPet('cat').economy, coins: 100 } });
    const after = buyAccessory(pet, 'collar', NOW);
    expect(after.economy.coins).toBe(100 - COLLAR.price);
    expect(after.cosmetics.owned).toContain('collar');
    expect(after.cosmetics.equipped.neck).toBe('collar');
  });

  it('does not charge twice — re-buying an owned item just re-wears it, free', () => {
    const pet = freshPet('cat', { economy: { ...freshPet('cat').economy, coins: 100 } });
    const bought = buyAccessory(pet, 'collar', NOW);
    const off = toggleAccessory(bought, 'collar', NOW);
    expect(off.cosmetics.equipped.neck).toBeNull();
    const reworn = buyAccessory(off, 'collar', NOW);
    expect(reworn.economy.coins).toBe(bought.economy.coins); // no extra charge
    expect(reworn.cosmetics.equipped.neck).toBe('collar');
  });

  it('is a no-op when you cannot afford it', () => {
    const pet = freshPet('cat', { economy: { ...freshPet('cat').economy, coins: 1 } });
    const after = buyAccessory(pet, 'crown', NOW);
    expect(after.cosmetics.owned).not.toContain('crown');
    expect(after.economy.coins).toBe(1);
  });

  it('ignores unknown accessory ids', () => {
    const pet = freshPet('cat', { economy: { ...freshPet('cat').economy, coins: 100 } });
    const after = buyAccessory(pet, 'nope', NOW);
    expect(after.economy.coins).toBe(100);
    expect(after.cosmetics.owned).toEqual([]);
  });

  it('a dead cat can neither buy nor change outfits', () => {
    const dead = freshPet('cat', { isDead: true, economy: { ...freshPet('cat').economy, coins: 100 } });
    expect(buyAccessory(dead, 'collar', NOW).cosmetics.owned).toEqual([]);
    expect(buyAccessory(dead, 'collar', NOW).economy.coins).toBe(100);
  });
});
