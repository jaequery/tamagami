import {
  ACTIVITIES,
  ALL_ACTIVITIES,
  activitySpec,
  overlayFor,
  ambientPool,
  pickAmbient,
  nextIdleDelayMs,
  IDLE_MIN_MS,
  IDLE_MAX_MS,
} from './animations';
import type { PetActivity, OverlayGlyph } from './animations';

// Canonical list, derived from the registry so it can never drift from the module.
const PET_ACTIVITIES = Object.keys(ACTIVITIES) as PetActivity[];

// A spread of rng values in [0, 1) used for sweeps. i / N keeps every draw < 1.
function unitSweep(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i / n);
}

// ─── Registry invariants ──────────────────────────────────────────────────────

describe('ACTIVITIES / ALL_ACTIVITIES registry', () => {
  it('ALL_ACTIVITIES lists every key of ACTIVITIES, exactly 7, no dupes', () => {
    expect(ALL_ACTIVITIES).toHaveLength(7);
    expect(new Set(ALL_ACTIVITIES).size).toBe(ALL_ACTIVITIES.length);
    expect([...ALL_ACTIVITIES].sort()).toEqual([...PET_ACTIVITIES].sort());
    // Iteration order matches the record's own key order (canonical order).
    expect([...ALL_ACTIVITIES]).toEqual(PET_ACTIVITIES);
  });

  it("each spec's key matches its record key and durationMs > 0", () => {
    for (const k of PET_ACTIVITIES) {
      const spec = ACTIVITIES[k];
      expect(spec.key).toBe(k);
      expect(spec.durationMs).toBeGreaterThan(0);
    }
  });

  it('ambient specs have weight > 0 and non-ambient specs have weight 0', () => {
    for (const k of PET_ACTIVITIES) {
      const spec = ACTIVITIES[k];
      if (spec.ambient) {
        expect(spec.weight).toBeGreaterThan(0);
      } else {
        expect(spec.weight).toBe(0);
      }
    }
  });

  it("'sleep' is night-only, looping, with a 'zzz' overlay", () => {
    const sleep = ACTIVITIES.sleep;
    expect(sleep.nightOnly).toBe(true);
    expect(sleep.overlay).toBe<OverlayGlyph>('zzz');
    expect(sleep.loop).toBe(true);
    expect(sleep.ambient).toBe(true);
  });

  it("'idle' is non-ambient with weight 0 and overlay 'none'", () => {
    const idle = ACTIVITIES.idle;
    expect(idle.ambient).toBe(false);
    expect(idle.weight).toBe(0);
    expect(idle.overlay).toBe<OverlayGlyph>('none');
  });

  it("'eat' and 'cheer' are non-ambient (user-triggered) activities", () => {
    expect(ACTIVITIES.eat.ambient).toBe(false);
    expect(ACTIVITIES.cheer.ambient).toBe(false);
  });

  it('activitySpec(k) returns the exact registry entry for every activity', () => {
    for (const k of PET_ACTIVITIES) {
      expect(activitySpec(k)).toBe(ACTIVITIES[k]);
    }
  });

  it('overlayFor(k) returns the spec overlay for every activity', () => {
    for (const k of PET_ACTIVITIES) {
      expect(overlayFor(k)).toBe(ACTIVITIES[k].overlay);
    }
  });
});

// ─── ambientPool ──────────────────────────────────────────────────────────────

describe('ambientPool', () => {
  const nightOnlyKeys = PET_ACTIVITIES.filter((k) => ACTIVITIES[k].nightOnly);

  it('has at least one night-only activity to gate (sanity)', () => {
    expect(nightOnlyKeys).toContain<PetActivity>('sleep');
  });

  it('excludes every night-only activity during the day (default opts)', () => {
    const day = ambientPool();
    for (const k of nightOnlyKeys) {
      expect(day).not.toContain(k);
    }
    expect(day).not.toContain<PetActivity>('sleep');
  });

  it('excludes night-only activities when night is explicitly false', () => {
    expect(ambientPool({ night: false })).toEqual(ambientPool());
  });

  it('includes night-only activities (sleep) at night', () => {
    expect(ambientPool({ night: true })).toContain<PetActivity>('sleep');
  });

  it('only ever contains ambient activities', () => {
    for (const pool of [ambientPool(), ambientPool({ night: true })]) {
      for (const k of pool) {
        expect(ACTIVITIES[k].ambient).toBe(true);
      }
    }
  });

  it('day pool is a strict subset of night pool, differing only by night-only ones', () => {
    const day = ambientPool();
    const night = ambientPool({ night: true });

    // Day ⊂ night.
    for (const k of day) {
      expect(night).toContain(k);
    }
    expect(night.length).toBeGreaterThan(day.length);

    // night = day + the night-only ones (as a set).
    const expectedNight = new Set<PetActivity>([...day, ...nightOnlyKeys]);
    expect(new Set(night)).toEqual(expectedNight);
  });
});

// ─── pickAmbient ──────────────────────────────────────────────────────────────

describe('pickAmbient', () => {
  it("returns the first pool activity ('walk') with rng = () => 0", () => {
    const dayPool = ambientPool();
    expect(pickAmbient(() => 0)).toBe(dayPool[0]);
    expect(pickAmbient(() => 0)).toBe<PetActivity>('walk');

    const nightPool = ambientPool({ night: true });
    expect(pickAmbient(() => 0, { night: true })).toBe(nightPool[0]);
    expect(pickAmbient(() => 0, { night: true })).toBe<PetActivity>('walk');
  });

  it('returns the last pool activity at the top of the unit interval', () => {
    const dayPool = ambientPool();
    const lastDay = dayPool[dayPool.length - 1];
    expect(pickAmbient(() => 0.9999)).toBe(lastDay);
    expect(pickAmbient(() => 0.9999)).toBe<PetActivity>('dance');

    const nightPool = ambientPool({ night: true });
    const lastNight = nightPool[nightPool.length - 1];
    expect(pickAmbient(() => 0.9999, { night: true })).toBe(lastNight);
    expect(pickAmbient(() => 0.9999, { night: true })).toBe<PetActivity>('sleep');
  });

  it("never returns 'sleep' during the day across a full rng sweep", () => {
    for (const r of unitSweep(200)) {
      expect(pickAmbient(() => r, { night: false })).not.toBe<PetActivity>('sleep');
    }
  });

  it("can return 'sleep' at night for an appropriate rng", () => {
    // Top of the interval lands on sleep (the heaviest, last in the night pool).
    expect(pickAmbient(() => 0.9999, { night: true })).toBe<PetActivity>('sleep');

    const seenAtNight = new Set<PetActivity>();
    for (const r of unitSweep(200)) {
      seenAtNight.add(pickAmbient(() => r, { night: true }));
    }
    expect(seenAtNight.has('sleep')).toBe(true);
  });

  it('always returns a member of the active pool', () => {
    const dayPool = ambientPool();
    const nightPool = ambientPool({ night: true });
    for (const r of unitSweep(200)) {
      expect(dayPool).toContain(pickAmbient(() => r));
      expect(nightPool).toContain(pickAmbient(() => r, { night: true }));
    }
  });

  it('covers every pool member and weights higher activities more often (day)', () => {
    const dayPool = ambientPool();
    const counts = new Map<PetActivity, number>(dayPool.map((k) => [k, 0]));

    const N = 1200;
    for (const r of unitSweep(N)) {
      const pick = pickAmbient(() => r);
      counts.set(pick, (counts.get(pick) ?? 0) + 1);
    }

    // Every pool member shows up at least once.
    for (const k of dayPool) {
      expect(counts.get(k)).toBeGreaterThan(0);
    }

    // Heavier weights appear at least as often: walk(5) ≥ jump(4) ≥ dance(3).
    const walk = counts.get('walk') ?? 0;
    const jump = counts.get('jump') ?? 0;
    const dance = counts.get('dance') ?? 0;
    expect(walk).toBeGreaterThanOrEqual(jump);
    expect(jump).toBeGreaterThanOrEqual(dance);
  });

  it('is robust to a NaN rng and returns a valid day-pool member', () => {
    const dayPool = ambientPool();
    let pick: PetActivity = 'idle';
    expect(() => {
      pick = pickAmbient(() => NaN);
    }).not.toThrow();
    // NaN clamps to 0 → first pool member.
    expect(pick).toBe(dayPool[0]);
    expect(dayPool).toContain(pick);
  });

  it('is robust to an out-of-range rng (>= 1) and never throws', () => {
    const nightPool = ambientPool({ night: true });
    let pick: PetActivity = 'idle';
    expect(() => {
      pick = pickAmbient(() => 1.5, { night: true });
    }).not.toThrow();
    expect(nightPool).toContain(pick);

    // Negative draws clamp to 0 → first member, still valid.
    expect(() => pickAmbient(() => -3)).not.toThrow();
    expect(ambientPool()).toContain(pickAmbient(() => -3));
  });
});

// ─── nextIdleDelayMs ──────────────────────────────────────────────────────────

describe('nextIdleDelayMs', () => {
  it('has sane bounds (min < max)', () => {
    expect(IDLE_MIN_MS).toBeLessThan(IDLE_MAX_MS);
  });

  it('returns exactly IDLE_MIN_MS for rng = () => 0', () => {
    expect(nextIdleDelayMs(() => 0)).toBe(IDLE_MIN_MS);
  });

  it('can reach IDLE_MAX_MS at the top of the unit interval', () => {
    expect(nextIdleDelayMs(() => 0.9999)).toBe(IDLE_MAX_MS);
  });

  it('stays an integer within [IDLE_MIN_MS, IDLE_MAX_MS] across a sweep', () => {
    for (const r of unitSweep(500)) {
      const delay = nextIdleDelayMs(() => r);
      expect(Number.isInteger(delay)).toBe(true);
      expect(delay).toBeGreaterThanOrEqual(IDLE_MIN_MS);
      expect(delay).toBeLessThanOrEqual(IDLE_MAX_MS);
    }
  });

  it('clamps degenerate rng values into bounds without throwing', () => {
    const degenerate = [NaN, -1, -0.5, 1, 1.5, 42, -Infinity, Infinity];
    for (const value of degenerate) {
      let delay = -1;
      expect(() => {
        delay = nextIdleDelayMs(() => value);
      }).not.toThrow();
      expect(Number.isInteger(delay)).toBe(true);
      expect(delay).toBeGreaterThanOrEqual(IDLE_MIN_MS);
      expect(delay).toBeLessThanOrEqual(IDLE_MAX_MS);
    }
    // NaN / negative / >= 1 all clamp to the floor.
    expect(nextIdleDelayMs(() => NaN)).toBe(IDLE_MIN_MS);
    expect(nextIdleDelayMs(() => -1)).toBe(IDLE_MIN_MS);
  });
});
