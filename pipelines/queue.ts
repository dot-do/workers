export default {
  async fetch(request, env, ctx) {
    // 1️⃣  Grab the object
    const key = "my-event-log.ndjson.gz";            // or derive from the URL
    const obj = await env.MY_BUCKET.get(key);        // R2Object (null if not found)
    if (!obj) return new Response("Not found", { status: 404 });

    /* 2️⃣  Build a pipeline
            R2 bytes  → gunzip → UTF-8 text → one JSON row at a time          */

    // a. Gzip → plain bytes
    const gunzipped = obj.body                 // ReadableStream<Uint8Array>
      .pipeThrough(new DecompressionStream("gzip"));   // native in Workers  [oai_citation:0‡The Cloudflare Blog](https://blog.cloudflare.com/standards-compliant-workers-api/)

    // b. Bytes → text
    const text = gunzipped.pipeThrough(new TextDecoderStream("utf-8"));

    // c. Text → parsed JSON objects (1 per line)
    const ndjson = text.pipeThrough(
      new TransformStream({
        start() { this.buffer = ""; },
        transform(chunk, controller) {
          this.buffer += chunk;
          const lines = this.buffer.split("\n");
          this.buffer = lines.pop();           // keep the partial last line
          for (const line of lines) {
            if (line.trim() !== "") controller.enqueue(JSON.parse(line));
          }
        },
        flush(controller) {
          if (this.buffer.trim() !== "") controller.enqueue(JSON.parse(this.buffer));
        }
      })
    );

    // 3️⃣  Consume the stream however you like
    for await (const row of ndjson) {
      // Do something with each JSON object
      console.log(row);
    }

    return new Response("Processed!", { status: 200 });
  }
}