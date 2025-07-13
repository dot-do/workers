// graft-module.js  ────────────────────────────────────────────
export function graftModule(targetClass, mod) {
  for (const key of Reflect.ownKeys(mod)) {
    if (key === 'default') continue;
    const desc = { enumerable: false, configurable: true,
                   get() { return mod[key]; } };      // live binding
    (typeof mod[key] === 'function'
      ? Object.defineProperty(targetClass.prototype, key, desc)
      : Object.defineProperty(targetClass,          key, desc));
  }
  return targetClass;   // <- important: return the (now-decorated) class
}