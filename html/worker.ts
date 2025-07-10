import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import YAML from "yaml";

marked.use(gfmHeadingId());          // ✅ gives each heading an id attribute

// OPTIONAL: add an anchor link (<a href="#id">) in front of every heading
marked.use({
  renderer: {
    // `slugger` may be injected by marked; fall back to a new instance if missing.
    // @ts-expect-error - Signature mismatch with marked's Renderer typing is acceptable here.
    heading(text: string, level: number, raw: string, slugger?: any) {
      // 'Slugger' is available at runtime as a static property on `marked`,
      // but it's not declared in the published type definitions, so we cast.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const sg = slugger ?? new (marked as any).Slugger();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const id = sg.slug(raw);
      return `<h${level} id="${id}">
        <a href="#${id}" aria-label="Permalink" class="anchor">¶</a>
        ${text}
      </h${level}>`;
    }
  }
});

// ─── the rest is unchanged ──────────────────────────────────────────────
const FRONT = /^---\s*[\r\n]+([\s\S]*?)\r?\n---\s*[\r\n]*/m;

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") return new Response("POST markdown", { status: 405 });

    const md = await req.text();
    const html = renderWithSections(md);
    return new Response(html, { headers: { "content-type": "text/html;charset=utf-8" } });
  },
} satisfies ExportedHandler;

function renderWithSections(src: string): string {
  let rest = src, out = "";
  while (true) {
    const m = rest.match(FRONT);
    if (!m) break;
    out += marked.parse(rest.slice(0, m.index));
    out += yamlSection(YAML.parse(m[1]) ?? {});
    rest = rest.slice(m.index! + m[0].length);
  }
  out += marked.parse(rest);
  return wrap(out);
}

function yamlSection(obj: Record<string, unknown>): string {
  return `<section class="frontmatter">
            <h2>Front-matter</h2>
            <pre><code>${escape(JSON.stringify(obj, null, 2))}</code></pre>
          </section>`;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!));

const wrap = (body: string) => `<!doctype html>
<html lang="en"><meta charset="utf-8">
<title>Rendered Markdown</title>
<link rel="stylesheet" href="https://unpkg.com/github-markdown-css/github-markdown-light.css">
<style>
  body{max-width:780px;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui}
  .frontmatter{background:#f6f8fa;border:1px solid #d0d7de;padding:1rem;border-radius:6px;margin:1.5rem 0}
  .anchor{opacity:.2;margin-right:.25em;text-decoration:none} /* tweak to taste */
  h1:hover .anchor,h2:hover .anchor,h3:hover .anchor{opacity:.6}
</style>
<body class="markdown-body">
${body}
</body></html>`;