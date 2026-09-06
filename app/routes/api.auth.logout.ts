import { getSession, sessionStorage } from "../lib/session.server";

export async function action({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  return Response.json(
    { authenticated: false },
    { headers: { "Set-Cookie": await sessionStorage.destroySession(session) } },
  );
}
