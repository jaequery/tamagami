import {
  BOND_SEED,
  BOND_MAX,
  BOND_MIN,
  BOND_LEVELS,
  bondLevel,
  deepenBond,
  reunionTier,
  reunionLine,
  dimBondForAbsence,
  bondSentence,
  bondBehaviors,
  type BondLevel,
  type ReunionTier,
} from './bond';

describe('bondLevel', () => {
  it('starts wary at the seed and climbs through the tiers', () => {
    expect(bondLevel(BOND_SEED)).toBe('wary');
    expect(bondLevel(0)).toBe('wary');
    expect(bondLevel(25)).toBe('warming');
    expect(bondLevel(55)).toBe('bonded');
    expect(bondLevel(85)).toBe('devoted');
    expect(bondLevel(BOND_MAX)).toBe('devoted');
  });

  it('is monotonic across the whole range', () => {
    let lastIdx = 0;
    for (let v = 0; v <= 100; v++) {
      const idx = BOND_LEVELS.indexOf(bondLevel(v));
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });
});

describe('deepenBond', () => {
  it('grows with care and clamps at the max', () => {
    expect(deepenBond(10)).toBeGreaterThan(10);
    expect(deepenBond(BOND_MAX)).toBe(BOND_MAX);
    expect(deepenBond(BOND_MAX, 50)).toBe(BOND_MAX);
  });
});

describe('reunionTier / reunionLine', () => {
  const H = 3600;
  it('escalates by hours away', () => {
    expect(reunionTier(0)).toBe('present');
    expect(reunionTier(1 * H)).toBe('present');
    expect(reunionTier(5 * H)).toBe('missed-you');
    expect(reunionTier(24 * H)).toBe('where-were-you');
    expect(reunionTier(72 * H)).toBe('you-came-back');
  });

  it('has copy for every non-present tier (present is silent)', () => {
    const tiers: ReunionTier[] = ['present', 'missed-you', 'where-were-you', 'you-came-back'];
    for (const t of tiers) {
      if (t === 'present') expect(reunionLine(t)).toBe('');
      else expect(reunionLine(t).length).toBeGreaterThan(0);
    }
  });
});

describe('dimBondForAbsence (forgiving — dims, never breaks)', () => {
  const H = 3600;
  it('does not dim for short absences', () => {
    expect(dimBondForAbsence(50, 1 * H)).toBe(50);
    expect(dimBondForAbsence(50, 5 * H)).toBe(50);
  });

  it('dims a little for long absences, never below zero', () => {
    expect(dimBondForAbsence(50, 24 * H)).toBeLessThan(50);
    expect(dimBondForAbsence(50, 72 * H)).toBeLessThan(50);
    expect(dimBondForAbsence(2, 72 * H)).toBeGreaterThanOrEqual(BOND_MIN);
  });

  it('a long absence + a reunion never drops the bond by more than a nudge', () => {
    // The dim is small (≤6) so showing up always restores the relationship.
    expect(dimBondForAbsence(50, 72 * H)).toBeGreaterThanOrEqual(50 - 6);
  });
});

describe('bondSentence / bondBehaviors', () => {
  it('names the bond once, per level, for the life-summary', () => {
    expect(bondSentence(BOND_MAX)).toMatch(/last morning/);
    const levels: BondLevel[] = ['wary', 'warming', 'bonded', 'devoted'];
    const vals = [0, 30, 60, 90];
    for (let i = 0; i < levels.length; i++) {
      expect(bondSentence(vals[i]).length).toBeGreaterThan(0);
    }
  });

  it('surfaces emergent behaviors for every tier', () => {
    for (const v of [0, 30, 60, 90]) {
      expect(bondBehaviors(v).length).toBeGreaterThan(0);
    }
  });
});
