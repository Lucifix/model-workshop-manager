import { providers } from "../lib/catalogProviders.server";
import { badRequest } from "../lib/api.server";
import { CatalogProviderError } from "../providers/types";

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

  const offset = Number(url.searchParams.get("offset") ?? 0);
  try {
    const page = await selected.searchModels(q, {
      offset: Number.isSafeInteger(offset) && offset > 0 ? offset : 0,
    });
    return Response.json({ provider: selected.id, ...page, quota: selected.quota?.() ?? null });
  } catch (err) {
    if (!(err instanceof CatalogProviderError)) {
      throw err;
    }
    // Distinct statuses so the form can tell "out of lookups for today" and
    // "slow down" apart from a plain "no match" (which is a 200 with no results).
    const status = err.code === "unavailable" ? 503 : 429;
    return Response.json(
      { error: err.code, provider: selected.id, quota: selected.quota?.() ?? null },
      { status },
    );
  }
}
