// ------------------------------------------------------------------
// 1. Callback type: your single place to do real work
// ------------------------------------------------------------------
type PathInvoker = (path: string, args: unknown[]) => unknown | Promise<unknown>;

// ------------------------------------------------------------------
// 2. The builder object returned by every operation
// ------------------------------------------------------------------
interface Builder extends Function, PromiseLike<unknown> {
  [key: string | symbol]: any;      // keep it open-ended
}

// ------------------------------------------------------------------
// 3. Factory that creates the fully-featured `db`
// ------------------------------------------------------------------
function createProxyInvoker(invoke: PathInvoker): Builder {
  const build = (segments: string[], chain: Promise<unknown>): Builder =>
    new Proxy(function () {}, {
      // ---- Property access (db.foo.bar) ---------------------------
      get(_target, prop: string | symbol) {
        // Async iterator still works
        if (prop === Symbol.asyncIterator) {
          return async function* () {
            const result = await chain;
            if (result && (result as any)[Symbol.asyncIterator]) {
              for await (const v of result as AsyncIterable<unknown>) yield v;
            } else if (result && (result as any)[Symbol.iterator]) {
              for (const v of result as Iterable<unknown>) yield v;
            } else {
              yield result;
            }
          };
        }

        // ---- Special: .then(...) ---------------------------------
        if (prop === 'then') {
          // The engine (await / Promise.resolve) or user code can call this.
          return (onFulfilled?: any, onRejected?: any) => {
            const next = chain.then(onFulfilled, onRejected);
            // Return *another* builder so we can keep chaining (.save etc.)
            return build([], next);
          };
        }

        // Normal property → extend the path
        return build([...segments, prop.toString()], chain);
      },

      // ---- Function / template-tag invocation --------------------
      apply(_target, _thisArg, argList) {
        const path = segments.join('.');
        // Sequencing: wait for prior async work before running this piece
        const next = chain.then(() => invoke(path, argList));
        return build([], next);   // fresh builder with updated chain
      }
    }) as unknown as Builder;

  // Start with *no* path and a resolved promise
  return build([], Promise.resolve());
}

// ------------------------------------------------------------------
// 4. Example: plug in your own implementation once -----------------
// ------------------------------------------------------------------
let env
export const $ = createProxyInvoker(async (path, args) => {
  // @ts-ignore - this won't work anywhere except cloudflare workers
  if (!env) env = await import('cloudflare:workers').then(m => m.env as any).catch(() => ({}))

  env.do?.do()

  console.log('→ invoke', { path, args });
  // demo: pretend each call returns an object with a .test() method
  return { test() { console.log('test() inside result'); } };
});

export default $

// ------------------------------------------------------------------
// 5. All syntaxes + the requested chain now work -------------------
// ------------------------------------------------------------------
$.testing.for.this.set({ foo: 'bar' }).do({ something: 'else' })            // → invoke { path: 'set', args: [ { foo: 'bar' } ] }
  .then(r => r.test())            // test() inside result
  .save()
  .then(console.log)


$`Testing ${123}`

$.ai`do something ${456}`