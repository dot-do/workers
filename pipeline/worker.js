import { ulid as generateULID } from 'ulid'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let tailInstance = Math.random().toString(36).substring(2, 10) 
let tailEvents = 0
let tailStart = Date.now()

export default {
  async tail(events, env) {
    // if (!tailInstance) tailInstance = ulid()
    let retries = 0
    tailEvents ++
    const $ts = Date.now()
    const ulid = generateULID(events[0].eventTimestamp)
    const url = events.map(e => e.event?.request?.url).filter(Boolean)[0]
    const serializableEvents = JSON.parse(JSON.stringify({ type: 'Worker.Executed', $ts, events, tailInstance, tailEvents, tailStart, tailDuration: $ts - tailStart, url, ulid }))

    // // Convert TraceItem objects to plain serializable objects using JSON
    // const serializableEvents = events.map(traceItem => {
    //   // JSON.stringify/parse automatically handles non-serializable properties


    //   // let invocation = traceItem.event.request ? traceItem.event.request : traceItem.event.response
    //   let invocation = 'unknown'  // TODO: Figure out all of the possible values for this
    //   if (traceItem.event.request) invocation = 'request'
    //   if (traceItem.event.rpcMethod) invocation = traceItem.event.rpcMethod
    //   if (traceItem.event.rcptTo) invocation =  'email' // traceItem.event.rcptTo


    //   let type = traceItem.scriptName + '.' + invocation + '.' + traceItem.outcome
    //   if (traceItem.dispatchNamespace) type = traceItem.dispatchNamespace + '.' + type
        
    //   // let type = 'Worker.Execution'
    //   // if (traceItem.event.request) type = 'Worker.Request'
      

    //   const serialized = JSON.parse(JSON.stringify(traceItem))
      
    //   // Add our custom properties
    //   serialized.ulid = ulid(traceItem.eventTimestamp || Date.now())
    //   // serialized.type = 'WorkerExecution' // TODO: figure out {scriptName}.{functionName} (which could be request, RPC, etc ... )
    //   serialized.tailInstance = tailInstance
    //   serialized.tailRetries = retries
    //   serialized.type = type

    //   // if (traceItem.)
      
    //   return serialized
    // })
    
    while (retries < 5) {
      try {
        await env.pipeline.send([serializableEvents])
        break
      } catch (e) {
        console.error(`Failed to send events (attempt ${retries + 1}):`, e.message)
        retries++
        if (retries < 5) {
          await sleep(retries ** 2 * 1000)
          // Update retry count in events
          // serializableEvents.forEach(event => {
          //   event.tailRetries = retries
          // })
        } else {
          throw e
        }
      }
    }
  }
}