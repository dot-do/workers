// ------------------------------------------------------------------
// 1. Define what your single handler can return
//    (value, Promise, or (async) iterable)
// ------------------------------------------------------------------
type PathInvoker =
  (path: string, args: unknown[]) =>
    | unknown
    | Promise<unknown>
    | Iterable<unknown>
    | AsyncIterable<unknown>;

// ------------------------------------------------------------------
// 2. Factory that gives you the magic `db`
// ------------------------------------------------------------------
function createProxyInvoker(invoke: PathInvoker) {
  // Recursive helper that keeps track of the property chain
  const build = (segments: string[]): any =>
    new Proxy(function () {}, {
      // ---- Property access: db.foo.bar ----
      get(_target, prop: string | symbol) {
        // Prevent “thenable” detection (await db)
        if (prop === 'then') return undefined;

        // ---- Async iteration: for await (const x of db.foo) ----
        if (prop === Symbol.asyncIterator) {
          // Capture the current path once
          const path = segments.join('.');
          return async function* () {
            const result = await invoke(path, []);
            // If user-supplied handler already gave us an (async) iterable → delegate
            if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
              for await (const v of result as AsyncIterable<unknown>) yield v;
            } else if (result && typeof (result as any)[Symbol.iterator] === 'function') {
              for (const v of result as Iterable<unknown>) yield v;
            } else {
              // otherwise just yield the single value
              yield result;
            }
          };
        }

        // Normal property → just extend the path
        return build([...segments, prop.toString()]);
      },

      // ---- Function / template-tag invocation ----
      apply(_target, _thisArg, argList) {
        return invoke(segments.join('.'), argList);
      }
    });

  return build([]); // start with an empty path
}

// ------------------------------------------------------------------
// 3. Example: plug in real logic once, use everywhere
// ------------------------------------------------------------------
const db = createProxyInvoker(async (path, args) => {
  console.log('→ invoke', { path, args });

  // Demo data for the example below
  if (path === 'users') {
    // pretend this came from a DB/API
    return [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];
  }

  return { ok: true }; // default
});

// ------------------------------------------------------------------
// 4. All the syntaxes now work—including async iteration
// ------------------------------------------------------------------
db.this.that.do(123, { testing: true });
//  → invoke { path: 'this.that.do', args: [ 123, { testing: true } ] }

db.get('this', 'that');
//  → invoke { path: 'get', args: [ 'this', 'that' ] }

db('root-call');
//  → invoke { path: '', args: [ 'root-call' ] }

db`tagged template`;
//  → invoke { path: '', args: [ [ 'tagged template' ] ] }

// for await (const user of db.users) {
//   console.log('iter-user', user);
// }
//  → invoke { path: 'users', args: [] }
//  iter-user { id: 1, name: 'Ada' }
//  iter-user { id: 2, name: 'Grace' }