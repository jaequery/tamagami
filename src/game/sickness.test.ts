import {
  AILMENTS,
  AILMENT_IDS,
  ailmentById,
  ailmentOn,
  activeAilment,
  treatedDayFor,
} from './sickness';
import { dayIndex } from './events';
import { NATURAL_LIFESPAN_SECONDS } from './lifespan';

const at = (y: number, mo: number, d: number): number => new Date(y, mo, d, 12).getTime();
const YOUNG = 2 * 86_400;
const OLD = NATURAL_LIFESPAN_SECONDS - 86_400;

describe('ailment table', () => {
  it('is well-formed', () => {
    for (const id of AILMENT_IDS) {
      const a = AILMENTS[id];
      expect(a.id).toBe(id);
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.text.length).toBeGreaterThan(0);
      expect(a.care.length).toBeGreaterThan(0);
    }
    expect(ailmentById('cold')).toBe(AILMENTS.cold);
    expect(ailmentById('nope')).toBeNull();
  });
});

describe('ailmentOn', () => {
  it('is deterministic + stable across a single day', () => {
    const a = ailmentOn(at(2026, 3, 10), 'seed', YOUNG);
    const b = ailmentOn(new Date(2026, 3, 10, 22).getTime(), 'seed', YOUNG);
    expect(a?.id).toBe(b?.id);
  });

  it('is rare for a young cat — a small minority of days', () => {
    let sick = 0;
    const N = 300;
    for (let d = 0; d < N; d++) {
      if (ailmentOn(at(2026, 0, 1) + d * 86_400_000, 'seedY', YOUNG)) sick++;
    }
    expect(sick / N).toBeLessThan(0.15);
  });

  it('is more common in old age than youth', () => {
    let young = 0;
    let old = 0;
    const N = 400;
    for (let d = 0; d < N; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      if (ailmentOn(now, 'seedZ', YOUNG)) young++;
      if (ailmentOn(now, 'seedZ', OLD)) old++;
    }
    expect(old).toBeGreaterThan(young);
  });

  it('never gives a young cat the old-age ache', () => {
    for (let d = 0; d < 300; d++) {
      const a = ailmentOn(at(2026, 0, 1) + d * 86_400_000, 's', YOUNG);
      if (a) expect(a.id).not.toBe('ache');
    }
  });
});

describe('activeAilment (treating clears the worry until tomorrow)', () => {
  it('returns nothing on a day you already treated', () => {
    // Find a sick day, then assert treating it clears the active worry.
    let sickNow = -1;
    for (let d = 0; d < 200 && sickNow < 0; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      if (ailmentOn(now, 'sickseed', OLD)) sickNow = now;
    }
    expect(sickNow).toBeGreaterThan(0);
    expect(activeAilment(sickNow, 'sickseed', OLD, null)).not.toBeNull();
    const treatedToday = treatedDayFor(sickNow);
    expect(activeAilment(sickNow, 'sickseed', OLD, treatedToday)).toBeNull();
    // …but tomorrow the worry can return.
    expect(treatedDayFor(sickNow)).toBe(dayIndex(sickNow));
  });

  it('a stale treatment (yesterday) does not clear today', () => {
    let sickNow = -1;
    for (let d = 0; d < 200 && sickNow < 0; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      if (ailmentOn(now, 'sickseed2', OLD)) sickNow = now;
    }
    const yesterday = treatedDayFor(sickNow) - 1;
    expect(activeAilment(sickNow, 'sickseed2', OLD, yesterday)).not.toBeNull();
  });
});
