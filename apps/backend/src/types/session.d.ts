import "@fastify/secure-session";

declare module "@fastify/secure-session" {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}
