import { z } from "zod";
import { checkCredentials } from "../lib/auth.server";
import { getSession, sessionStorage } from "../lib/session.server";
import { parseBody } from "../lib/validate.server";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function action({ request }: { request: Request }) {
  const body = parseBody(loginSchema, await request.json());

  if (!checkCredentials(body.username, body.password)) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("authenticated", true);
  session.set("username", body.username);

  return Response.json(
    { authenticated: true, username: body.username },
    { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } },
  );
}
