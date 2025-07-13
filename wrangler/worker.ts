import { getSandbox } from "@cloudflare/sandbox";
export { Sandbox } from "@cloudflare/sandbox";

export default {
  async fetch(request: Request, env: Env) {
    try {
      const sandbox = getSandbox(env.Sandbox, "sandbox");
      return sandbox.exec("ls", ["-la"]);
    } catch (error: any) {
      return new Response(error.message, { status: 500 });
    }
  },
};