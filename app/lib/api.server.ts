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

export function idParam(params: Record<string, string | undefined>, key = "id"): number {
  return Number(params[key]);
}
