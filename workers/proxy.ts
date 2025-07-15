// ------------------------------------------------------------------
// 1. Callback type: your single place to do real work
// ------------------------------------------------------------------
type PathInvoker = (path: string, args: any[]) => any | Promise<any>;

// ------------------------------------------------------------------
// 2. The builder object returned by every operation
// ------------------------------------------------------------------
interface Builder extends Function, PromiseLike<any> {
  [key: string | symbol]: any;      // keep it open-ended
}

// ------------------------------------------------------------------
// 3. Factory that creates the fully-featured `db`
// ------------------------------------------------------------------
function createProxyInvoker(invoke: PathInvoker): Builder {
  const build = (segments: string[], chain: Promise<any>): Builder =>
    new Proxy(function () {}, {
      // ---- Property access (db.foo.bar) ---------------------------
      get(_target, prop: string | symbol) {
        // Async iterator still works
        if (prop === Symbol.asyncIterator) {
          return async function* () {
            const result = await chain;
            if (result && (result as any)[Symbol.asyncIterator]) {
              for await (const v of result as AsyncIterable<any>) yield v;
            } else if (result && (result as any)[Symbol.iterator]) {
              for (const v of result as Iterable<any>) yield v;
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
const db = createProxyInvoker(async (path, args) => {
  console.log('→ invoke', { path, args });
  // demo: pretend each call returns an object with a .test() method
  return { test() { console.log('test() inside result'); } };
});

// ------------------------------------------------------------------
// 5. All syntaxes + the requested chain now work -------------------
// ------------------------------------------------------------------
db.set({ foo: 'bar' })            // → invoke { path: 'set', args: [ { foo: 'bar' } ] }
  .then((r: any) => r.test())     // test() inside result
  .save();                        // → invoke { path: 'save', args: [] }