export default {
  // this event is fired when the dispatched Workers make a subrequest
  async fetch(request, env, ctx) {

    ctx.waitUntil(
      env.pipeline.send([{
        type: 'OutboundRequest.Fetch',
        url: request.url,
        // env,
        startTime: new Date().toISOString(),
      }]).catch(console.error)
    )

    // env contains the values we set in `dispatcher.get()`
    // const customer_name = env.customer_name;
    // const original_url = env.url;

    // log the request
    // ctx.waitUntil(fetch(
    //   'https://logs.example.com',
    //   {
    //     method: 'POST',
    //     body: JSON.stringify({
    //       customer_name,
    //       original_url,
    //     }),
    //   },
    // ));

    // const url = new URL(original_url);
    // if (url.host === 'api.example.com') {
    //   // pre-auth requests to our API
    //   const jwt = '' // make_jwt_for_customer(customer_name);

    //   let headers = new Headers(request.headers);
    //   headers.set('Authorization', `Bearer ${jwt}`);

    //   // clone the request to set new headers using existing body
    //   let new_request = new Request(request, {headers});

    //   return fetch(new_request)
    // }

    // if (request.url === 'https://default') {
    try {
      return Response.json({ success: true, from: 'outbound' })
    } catch (e) {
      console.error(e)
      return Response.json({ success: false, from: 'outbound', error: (e as any).message })
    }
    // }

    return fetch(request)
  }
} satisfies ExportedHandler<Env>