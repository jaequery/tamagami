import {
  seasonOf,
  seasonLabel,
  seasonFlavor,
  weatherOf,
  weatherLabel,
  weatherReaction,
  isFirstSnow,
  type Season,
  type Weather,
} from './season';

// Local-time constructor (timezone-stable, like world.test / events.test).
const at = (y: number, m: number, d: number, h = 12): number => new Date(y, m, d, h).getTime();

const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];
const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'snow', 'wind'];

describe('seasonOf', () => {
  it('maps months to northern-hemisphere seasons', () => {
    expect(seasonOf(at(2026, 0, 15))).toBe('winter');  // Jan
    expect(seasonOf(at(2026, 1, 15))).toBe('winter');  // Feb
    expect(seasonOf(at(2026, 3, 15))).toBe('spring');  // Apr
    expect(seasonOf(at(2026, 6, 15))).toBe('summer');  // Jul
    expect(seasonOf(at(2026, 9, 15))).toBe('autumn');  // Oct
    expect(seasonOf(at(2026, 11, 15))).toBe('winter'); // Dec
  });

  it('labels and flavors every season', () => {
    for (const s of SEASONS) {
      expect(seasonLabel(s)).toMatch(/^[A-Z]+$/);
      expect(seasonFlavor(s).length).toBeGreaterThan(0);
    }
  });
});

describe('weatherOf', () => {
  it('is deterministic and stable across a single local day', () => {
    const morning = at(2026, 2, 10, 7);
    const evening = at(2026, 2, 10, 22);
    expect(weatherOf(morning)).toBe(weatherOf(evening));
  });

  it('only ever snows in cold seasons (never summer/spring)', () => {
    // Scan a whole year; assert that any day whose actual season is summer/spring
    // is snow-free (the window must key off seasonOf, not a fixed date range).
    for (let d = 0; d < 365; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      const s = seasonOf(now);
      if (s === 'summer' || s === 'spring') {
        expect(weatherOf(now)).not.toBe('snow');
      }
    }
  });

  it('produces snow somewhere in deep winter', () => {
    let sawSnow = false;
    for (let d = 0; d < 60 && !sawSnow; d++) {
      if (weatherOf(at(2026, 0, 1) + d * 86_400_000) === 'snow') sawSnow = true;
    }
    expect(sawSnow).toBe(true);
  });

  it('always returns a valid weather + label + reaction', () => {
    for (let d = 0; d < 120; d++) {
      const w = weatherOf(at(2026, 0, 1) + d * 86_400_000);
      expect(WEATHERS).toContain(w);
      expect(weatherLabel(w)).toMatch(/^[A-Z]+$/);
      expect(weatherReaction(w).length).toBeGreaterThan(0);
    }
  });
});

describe('isFirstSnow', () => {
  it('is true only on a snow day that follows a non-snow day', () => {
    // Find a first-snow day in winter and assert the day before it wasn't snow.
    let found = false;
    for (let d = 0; d < 120 && !found; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      if (isFirstSnow(now)) {
        found = true;
        expect(weatherOf(now)).toBe('snow');
        expect(weatherOf(now - 86_400_000)).not.toBe('snow');
      }
    }
    expect(found).toBe(true);
  });

  it('is never true on a non-snow day', () => {
    for (let d = 0; d < 365; d++) {
      const now = at(2026, 0, 1) + d * 86_400_000;
      if (weatherOf(now) !== 'snow') expect(isFirstSnow(now)).toBe(false);
    }
  });
});
