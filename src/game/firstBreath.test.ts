import {
  wakeReaction,
  withName,
  namedConfirmation,
  clockPromiseLines,
  meetingLines,
  ownerNamesYouLines,
  EYES_OPEN_LINES,
  NAMING_PROMPT_LINES,
  OWNER_NAME_PROMPT_LINES,
  FIRST_FEED_BID,
  HOME_LINE,
} from './firstBreath';

const at = (h: number): number => new Date(2026, 5, 10, h).getTime();

describe('wakeReaction (the clock waking up)', () => {
  it('wakes in the morning, settles at dusk, sleeps at night', () => {
    expect(wakeReaction(at(7), 'Maple').pose).toBe('wake');   // dawn
    expect(wakeReaction(at(13), 'Maple').pose).toBe('wake');  // day
    expect(wakeReaction(at(19), 'Maple').pose).toBe('settle'); // dusk
    expect(wakeReaction(at(2), 'Maple').pose).toBe('sleep');  // night
  });

  it('weaves the pet name into the reaction line', () => {
    const r = wakeReaction(at(7), 'Biscuit');
    expect(r.line).toContain('Biscuit');
    expect(r.line).not.toContain('{name}');
  });
});

describe('ceremony copy', () => {
  it('withName replaces every slot', () => {
    expect(withName('hi {name}, {name}!', 'Sol')).toBe('hi Sol, Sol!');
  });

  it('confirmation and promise both name her', () => {
    expect(namedConfirmation('Sol')[0]).toBe('Sol.');
    expect(clockPromiseLines('Sol')[0]).toContain('Sol');
    expect(clockPromiseLines('Sol').join(' ')).toMatch(/lives on your time/);
  });

  it('ships the fixed beats non-empty', () => {
    expect(EYES_OPEN_LINES.length).toBe(2);
    expect(NAMING_PROMPT_LINES.length).toBe(2);
    expect(FIRST_FEED_BID.length).toBeGreaterThan(0);
    expect(HOME_LINE.length).toBeGreaterThan(0);
  });
});

describe('the cold-open meeting (§2 — YOU, bond-only)', () => {
  it('asks the player their name before the birth', () => {
    expect(OWNER_NAME_PROMPT_LINES.length).toBe(2);
  });

  it('the meeting names YOU and nobody else (no household/family copy)', () => {
    const lines = meetingLines('Dave');
    expect(lines.join(' ')).toContain('Dave');
  });

  it('the naming ceremony hands the name to YOU', () => {
    const lines = ownerNamesYouLines('Dave');
    expect(lines.join(' ')).toContain('Dave');
    expect(lines.join(' ').toLowerCase()).toContain('name you');
  });
});
