import { ulid } from 'ulid'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let tailInstance

export default {
  async tail(events, env) {
    if (!tailInstance) tailInstance = ulid()
    let retries = 0
    
    // Convert TraceItem objects to plain serializable objects using JSON
    const serializableEvents = events.map(traceItem => {
      // JSON.stringify/parse automatically handles non-serializable properties
      const serialized = JSON.parse(JSON.stringify(traceItem))
      
      // Add our custom properties
      serialized.ulid = ulid(traceItem.eventTimestamp || Date.now())
      serialized.type = 'WorkerExecution' // TODO: figure out {scriptName}.{functionName} (which could be request, RPC, etc ... )
      serialized.tailInstance = tailInstance
      serialized.tailRetries = retries
      
      return serialized
    })
    
    while (retries < 5) {
      try {
        await env.pipeline.send(serializableEvents)
        break
      } catch (e) {
        console.error(`Failed to send events (attempt ${retries + 1}):`, e.message)
        retries++
        if (retries < 5) {
          await sleep(retries ** 2 * 1000)
          // Update retry count in events
          serializableEvents.forEach(event => {
            event.tailRetries = retries
          })
        } else {
          throw e
        }
      }
    }
  }
}