import { giftLuckFromRarity } from './gift';
import { GIFT_LUCK_CAP } from './constants';

describe('giftLuckFromRarity', () => {
  it('always gifts at least 1 luck (a welcome bump for clicking through)', () => {
    expect(giftLuckFromRarity('common')).toBe(1);
    expect(giftLuckFromRarity('uncommon')).toBe(1);
  });

  it('scales with the shared pet\'s rarity', () => {
    expect(giftLuckFromRarity('rare')).toBe(2);
    expect(giftLuckFromRarity('epic')).toBe(3);
  });

  it('caps at GIFT_LUCK_CAP', () => {
    expect(giftLuckFromRarity('secret')).toBe(GIFT_LUCK_CAP);
    expect(giftLuckFromRarity('secret')).toBeLessThanOrEqual(GIFT_LUCK_CAP);
  });
});
