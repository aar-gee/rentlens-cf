import type { FC } from "hono/jsx";

// Turnstile widget — renders the Cloudflare challenge inside a form. The
// api.js script auto-renders any .cf-turnstile div and injects the hidden
// `cf-turnstile-response` token into the enclosing form on success. Renders
// nothing when siteKey is absent (local dev / Turnstile disabled), so forms
// stay usable without keys configured.
export const Turnstile: FC<{ siteKey?: string; error?: string }> = ({ siteKey, error }) => {
  if (!siteKey) return <></>;
  return (
    <div>
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div class="cf-turnstile" data-sitekey={siteKey} />
      {error ? <div class="text-xs text-danger mt-1.5">{error}</div> : null}
    </div>
  );
};
