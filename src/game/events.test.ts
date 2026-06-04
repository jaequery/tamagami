import { phaseOfDay, isNight, hourOf } from './world';
import {
  EVENT_CATALOG,
  TOTAL_EVENTS,
  EVENT_IDS,
  eventById,
  isValidEventId,
  isEclipseDay,
  dayIndex,
  activeEventAt,
} from './events';
import { createInitialPet, witnessEvent, simulate } from './engine';

// Build a local-time instant for a given day offset + hour. Both construction and
// reading use local time, so these assertions are timezone-stable.
function at(hour: number, dayOffset = 0): number {
  return new Date(2026, 0, 1 + dayOffset, hour, 0, 0, 0).getTime();
}

const NOW = at(10); // a calm mid-morning, no event

// ─── world: day / night ─────────────────────────────────────────────────────

describe('phaseOfDay', () => {
  it('maps hours to the right phase', () => {
    expect(phaseOfDay(at(6))).toBe('dawn');
    expect(phaseOfDay(at(12))).toBe('day');
    expect(phaseOfDay(at(19))).toBe('dusk');
    expect(phaseOfDay(at(23))).toBe('night');
    expect(phaseOfDay(at(2))).toBe('night');
  });

  it('isNight covers the dark hours only', () => {
    expect(isNight(at(22))).toBe(true);
    expect(isNight(at(3))).toBe(true);
    expect(isNight(at(12))).toBe(false);
    expect(hourOf(at(15))).toBe(15);
  });
});

// ─── events: active window resolution ────────────────────────────────────────

function findEclipseDay(): number {
  for (let d = 0; d < 60; d++) {
    if (isEclipseDay(at(12, d))) return d;
  }
  throw new Error('no eclipse day found in 60 days — calendar is broken');
}

function findNonEclipseDay(): number {
  for (let d = 0; d < 60; d++) {
    if (!isEclipseDay(at(12, d))) return d;
  }
  throw new Error('every day is an eclipse — calendar is broken');
}

describe('activeEventAt', () => {
  it('shows the 3am visitor at hour 3', () => {
    expect(activeEventAt(at(3, findNonEclipseDay()))?.id).toBe('visitor');
  });

  it('shows a meteor shower in the late/early night', () => {
    expect(activeEventAt(at(22))?.id).toBe('meteor');
    expect(activeEventAt(at(2))?.id).toBe('meteor');
  });

  it('shows nothing in plain daylight', () => {
    expect(activeEventAt(at(14, findNonEclipseDay()))).toBeNull();
  });

  it('shows the eclipse only at noon on an eclipse day', () => {
    const ed = findEclipseDay();
    expect(activeEventAt(at(12, ed))?.id).toBe('eclipse');
    // …and a non-eclipse day at noon is empty
    expect(activeEventAt(at(12, findNonEclipseDay()))).toBeNull();
  });

  it('eclipse outranks the visitor (they never overlap, but priority holds)', () => {
    // The eclipse window is noon; the visitor is 3am — pick noon on an eclipse day.
    expect(activeEventAt(at(12, findEclipseDay()))?.id).toBe('eclipse');
  });
});

describe('isEclipseDay / dayIndex', () => {
  it('is deterministic and recurs roughly every 6 days', () => {
    const base = findEclipseDay();
    expect(isEclipseDay(at(12, base))).toBe(true);
    expect(isEclipseDay(at(12, base + 6))).toBe(true);
    expect(isEclipseDay(at(12, base + 1))).toBe(false);
  });

  it('dayIndex advances by one per calendar day', () => {
    expect(dayIndex(at(23, 5)) - dayIndex(at(1, 5))).toBe(0);
    expect(dayIndex(at(1, 6)) - dayIndex(at(1, 5))).toBe(1);
  });
});

// ─── catalog ──────────────────────────────────────────────────────────────────

describe('event catalog', () => {
  it('has three well-formed events', () => {
    expect(TOTAL_EVENTS).toBe(3);
    expect(EVENT_CATALOG).toHaveLength(3);
    for (const e of EVENT_CATALOG) {
      expect(e.short.length).toBeLessThanOrEqual(7);
      expect(eventById(e.id)).toBe(e);
      expect(isValidEventId(e.id)).toBe(true);
    }
    expect(EVENT_IDS).toEqual(EVENT_CATALOG.map((e) => e.id));
  });

  it('rejects unknown ids', () => {
    expect(eventById('nope')).toBeNull();
    expect(isValidEventId('nope')).toBe(false);
  });
});

// ─── engine.witnessEvent ───────────────────────────────────────────────────────

describe('witnessEvent', () => {
  it('stamps the event onto the pet', () => {
    const pet = createInitialPet('Star', 'cat', NOW);
    const after = witnessEvent(pet, 'meteor', NOW);
    expect(after.events).toContain('meteor');
  });

  it('is idempotent — a pet carries each event at most once', () => {
    let pet = createInitialPet('Star', 'cat', NOW);
    pet = witnessEvent(pet, 'meteor', NOW);
    pet = witnessEvent(pet, 'meteor', NOW + 1000);
    expect(pet.events.filter((e) => e === 'meteor')).toHaveLength(1);
  });

  it('a dead pet cannot witness anything', () => {
    const dead = { ...createInitialPet('Star', 'cat', NOW), isDead: true };
    const after = witnessEvent(dead, 'meteor', NOW);
    expect(after.events).not.toContain('meteor');
  });

  it('advances the clock like other reducers', () => {
    const pet = createInitialPet('Star', 'cat', NOW);
    const after = witnessEvent(pet, 'meteor', NOW + 60_000);
    expect(after.lastTick).toBe(simulate(pet, NOW + 60_000).lastTick);
  });
});
