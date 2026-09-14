import { hasCredential } from "../lib/credentials.server";
import { getSession, isSessionAuthenticated } from "../lib/session.server";

export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("Cookie");
  // Deliberately the same check the route middleware uses, expiry included —
  // if this said "authenticated" on a session the guards reject, the UI would
  // render the whole logged-in shell against an API answering 401.
  const authenticated = await isSessionAuthenticated(cookie);
  const session = await getSession(cookie);
  return Response.json({
    authenticated,
    username: authenticated ? session.get("username") : undefined,
    // Tells AuthGate (app/root.tsx) to show the one-time setup screen
    // instead of the login form — true only until POST /api/auth/setup
    // creates the one credential row.
    needsSetup: !hasCredential(),
  });
}
