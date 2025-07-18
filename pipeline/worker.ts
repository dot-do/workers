import { ulid as generateULID } from 'ulid'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
let tailInstance = Math.random().toString(36).substring(2, 10) 
let tailEvents = 0
let tailStart: number | undefined //= Date.now()

export default {
  async tail(events, env) {
    // await env.pipeline.send(events)
    // if (!tailInstance) tailInstance = ulid()
    if (!tailStart) tailStart = Date.now()
    const ulid = generateULID(events[0]?.eventTimestamp ?? Date.now())
    const updatedEvents = events.map(e => {
      // @ts-ignore
      let type = e.event?.scriptName || ''
      // @ts-ignore
      if (e.dispatchNamespace) type = e.dispatchNamespace + '.' + type
      // @ts-ignore
      if (e.event?.rpcMethod) type = type + '.' + e.event?.rpcMethod
      // @ts-ignore
      if (e.event?.request) {
        type = type + '.fetch'
        // @ts-ignore
        e.url = e.event?.request?.url
      }
      // @ts-ignore
      if (e.event?.rcptTo) {
        type = type + '.email'
        // @ts-ignore
        e.url = 'mailto:' + e.event?.rcptTo
      }
      // @ts-ignore
      if (e.event?.scheduledTime) {
        type = type + '.schedule'
        // @ts-ignore
        // e.url = 'https://cron.do/' + new Date(e.event?.scheduledTime).toISOString()
      }
      // @ts-ignore
      if (e.event?.cron) type = type + '.' + e.event.cron
      // @ts-ignore
      if (e.event?.queue) type = type + '.queue.' + e.event.queue
      // @ts-ignore
      if (e.event?.outcome) type = type + '.' + e.event?.outcome
      // @ts-ignore
      e.type = type
      // @ts-ignore
      e.ulid = ulid
      // @ts-ignore
      // e.workerName = e.workerName || 'unknown'
      return e
    })

    let retries = 0
    tailEvents ++
    const $ts = Date.now()
    // const url = events.map(e => e.event?.request?.url).filter(Boolean)[0]
    // @ts-ignore
    const ray = events[0]?.event?.request?.headers?.['cf-ray']

    // const serializableEvents = JSON.parse(JSON.stringify({ type: 'Worker.Executed', $ts, events, tailInstance, tailEvents, tailStart, tailDuration: $ts - tailStart, url, ulid, ray }))

    // const serializableEvents = JSON.parse(JSON.stringify(events))
    const serializableEvents = JSON.parse(JSON.stringify(updatedEvents))
    // serializableEvents.forEach((e: any) => {
    //   e.ulid = ulid
    //   e.ray = ray
    //   // e.url = url
    //   e.type = e.workerName + '.' + e.event?.rpcMethod || 'fetch'
    //   // e.tailInstance = tailInstance
    //   // e.tailEvents = tailEvents
    //   // e.tailStart = tailStart
    //   // e.tailDuration = $ts - tailStart
    // })


    // const serializableEvents = { type: 'Worker.Executed', $ts, events, tailInstance, tailEvents, tailStart, tailDuration: $ts - tailStart, url, ulid }

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
        // await env.pipeline.send([serializableEvents])
        await env.pipeline.send(serializableEvents)
        break
      } catch (e) {
        console.error(`Failed to send events (attempt ${retries + 1}):`, (e as Error).message)
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
} satisfies ExportedHandler<Env>