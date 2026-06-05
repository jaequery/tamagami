import {
  MATERIAL_TIERS,
  LIFE_SITUATIONS,
  rollHousehold,
  householdSeed,
  householdId,
  parseHouseholdId,
  isHouseholdId,
  householdFromId,
  startingCoinsForTier,
  startingCoinsForHousehold,
  contrastLine,
  type MaterialTier,
  type LifeSituation,
} from './household';
import { STARTING_COINS } from './constants';
import { ORIGIN_IDS } from './origins';

// ─── rollHousehold: determinism + validity ──────────────────────────────────────

describe('rollHousehold', () => {
  it('is deterministic for the same birth identity', () => {
    const a = rollHousehold(1_700_000_000_000, 'Pixel', 'cat');
    const b = rollHousehold(1_700_000_000_000, 'Pixel', 'cat');
    expect(a).toBe(b);
  });

  it('always rolls a parseable, reconstructable household', () => {
    for (let i = 0; i < 500; i++) {
      const id = rollHousehold(1_700_000_000_000 + i * 1000, `pet${i}`, 'cat');
      const hh = householdFromId(id);
      expect(hh).not.toBeNull();
      expect(MATERIAL_TIERS).toContain(hh!.tier);
      expect(LIFE_SITUATIONS).toContain(hh!.situation);
      expect(hh!.person.length).toBeGreaterThan(0);
      expect(hh!.homeLine.length).toBeGreaterThan(0);
      expect(hh!.personLine).toContain(hh!.person);
      expect(hh!.summary).toContain(hh!.person);
    }
  });

  it('spreads across tiers and situations over many seeds', () => {
    const tiers = new Set<MaterialTier>();
    const situations = new Set<LifeSituation>();
    for (let i = 0; i < 800; i++) {
      const hh = householdFromId(rollHousehold(1_700_000_000_000 + i * 997, `p${i}`, 'cat'))!;
      tiers.add(hh.tier);
      situations.add(hh.situation);
    }
    expect(tiers.size).toBe(MATERIAL_TIERS.length);
    expect(situations.size).toBe(LIFE_SITUATIONS.length);
  });

  it('namespaces its seed', () => {
    expect(householdSeed(1, 'A', 'cat')).toContain('household:');
  });
});

// ─── id round-trip + tolerance ──────────────────────────────────────────────────

describe('household id', () => {
  it('round-trips through encode → parse', () => {
    const id = householdId('comfortable', 'grieving', 2);
    const parsed = parseHouseholdId(id);
    expect(parsed).toEqual({ tier: 'comfortable', situation: 'grieving', nameIdx: 2 });
  });

  it('rejects malformed ids', () => {
    expect(isHouseholdId('')).toBe(false);
    expect(isHouseholdId('comfortable:grieving')).toBe(false); // too few parts
    expect(isHouseholdId('rich:grieving:0')).toBe(false);      // bad tier
    expect(isHouseholdId('comfortable:sad:0')).toBe(false);    // bad situation
    expect(isHouseholdId('comfortable:grieving:999')).toBe(false); // name index out of range
    expect(isHouseholdId('comfortable:grieving:-1')).toBe(false);
    expect(isHouseholdId(42)).toBe(false);
    expect(isHouseholdId(null)).toBe(false);
    expect(householdFromId('garbage')).toBeNull();
  });
});

// ─── economy hook ────────────────────────────────────────────────────────────────

describe('starting coins by tier', () => {
  it('getting_by equals the flat default; wealth scales up, scraping down', () => {
    expect(startingCoinsForTier('getting_by')).toBe(STARTING_COINS);
    expect(startingCoinsForTier('wealthy')).toBeGreaterThan(startingCoinsForTier('comfortable'));
    expect(startingCoinsForTier('comfortable')).toBeGreaterThan(startingCoinsForTier('getting_by'));
    expect(startingCoinsForTier('getting_by')).toBeGreaterThan(startingCoinsForTier('scraping'));
  });

  it('scraping is lean but never zero (no soft-lock)', () => {
    expect(startingCoinsForTier('scraping')).toBeGreaterThan(0);
  });

  it('derives coins from a stored household id, falling back to the default', () => {
    const id = householdId('wealthy', 'lonely_elder', 0);
    expect(startingCoinsForHousehold(id)).toBe(startingCoinsForTier('wealthy'));
    expect(startingCoinsForHousehold('garbage')).toBe(STARTING_COINS);
  });
});

// ─── contrast line (origin × household) ──────────────────────────────────────────

describe('contrastLine', () => {
  it('names the lucky-window-into-a-quiet-house gap', () => {
    const hh = householdFromId(householdId('wealthy', 'lonely_elder', 0))!;
    expect(contrastLine('the_window', hh)).toMatch(/only soul in the room/);
  });

  it('names the storm-drain-into-warm-chaos gap', () => {
    const hh = householdFromId(householdId('scraping', 'warm_chaos', 0))!;
    expect(contrastLine('storm_drain', hh)).toMatch(/lap that isn't taken/);
  });

  it('produces a non-empty line for every origin × situation pairing', () => {
    for (const origin of ORIGIN_IDS) {
      for (const situation of LIFE_SITUATIONS) {
        const hh = householdFromId(householdId('getting_by', situation, 0))!;
        expect(contrastLine(origin, hh).length).toBeGreaterThan(0);
      }
    }
  });
});
