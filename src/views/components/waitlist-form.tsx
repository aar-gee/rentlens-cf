import type { FC } from "hono/jsx";

// Waitlist capture (RENT-swwqpyth) for sparse society pages. HTMX-inline:
// posts to /waitlist, swaps the #waitlist-box innerHTML with WaitlistInner
// (form-with-error or the done confirmation). Anti-spam is a honeypot field
// (`company`, hidden — bots fill it) plus a per-IP rate cap server-side, so no
// Turnstile widget is needed on this page.

type InnerProps = {
  slug: string;
  name: string;
  done?: boolean;
  email?: string; // shown in the done state
  error?: string;
};

export const WaitlistInner: FC<InnerProps> = ({ slug, name, done, email, error }) => {
  if (done) {
    return (
      <div class="flex items-start gap-3 bg-marigold/10 border border-marigold/30 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 16 16" class="text-marigold-deep flex-shrink-0 mt-0.5">
          <path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none" />
        </svg>
        <div class="text-sm text-ink leading-relaxed">
          You're on the list{email ? <> as <span class="font-medium">{email}</span></> : null}. We'll email you once{" "}
          {name} has resident-reported data — once, then never again unless you ask.
        </div>
      </div>
    );
  }
  return (
    <form hx-post="/waitlist" hx-target="#waitlist-box" hx-swap="innerHTML" class="space-y-2.5">
      <input type="hidden" name="society_slug" value={slug} />
      <input type="hidden" name="society_name" value={name} />
      {/* Honeypot — off-screen, not announced. A filled value = bot → silent drop. */}
      <input
        type="text"
        name="company"
        tabindex={-1}
        autocomplete="off"
        aria-hidden="true"
        class="absolute w-px h-px -m-px overflow-hidden"
        style="clip:rect(0 0 0 0)"
      />
      <div class="flex items-stretch gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@email.com"
          class="flex-1 min-w-0 px-3 py-2.5 bg-white border border-hairline focus:border-ink focus:outline-none text-sm"
        />
        <button
          type="submit"
          class="bg-ink text-parchment px-4 py-2.5 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors whitespace-nowrap"
        >
          Notify me
        </button>
      </div>
      {error ? <div class="text-xs text-danger leading-relaxed">{error}</div> : null}
    </form>
  );
};

// WaitlistBox — the bordered card placed on the sparse page. Carries the
// swap target #waitlist-box around WaitlistInner.
export const WaitlistBox: FC<{ slug: string; name: string }> = ({ slug, name }) => (
  <div class="mt-6 bg-white border border-hairline p-5 sm:p-6">
    <div class="eyebrow mb-2">/ Get notified</div>
    <p class="text-sm text-ink-mute leading-relaxed mb-4 max-w-[460px]">
      Want to know the moment {name} has real resident reports? Leave your email — we'll ping you once, when it's worth
      your time.
    </p>
    <div id="waitlist-box">
      <WaitlistInner slug={slug} name={name} />
    </div>
  </div>
);
