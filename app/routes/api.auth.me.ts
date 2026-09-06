import { getSession } from "../lib/session.server";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const authenticated = session.get("authenticated") === true;
  return Response.json({
    authenticated,
    username: authenticated ? session.get("username") : undefined,
  });
}
