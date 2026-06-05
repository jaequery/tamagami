import {
  buyFood,
  chooseJob,
  clockIn,
  clockOut,
  createHeir,
  createInitialPet,
  enroll,
  quitJob,
  simulate,
} from './engine';
import {
  canAfford,
  coinsLabel,
  currentJob,
  defaultEconomy,
  isStudying,
  isWorking,
  jobById,
  nextEducation,
  qualifiesFor,
  shiftEarned,
  shiftMaxed,
} from './economy';
import { STARTING_COINS, WORK_SHIFT_MAX_SECONDS } from './constants';
import { startingCoinsForHousehold } from './household';
import type { PetEconomy, PetState } from './types';

const NOW = 1_700_000_000_000;

// Pin the starting balance to the flat default so these tests isolate economy
// mechanics from the §2 household tier (which now seeds coins in createInitialPet).
function cat(econ?: Partial<PetEconomy>, stats?: Partial<PetState['stats']>): PetState {
  const base = createInitialPet('Test', 'cat', NOW);
  return {
    ...base,
    economy: { ...base.economy, coins: STARTING_COINS, ...econ },
    stats: { ...base.stats, ...stats },
  };
}

// ─── defaults / seeding ────────────────────────────────────────────────────────

describe('economy seeding', () => {
  it('seeds a fresh pet with starting coins, no job, no education', () => {
    const pet = createInitialPet('Test', 'cat', NOW);
    // Starting coins are now set by the §2 household material tier — a positive
    // balance derived deterministically from the pet's dealt household.
    expect(pet.economy.coins).toBe(startingCoinsForHousehold(pet.household));
    expect(pet.economy.coins).toBeGreaterThan(0);
    expect(pet.economy.jobId).toBeNull();
    expect(pet.economy.education).toBe(0);
    expect(isWorking(pet.economy)).toBe(false);
    expect(isStudying(pet.economy)).toBe(false);
  });

  it('defaultEconomy matches the seed', () => {
    expect(defaultEconomy().coins).toBe(STARTING_COINS);
  });
});

// ─── marketplace (buyFood) ──────────────────────────────────────────────────────

describe('buyFood', () => {
  it('spends coins and restores hunger', () => {
    const pet = buyFood(cat({}, { hunger: 10 }), 'meal', NOW);
    expect(pet.economy.coins).toBe(STARTING_COINS - 14);
    expect(pet.stats.hunger).toBe(60); // 10 + 50
  });

  it('is a no-op when you cannot afford the food', () => {
    const pet = buyFood(cat({ coins: 2 }, { hunger: 10 }), 'feast', NOW);
    expect(pet.economy.coins).toBe(2);
    expect(pet.stats.hunger).toBe(10);
  });

  it('is a no-op for an unknown food id', () => {
    const pet = buyFood(cat({}, { hunger: 10 }), 'pizza', NOW);
    expect(pet.economy.coins).toBe(STARTING_COINS);
    expect(pet.stats.hunger).toBe(10);
  });

  it('does not over-fill hunger past 100', () => {
    const pet = buyFood(cat({}, { hunger: 90 }), 'feast', NOW);
    expect(pet.stats.hunger).toBe(100);
  });

});

// ─── jobs ───────────────────────────────────────────────────────────────────────

describe('jobs', () => {
  it('takes a job you qualify for', () => {
    const pet = chooseJob(cat(), 'forager', NOW);
    expect(pet.economy.jobId).toBe('forager');
  });

  it('refuses a job you are under-qualified for', () => {
    const pet = chooseJob(cat({ education: 0 }), 'coder', NOW);
    expect(pet.economy.jobId).toBeNull();
  });

  it('allows a skilled job once educated enough', () => {
    const pet = chooseJob(cat({ education: 2 }), 'coder', NOW);
    expect(pet.economy.jobId).toBe('coder');
  });

  it('quitting clears the job and any shift', () => {
    let pet = chooseJob(cat(), 'forager', NOW);
    pet = clockIn(pet, NOW);
    pet = quitJob(pet, NOW);
    expect(pet.economy.jobId).toBeNull();
    expect(isWorking(pet.economy)).toBe(false);
  });

  it('qualifiesFor reflects education gating', () => {
    const coder = jobById('coder')!;
    expect(qualifiesFor(defaultEconomy(), coder)).toBe(false);
    expect(qualifiesFor({ ...defaultEconomy(), education: 2 }, coder)).toBe(true);
  });
});

// ─── working (clock in / out, wages, shift cap) ─────────────────────────────────

describe('working a shift', () => {
  it('earns the hourly wage over an in-game hour (60s)', () => {
    let pet = chooseJob(cat(), 'forager', NOW); // 10/hr
    pet = clockIn(pet, NOW);
    pet = simulate(pet, NOW + 60_000); // one in-game hour
    expect(coinsLabel(pet.economy)).toBe(STARTING_COINS + 10);
  });

  it('working tires the pet (happiness drops)', () => {
    let pet = chooseJob(cat(), 'forager', NOW);
    pet = clockIn(pet, NOW);
    const before = pet.stats.happiness;
    pet = simulate(pet, NOW + 60_000);
    // -5 joy/hr from the job, plus a little natural decay
    expect(pet.stats.happiness).toBeLessThan(before - 4);
  });

  it('caps a single shift at the shift max', () => {
    let pet = chooseJob(cat(), 'forager', NOW);
    pet = clockIn(pet, NOW);
    pet = simulate(pet, NOW + (WORK_SHIFT_MAX_SECONDS + 600) * 1000);
    // forager 10/hr × 8 capped hours = 80
    expect(coinsLabel(pet.economy)).toBe(STARTING_COINS + 80);
    expect(shiftMaxed(pet.economy)).toBe(true);
  });

  it('does not pay twice for the same elapsed time (idempotent step)', () => {
    let pet = chooseJob(cat(), 'forager', NOW);
    pet = clockIn(pet, NOW);
    pet = simulate(pet, NOW + 60_000);
    const coins = pet.economy.coins;
    pet = simulate(pet, NOW + 60_000); // same instant again
    expect(pet.economy.coins).toBe(coins);
  });

  it('clocking out banks earnings and ends the shift', () => {
    let pet = chooseJob(cat(), 'forager', NOW);
    pet = clockIn(pet, NOW);
    pet = simulate(pet, NOW + 60_000);
    const earned = pet.economy.coins;
    pet = clockOut(pet, NOW + 60_000);
    expect(pet.economy.coins).toBe(earned); // kept
    expect(isWorking(pet.economy)).toBe(false);
    expect(shiftEarned(pet.economy)).toBe(0);
  });

  it('clock-in is a no-op when unemployed', () => {
    const pet = clockIn(cat(), NOW);
    expect(isWorking(pet.economy)).toBe(false);
  });
});

// ─── education ──────────────────────────────────────────────────────────────────

describe('education', () => {
  it('enrolling pays tuition and starts a study timer', () => {
    const pet = enroll(cat(), NOW); // SCHOOL: 40 tuition
    expect(pet.economy.coins).toBe(STARTING_COINS - 40);
    expect(isStudying(pet.economy)).toBe(true);
  });

  it('graduates after the study duration, raising education', () => {
    let pet = enroll(cat(), NOW); // SCHOOL: 60s
    pet = simulate(pet, NOW + 60_000);
    expect(pet.economy.education).toBe(1);
    expect(isStudying(pet.economy)).toBe(false);
  });

  it('is a no-op when tuition is unaffordable', () => {
    const pet = enroll(cat({ coins: 5 }), NOW);
    expect(pet.economy.coins).toBe(5);
    expect(isStudying(pet.economy)).toBe(false);
  });

  it('cannot enroll while already studying', () => {
    let pet = enroll(cat({ coins: 1000 }), NOW);
    const coinsAfterFirst = pet.economy.coins;
    pet = enroll(pet, NOW); // ignored — already in SCHOOL
    expect(pet.economy.coins).toBe(coinsAfterFirst);
  });

  it('nextEducation advances and tops out', () => {
    expect(nextEducation(defaultEconomy())?.title).toBe('SCHOOL');
    expect(nextEducation({ ...defaultEconomy(), education: 3 })).toBeNull();
  });
});

// ─── inheritance ────────────────────────────────────────────────────────────────

describe('heir inheritance', () => {
  it('bequeaths the family savings but resets career + schooling', () => {
    const parent = cat({ coins: 250, education: 3, jobId: 'mayor' });
    const heir = createHeir(parent, NOW);
    expect(heir.economy.coins).toBe(250);
    expect(heir.economy.jobId).toBeNull();
    expect(heir.economy.education).toBe(0);
  });
});

// ─── selectors ──────────────────────────────────────────────────────────────────

describe('selectors', () => {
  it('canAfford compares the balance', () => {
    expect(canAfford(defaultEconomy(), STARTING_COINS)).toBe(true);
    expect(canAfford(defaultEconomy(), STARTING_COINS + 1)).toBe(false);
  });

  it('currentJob resolves the job def', () => {
    expect(currentJob({ ...defaultEconomy(), jobId: 'forager' })?.title).toBe('FORAGER');
    expect(currentJob(defaultEconomy())).toBeNull();
  });
});
