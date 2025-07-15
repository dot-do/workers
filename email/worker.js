import * as PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    const parser = new PostalMime.default()
    const rawEmail = new Response(message.raw)
    const email = await parser.parse(await rawEmail.arrayBuffer())
    console.log(email)
    email.$type = 'Email.Received'
    email.type = 'Email.Received'
    email.$ts = new Date().toISOString()
    console.log(email)
    await env.pipeline.send([email])
  },
}