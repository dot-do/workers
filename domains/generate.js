// domainHelpers.ts
import PQueue from "p-queue";

export type Suggestions = {
  tldOnly: string[];
  modified: string[];
};

export interface DomainOptions {
  /** Randomise order of each list (default: false) */
  shuffle?: boolean;
  /** Call Cloudflare DoH and keep only domains without NS records (default: false) */
  checkNS?: boolean;
  /** Max concurrent DNS requests (default: 20) */
  concurrency?: number;
}

const TLDs = [
  ".com", ".io", ".ai", ".co", ".net",
  ".app",".dev",".tech",".xyz",".cloud",".gg",".me",".org",".site",
  ".online",".space",".studio",".live",".world",".digital",
  ".store",".shop",".pay",".solutions",".systems",".network",".group",
  ".team",".works",".agency",
  ".capital",".vc",".fund",".finance",".money",".investments",
  ".design",".media",".press",".blog",".consulting",".services",
  ".software",".partners",
  ".health",".care",".life",".bio",
  ".global",".tv",
] as const;

const prefixes = [
  "get","go","use","try","my","the","join","hey","hello","meet","find","hire",
  "ask","shop","buy","start","launch","open","weare","team","drive","send",
  "play","smart","live",
] as const;

const suffixes = [
  "app","hq","labs","tech","cloud","online","digital","hub","solutions",
  "systems","network","group","media","studio","works","world","center",
  "zone","shop","store","space","life","pro","plus","point",
] as const;

const top5 = [".com", ".io", ".ai", ".co", ".net"] as const;

/** Quick Fisher-Yates */
function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Hit Cloudflare DoH once and resolve true if *no* NS records are returned */
async function hasNoNS(domain: string): Promise<boolean> {
  const url = `https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) return true;           // treat failures as “maybe free”
  const data = await res.json();
  return !("Answer" in data) || data.Answer.length === 0;
  // JSON schema follows Google’s DoH format – “Answer” array holds records [oai_citation:0‡Cloudflare Docs](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/)
}

/** Master helper */
export async function suggestDomains(
  rawName: string,
  opts: DomainOptions = {}
): Promise<Suggestions> {
  const name = rawName.replace(/\s+/g, "").toLowerCase();

  let tldOnly  = TLDs.map(tld => `${name}${tld}`);
  let modified = [
    ...prefixes.flatMap(p => top5.map(tld => `${p}${name}${tld}`)),
    ...suffixes.flatMap(s => top5.map(tld => `${name}${s}${tld}`)),
  ];

  if (opts.shuffle) { shuffle(tldOnly); shuffle(modified); }

  if (opts.checkNS) {
    const queue = new PQueue({ concurrency: opts.concurrency ?? 20 });

    const filter = async (list: string[]) => {
      const keep: string[] = [];
      await Promise.all(list.map(d =>
        queue.add(async () => (await hasNoNS(d)) && keep.push(d))
      ));
      return keep;
    };

    [tldOnly, modified] = await Promise.all([filter(tldOnly), filter(modified)]);
  }

  return { tldOnly, modified };
}