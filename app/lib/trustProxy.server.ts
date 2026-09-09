/**
 * Parses TRUST_PROXY into a value for Express's `trust proxy` setting.
 *
 * Unset is the default and means "don't trust anything": `req.ip` stays the
 * socket address, so behind a reverse proxy the login rate limiter buckets
 * every client under the proxy's own address — one shared 5/minute budget
 * instead of one per client. That's wrong, but wrong in the direction that
 * locks people out rather than letting attempts through, which is why this
 * stays opt-in instead of being switched on for everyone.
 *
 * `true` is rejected rather than accepted. It tells Express to believe the
 * left-most X-Forwarded-For entry, which is written by the client — so anyone
 * could present a fresh address per request and remove the rate limit
 * altogether, turning a safe misconfiguration into an unsafe one.
 * express-rate-limit rejects it too (ERR_ERL_PERMISSIVE_TRUST_PROXY), but not
 * until the first request reaches the limiter; failing at boot matches how
 * this app already handles the misconfigurations it can see up front.
 */
export function parseTrustProxy(raw: string | undefined): number | string | null {
  const value = raw?.trim();
  if (!value || value === "false") {
    return null;
  }
  if (value === "true") {
    throw new Error(
      "TRUST_PROXY=true is not accepted: it trusts a client-supplied X-Forwarded-For header, " +
        "which lets anyone bypass the login rate limit. Use the number of proxies in front of " +
        'this app (e.g. TRUST_PROXY=1), a preset ("loopback", "linklocal", "uniquelocal"), or an ' +
        "explicit IP/CIDR list.",
    );
  }
  // A hop count — the common case, and the one that stays correct no matter
  // what address the proxy happens to have on the Docker network.
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  // A preset or an IP/CIDR list, both of which Express parses itself.
  return value;
}
