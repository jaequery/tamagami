import {
  clean,
  createInitialPet,
  feed,
  getMood,
  heal,
  play,
  rename,
  restart,
  simulate,
  toggleSleep,
} from './engine';
import {
  HUNGER_CRITICAL_THRESHOLD,
  MAX_CATCHUP_SECONDS,
  POOP_OVERFLOW_THRESHOLD,
  STAGE_BABY_TO_CHILD_SECONDS,
  STAGE_EGG_HATCH_SECONDS,
} from './constants';
import type { PetState } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000; // fixed epoch ms

function freshPet(overrides?: Partial<PetState>): PetState {
  return { ...createInitialPet('TestPet', NOW), ...overrides };
}

function advanceSeconds(state: PetState, seconds: number): PetState {
  return simulate(state, state.lastTick + seconds * 1000);
}

// ─── createInitialPet ────────────────────────────────────────────────────────

describe('createInitialPet', () => {
  it('creates an egg with full stats and no death', () => {
    const pet = createInitialPet('Pixel', NOW);
    expect(pet.stage).toBe('egg');
    expect(pet.isDead).toBe(false);
    expect(pet.causeOfDeath).toBeNull();
    expect(pet.stats.health).toBe(100);
    expect(pet.name).toBe('Pixel');
  });
});

// ─── Name sanitization ───────────────────────────────────────────────────────

describe('name sanitization', () => {
  it('trims whitespace', () => {
    const pet = createInitialPet('  Pixel  ', NOW);
    expect(pet.name).toBe('Pixel');
  });

  it('clamps to 20 characters', () => {
    const longName = 'A'.repeat(30);
    const pet = createInitialPet(longName, NOW);
    expect(pet.name.length).toBe(20);
  });

  it('strips control characters', () => {
    const pet = createInitialPet('Pixel\x00\x1F\x7F', NOW);
    expect(pet.name).toBe('Pixel');
  });

  it('falls back to Pixel for empty name', () => {
    const pet = createInitialPet('', NOW);
    expect(pet.name).toBe('Pixel');
  });

  it('falls back to Pixel for whitespace-only name', () => {
    const pet = createInitialPet('   ', NOW);
    expect(pet.name).toBe('Pixel');
  });

  it('rename sanitizes the new name', () => {
    const pet = freshPet();
    const next = rename(pet, '  Tama\x00  ');
    expect(next.name).toBe('Tama');
  });

  it('restart sanitizes the provided name', () => {
    const pet = freshPet({ isDead: true });
    const next = restart(pet, NOW, '  NewPet\x1F  ');
    expect(next.name).toBe('NewPet');
  });

  it('restart falls back to Pixel for blank name', () => {
    const pet = freshPet({ isDead: true });
    const next = restart(pet, NOW, '   ');
    expect(next.name).toBe('Pixel');
  });
});

// ─── Decay tests ─────────────────────────────────────────────────────────────

describe('simulate — decay', () => {
  it('reduces hunger over elapsed time', () => {
    const pet = freshPet({ stage: 'baby' });
    const advanced = advanceSeconds(pet, 3600); // 1 hour
    expect(advanced.stats.hunger).toBeLessThan(pet.stats.hunger);
  });

  it('reduces happiness over elapsed time', () => {
    const pet = freshPet({ stage: 'baby' });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.stats.happiness).toBeLessThan(pet.stats.happiness);
  });

  it('reduces energy while awake', () => {
    const pet = freshPet({ stage: 'baby', isSleeping: false });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.stats.energy).toBeLessThan(pet.stats.energy);
  });

  it('recovers energy while sleeping', () => {
    const pet = freshPet({
      stage: 'baby',
      isSleeping: true,
      stats: { hunger: 80, happiness: 80, energy: 30, hygiene: 80, health: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.stats.energy).toBeGreaterThan(30);
  });

  it('clamps stats at 0 on heavy decay', () => {
    const pet = freshPet({ stage: 'adult' });
    // Advance 5 hours — hunger should hit 0 (full decay is ~4h)
    const advanced = advanceSeconds(pet, 5 * 3600);
    expect(advanced.stats.hunger).toBeGreaterThanOrEqual(0);
    expect(advanced.stats.hunger).toBeLessThanOrEqual(100);
  });

  it('clamps stats at 100 — energy cannot exceed 100 while sleeping', () => {
    const pet = freshPet({
      stage: 'adult',
      isSleeping: true,
      stats: { hunger: 60, happiness: 60, energy: 99, hygiene: 60, health: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.stats.energy).toBeLessThanOrEqual(100);
  });

  it('updates lastTick to now', () => {
    const pet = freshPet();
    const target = NOW + 5000;
    const advanced = simulate(pet, target);
    expect(advanced.lastTick).toBe(target);
  });

  it('does not mutate original state', () => {
    const pet = freshPet({ stage: 'baby' });
    const originalHunger = pet.stats.hunger;
    advanceSeconds(pet, 3600);
    expect(pet.stats.hunger).toBe(originalHunger);
  });
});

// ─── Offline catch-up ────────────────────────────────────────────────────────

describe('simulate — offline catch-up', () => {
  it('respects MAX_CATCHUP_SECONDS and does not overflow stats', () => {
    const pet = freshPet({ stage: 'adult' });
    const hugeElapsed = (MAX_CATCHUP_SECONDS + 100 * 24 * 3600) * 1000;
    const advanced = simulate(pet, pet.lastTick + hugeElapsed);
    // All stats must stay within [0, 100]
    expect(advanced.stats.hunger).toBeGreaterThanOrEqual(0);
    expect(advanced.stats.happiness).toBeGreaterThanOrEqual(0);
    expect(advanced.stats.energy).toBeGreaterThanOrEqual(0);
    expect(advanced.stats.hygiene).toBeGreaterThanOrEqual(0);
    expect(advanced.stats.health).toBeGreaterThanOrEqual(0);
  });

  it('applies exactly MAX_CATCHUP_SECONDS regardless of larger elapsed', () => {
    const pet = freshPet({ stage: 'adult' });
    const capped = simulate(pet, pet.lastTick + (MAX_CATCHUP_SECONDS + 86400) * 1000);
    const exact = simulate(pet, pet.lastTick + MAX_CATCHUP_SECONDS * 1000);
    // Both should reach the same terminal stat values (both fully decayed)
    expect(capped.stats.hunger).toBe(exact.stats.hunger);
  });

  it('is a no-op when elapsed is zero', () => {
    const pet = freshPet({ stage: 'adult' });
    const advanced = simulate(pet, pet.lastTick);
    expect(advanced.stats.hunger).toBe(pet.stats.hunger);
  });
});

// ─── FEED action ─────────────────────────────────────────────────────────────

describe('feed', () => {
  it('increases hunger', () => {
    const pet = freshPet({
      stage: 'adult',
      stats: { hunger: 40, happiness: 60, energy: 60, hygiene: 60, health: 100 },
    });
    const next = feed(pet, NOW);
    expect(next.stats.hunger).toBeGreaterThan(40);
  });

  it('cannot exceed 100 hunger', () => {
    const pet = freshPet({
      stage: 'adult',
      stats: { hunger: 95, happiness: 60, energy: 60, hygiene: 60, health: 100 },
    });
    const next = feed(pet, NOW);
    expect(next.stats.hunger).toBeLessThanOrEqual(100);
  });

  it('does nothing while sleeping', () => {
    const pet = freshPet({
      stage: 'adult',
      isSleeping: true,
      stats: { hunger: 40, happiness: 60, energy: 60, hygiene: 60, health: 100 },
    });
    const next = feed(pet, NOW);
    // hunger should not be boosted (only natural decay from simulate)
    expect(next.stats.hunger).toBeLessThanOrEqual(40);
  });

  it('does nothing when dead', () => {
    const pet = freshPet({
      stage: 'adult',
      isDead: true,
      stats: { hunger: 0, happiness: 0, energy: 0, hygiene: 0, health: 0 },
    });
    const next = feed(pet, NOW);
    expect(next.stats.hunger).toBe(0);
  });
});

// ─── PLAY action ─────────────────────────────────────────────────────────────

describe('play', () => {
  it('increases happiness and costs energy', () => {
    const pet = freshPet({
      stage: 'adult',
      stats: { hunger: 60, happiness: 40, energy: 80, hygiene: 60, health: 100 },
    });
    const next = play(pet, NOW);
    expect(next.stats.happiness).toBeGreaterThan(40);
    expect(next.stats.energy).toBeLessThan(80);
  });

  it('does nothing while sleeping', () => {
    const pet = freshPet({
      stage: 'adult',
      isSleeping: true,
      stats: { hunger: 60, happiness: 40, energy: 80, hygiene: 60, health: 100 },
    });
    const next = play(pet, NOW);
    expect(next.stats.happiness).toBeLessThanOrEqual(40);
  });
});

// ─── CLEAN action ─────────────────────────────────────────────────────────────

describe('clean', () => {
  it('restores hygiene to 100 and clears poops', () => {
    const pet = freshPet({
      stage: 'adult',
      poops: 5,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 20, health: 100 },
    });
    const next = clean(pet, NOW);
    expect(next.stats.hygiene).toBe(100);
    expect(next.poops).toBe(0);
  });

  it('does nothing when dead', () => {
    const pet = freshPet({
      stage: 'adult',
      isDead: true,
      poops: 3,
      stats: { hunger: 0, happiness: 0, energy: 0, hygiene: 10, health: 0 },
    });
    const next = clean(pet, NOW);
    expect(next.poops).toBe(3);
  });
});

// ─── HEAL action ─────────────────────────────────────────────────────────────

describe('heal', () => {
  it('cures sickness and boosts health', () => {
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      stats: { hunger: 40, happiness: 40, energy: 40, hygiene: 40, health: 50 },
    });
    const next = heal(pet, NOW);
    expect(next.isSick).toBe(false);
    expect(next.stats.health).toBeGreaterThan(50);
  });

  it('is a no-op when not sick', () => {
    const pet = freshPet({
      stage: 'adult',
      isSick: false,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 60, health: 80 },
    });
    const next = heal(pet, NOW);
    expect(next.isSick).toBe(false);
    // health might regen slightly from simulate, but no explicit HEAL boost
    expect(next.stats.health).toBeLessThanOrEqual(80 + 1); // only regen from simulate which is < 1s
  });

  it('heal() instant-cures sickness caused by poops even before poops are cleaned', () => {
    // Pet is sick because poops > POOP_OVERFLOW_THRESHOLD
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      poops: POOP_OVERFLOW_THRESHOLD + 1,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 30, health: 60 },
    });
    const next = heal(pet, NOW);
    // simulate() inside heal() will re-trigger isSick because poops are still there,
    // so the simulated state has isSick=true and heal() should then cure it.
    // But note: simulate fires first and re-sets isSick=true, then heal() cures it.
    expect(next.isSick).toBe(false);
    expect(next.stats.health).toBeGreaterThan(60);
  });

  it('heal() boosts health stat', () => {
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      poops: 0,
      stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 40 },
    });
    const healed = heal(pet, NOW);
    expect(healed.stats.health).toBeGreaterThan(40);
  });
});

// ─── Sickness recovery flow ───────────────────────────────────────────────────
// Fix #3: gameplay rule tests for sickness onset / natural recovery / heal

describe('sickness recovery flow', () => {
  it('pet becomes sick when poops exceed POOP_OVERFLOW_THRESHOLD', () => {
    const pet = freshPet({
      stage: 'adult',
      poops: POOP_OVERFLOW_THRESHOLD + 1,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 50, health: 100 },
    });
    // A tiny advance triggers simulate with the overflow poops already set
    const next = advanceSeconds(pet, 1);
    expect(next.isSick).toBe(true);
  });

  it('pet stays sick while poop overflow persists', () => {
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      poops: POOP_OVERFLOW_THRESHOLD + 1,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 40, health: 80 },
    });
    const next = advanceSeconds(pet, 60);
    expect(next.isSick).toBe(true);
  });

  it('pet recovers naturally on next tick after clean() removes the poop cause', () => {
    // Set up a pet that is sick due to poop overflow; hygiene is restored by clean()
    const sick = freshPet({
      stage: 'adult',
      isSick: true,
      poops: POOP_OVERFLOW_THRESHOLD + 1,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 10, health: 70 },
    });
    // clean() resets poops to 0 and hygiene to 100
    const cleaned = clean(sick, NOW);
    expect(cleaned.poops).toBe(0);
    expect(cleaned.stats.hygiene).toBe(100);
    // On the next simulated tick (1 second later), no sickness causes remain →
    // isSick should clear naturally
    const recovered = advanceSeconds(cleaned, 1);
    expect(recovered.isSick).toBe(false);
  });

  it('heal() provides instant cure + health bump regardless of remaining causes', () => {
    // Pet is sick with poops still present (causes not yet resolved)
    // simulate() inside heal() re-triggers isSick; then heal() clears it immediately
    const sick = freshPet({
      stage: 'adult',
      isSick: true,
      poops: POOP_OVERFLOW_THRESHOLD + 1,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 20, health: 50 },
    });
    const healed = heal(sick, NOW);
    expect(healed.isSick).toBe(false);
    expect(healed.stats.health).toBeGreaterThan(50);
  });
});

// ─── SLEEP toggle ─────────────────────────────────────────────────────────────

describe('toggleSleep', () => {
  it('toggles isSleeping on and off', () => {
    const pet = freshPet({ stage: 'adult', isSleeping: false });
    const sleeping = toggleSleep(pet, NOW);
    expect(sleeping.isSleeping).toBe(true);
    const awake = toggleSleep(sleeping, NOW);
    expect(awake.isSleeping).toBe(false);
  });

  it('does nothing when dead', () => {
    const pet = freshPet({ stage: 'adult', isDead: true, isSleeping: false });
    const next = toggleSleep(pet, NOW);
    expect(next.isSleeping).toBe(false);
  });
});

// ─── Neglect path: starvation → sick → dead ──────────────────────────────────

describe('neglect path', () => {
  it('pet becomes sick when hunger hits 0', () => {
    // Start with minimal hunger, advance long enough to drain it
    const pet = freshPet({
      stage: 'adult',
      stats: { hunger: 5, happiness: 60, energy: 60, hygiene: 60, health: 100 },
    });
    const advanced = advanceSeconds(pet, 3600);
    // After an hour with 5 hunger, hunger should be 0 and sickness triggered
    expect(advanced.stats.hunger).toBe(0);
    expect(advanced.isSick).toBe(true);
  });

  it('pet health decays when sick and eventually dies', () => {
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      stats: { hunger: 0, happiness: 0, energy: 0, hygiene: 0, health: 5 },
    });
    // Advance 1 hour — health should hit 0 and pet should die
    const advanced = advanceSeconds(pet, 3600);
    expect(advanced.isDead).toBe(true);
  });

  it('causeOfDeath is starvation when hunger drove the death (hunger === 0)', () => {
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      stats: { hunger: 0, happiness: 0, energy: 0, hygiene: 60, health: 1 },
    });
    const advanced = advanceSeconds(pet, 600);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('starvation');
  });

  it('causeOfDeath is starvation when hunger is low but nonzero (≤ HUNGER_CRITICAL_THRESHOLD)', () => {
    // Fix #4: near-starvation deaths should be 'starvation', not 'neglect'
    const pet = freshPet({
      stage: 'adult',
      isSick: false,
      stats: {
        hunger: HUNGER_CRITICAL_THRESHOLD,
        happiness: 60,
        energy: 60,
        hygiene: 60,
        health: 1,
      },
    });
    const advanced = advanceSeconds(pet, 600);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('starvation');
  });

  it('causeOfDeath is sickness when sick with ok hunger (cause kept via low hygiene)', () => {
    // Keep a sickness cause alive (hygiene = 0) so isSick stays true throughout.
    // hunger is well above HUNGER_CRITICAL_THRESHOLD so starvation is ruled out.
    const pet = freshPet({
      stage: 'adult',
      isSick: true,
      stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 0, health: 1 },
    });
    const advanced = advanceSeconds(pet, 600);
    expect(advanced.isDead).toBe(true);
    expect(advanced.causeOfDeath).toBe('sickness');
  });

  it('simulate is a no-op after death (except lastTick)', () => {
    const dead: PetState = {
      ...freshPet({ stage: 'adult' }),
      isDead: true,
      causeOfDeath: 'starvation',
      stats: { hunger: 0, happiness: 0, energy: 0, hygiene: 0, health: 0 },
    };
    const target = dead.lastTick + 60_000;
    const advanced = simulate(dead, target);
    expect(advanced.lastTick).toBe(target);
    expect(advanced.isDead).toBe(true);
    expect(advanced.stats.hunger).toBe(0);
  });
});

// ─── Life-stage evolution ────────────────────────────────────────────────────

describe('life-stage evolution', () => {
  it('egg hatches into baby after STAGE_EGG_HATCH_SECONDS', () => {
    const pet = createInitialPet('Test', NOW);
    expect(pet.stage).toBe('egg');
    const advanced = advanceSeconds(pet, STAGE_EGG_HATCH_SECONDS + 1);
    expect(advanced.stage).toBe('baby');
  });

  it('baby evolves to child after STAGE_BABY_TO_CHILD_SECONDS', () => {
    const pet = createInitialPet('Test', NOW);
    const advanced = advanceSeconds(pet, STAGE_BABY_TO_CHILD_SECONDS + 1);
    expect(advanced.stage).toBe('child');
  });

  it('stage stays adult indefinitely beyond teen threshold', () => {
    const pet = createInitialPet('Test', NOW);
    // Advance well past adult threshold (9 hours)
    const advanced = advanceSeconds(pet, 9 * 3600);
    expect(advanced.stage).toBe('adult');
  });
});

// ─── restart ─────────────────────────────────────────────────────────────────

describe('restart', () => {
  it('yields a fresh egg with full stats', () => {
    const dead: PetState = {
      ...freshPet({ stage: 'adult' }),
      isDead: true,
      causeOfDeath: 'neglect',
    };
    const next = restart(dead, NOW);
    expect(next.stage).toBe('egg');
    expect(next.isDead).toBe(false);
    expect(next.causeOfDeath).toBeNull();
    expect(next.stats.health).toBe(100);
  });

  it('uses provided name when given', () => {
    const dead = freshPet({ isDead: true });
    const next = restart(dead, NOW, 'NewPet');
    expect(next.name).toBe('NewPet');
  });

  it('uses existing name when no name given', () => {
    const dead = freshPet({ isDead: true, name: 'OldPet' });
    const next = restart(dead, NOW);
    expect(next.name).toBe('OldPet');
  });
});

// ─── rename ──────────────────────────────────────────────────────────────────

describe('rename', () => {
  it('updates the pet name', () => {
    const pet = freshPet({ name: 'Pixel' });
    const next = rename(pet, 'Tama');
    expect(next.name).toBe('Tama');
  });
});

// ─── getMood ─────────────────────────────────────────────────────────────────

describe('getMood', () => {
  it('returns dead when isDead', () => {
    const pet = freshPet({ isDead: true });
    expect(getMood(pet)).toBe('dead');
  });

  it('returns sleeping when isSleeping (and not dead)', () => {
    const pet = freshPet({ isSleeping: true });
    expect(getMood(pet)).toBe('sleeping');
  });

  it('returns sick when isSick (and not dead/sleeping)', () => {
    const pet = freshPet({ isSick: true });
    expect(getMood(pet)).toBe('sick');
  });

  it('returns happy with high hunger + happiness + energy', () => {
    const pet = freshPet({
      stats: { hunger: 90, happiness: 90, energy: 90, hygiene: 90, health: 100 },
    });
    expect(getMood(pet)).toBe('happy');
  });

  it('returns neutral with mid-range stats', () => {
    const pet = freshPet({
      stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 100 },
    });
    expect(getMood(pet)).toBe('neutral');
  });

  it('returns sad with low stats', () => {
    const pet = freshPet({
      stats: { hunger: 10, happiness: 10, energy: 50, hygiene: 50, health: 60 },
    });
    expect(getMood(pet)).toBe('sad');
  });

  it('returns sad when energy is critically low', () => {
    const pet = freshPet({
      stats: { hunger: 80, happiness: 80, energy: 5, hygiene: 80, health: 100 },
    });
    expect(getMood(pet)).toBe('sad');
  });
});
