import { providers } from "../lib/catalogProviders.server";
import { badRequest } from "../lib/api.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  if (!q) {
    return badRequest("missing_query");
  }

  // Object.hasOwn, not a truthiness check: `providers` is a plain object, so
  // providers["constructor"] resolves up the prototype chain to a truthy
  // value and would sail past a `!selected` guard into a 500 on
  // selected.searchModels.
  const name = provider ?? "manual";
  if (!Object.hasOwn(providers, name)) {
    return badRequest("unknown_provider");
  }
  const selected = providers[name]!;
  // `enabled !== false`, matching api.catalog.providers.ts: `enabled` is
  // opt-out, and manualProvider (the default here) never sets it at all.
  if (selected.enabled === false) {
    return badRequest("provider_disabled", { provider: selected.id });
  }

  const results = await selected.searchModels(q);
  return Response.json({ provider: selected.id, results });
}
