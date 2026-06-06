// ─── The life-summary — her whole story, in your hand (GAME.md §9 / §10) ───────
//
// Death mints the artifact the whole game was quietly writing. Not stats — the
// STORY: where she came from (§1 origin), who she got (§2 household), who she
// became (§6 rarity/age), what she witnessed (§7 wonders), what she was there for
// (§5 owner), and the bond, named (§8). The one shareable object with both a
// punchline and a tear.
//
// Pure: assembled from records already accrued on the pet. No I/O, no roll.

import type { PetState } from './types';
import { displayedAgeYears } from './lifespan';
import { isOriginId, originById } from './origins';
import { householdFromId } from './household';
import { bondSentence } from './bond';
import { eventById } from './events';
import { formName } from './evolution';

export interface LifeSummary {
  name: string;
  headline: string;     // "She lived 16 years."
  lines: string[];      // the story, in order
  closing: string;      // the bond, named — the line you carry
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
function numberWord(n: number): string {
  return n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Pluralize an event's display name by count (eclipse → "two eclipses"). */
function pluralizeEvent(name: string, count: number): string {
  const lower = name.toLowerCase();
  const plural = count === 1 ? lower : `${lower}s`;
  return `${numberWord(count)} ${plural}`;
}

// "She saw two eclipses and one meteor shower." — from her witnessed aura.
function witnessedLine(events: string[]): string | null {
  const counts = new Map<string, number>();
  for (const id of events) {
    const ev = eventById(id);
    if (ev) counts.set(ev.name, (counts.get(ev.name) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const parts = [...counts.entries()].map(([name, n]) => pluralizeEvent(name, n));
  const joined = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `She saw ${joined}.`;
}

const CAUSE_OPENER: Partial<Record<NonNullable<PetState['causeOfDeath']>, string>> = {
  oldAge: 'A long, full life.',
  illness: 'She fought it as long as she could.',
};

/**
 * Assemble the life-summary card for a (usually dead) pet. Generic pronoun "she"
 * matches the cat-first copy; everything else is drawn from her own records.
 */
export function buildLifeSummary(pet: PetState): LifeSummary {
  const years = Math.max(1, Math.round(displayedAgeYears(pet.ageSeconds)));
  const lines: string[] = [];

  const opener = pet.causeOfDeath ? CAUSE_OPENER[pet.causeOfDeath] : undefined;
  if (opener) lines.push(opener);

  // §1 — where she came from.
  if (isOriginId(pet.origin)) {
    lines.push(`${capitalize(originById(pet.origin).summary)}.`);
  }

  // §2 / §5 — who she got, and that she was there for them. Bond-only: it's YOU
  // (legacy saves with no ownerName fall back to the procedural household.person).
  const owner = pet.ownerName.trim() || householdFromId(pet.household)?.person || '';
  if (owner) {
    lines.push(`She found her way to ${owner}.`);
    lines.push(`She was there for ${owner} — the hard days and the bright ones.`);
  }

  // §6 — who she became.
  lines.push(`She grew into ${formName(pet.petType, pet.rarity).toLowerCase()}.`);

  // §7 — what she witnessed.
  const witnessed = witnessedLine(pet.events);
  if (witnessed) lines.push(witnessed);

  // §8 — the bond, named (the line you carry).
  const closing = bondSentence(pet.bond ?? 0);

  return {
    name: pet.name,
    headline: `She lived ${years} ${years === 1 ? 'year' : 'years'}.`,
    lines,
    closing,
  };
}

/** A single-paragraph rendering for the share caption (§10 life-summary card). */
export function lifeSummaryCaption(pet: PetState): string {
  const s = buildLifeSummary(pet);
  return [s.headline, ...s.lines, s.closing].join(' ');
}
