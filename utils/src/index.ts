import { WorkerEntrypoint, env } from 'cloudflare:workers'
import { decodeTime, encodeTime, isValid } from 'ulid'
import Sqids from 'sqids'

// Sqids instance for ID conversion
const sqids = new Sqids({
  // optional: customise alphabet / minLength for aesthetics
  // alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  // minLength: 22
})

// Base32 conversion helpers
const CROCKFORD32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const lookup32 = [...CROCKFORD32].reduce((m, c, i) => (m[c] = i, m), {} as Record<string, number>)

function base32ChunkToBigInt(chunk: string): bigint {
  let b = 0n
  for (const ch of chunk) b = (b << 5n) | BigInt(lookup32[ch])
  return b
}

function bigIntToBase32(b: bigint, length: number): string {
  const out: string[] = Array(length)
  for (let i = length - 1; i >= 0; --i) {
    out[i] = CROCKFORD32[Number(b & 31n)]
    b >>= 5n
  }
  return out.join('')
}

// Utility functions
export function ulidToSqid(args: { u?: string }): string {
  const u = args.u || ''
  if (!isValid(u)) throw new Error('Invalid ULID')

  const t48 = decodeTime(u)
  const randBig = base32ChunkToBigInt(u.slice(10))
  const hi = Number(randBig >> 40n)
  const lo = Number(randBig & ((1n << 40n) - 1n))

  return sqids.encode([t48, hi, lo])
}

export function sqidToUlid(args: { id?: string }): string {
  const id = args.id || ''
  const [t48, hi, lo] = sqids.decode(id)
  if (t48 === undefined) throw new Error('Bad Sqid')

  const randBig = (BigInt(hi) << 40n) | BigInt(lo)
  const tsPart = encodeTime(t48)
  const randPart = bigIntToBase32(randBig, 16)

  return tsPart + randPart
}

export const toMarkdown = env?.ai?.toMarkdown as any

// Collect all exported functions
const pkg = { ulidToSqid, sqidToUlid, toMarkdown }

// RPC class with dynamic method binding
class RPC extends WorkerEntrypoint {
  constructor() {
    super({} as any, {} as any)
  }

  async fetch(request: Request) {
    const { origin, pathname, searchParams } = new URL(request.url)
    const args = Object.fromEntries(searchParams)
    const fn = pathname.slice(1)

    if (pkg[fn as keyof typeof pkg]) {
      try {
        return Response.json(await pkg[fn as keyof typeof pkg](args))
      } catch (error) {
        return Response.json({ success: false, error: (error as Error).message })
      }
    }

    return Response.json(Object.keys(pkg).map((key) => origin + '/' + key))
  }
}

// Bind functions to RPC prototype
for (const key of Object.keys(pkg)) {
  const desc = {
    enumerable: false,
    configurable: true,
    get() {
      return pkg[key as keyof typeof pkg]
    },
  }
  Object.defineProperty(RPC.prototype, key, desc)
}

export default RPC
