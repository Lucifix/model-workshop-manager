import { providers } from "../lib/catalogProviders.server";

export async function loader() {
  return Response.json(
    Object.values(providers)
      .filter((p) => p.enabled !== false)
      .map((p) => ({ id: p.id, label: p.label })),
  );
}
