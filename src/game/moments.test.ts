import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DAILY_MOMENTS,
  MILESTONES,
  ALL_MOMENTS,
  MOMENT_IDS,
  TOTAL_MOMENTS,
  momentById,
  isValidMomentId,
  momentOfDay,
  milestoneForStage,
  type MoodBand,
} from './moments';
import {
  loadCaughtMoments,
  recordCaughtMoment,
  _resetMomentCodexCache,
} from './momentCodex';
import type { LifeStage } from './types';

const at = (y: number, mo: number, d: number): number => new Date(y, mo, d, 12).getTime();
const STAGES: LifeStage[] = ['baby', 'child', 'teen', 'adult', 'elder'];
const MOODS: MoodBand[] = ['happy', 'neutral', 'sad'];

// ─── table integrity ────────────────────────────────────────────────────────────

describe('moment tables', () => {
  it('have unique ids and well-formed entries', () => {
    expect(new Set(MOMENT_IDS).size).toBe(TOTAL_MOMENTS);
    expect(ALL_MOMENTS.length).toBe(DAILY_MOMENTS.length + MILESTONES.length);
    for (const m of ALL_MOMENTS) {
      expect(m.text.length).toBeGreaterThan(0);
      expect(['daily', 'first', 'last']).toContain(m.kind);
    }
  });

  it('milestones are all stage-gated firsts/lasts', () => {
    for (const m of MILESTONES) {
      expect(m.kind === 'first' || m.kind === 'last').toBe(true);
      expect(m.stages).toBeDefined();
      expect(m.stages!.length).toBeGreaterThan(0);
    }
  });

  it('momentById round-trips and rejects junk', () => {
    expect(momentById(MOMENT_IDS[0])!.id).toBe(MOMENT_IDS[0]);
    expect(momentById('nope')).toBeNull();
    expect(isValidMomentId('nope')).toBe(false);
  });
});

// ─── momentOfDay ─────────────────────────────────────────────────────────────────

describe('momentOfDay', () => {
  it('returns nothing before she hatches (egg)', () => {
    expect(momentOfDay(at(2026, 5, 10), 'seed', 'egg', 'happy')).toBeNull();
  });

  it('is deterministic and stable across a single day', () => {
    const a = momentOfDay(at(2026, 5, 10), 'seed', 'adult', 'happy');
    const b = momentOfDay(new Date(2026, 5, 10, 23).getTime(), 'seed', 'adult', 'happy');
    expect(a!.id).toBe(b!.id);
  });

  it('always respects the stage + mood gates', () => {
    for (const stage of STAGES) {
      for (const mood of MOODS) {
        for (let d = 0; d < 60; d++) {
          const m = momentOfDay(at(2026, 0, 1) + d * 86_400_000, 's', stage, mood);
          expect(m).not.toBeNull();
          if (m!.stages) expect(m!.stages).toContain(stage);
          if (m!.moods) expect(m!.moods).toContain(mood);
        }
      }
    }
  });

  it('surfaces variety over a stretch of days', () => {
    const seen = new Set<string>();
    for (let d = 0; d < 120; d++) {
      seen.add(momentOfDay(at(2026, 0, 1) + d * 86_400_000, 'varied', 'adult', 'happy')!.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});

// ─── milestones ──────────────────────────────────────────────────────────────────

describe('milestoneForStage', () => {
  it('is null on stages with no milestone but present on growth stages', () => {
    expect(milestoneForStage('baby', 's')).toBeNull(); // no milestone gated to baby
    expect(milestoneForStage('child', 's')).not.toBeNull();
    expect(milestoneForStage('elder', 's')).not.toBeNull();
  });

  it('is deterministic per (stage, seed)', () => {
    expect(milestoneForStage('elder', 'abc')!.id).toBe(milestoneForStage('elder', 'abc')!.id);
  });

  it('only returns milestones whose gate includes the stage', () => {
    for (const stage of STAGES) {
      const m = milestoneForStage(stage, 'x');
      if (m) expect(m.stages).toContain(stage);
    }
  });
});

// ─── catch-and-keep codex ────────────────────────────────────────────────────────

describe('momentCodex', () => {
  beforeEach(async () => {
    _resetMomentCodexCache();
    await AsyncStorage.clear();
  });

  it('records a newly caught moment once and persists it', async () => {
    expect(await recordCaughtMoment(MOMENT_IDS[0])).toBe(true);
    expect(await recordCaughtMoment(MOMENT_IDS[0])).toBe(false); // already caught
    const caught = await loadCaughtMoments();
    expect(caught.has(MOMENT_IDS[0])).toBe(true);
  });

  it('ignores invalid ids', async () => {
    expect(await recordCaughtMoment('not_real')).toBe(false);
    expect((await loadCaughtMoments()).size).toBe(0);
  });
});
