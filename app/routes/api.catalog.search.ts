import { providers } from "../lib/catalogProviders.server";
import { badRequest } from "../lib/api.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  if (!q) {
    return badRequest("missing_query");
  }

  const selected = providers[provider ?? "manual"];
  if (!selected) {
    return badRequest("unknown_provider");
  }

  const results = await selected.searchModels(q);
  return Response.json({ provider: selected.id, results });
}
