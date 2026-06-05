import {
  ORIGINS,
  ORIGIN_IDS,
  HANDOFF_LINES,
  isOriginId,
  originSeed,
  rollOrigin,
  originById,
  type OriginId,
} from './origins';
import { RARITIES } from './evolution';
import type { Rarity } from './types';

const NON_SECRET: Rarity[] = ['common', 'uncommon', 'rare', 'epic'];

// ─── Catalog integrity ──────────────────────────────────────────────────────────

describe('origin catalog', () => {
  it('has six origins, exactly one of them secret', () => {
    expect(ORIGIN_IDS).toHaveLength(6);
    expect(ORIGIN_IDS.filter((id) => ORIGINS[id].secret)).toEqual(['midnight_litter']);
  });

  it('every origin is well-formed (title, tone, beats, summary)', () => {
    for (const id of ORIGIN_IDS) {
      const o = originById(id);
      expect(o.id).toBe(id);
      expect(o.title.length).toBeGreaterThan(0);
      expect(o.tone.length).toBeGreaterThan(0);
      expect(o.summary.length).toBeGreaterThan(0);
      expect(o.beats.length).toBeGreaterThanOrEqual(2);
      expect(o.beats.length).toBeLessThanOrEqual(3);
      for (const beat of o.beats) expect(beat.length).toBeGreaterThan(0);
    }
  });

  it('ends every origin on the same two-line hand-off', () => {
    expect(HANDOFF_LINES).toHaveLength(2);
    expect(HANDOFF_LINES[1]).toMatch(/yours/);
  });
});

// ─── isOriginId ──────────────────────────────────────────────────────────────────

describe('isOriginId', () => {
  it('accepts known ids and rejects everything else', () => {
    expect(isOriginId('storm_drain')).toBe(true);
    expect(isOriginId('midnight_litter')).toBe(true);
    expect(isOriginId('nope')).toBe(false);
    expect(isOriginId(42)).toBe(false);
    expect(isOriginId(null)).toBe(false);
    expect(isOriginId(undefined)).toBe(false);
  });
});

// ─── rollOrigin: determinism + the secret rule ──────────────────────────────────

describe('rollOrigin', () => {
  it('is deterministic for the same birth identity + rarity', () => {
    const a = rollOrigin(1_700_000_000_000, 'Pixel', 'cat', 'common');
    const b = rollOrigin(1_700_000_000_000, 'Pixel', 'cat', 'common');
    expect(a).toBe(b);
  });

  it('always produces a valid origin id', () => {
    for (const r of RARITIES) {
      expect(ORIGIN_IDS).toContain(rollOrigin(1_700_000_000_000, 'Pixel', 'cat', r));
    }
  });

  it('reserves the midnight litter for secret rarity, and only secret', () => {
    // secret → always the midnight litter
    for (let i = 0; i < 100; i++) {
      expect(rollOrigin(1_700_000_000_000 + i * 1000, `s${i}`, 'cat', 'secret')).toBe('midnight_litter');
    }
    // non-secret → never the midnight litter
    for (const r of NON_SECRET) {
      for (let i = 0; i < 200; i++) {
        expect(rollOrigin(1_700_000_000_000 + i * 7, `n${i}`, 'cat', r)).not.toBe('midnight_litter');
      }
    }
  });

  it('spreads across the everyday origins for common pets', () => {
    const seen = new Set<OriginId>();
    for (let i = 0; i < 500; i++) {
      seen.add(rollOrigin(1_700_000_000_000 + i * 1000, `pet${i}`, 'cat', 'common'));
    }
    // Common pets should reach several everyday origins (peril-weighted, but varied).
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(seen.has('midnight_litter')).toBe(false);
  });

  it('biases luckier rarities toward the lucky window over the storm drain', () => {
    const window = { common: 0, epic: 0 };
    const drain = { common: 0, epic: 0 };
    for (let i = 0; i < 1500; i++) {
      const seedBorn = 1_700_000_000_000 + i * 1000;
      if (rollOrigin(seedBorn, `c${i}`, 'cat', 'common') === 'the_window') window.common++;
      if (rollOrigin(seedBorn, `c${i}`, 'cat', 'common') === 'storm_drain') drain.common++;
      if (rollOrigin(seedBorn, `e${i}`, 'cat', 'epic') === 'the_window') window.epic++;
      if (rollOrigin(seedBorn, `e${i}`, 'cat', 'epic') === 'storm_drain') drain.epic++;
    }
    // Epic pets land in the window far more than common pets do…
    expect(window.epic).toBeGreaterThan(window.common);
    // …and in the storm drain far less.
    expect(drain.epic).toBeLessThan(drain.common);
  });

  it('namespaces its seed away from the rarity roll', () => {
    expect(originSeed(1, 'A', 'cat')).toContain('origin:');
  });
});
