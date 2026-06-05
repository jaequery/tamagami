import { decodePayload, encodePayload } from './nearby';
import type { PeerIdentity, Rarity } from './types';

// Same separator the codec uses (U+001F), built without a literal control char.
const SEP = String.fromCharCode(0x1f);
const pack = (...parts: string[]): string => parts.join(SEP);

describe('nearby payload codec', () => {
  it('round-trips a cat identity', () => {
    const id: PeerIdentity = { id: 'a1b2c3d4', name: 'Rex', petType: 'cat', rarity: 'common' };
    const decoded = decodePayload(encodePayload(id));
    expect(decoded).toEqual(id);
  });

  it.each<Rarity>(['common', 'uncommon', 'rare', 'epic', 'secret'])(
    'round-trips %s rarity over the air',
    (rarity) => {
      const id: PeerIdentity = { id: 'a1b2c3d4', name: 'Rex', petType: 'cat', rarity };
      expect(decodePayload(encodePayload(id))).toEqual(id);
    },
  );

  it('truncates long names to fit the advertisement', () => {
    const id: PeerIdentity = { id: 'deadbeef', name: 'Bartholomew', petType: 'cat', rarity: 'rare' };
    const decoded = decodePayload(encodePayload(id));
    expect(decoded?.name).toBe('Bartholome'); // 'Bartholomew' → 10 chars
    expect(decoded?.name.length).toBe(10);
  });

  it('decodes legacy 4-field payloads (pre-rarity) as common', () => {
    const decoded = decodePayload(pack('TG', 'a1b2c3d4', 'c', 'Rex'));
    expect(decoded).toEqual({ id: 'a1b2c3d4', name: 'Rex', petType: 'cat', rarity: 'common' });
  });

  it('treats an unknown rarity code as common rather than rejecting', () => {
    const decoded = decodePayload(pack('TG', 'a1b2c3d4', 'c', 'Z', 'Rex'));
    expect(decoded?.rarity).toBe('common');
  });

  it('rejects garbage / foreign advertisements', () => {
    expect(decodePayload('')).toBeNull();
    expect(decodePayload('hello world')).toBeNull();
    expect(decodePayload(pack('XY', 'id', 'c', 'o', 'Rex'))).toBeNull(); // wrong prefix
    expect(decodePayload(pack('TG', '', 'c', 'o', 'Rex'))).toBeNull();   // empty id
    expect(decodePayload(pack('TG', 'id'))).toBeNull();                  // too few parts
  });

  it('decodes any (legacy plant/dog) type code as a cat — the world is cat-only', () => {
    const decoded = decodePayload(pack('TG', 'a1b2c3d4', 'd', 'o', 'Rex')); // old 'd' = dog
    expect(decoded?.petType).toBe('cat');
  });

  it('falls back to a default name when the name field is empty', () => {
    const decoded = decodePayload(encodePayload({ id: 'abc12345', name: '', petType: 'cat', rarity: 'common' }));
    expect(decoded?.name).toBe('Pixel');
  });

  it('preserves spaces in names', () => {
    const id: PeerIdentity = { id: 'abc12345', name: 'Sir Cat', petType: 'cat', rarity: 'epic' };
    expect(decodePayload(encodePayload(id))).toEqual(id);
  });
});
