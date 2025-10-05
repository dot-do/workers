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

// ============================================================================
// TIMESTAMP HELPERS
// ============================================================================

/**
 * Extract timestamp (milliseconds since epoch) from a Sqid
 * @param sqid The Sqid to extract timestamp from
 * @returns Timestamp in milliseconds
 */
export function extractTimestampFromSquid(sqid: string): number {
  const [t48] = sqids.decode(sqid);
  if (t48 === undefined) throw new Error('Invalid Sqid');
  return t48;
}

/**
 * Extract timestamp (milliseconds since epoch) from a ULID
 * @param ulid The ULID to extract timestamp from
 * @returns Timestamp in milliseconds
 */
export function extractTimestampFromUlid(ulid: string): number {
  if (!isValid(ulid)) throw new Error('Invalid ULID');
  return decodeTime(ulid);
}

/**
 * Create a new Sqid with a specific or current timestamp
 * @param timestamp Optional timestamp in milliseconds (defaults to now)
 * @returns New Sqid with encoded timestamp
 */
export function createSquidWithTimestamp(timestamp?: number): string {
  timestamp = timestamp ?? Date.now();

  // Generate random 80-bit value
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // Convert to bigint
  let randBig = 0n;
  for (let i = 0; i < 10; i++) {
    randBig = (randBig << 8n) | BigInt(randomBytes[i]);
  }

  // Split into hi (40 bits) and lo (40 bits)
  const hi = Number(randBig >> 40n);
  const lo = Number(randBig & ((1n << 40n) - 1n));

  return sqids.encode([timestamp, hi, lo]);
}

/**
 * Create a new ULID with a specific or current timestamp
 * @param timestamp Optional timestamp in milliseconds (defaults to now)
 * @returns New ULID with encoded timestamp
 */
export function createUlidWithTimestamp(timestamp?: number): string {
  timestamp = timestamp ?? Date.now();

  // Generate random 80-bit value
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // Convert to bigint
  let randBig = 0n;
  for (let i = 0; i < 10; i++) {
    randBig = (randBig << 8n) | BigInt(randomBytes[i]);
  }

  // Encode timestamp and random parts
  const tsPart = encodeTime(timestamp);
  const randPart = bigIntToBase32(randBig, 16);

  return tsPart + randPart;
}

/**
 * Check if a string is a valid Sqid
 * @param id The string to check
 * @returns true if valid Sqid, false otherwise
 */
export function isValidSquid(id: string): boolean {
  try {
    const decoded = sqids.decode(id);
    return decoded.length === 3 && decoded[0] !== undefined;
  } catch {
    return false;
  }
}