// Lightweight Markdown/MDX fetch‑and‑parse helper for Cloudflare Workers
// Bundles under ≈120 KB after tree‑shaking and is edge‑runtime friendly.

import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxjs } from "micromark-extension-mdxjs";
import { mdxFromMarkdown } from "mdast-util-mdx";
import yaml from "yaml";

export type $Data = {
  /** Absolute canonical URL for this resource or `$id` from the front‑matter */
  $id: `https://${string}`
  /** Optional `$type` / `type` field from the front‑matter */
  $type?: string
  /** All top‑level `import`/`export` lines stripped from the document body */
  $code?: string
  /** Markdown (GFM / MDX) content with front‑matter & code removed */
  $content?: string
  /** MDAST tree produced by mdast-util‑from‑markdown with MDX extensions */
  $ast?: any
} & Record<string, any>

/**
 * Fetch a Markdown/MDX document, parse its YAML front‑matter, extract code blocks
 * and return a rich `$Data` object. Designed for edge runtimes such as
 * Cloudflare Workers – avoids Node-only APIs and keeps memory usage low.
 */
export async function get(url: string): Promise<$Data> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const raw = await res.text();

  // 1. ── Front‑matter --------------------------------------------------------
  let front = {} as Record<string, any>;
  let body = raw;

  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) {
      const fmText = raw.slice(3, end).trim();
      body = raw.slice(end + 4); // skip closing delimiter & LF
      front = yaml.parse(fmText) ?? {};
    }
  }

  // 2. ── Extract top‑level JS/TS/JSX code lines -----------------------------
  const codeLines: string[] = [];
  const contentLines: string[] = [];

  for (const line of body.split("\n")) {
    if (/^\s*(import|export)\s/.test(line)) codeLines.push(line);
    else contentLines.push(line);
  }

  const code = codeLines.length ? codeLines.join("\n").trim() : undefined;
  const content = contentLines.join("\n").trim() || undefined;

  // 3. ── Build MDAST (+ MDX) -------------------------------------------------
  let ast: any | undefined;
  try {
    ast = fromMarkdown(content ?? "", {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()]
    });
  } catch (err) {
    console.warn("mdast parse failed", err);
  }

  // 4. ── Assemble result -----------------------------------------------------
  const $id = (front.$id || front.id || url) as `https://${string}`;

  return {
    $id,
    ...(front.$type || front.type ? { $type: front.$type ?? front.type } : {}),
    ...front, // expose remaining front‑matter keys
    ...(code ? { $code: code } : {}),
    ...(content ? { $content: content } : {}),
    ...(ast ? { $ast: ast } : {}),
  } as $Data;
}
