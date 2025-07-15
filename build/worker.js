import { Container, getContainer } from "@cloudflare/containers";

export class MyContainer extends Container {
  defaultPort = 4000; // Port the container is listening on
  sleepAfter = "10m"; // Stop the instance if requests not sent for 10 minutes
}

export default {
  async fetch(request, env) {
    const { "session-id": sessionId } = await request.json();
    // Get the container instance for the given session ID
    const containerInstance = getContainer(env.MY_CONTAINER, sessionId)
    // Pass the request to the container instance on its default port
    return containerInstance.fetch(request);
  }
}