import {
  catStageLabel,
  catStageBlurb,
  displayedAgeYears,
  displayedAgeLabel,
  ownerStageForGeneration,
  NATURAL_LIFESPAN_SECONDS,
  lifeProgress,
} from './lifespan';
import { STAGE_THRESHOLDS, STAGE_ORDER, stageFor } from './evolution';
import { OWNER_STAGES, type OwnerStage } from './ownerLife';
import type { LifeStage } from './types';

const DAY = 86_400;
const ALL_STAGES: LifeStage[] = ['egg', 'baby', 'child', 'teen', 'adult', 'elder'];

// ─── retuned thresholds ──────────────────────────────────────────────────────────

describe('§6 retuned life curve', () => {
  it('still hatches fast (birth in the opening session)', () => {
    expect(STAGE_THRESHOLDS[1].atSeconds).toBe(45);
    expect(stageFor(44)).toBe('egg');
    expect(stageFor(45)).toBe('baby');
  });

  it('spans roughly four real weeks, monotonically', () => {
    for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
      expect(STAGE_THRESHOLDS[i].atSeconds).toBeGreaterThan(STAGE_THRESHOLDS[i - 1].atSeconds);
    }
    const elder = STAGE_THRESHOLDS.find((t) => t.stage === 'elder')!;
    expect(elder.atSeconds).toBeGreaterThanOrEqual(20 * DAY);
    expect(STAGE_ORDER).toEqual(STAGE_THRESHOLDS.map((t) => t.stage));
  });
});

// ─── labels ──────────────────────────────────────────────────────────────────────

describe('cat stage names', () => {
  it('names every internal stage with a cat-facing label + blurb', () => {
    for (const s of ALL_STAGES) {
      expect(catStageLabel(s)).toMatch(/^[A-Z]+$/);
      expect(catStageBlurb(s).length).toBeGreaterThan(0);
    }
  });

  it('maps baby→KITTEN and elder→ELDER', () => {
    expect(catStageLabel('baby')).toBe('KITTEN');
    expect(catStageLabel('teen')).toBe('ADULT');
    expect(catStageLabel('elder')).toBe('ELDER');
  });
});

// ─── displayed age ───────────────────────────────────────────────────────────────

describe('displayedAgeYears', () => {
  it('is 0 at birth and climbs to ~16 over a full life', () => {
    expect(displayedAgeYears(0)).toBe(0);
    expect(displayedAgeYears(28 * DAY)).toBeCloseTo(16, 0);
  });

  it('is monotonic increasing', () => {
    let last = -1;
    for (let d = 0; d <= 30; d++) {
      const y = displayedAgeYears(d * DAY);
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
  });

  it('moves fast early then settles (kitten months, then years)', () => {
    // First 4 days cover only ~0.5 yr; days 9→16 cover ~6 yr — the early-fast curve.
    const earlyRate = displayedAgeYears(4 * DAY) - displayedAgeYears(0);
    const primeRate = displayedAgeYears(16 * DAY) - displayedAgeYears(9 * DAY);
    expect(primeRate).toBeGreaterThan(earlyRate);
  });

  it('keeps aging past a full life', () => {
    expect(displayedAgeYears(40 * DAY)).toBeGreaterThan(displayedAgeYears(28 * DAY));
  });

  it('labels months under a year, then whole years', () => {
    expect(displayedAgeLabel(2 * DAY)).toMatch(/MO$/);
    expect(displayedAgeLabel(16 * DAY)).toMatch(/YR$/);
  });
});

// ─── owner aging ─────────────────────────────────────────────────────────────────

describe('ownerStageForGeneration', () => {
  it('holds at the start stage for generation 1', () => {
    expect(ownerStageForGeneration('young_adult', 1)).toBe('young_adult');
  });

  it('advances ~one stage per generation and clamps at elder', () => {
    expect(ownerStageForGeneration('young_adult', 2)).toBe('adult');
    expect(ownerStageForGeneration('young_adult', 3)).toBe('elder');
    expect(ownerStageForGeneration('young_adult', 99)).toBe('elder');
  });

  it('always returns a valid owner stage', () => {
    for (const start of OWNER_STAGES) {
      for (let g = 1; g <= 10; g++) {
        expect(OWNER_STAGES).toContain(ownerStageForGeneration(start as OwnerStage, g));
      }
    }
  });
});

// ─── natural lifespan ────────────────────────────────────────────────────────────

describe('lifeProgress', () => {
  it('runs 0→1 across the natural lifespan and clamps', () => {
    expect(lifeProgress(0)).toBe(0);
    expect(lifeProgress(NATURAL_LIFESPAN_SECONDS / 2)).toBeCloseTo(0.5, 5);
    expect(lifeProgress(NATURAL_LIFESPAN_SECONDS)).toBe(1);
    expect(lifeProgress(NATURAL_LIFESPAN_SECONDS * 2)).toBe(1);
  });
});
