// --------------------------------------------------------
// 1. Signature of the callback that actually does the work
// --------------------------------------------------------
type PathInvoker = (path: string, args: unknown[]) => unknown;

// --------------------------------------------------------
// 2. Factory: returns your fully-featured `db` object
// --------------------------------------------------------
function createProxyInvoker(invoke: PathInvoker) {
  // A tiny helper that (recursively) returns a fresh proxy
  const build = (segments: string[]): any =>
    new Proxy(function () {}, {
      // --- Property access: db.foo.bar ---
      get(_target, prop: string | symbol) {
        // Make TS happy & avoid strange Promise behaviour when someone does `await db`
        if (prop === 'then') return undefined;
        if (typeof prop === 'symbol') return build([...segments, prop.toString()]);
        return build([...segments, prop]);
      },

      // --- Function / template-tag invocation: db(...) / db`...` / db.foo() ---
      apply(_target, _thisArg, argList) {
        const path = segments.join('.');           // e.g. "foo.bar.baz"
        return invoke(path, argList);              // delegate the call
      }
    });

  // Start with an *empty* path (calling plain `db()` yields path === "")
  return build([]);
}

// --------------------------------------------------------
// 3. Example: plug in your own handler
// --------------------------------------------------------
const db = createProxyInvoker((path, args) => {
  console.log('→ invoke:', { path, args });
  // ...replace the line above with real logic (fetch, RPC, eval, etc.)...
});

// --------------------------------------------------------
// 4. Usage examples (all log the path string + args array)
// --------------------------------------------------------
db.this.that.do(123, { testing: true }); // { path: "this.that.do", args: [123, {...}] }
db.get('this', 'that');                  // { path: "get",           args: ["this","that"] }
db('test');                              // { path: "",              args: ["test"] }
db`testing`;                             // { path: "",              args: [["testing"],] }