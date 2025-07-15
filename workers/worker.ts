import { env, WorkerEntrypoint } from 'cloudflare:workers'

const db: any = env.db
const yaml: any = env.yaml



export default class extends WorkerEntrypoint {

  async do(request: Request, functionName: string, args: any) {
    try {
      // TODO: Implement Auth with WorkOS for RBAC and FGA
      const { origin, hostname, pathname } = new URL(request.url)
      const reqId = request.headers.get('cf-ray')
      const worker = env.do.get(hostname) as any
      const result = await worker.rpc(functionName, args)
      console.log(result)
      this.ctx.waitUntil(db.set(`https://${origin}/_${pathname}`, result))
      return result
    } catch (error) {
      console.error(error)
      return { error: (error as Error).message }
    }
    
  }

  async fetch(request: Request) {
    const { origin, pathname } = new URL(request.url)
    
    // Extract function name and arguments from pattern like /functionName(arg1,arg2,key:value)
    const match = pathname.match(/^\/([^(]+)\(([^)]*)\)$/)
    
    if (!match) {
      // Fallback to original path extraction if not in function call format
      const [path, ...args] = pathname.match(/^(\/[^/]+)\/([^/]+)(?:\?([^#]*))?(?:#(.*))?$/) || []
      const result = await this.do(request, path || '', args)
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json' }
      })
    }
    
    const [, functionName, argsString] = match
    
    // Parse arguments
    const args: any[] = []
    if (argsString) {
      // Split by comma but need to handle key:value pairs
      const tokens = argsString.split(',')
      let currentObj: Record<string, any> | null = null
      
      for (const token of tokens) {
        const trimmed = token.trim()
        
        if (trimmed.includes(':')) {
          // This is a key:value pair
          const [key, value] = trimmed.split(':', 2)
          
          // If we don't have a current object, create one
          if (!currentObj) {
            currentObj = {}
            args.push(currentObj)
          }
          
          // Add the key:value to the current object
          // Try to parse the value as a number if possible
          const parsedValue = isNaN(Number(value)) ? value : Number(value)
          currentObj[key.trim()] = parsedValue
        } else {
          // This is a regular value, not a key:value pair
          // If we had an object, we're done with it
          currentObj = null
          
          // Try to parse as number if possible
          const parsedValue = isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
          args.push(parsedValue)
        }
      }
    }
    
    const result = await this.do(request, `/${functionName}`, args)
    return new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json' }
    })
  }
}

