// ─── Economy ──────────────────────────────────────────────────────────────────
// Currency + marketplace + jobs + education for the animal (cat/dog) care loop.
//
//   feed  → buy food (costs coins)
//   coins → work a job (paid per hour, clock in / clock out)
//   job   → gated by education (you pay tuition + wait to graduate)
//
// Everything here is a PURE function over PetEconomy (no I/O, no stats). The
// engine owns anything that also touches care stats (buying food restores
// hunger; working tires the pet). UI reads the data tables + selector helpers.

import type { PetEconomy } from './types';
import {
  STARTING_COINS,
  WORK_SECONDS_PER_HOUR,
  WORK_SHIFT_MAX_SECONDS,
} from './constants';

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface FoodDef {
  id:        string;
  title:     string;
  glyph:     string;  // single pixel-font char shown on the shop row
  price:     number;  // coins
  hunger:    number;  // +hunger restored
  happiness: number;  // +happiness (a good meal cheers you up a little)
}

export interface JobDef {
  id:                string;
  title:             string;
  blurb:             string;
  wagePerHour:       number;  // coins earned per in-game hour worked
  joyPerHour:        number;  // happiness change per hour (negative = tiring)
  requiredEducation: number;  // completed education levels needed to qualify
}

export interface EducationDef {
  level:       number;  // the completed-level this program grants (1-based)
  title:       string;
  blurb:       string;
  tuition:     number;  // coins paid up-front to enroll
  durationSec: number;  // real seconds of study before you graduate
}

// ─── Tables ───────────────────────────────────────────────────────────────────
// Tuned so a fresh pet (STARTING_COINS) can FORAGE immediately, afford SCHOOL
// after a short shift, and climb from there.

export const FOODS: readonly FoodDef[] = [
  { id: 'kibble', title: 'KIBBLE', glyph: '.', price: 6,  hunger: 25, happiness: 2 },
  { id: 'meal',   title: 'MEAL',   glyph: '*', price: 14, hunger: 50, happiness: 6 },
  { id: 'feast',  title: 'FEAST',  glyph: '#', price: 30, hunger: 90, happiness: 15 },
];

export const JOBS: readonly JobDef[] = [
  { id: 'forager', title: 'FORAGER', blurb: 'No résumé needed. Scrounge for scraps.', wagePerHour: 10,  joyPerHour: -5,  requiredEducation: 0 },
  { id: 'barista', title: 'BARISTA', blurb: 'Low pay, but the regulars are sweet.',   wagePerHour: 22,  joyPerHour: -3,  requiredEducation: 1 },
  { id: 'courier', title: 'COURIER', blurb: 'Fast feet, faster pay. Tiring.',          wagePerHour: 28,  joyPerHour: -9,  requiredEducation: 1 },
  { id: 'coder',   title: 'CODER',   blurb: 'Great money, a real grind.',              wagePerHour: 60,  joyPerHour: -13, requiredEducation: 2 },
  { id: 'mayor',   title: 'MAYOR',   blurb: 'Top wage. The pressure is immense.',      wagePerHour: 130, joyPerHour: -18, requiredEducation: 3 },
];

export const EDUCATION: readonly EducationDef[] = [
  { level: 1, title: 'SCHOOL',  blurb: 'The basics. Unlocks entry work.', tuition: 40,  durationSec: 60 },
  { level: 2, title: 'COLLEGE', blurb: 'Opens skilled, better-paid work.', tuition: 130, durationSec: 150 },
  { level: 3, title: 'MASTERS', blurb: 'The top tier. The best jobs.',     tuition: 350, durationSec: 300 },
];

export const MAX_EDUCATION = EDUCATION.length;

// ─── Factory ──────────────────────────────────────────────────────────────────

export function defaultEconomy(): PetEconomy {
  return {
    coins:       STARTING_COINS,
    education:   0,
    jobId:       null,
    clockedInAt: null,
    shiftSeconds: 0,
    studyId:     null,
    studyEndsAt: null,
  };
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export function foodById(id: string): FoodDef | null {
  return FOODS.find((f) => f.id === id) ?? null;
}

export function jobById(id: string | null): JobDef | null {
  if (id === null) return null;
  return JOBS.find((j) => j.id === id) ?? null;
}

export function currentJob(econ: PetEconomy): JobDef | null {
  return jobById(econ.jobId);
}

/** The next education program to enroll in, or null if fully educated. */
export function nextEducation(econ: PetEconomy): EducationDef | null {
  return EDUCATION[econ.education] ?? null;
}

/** Completed-education title for display (e.g. 0 → 'NONE', 1 → 'SCHOOL'). */
export function educationTitle(level: number): string {
  if (level <= 0) return 'NONE';
  return EDUCATION[level - 1]?.title ?? 'NONE';
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export function qualifiesFor(econ: PetEconomy, job: JobDef): boolean {
  return econ.education >= job.requiredEducation;
}

export function canAfford(econ: PetEconomy, price: number): boolean {
  return econ.coins >= price;
}

export function isWorking(econ: PetEconomy): boolean {
  return econ.clockedInAt !== null;
}

export function isStudying(econ: PetEconomy): boolean {
  return econ.studyId !== null;
}

/** Seconds remaining until the current study program graduates (0 if none). */
export function studyRemainingSec(econ: PetEconomy, now: number): number {
  if (econ.studyEndsAt === null) return 0;
  return Math.max(0, Math.ceil((econ.studyEndsAt - now) / 1000));
}

/** Real seconds elapsed on the current shift, capped at the shift max. */
export function shiftElapsedSec(econ: PetEconomy, now: number): number {
  if (econ.clockedInAt === null) return 0;
  return Math.min(Math.floor((now - econ.clockedInAt) / 1000), WORK_SHIFT_MAX_SECONDS);
}

/** Coins earned so far on the current shift (whole coins, for display). */
export function shiftEarned(econ: PetEconomy): number {
  const job = currentJob(econ);
  if (job === null) return 0;
  return Math.floor((job.wagePerHour * econ.shiftSeconds) / WORK_SECONDS_PER_HOUR);
}

/** True once the current shift has hit the cap and stopped paying. */
export function shiftMaxed(econ: PetEconomy): boolean {
  return econ.shiftSeconds >= WORK_SHIFT_MAX_SECONDS;
}

/** Whole-coin balance for display. */
export function coinsLabel(econ: PetEconomy): number {
  return Math.floor(econ.coins);
}

// ─── Pure transforms (no stats) ───────────────────────────────────────────────
// Each returns the economy unchanged when the action isn't valid, so callers can
// stay declarative and the UI's guards and the model's guards never disagree.

/** Take a job. No-op if the job is unknown or you're under-qualified. Starting a
 *  new job ends any shift in progress (you haven't clocked in to the new one). */
export function withJob(econ: PetEconomy, jobId: string): PetEconomy {
  const job = jobById(jobId);
  if (job === null || !qualifiesFor(econ, job)) return econ;
  return { ...econ, jobId: job.id, clockedInAt: null, shiftSeconds: 0 };
}

/** Quit. Ends employment and any shift. */
export function withoutJob(econ: PetEconomy): PetEconomy {
  if (econ.jobId === null) return econ;
  return { ...econ, jobId: null, clockedInAt: null, shiftSeconds: 0 };
}

/** Clock in to start a shift. No-op if unemployed or already on the clock. */
export function clockIn(econ: PetEconomy, now: number): PetEconomy {
  if (econ.jobId === null || econ.clockedInAt !== null) return econ;
  return { ...econ, clockedInAt: now, shiftSeconds: 0 };
}

/** Clock out. Wages up to `now` are banked by stepEconomy before this is called
 *  (the engine simulates first), so this just ends the shift. */
export function clockOut(econ: PetEconomy): PetEconomy {
  if (econ.clockedInAt === null) return econ;
  return { ...econ, clockedInAt: null, shiftSeconds: 0 };
}

/** Enroll in the next education program. No-op if maxed, already studying, or
 *  you can't cover tuition. Deducts tuition and starts the study timer. */
export function enroll(econ: PetEconomy, now: number): PetEconomy {
  const next = nextEducation(econ);
  if (next === null || isStudying(econ) || !canAfford(econ, next.tuition)) return econ;
  return {
    ...econ,
    coins:       econ.coins - next.tuition,
    studyId:     `edu${next.level}`,
    studyEndsAt: now + next.durationSec * 1000,
  };
}

// ─── Time step (called inside engine.simulate) ────────────────────────────────

export interface EconomyStep {
  economy:        PetEconomy;
  happinessDelta: number;  // work fatigue/joy to fold into happiness (usually < 0)
}

/**
 * Advance the economy to `now`: graduate a finished study program and bank wages
 * for any new shift seconds (up to the shift cap), returning the happiness change
 * working caused so the engine can apply it alongside normal stat decay.
 * Pure and idempotent w.r.t. already-paid shift seconds.
 */
export function stepEconomy(econ: PetEconomy, now: number): EconomyStep {
  let e = econ;
  let happinessDelta = 0;

  // Graduate if the study timer elapsed.
  if (e.studyId !== null && e.studyEndsAt !== null && now >= e.studyEndsAt) {
    e = {
      ...e,
      education:   Math.min(MAX_EDUCATION, e.education + 1),
      studyId:     null,
      studyEndsAt: null,
    };
  }

  // Bank wages for new shift seconds since the last step.
  if (e.clockedInAt !== null) {
    const job = currentJob(e);
    if (job === null) {
      e = { ...e, clockedInAt: null, shiftSeconds: 0 };
    } else {
      const worked = Math.min((now - e.clockedInAt) / 1000, WORK_SHIFT_MAX_SECONDS);
      const delta = Math.max(0, worked - e.shiftSeconds);
      if (delta > 0) {
        const wage = (job.wagePerHour * delta) / WORK_SECONDS_PER_HOUR;
        happinessDelta += (job.joyPerHour * delta) / WORK_SECONDS_PER_HOUR;
        e = { ...e, coins: e.coins + wage, shiftSeconds: worked };
      }
    }
  }

  return { economy: e, happinessDelta };
}
