import { env, WorkerEntrypoint } from 'cloudflare:workers'

export class SDK extends WorkerEntrypoint {
  async sdk(ns: string) {
    return {
      ai: new Proxy({
        generateText: async (prompt: string) => {
          const result = await (env.ai as any).generateText(prompt)
          return result
        }
      }, {
        get(target, key) {
          return async (...args: any[]) => {
            const result = await (env.ai as any).generateText(args[0])
            return result
          }
        }
      })
    }
  }
}