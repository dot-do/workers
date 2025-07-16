export default {
  async fetch(request) {
    // Read the incoming CSV – ClickHouse always POSTs the first column name,
    // then one URL per line.
    const body      = await request.text();
    const [, ...urls] = body.trim().split('\n').map(l => l.trim()).filter(Boolean);

    const headers = Object.fromEntries(request.headers.entries())
    console.log({ body, urls, headers })

    // Build one big JSONObject-Each-Row response:
    const rows = {};

    // Download all URLs in parallel (the free plan allows ±50 concurrent calls;
    // tune with Promise.allSettled / batching if needed).
    await Promise.all(urls.map(async url => {
      const r       = await fetch(url);   // no HEAD, no cache
      const text    = await r.text();
      const trimmed = text.trimStart();

      // If it already looks like JSON keep it verbatim,
      // otherwise wrap it to make ClickHouse happy.
      const safe    =
        trimmed.startsWith('{') || trimmed.startsWith('[')
          ? trimmed
          : JSON.stringify(text);

      // NB: we do *not* parse – the value can be object, array or quoted string.
      rows[url] = { data: JSON.parse(safe) };
    }));

    return new Response(JSON.stringify(rows), {
      headers: { 'content-type': 'application/json' },
    });
  }
}