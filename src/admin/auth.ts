// Admin access control. Port of admin/server.go: an obscure URL prefix +
// HTTP Basic Auth (defense in depth). When ADMIN_USER/ADMIN_PASS aren't set,
// every admin route 404s — the admin is disabled and not discoverable.
import type { MiddlewareHandler } from "hono";

// Obscure path segment all admin routes mount under. NOT the security
// boundary (auth is) — it just keeps the admin off opportunistic /admin/ scans.
export const ADMIN_PREFIX = "/x-a9c2d27eab89";

// adminHref prefixes a path with ADMIN_PREFIX (single source of truth).
export const adminHref = (path: string): string => ADMIN_PREFIX + (path.startsWith("/") ? path : "/" + path);

// constantTimeEqual avoids leaking length/content via timing.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseBasic(header: string): { user: string; pass: string } | null {
  const m = /^Basic\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  let decoded: string;
  try {
    decoded = atob(m[1]);
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

type AdminEnv = { ADMIN_USER?: string; ADMIN_PASS?: string };

// adminAuth: 404 when credentials are unconfigured (admin disabled); 401 with
// a Basic challenge on missing/wrong creds; otherwise stamps noindex + sets the
// authenticated username on context (`adminUser`) for the audit log.
export const adminAuth: MiddlewareHandler<{
  Bindings: AdminEnv;
  Variables: { adminUser: string };
}> = async (c, next) => {
  const wantUser = c.env.ADMIN_USER;
  const wantPass = c.env.ADMIN_PASS;
  if (!wantUser || !wantPass) return c.notFound();

  const creds = parseBasic(c.req.header("Authorization") ?? "");
  if (!creds || !constantTimeEqual(creds.user, wantUser) || !constantTimeEqual(creds.pass, wantPass)) {
    c.header("WWW-Authenticate", 'Basic realm="RentLens", charset="UTF-8"');
    return c.text("Unauthorized", 401);
  }
  c.set("adminUser", creds.user);
  c.header("X-Robots-Tag", "noindex, nofollow");
  await next();
};
