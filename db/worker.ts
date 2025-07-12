import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  const { url } = c.req
  console.log(url)
  return c.json({ hello: 'world', url })
})

// https://github.com/ClickHouse/clickhouse-js/blob/main/examples/node/select_json_each_row_with_progress.ts

export default app



// npm i @clickhouse/client-web js-yaml
import { createClient, isProgressRow } from '@clickhouse/client-web';
import yaml from 'yaml';

async function* frontmatterRows() {
  const ch = createClient({
    url: 'https://<host>:8123',           // or cloud endpoint
    // user/password/JWT/TLS...
  });

  const query = await ch.query({
    query: `
      SELECT id, type, data, content
      FROM <db>.<table>
      ORDER BY id
      FORMAT JSONEachRowWithProgress
    `,
    format: 'JSONEachRowWithProgress',
    clickhouse_settings: {
      wait_end_of_query: 0,               // flush blocks immediately
      // max_block_size: 10_000,            // tune for latency vs efficiency
    },
  });

  type DataRow = {
    id: string
    type: string
    data: Record<string, unknown>
    content: string
  }

  const stream = query.stream<DataRow>()

  for await (const rows of stream) {
    for (const row of rows) {
      const decoded: any = row.json()

      if (isProgressRow(decoded)) {
        // skip progress rows
        continue
      }

      const { id, type, data, content } = decoded.row ?? decoded

      const frontmatter = yaml.stringify({ $id: id, $type: type, ...data }, { lineWidth: 120 })

      yield `---\n${frontmatter}---\n\n${content}`
    }
  }
}

app.get('/frontmatter', (c) => {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    try {
      for await (const markdownDoc of frontmatterRows()) {
        const chunk = new TextEncoder().encode(markdownDoc + '\n');
        await writer.write(chunk);
      }
      writer.close();
    } catch (err) {
      writer.abort(err);
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/mdx; charset=utf-8',
    },
  });
});