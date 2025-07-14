import { ulid } from 'ulid'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let tailInstance

export default {
  async tail(events, env) {
    if (!tailInstance) tailInstance = ulid()
    let retries = 0
    while (retries < 5) {
      try {
        const results = await env.pipeline.send(
          events.map((e => {
            e.ulid = ulid(e.eventTimestamp)
            e.type = 'WorkerExecution'
            e.tailInstance = tailInstance
            e.tailRetries = retries
            return e
          }))
        )
        break
      } catch (e) {
        retries++
        await sleep(retries ** 2 * 1000)
      }
    }
  }
}