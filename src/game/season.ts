// ─── Living world: season + ambient weather (GAME.md §7) ───────────────────────
//
// Her world keeps your real calendar. The SEASON is read straight off the device
// date — free, local, and true (a snowbound January, long golden July) — so the
// shop's winter coat means something because it's actually winter for you.
//
// WEATHER, by the local-only constraint, can't come from a network feed (that
// would break offline). So it's a believable deterministic *ambient sim* — "her
// world's weather" — seeded per local day and biased by the real season: snow
// only when it's cold, rain leaning into spring/autumn, long clear spells in
// summer. Same FNV seed primitive as every other roll; no Math.random.
//
// Pure + timezone-stable: tests build `now` with `new Date(Y, M, D, H)` (local),
// exactly like world.ts / events.ts.

import { hashUnit } from './evolution';
import { dayIndex } from './events';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'wind';

// Northern-hemisphere meteorological seasons by month. A known simplification
// (a southern player sees flipped seasons) — flippable later behind one constant;
// real *date* is the win, and it's free and offline.
export function seasonOf(now: number): Season {
  const month = new Date(now).getMonth(); // 0 = Jan … 11 = Dec
  if (month <= 1 || month === 11) return 'winter'; // Dec, Jan, Feb
  if (month <= 4) return 'spring';                  // Mar, Apr, May
  if (month <= 7) return 'summer';                  // Jun, Jul, Aug
  return 'autumn';                                  // Sep, Oct, Nov
}

const SEASON_LABEL: Record<Season, string> = {
  winter: 'WINTER',
  spring: 'SPRING',
  summer: 'SUMMER',
  autumn: 'AUTUMN',
};

export function seasonLabel(season: Season): string {
  return SEASON_LABEL[season];
}

const SEASON_FLAVOR: Record<Season, string> = {
  winter: 'the window is cold, and the light comes late.',
  spring: 'everything outside is trying again.',
  summer: 'long golden light, and dust turning slow in it.',
  autumn: 'the air has an edge now, and the days lean short.',
};

export function seasonFlavor(season: Season): string {
  return SEASON_FLAVOR[season];
}

// ─── Ambient weather ─────────────────────────────────────────────────────────────
// Per-season weight of each weather kind. Snow is winter-only; rain leans spring/
// autumn; summer skews clear. Weights need not sum to anything — we normalize.
const WEATHER_WEIGHTS: Record<Season, Record<Weather, number>> = {
  winter: { clear: 30, cloudy: 28, rain: 8, snow: 26, wind: 8 },
  spring: { clear: 34, cloudy: 24, rain: 30, snow: 0, wind: 12 },
  summer: { clear: 56, cloudy: 20, rain: 12, snow: 0, wind: 12 },
  autumn: { clear: 30, cloudy: 28, rain: 24, snow: 2, wind: 16 },
};

const WEATHER_ORDER: readonly Weather[] = ['clear', 'cloudy', 'rain', 'snow', 'wind'];

/**
 * The ambient weather for the local day containing `now` — stable for the whole
 * day (keyed on the local day index), so the world doesn't flicker hour to hour.
 */
export function weatherOf(now: number): Weather {
  const season = seasonOf(now);
  const weights = WEATHER_WEIGHTS[season];
  const total = WEATHER_ORDER.reduce((sum, w) => sum + weights[w], 0);
  // Day-index leads the seed: FNV-1a mixes trailing bytes weakly, so a day-at-the-
  // end key would give the player runs of identical weather. Leading varies it.
  const target = hashUnit(`${dayIndex(now)}:weather`) * total;
  let acc = 0;
  for (const w of WEATHER_ORDER) {
    acc += weights[w];
    if (target < acc) return w;
  }
  return 'clear'; // float-rounding safety net
}

const WEATHER_LABEL: Record<Weather, string> = {
  clear: 'CLEAR',
  cloudy: 'CLOUDY',
  rain: 'RAIN',
  snow: 'SNOW',
  wind: 'WIND',
};

export function weatherLabel(weather: Weather): string {
  return WEATHER_LABEL[weather];
}

// How she reacts to today's sky (the small catchable behavior, §4/§7).
const WEATHER_REACTION: Record<Weather, string> = {
  clear: 'she\'s stretched out in a square of sun, blinking slow.',
  cloudy: 'she\'s watching the grey go by from the sill.',
  rain: 'she\'s curled tight against the rain, ears twitching at it.',
  snow: 'she\'s pressed to the cold glass, watching the first snow come down.',
  wind: 'she\'s chasing the things the wind keeps moving outside.',
};

export function weatherReaction(weather: Weather): string {
  return WEATHER_REACTION[weather];
}

/**
 * True on the first snow day of the cold season at this instant — a small wonder
 * (§7). Deterministic: today is snowing and the day before was not.
 */
export function isFirstSnow(now: number): boolean {
  if (weatherOf(now) !== 'snow') return false;
  const yesterday = now - 86_400_000;
  return weatherOf(yesterday) !== 'snow';
}
