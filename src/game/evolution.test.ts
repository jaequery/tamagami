import {
  RARITIES,
  rarityFromUnit,
  rollRarity,
  stageFor,
  secondsUntilHatch,
  isHatched,
  STAGE_THRESHOLDS,
  STAGE_ORDER,
  formIdFor,
  formName,
  ALL_FORMS,
  TOTAL_FORMS,
} from './evolution';
import { paletteForRarity } from './palettes';
import type { PetType, Rarity } from './types';

const PET_TYPES: PetType[] = ['cat'];

// ─── stageFor ─────────────────────────────────────────────────────────────────

describe('stageFor', () => {
  it('starts as an egg at age 0', () => {
    expect(stageFor(0)).toBe('egg');
  });

  it('hatches to baby exactly at the hatch threshold', () => {
    const hatchAt = STAGE_THRESHOLDS[1].atSeconds;
    expect(stageFor(hatchAt - 1)).toBe('egg');
    expect(stageFor(hatchAt)).toBe('baby');
  });

  it('returns the highest stage whose threshold is reached', () => {
    for (const { stage, atSeconds } of STAGE_THRESHOLDS) {
      expect(stageFor(atSeconds)).toBe(stage);
    }
  });

  it('caps at elder for very old pets', () => {
    expect(stageFor(999 * 24 * 60 * 60)).toBe('elder');
  });

  it('orders thresholds monotonically', () => {
    for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
      expect(STAGE_THRESHOLDS[i].atSeconds).toBeGreaterThan(STAGE_THRESHOLDS[i - 1].atSeconds);
    }
    expect(STAGE_ORDER).toEqual(STAGE_THRESHOLDS.map((t) => t.stage));
  });
});

describe('secondsUntilHatch / isHatched', () => {
  it('counts down to the hatch threshold and floors at 0', () => {
    const hatchAt = STAGE_THRESHOLDS[1].atSeconds;
    expect(secondsUntilHatch(0)).toBe(hatchAt);
    expect(secondsUntilHatch(hatchAt)).toBe(0);
    expect(secondsUntilHatch(hatchAt + 100)).toBe(0);
  });

  it('isHatched is false only for the egg stage', () => {
    expect(isHatched('egg')).toBe(false);
    expect(isHatched('baby')).toBe(true);
    expect(isHatched('elder')).toBe(true);
  });
});

// ─── Rarity roll ──────────────────────────────────────────────────────────────

describe('rarityFromUnit', () => {
  it('maps the unit interval to weighted buckets in order', () => {
    expect(rarityFromUnit(0)).toBe('common');
    expect(rarityFromUnit(0.59)).toBe('common');
    expect(rarityFromUnit(0.6)).toBe('uncommon');
    expect(rarityFromUnit(0.84)).toBe('uncommon');
    expect(rarityFromUnit(0.85)).toBe('rare');
    expect(rarityFromUnit(0.95)).toBe('epic');
    expect(rarityFromUnit(0.99)).toBe('secret');
    expect(rarityFromUnit(0.999)).toBe('secret');
  });

  it('never falls off the end (float-safety net)', () => {
    expect(RARITIES).toContain(rarityFromUnit(0.9999999999));
  });
});

describe('rollRarity', () => {
  it('is deterministic for the same birth identity', () => {
    const a = rollRarity(1_700_000_000_000, 'Pixel', 'cat');
    const b = rollRarity(1_700_000_000_000, 'Pixel', 'cat');
    expect(a).toBe(b);
  });

  it('produces a valid rarity', () => {
    expect(RARITIES).toContain(rollRarity(1_700_000_000_000, 'Pixel', 'cat'));
  });

  it('spreads across multiple rarities over many seeds', () => {
    const seen = new Set<Rarity>();
    for (let i = 0; i < 500; i++) {
      seen.add(rollRarity(1_700_000_000_000 + i * 1000, `pet${i}`, 'cat'));
    }
    // With 500 samples we should see at least the common + a couple rarer tiers.
    expect(seen.has('common')).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

// ─── Form catalog ─────────────────────────────────────────────────────────────

describe('form catalog', () => {
  it('has one form per petType × rarity', () => {
    expect(TOTAL_FORMS).toBe(PET_TYPES.length * RARITIES.length);
    expect(ALL_FORMS).toHaveLength(TOTAL_FORMS);
  });

  it('has unique, well-formed ids', () => {
    const ids = ALL_FORMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PET_TYPES) {
      for (const r of RARITIES) {
        expect(ids).toContain(formIdFor(t, r));
      }
    }
  });

  it('names a form as EPITHET TYPE', () => {
    expect(formName('cat', 'rare')).toBe('AMBER CAT');
    expect(formName('cat', 'common')).toBe('MOSS CAT');
    expect(formName('cat', 'secret')).toBe('LUNAR CAT');
  });
});

// ─── Palettes ─────────────────────────────────────────────────────────────────

describe('paletteForRarity', () => {
  it('returns a full 5-channel ramp for every rarity', () => {
    for (const r of RARITIES) {
      const p = paletteForRarity(r);
      for (const channel of [p.bg, p.shade1, p.shade2, p.dark, p.off]) {
        expect(channel).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it('inverts the secret palette (dark sky, light ink)', () => {
    const secret = paletteForRarity('secret');
    // bg darker than ink → inverted night look
    expect(secret.bg.toLowerCase()).toBe('#0b1026');
    expect(secret.dark.toLowerCase()).toBe('#cbd6ff');
  });
});
