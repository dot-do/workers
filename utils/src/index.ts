// In your wrangler.jsonc
{
  "services": [
    { "binding": "UTILS_SERVICE", "service": "utils" }
  ]
}

// In your worker
const sqid = await env.UTILS_SERVICE.ulidToSqid('01ARZ3NDEKTSV4RRFFQ69G5FAV')
const ulid = await env.UTILS_SERVICE.sqidToUlid('abc123')
const markdown = await env.UTILS_SERVICE.toMarkdown({ blob })


import { WorkerEntrypoint } from 'cloudflare:workers'
import def, * as mod from './utils'
const pkg = { ...def, ...mod } as any

class RPC extends WorkerEntrypoint {
  constructor() {
    super({} as any, {} as any)
  }

  async fetch(request: Request) {
    const { origin, pathname, searchParams } = new URL(request.url)
    const args = Object.fromEntries(searchParams)

    const fn = pathname.slice(1)

    if (pkg[fn]) {
      try {
        return Response.json(await pkg[fn](args))
      } catch (error) {
        return Response.json({ success: false, error: (error as Error).message })
      }
    }

    return Response.json(Object.keys(pkg).map(key => origin + '/' + key))
  }
}

for (const key of Reflect.ownKeys(pkg)) {
  if (key === 'default') continue;
  const desc = { enumerable: false, configurable: true, get() { return pkg[key] } };
  (typeof pkg[key] === 'function'
    ? Object.defineProperty(RPC.prototype, key, desc)
    : Object.defineProperty(RPC, key, desc));
}

export default RPC


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


import { env } from 'cloudflare:workers'

export const toMarkdown = env?.ai?.toMarkdown as any
