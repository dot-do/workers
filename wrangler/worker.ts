import { getSandbox } from "@cloudflare/sandbox";
export { Sandbox } from "@cloudflare/sandbox";

export default {
  async fetch(request: Request, env: Env) {
    const sandbox = getSandbox(env.Sandbox, "my-sandbox");
    return sandbox.exec("ls", ["-la"]);
  },
};