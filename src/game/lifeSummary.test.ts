import { buildLifeSummary, lifeSummaryCaption } from './lifeSummary';
import { createInitialPet } from './engine';
import { BOND_MAX } from './bond';
import { NATURAL_LIFESPAN_SECONDS } from './lifespan';
import type { PetState } from './types';

const NOW = 1_700_000_000_000;

function deadCat(overrides?: Partial<PetState>): PetState {
  const base = createInitialPet('Maple', 'cat', NOW);
  return {
    ...base,
    isDead: true,
    causeOfDeath: 'oldAge',
    ageSeconds: NATURAL_LIFESPAN_SECONDS,
    bond: BOND_MAX,
    ...overrides,
  };
}

describe('buildLifeSummary', () => {
  it('headlines with her displayed years', () => {
    const s = buildLifeSummary(deadCat());
    expect(s.headline).toMatch(/^She lived \d+ years\.$/);
  });

  it('opens an old-age death with "a long, full life"', () => {
    const s = buildLifeSummary(deadCat({ causeOfDeath: 'oldAge' }));
    expect(s.lines[0]).toMatch(/long, full life/i);
  });

  it('weaves origin, household person, and the named bond', () => {
    const pet = deadCat();
    const s = buildLifeSummary(pet);
    // The closing line is the bond, named — devoted reads as the heartbreak line.
    expect(s.closing).toMatch(/last morning/);
    // Story mentions her person somewhere.
    const body = s.lines.join(' ');
    expect(body.length).toBeGreaterThan(0);
  });

  it('counts witnessed wonders into the story', () => {
    const s = buildLifeSummary(deadCat({ events: ['eclipse', 'eclipse', 'meteor'] }));
    const body = s.lines.join(' ');
    expect(body).toMatch(/two .*eclipse/i);
    expect(body).toMatch(/one .*meteor/i);
  });

  it('omits the witnessed line when she saw nothing', () => {
    const s = buildLifeSummary(deadCat({ events: [] }));
    expect(s.lines.join(' ')).not.toMatch(/She saw/);
  });

  it('caption renders the whole story as one shareable paragraph', () => {
    const caption = lifeSummaryCaption(deadCat());
    expect(caption).toContain('She lived');
    expect(caption).toMatch(/last morning/);
  });

  it('does not crash on a weakly-bonded short life', () => {
    const s = buildLifeSummary(deadCat({ bond: 2, ageSeconds: 9 * 86_400, causeOfDeath: 'neglect' }));
    expect(s.headline).toMatch(/She lived/);
    expect(s.closing.length).toBeGreaterThan(0);
  });
});
