// ------------------------------------------------------------------
// 1. Callback type: your single place to do real work
// ------------------------------------------------------------------
type PathInvoker = (path: string, args: unknown[], context?: unknown) => unknown | Promise<unknown>;

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
  const build = (segments: string[], chain: Promise<unknown>, context?: unknown): Builder =>
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
            return build([], next, context);
          };
        }

        // Normal property → extend the path
        return build([...segments, prop.toString()], chain, context);
      },

      // ---- Function / template-tag invocation --------------------
      apply(_target, _thisArg, argList) {
        const path = segments.join('.');
        // Sequencing: wait for prior async work before running this piece
        const next = chain.then(async (previousResult) => {
          // Use previous result as context if available, otherwise use the builder's context
          const currentContext = previousResult !== undefined ? previousResult : context;
          const result = await invoke(path, argList, currentContext);
          return result;
        });
        // Pass the next promise itself - it will be awaited when needed
        return build([], next);   // fresh builder with updated chain
      }
    }) as unknown as Builder;

  // Start with *no* path and a resolved promise
  return build([], Promise.resolve(), undefined);
}

// ------------------------------------------------------------------
// 4. Example: plug in your own implementation once -----------------
// ------------------------------------------------------------------
let env
export const $ = createProxyInvoker(async (path, args, context) => {
  // @ts-ignore - this won't work anywhere except cloudflare workers
  if (!env) env = await import('cloudflare:workers').then(m => m.env as any).catch(() => ({}))

  // env.do?.do()

  const body = JSON.stringify({ path, args, context })
  // if (body.length > 10_000) 
  // https://echo-http-requests.appspot.com/push/test
  // const result = await fetch(`https://apis.do/${path}(${body})`).then(r => r.json())
  // const result = await fetch(`https://echo-http-requests.appspot.com/push/test`, { method: 'POST', body }).then(r => r.json())

  // const result = await fetch('https://apis.do/rpc', { method: 'POST', body }).then(r => r.json())

  console.log('→ invoke', { path, args, context });
  return { path, args, context }
  // demo: pretend each call returns an object with a .test() method
  // return { test() { console.log('test() inside result'); }, value: `result of ${path || 'root'}` };
});

export default $

// ------------------------------------------------------------------
// 5. All syntaxes + the requested chain now work -------------------
// ------------------------------------------------------------------
$.testing.for.this.set({ foo: 'bar' }).do({ something: 'else' })            // → invoke { path: 'set', args: [ { foo: 'bar' } ] }
  .then(console.log)            // test() inside result
  .save()
  .then(console.log)

const { ai, api, db, is } = $

db.customers.find({ name: 'John' })
db.customers.create({ company: 'Acme' })


is`${123} is a number`

ai.listBlogPostTitles({ topic: 'Future of AI' })


$`Testing ${123}`

$.testing.for.this.set({ foo: 'bar' }).do({ something: 'else' })

$.ai`do something ${456}`

$`https://builder.domains`.get('*')

$.builder.domains

$.builder.domains.search`how are you?`

is`${123} is a number`

ai.listBlogPostTitles({ topic: 'Future of AI' })

