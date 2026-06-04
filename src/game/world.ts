// ─── Living world: day / night ────────────────────────────────────────────────
//
// A thin, deterministic read of the device clock. The pet lives in real time, so
// the time of day it's experiencing is just a function of `now` (epoch ms). Night
// is when the rare events come out (see game/events.ts) — so day/night isn't only
// cosmetic, it's the reason to open the app at odd hours.
//
// Pure: every function takes `now` and reads local wall-clock time from it. Tests
// build `now` with `new Date(Y, M, D, H)` (local), so they're timezone-stable.

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Local hour [0, 23] for the given instant. */
export function hourOf(now: number): number {
  return new Date(now).getHours();
}

export function phaseOfDay(now: number): DayPhase {
  const h = hourOf(now);
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 18) return 'day';
  if (h >= 18 && h < 21) return 'dusk';
  return 'night';
}

/** True for the dark hours when night events can appear (21:00–05:00). */
export function isNight(now: number): boolean {
  const h = hourOf(now);
  return h >= 21 || h < 5;
}

const PHASE_LABEL: Record<DayPhase, string> = {
  dawn: 'DAWN',
  day: 'DAY',
  dusk: 'DUSK',
  night: 'NIGHT',
};

export function phaseLabel(phase: DayPhase): string {
  return PHASE_LABEL[phase];
}
