import { WorkerEntrypoint } from 'cloudflare:workers'
import { parse, stringify } from 'yaml'

class YamlWorker extends WorkerEntrypoint {
  parse(...args: Parameters<typeof parse>) {
    return parse(...args)
  }

  stringify(...args: Parameters<typeof stringify>) {
    return stringify(...args)
  }

  fetch() {
    return Response.json({ success: true })
  }
}

// Create a proxy that logs every property access, assignment, and method invocation.
const ProxiedWorker: typeof YamlWorker = new Proxy(YamlWorker, {
  // Log construction of the worker and wrap the resulting instance in a proxy
  construct(target, args, newTarget) {
    console.log("Constructing YamlWorker with args:", args)
    const instance = Reflect.construct(target, args, newTarget)

    return new Proxy(instance, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver)
        console.log(`Accessed property: ${String(prop)}`)

        // If the accessed property is a function, wrap it to log its invocation
        if (typeof value === "function") {
          return (...fnArgs: unknown[]) => {
            console.log(`Called method: ${String(prop)} with arguments:`, fnArgs)
            return (value as Function).apply(target, fnArgs)
          }
        }

        return value
      },
      set(target, prop, value, receiver) {
        console.log(`Set property: ${String(prop)} to`, value)
        return Reflect.set(target, prop, value, receiver)
      },
    })
  },
})

export default ProxiedWorker;
