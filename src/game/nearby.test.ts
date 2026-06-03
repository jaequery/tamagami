import { decodePayload, encodePayload } from './nearby';
import type { PeerIdentity, PetType } from './types';

// Same separator the codec uses (U+001F), built without a literal control char.
const SEP = String.fromCharCode(0x1f);
const pack = (...parts: string[]): string => parts.join(SEP);

describe('nearby payload codec', () => {
  it.each<PetType>(['plant', 'cat', 'dog'])('round-trips a %s identity', (petType) => {
    const id: PeerIdentity = { id: 'a1b2c3d4', name: 'Rex', petType };
    const decoded = decodePayload(encodePayload(id));
    expect(decoded).toEqual(id);
  });

  it('truncates long names to fit the advertisement', () => {
    const id: PeerIdentity = { id: 'deadbeef', name: 'Bartholomew', petType: 'dog' };
    const decoded = decodePayload(encodePayload(id));
    expect(decoded?.name).toBe('Bartholome'); // 'Bartholomew' → 10 chars
    expect(decoded?.name.length).toBe(10);
  });

  it('rejects garbage / foreign advertisements', () => {
    expect(decodePayload('')).toBeNull();
    expect(decodePayload('hello world')).toBeNull();
    expect(decodePayload(pack('XY', 'id', 'c', 'Rex'))).toBeNull(); // wrong prefix
    expect(decodePayload(pack('TG', '', 'c', 'Rex'))).toBeNull();   // empty id
    expect(decodePayload(pack('TG', 'id', 'z', 'Rex'))).toBeNull(); // unknown type code
    expect(decodePayload(pack('TG', 'id', 'c'))).toBeNull();        // too few parts
  });

  it('falls back to a default name when the name field is empty', () => {
    const decoded = decodePayload(encodePayload({ id: 'abc12345', name: '', petType: 'cat' }));
    expect(decoded?.name).toBe('Pixel');
  });

  it('preserves spaces in names', () => {
    const id: PeerIdentity = { id: 'abc12345', name: 'Sir Cat', petType: 'cat' };
    expect(decodePayload(encodePayload(id))).toEqual(id);
  });
});
