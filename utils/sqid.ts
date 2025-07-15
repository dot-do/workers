import { decodeTime, encodeTime, isValid } from 'ulid';
import Sqids from 'sqids';

const sqids = new Sqids({
  // optional: customise alphabet / minLength for aesthetics
  // alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  // minLength: 22
});

// ---------- helpers ----------
const CROCKFORD32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const lookup32    = [...CROCKFORD32].reduce((m, c, i) => (m[c] = i, m), {} as Record<string, number>);

function base32ChunkToBigInt(chunk: string): bigint {
  let b = 0n;
  for (const ch of chunk) b = (b << 5n) | BigInt(lookup32[ch]);
  return b;
}

function bigIntToBase32(b: bigint, length: number): string {
  const out: string[] = Array(length);
  for (let i = length - 1; i >= 0; --i) {
    out[i] = CROCKFORD32[Number(b & 31n)]; // 31 = 0b11111
    b >>= 5n;
  }
  return out.join('');
}
// --------------------------------

// ULID ➜ Sqid
export function ulidToSqid(u: string): string {
  if (!isValid(u)) throw new Error('Invalid ULID');

  const t48 = decodeTime(u);                 // number
  const randBig = base32ChunkToBigInt(u.slice(10));     // 80 bits

  const hi = Number(randBig >> 40n);         // top 40 bits
  const lo = Number(randBig & ((1n << 40n) - 1n));

  return sqids.encode([t48, hi, lo]);
}

// Sqid ➜ ULID
export function sqidToUlid(id: string): string {
  const [t48, hi, lo] = sqids.decode(id);
  if (t48 === undefined) throw new Error('Bad Sqid');

  const randBig = (BigInt(hi) << 40n) | BigInt(lo);
  const tsPart  = encodeTime(t48);           // 10 chars
  const randPart = bigIntToBase32(randBig, 16);

  return tsPart + randPart;                  // 26-char ULID
}