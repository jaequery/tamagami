import { PLAYS, playById } from './play';
import { ACTIVITIES } from './animations';

describe('play catalog', () => {
  it('has unique ids and sane, on-brand effects', () => {
    const ids = PLAYS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PLAYS) {
      expect(p.happiness).toBeGreaterThan(0);
      expect(p.hunger).toBeGreaterThanOrEqual(0); // hunger is a cost, never negative
      expect(p.bond).toBeGreaterThan(0);
      expect(p.glyph.length).toBeGreaterThan(0);
      expect(p.blurb.length).toBeGreaterThan(0);
      expect(ACTIVITIES[p.activity]).toBeDefined(); // animation key is real
    }
  });

  it('offers both calm play (no hunger cost, big bond) and active play (tiring)', () => {
    const calm = PLAYS.filter((p) => p.hunger === 0);
    const active = PLAYS.filter((p) => p.hunger > 0);
    expect(calm.length).toBeGreaterThan(0);
    expect(active.length).toBeGreaterThan(0);
    // Calm play bonds harder than active play — presence over stimulation (§8).
    const maxCalmBond = Math.max(...calm.map((p) => p.bond));
    const maxActiveBond = Math.max(...active.map((p) => p.bond));
    expect(maxCalmBond).toBeGreaterThan(maxActiveBond);
  });

  it('playById resolves real ids and rejects junk', () => {
    expect(playById('pet')?.id).toBe('pet');
    expect(playById('nope')).toBeNull();
  });
});
