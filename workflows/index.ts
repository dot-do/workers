// import {
//   WorkflowEntrypoint,
//   WorkflowEvent,
//   WorkflowStep,
// } from 'cloudflare:workers';

// type Env = {
//   FETCH_WORKFLOW: Workflow;        // bound in wrangler.toml
// };

// type Params = {
//   urls: string[];                  // supplied by the caller
// };

// export class FetchWorkflow extends WorkflowEntrypoint<Env, Params> {
//   async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
//     const { urls } = event.payload;
//     const results: { url: string; status: number; body: string }[] = [];

//     // sequentially - each fetch gets its own durable “step”
//     for (const url of urls) {
//       const result = await step.do(`fetch ${url}`, async () => {
//         const r = await fetch(url);
//         return { url, status: r.status, body: await r.text() };
//       });
//       results.push(result);
//     }

//     // whatever you return from run() becomes the instance “output”
//     return results;
//   }
// }

// // optional convenience HTTP wrapper
// export default {
//   async fetch(req: Request, env: Env) {
//     if (req.method !== 'POST') {
//       return new Response('POST {"urls":[...]}', { status: 400 });
//     }

//     const { urls } = await req.json();
//     const instance = await env.FETCH_WORKFLOW.create({ urls }); // start run
//     return Response.json({ instanceId: instance.id });
//   },
// };