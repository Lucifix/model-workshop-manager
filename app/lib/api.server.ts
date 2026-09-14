export function notFound(error = "not_found") {
  return Response.json({ error }, { status: 404 });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export function badRequest(error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status: 400 });
}

export function conflict(error: string, message?: string) {
  return Response.json({ error, message }, { status: 409 });
}

export function methodNotAllowed() {
  return new Response("Method Not Allowed", { status: 405 });
}

// Rejects non-numeric/negative/non-integer ids up front instead of letting
// NaN flow into a Drizzle eq() unchecked.
export function idParam(params: Record<string, string | undefined>, key = "id"): number {
  const value = Number(params[key]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw badRequest("invalid_id");
  }
  return value;
}
