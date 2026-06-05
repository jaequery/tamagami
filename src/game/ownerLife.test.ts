import {
  OWNER_STAGES,
  OWNER_EVENTS,
  ownerEventById,
  isValidOwnerEventId,
  startOwnerStage,
  ownerEventAt,
  applyOwnerEvent,
  driftOwnerMood,
  ownerMoodBand,
  OWNER_MOOD_NEUTRAL,
  OWNER_MOOD_SEED,
  type OwnerTone,
} from './ownerLife';
import { LIFE_SITUATIONS } from './household';

const at = (y: number, mo: number, d: number): number => new Date(y, mo, d, 19).getTime();

// ─── table integrity ────────────────────────────────────────────────────────────

describe('owner event table', () => {
  it('is well-formed: tones, responses, stages, copy', () => {
    const tones: OwnerTone[] = ['quiet', 'hard', 'bright', 'turning'];
    for (const e of OWNER_EVENTS) {
      expect(tones).toContain(e.tone);
      expect(e.text.length).toBeGreaterThan(0);
      expect(e.stages.length).toBeGreaterThan(0);
      for (const s of e.stages) expect(OWNER_STAGES).toContain(s);
      // comfort/celebrate beats carry the cat's act; quiet ones don't need to.
      if (e.response !== 'none') expect(e.responseText.length).toBeGreaterThan(0);
      // hard days lower mood, bright/turning raise it; quiet is ~flat.
      if (e.tone === 'hard') expect(e.moodDelta).toBeLessThan(0);
      if (e.tone === 'bright') expect(e.moodDelta).toBeGreaterThan(0);
    }
  });

  it('has at least one quiet beat reachable from every stage (fallback safety)', () => {
    for (const s of OWNER_STAGES) {
      expect(OWNER_EVENTS.some((e) => e.tone === 'quiet' && e.stages.includes(s))).toBe(true);
    }
  });

  it('ownerEventById round-trips and rejects junk', () => {
    expect(ownerEventById(OWNER_EVENTS[0].id)).toBe(OWNER_EVENTS[0]);
    expect(ownerEventById('nope')).toBeNull();
    expect(isValidOwnerEventId('nope')).toBe(false);
  });
});

// ─── starting stage ──────────────────────────────────────────────────────────────

describe('startOwnerStage', () => {
  it('maps every household situation to a valid owner stage', () => {
    for (const sit of LIFE_SITUATIONS) {
      expect(OWNER_STAGES).toContain(startOwnerStage(sit));
    }
  });

  it('puts the lonely elder at elder and the new couple young', () => {
    expect(startOwnerStage('lonely_elder')).toBe('elder');
    expect(startOwnerStage('new_couple')).toBe('young_adult');
  });
});

// ─── the daily deal ──────────────────────────────────────────────────────────────

describe('ownerEventAt', () => {
  it('is deterministic and stable across a single local day', () => {
    const a = ownerEventAt(at(2026, 5, 10), 'seedA', 'adult');
    const b = ownerEventAt(new Date(2026, 5, 10, 8).getTime(), 'seedA', 'adult');
    expect(a.id).toBe(b.id);
  });

  it('always returns a stage-appropriate event', () => {
    for (const stage of OWNER_STAGES) {
      for (let d = 0; d < 120; d++) {
        const ev = ownerEventAt(at(2026, 0, 1) + d * 86_400_000, 'seed', stage);
        expect(ev.stages).toContain(stage);
      }
    }
  });

  it('keeps quiet days the majority and turns a meaningful minority', () => {
    let quiet = 0;
    const N = 400;
    for (let d = 0; d < N; d++) {
      if (ownerEventAt(at(2026, 0, 1) + d * 86_400_000, 'seedX', 'adult').tone === 'quiet') quiet++;
    }
    const quietFrac = quiet / N;
    // Most days ordinary, but turns happen often enough to keep you checking.
    expect(quietFrac).toBeGreaterThan(0.6);
    expect(quietFrac).toBeLessThan(0.9);
  });

  it('different owners get different streams', () => {
    const a: string[] = [];
    const b: string[] = [];
    for (let d = 0; d < 60; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      a.push(ownerEventAt(now, 'ownerA', 'adult').id);
      b.push(ownerEventAt(now, 'ownerB', 'adult').id);
    }
    expect(a).not.toEqual(b);
  });
});

// ─── mood ────────────────────────────────────────────────────────────────────────

describe('owner mood', () => {
  const hard = OWNER_EVENTS.find((e) => e.tone === 'hard')!;
  const bright = OWNER_EVENTS.find((e) => e.tone === 'bright')!;

  it('the cat comforting a hard day softens the blow', () => {
    const withCat = applyOwnerEvent(50, hard, true);
    const withoutCat = applyOwnerEvent(50, hard, false);
    expect(withCat).toBeGreaterThan(withoutCat);
  });

  it('the cat celebrating a bright day makes the joy bigger', () => {
    const withCat = applyOwnerEvent(50, bright, true);
    const withoutCat = applyOwnerEvent(50, bright, false);
    expect(withCat).toBeGreaterThan(withoutCat);
  });

  it('mood is clamped to [0,100]', () => {
    expect(applyOwnerEvent(2, hard, false)).toBeGreaterThanOrEqual(0);
    expect(applyOwnerEvent(99, bright, true)).toBeLessThanOrEqual(100);
  });

  it('drifts toward neutral over time, from both directions', () => {
    expect(driftOwnerMood(90, 24 * 3600)).toBeLessThan(90);
    expect(driftOwnerMood(90, 24 * 3600)).toBeGreaterThanOrEqual(OWNER_MOOD_NEUTRAL);
    expect(driftOwnerMood(10, 24 * 3600)).toBeGreaterThan(10);
    expect(driftOwnerMood(10, 24 * 3600)).toBeLessThanOrEqual(OWNER_MOOD_NEUTRAL);
    expect(driftOwnerMood(OWNER_MOOD_NEUTRAL, 99999)).toBe(OWNER_MOOD_NEUTRAL);
  });

  it('bands the mood and starts a notch above neutral', () => {
    expect(OWNER_MOOD_SEED).toBeGreaterThan(OWNER_MOOD_NEUTRAL);
    expect(ownerMoodBand(20)).toBe('low');
    expect(ownerMoodBand(50)).toBe('okay');
    expect(ownerMoodBand(80)).toBe('good');
  });
});
