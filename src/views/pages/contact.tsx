import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { FieldRow } from "./submit";
import { FormLabel, RadioGroup, TextInput, Textarea, CounterScript, type RadioOption } from "../components/form";
import type { ContactFormData } from "../../lib/contact";

type Errors = Record<string, string>;

const categoryOptions: RadioOption[] = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "general", label: "General" },
];

const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const PreviewBanner: FC = () => (
  <div class="bg-parchment-deep border-b border-hairline px-5 sm:px-8 py-3">
    <div class="max-w-base mx-auto text-xs text-ink-mute flex items-start sm:items-center gap-2 leading-relaxed">
      <span class="w-1.5 h-1.5 rounded-full bg-marigold mt-1.5 sm:mt-0 flex-shrink-0" />
      <span class="num text-marigold-deep tracking-[0.14em] uppercase flex-shrink-0">Preview</span>
      <span>
        RentLens is in preview. Your message is saved and reaches the team — replies aren't guaranteed yet, but bug
        reports are prioritised.
      </span>
    </div>
  </div>
);

export const Contact: FC<{ data: ContactFormData; errors: Errors }> = ({ data, errors }) => (
  <Layout
    meta={{
      title: "Contact — RentLens",
      description: "Get in touch with RentLens. Bug reports, feature ideas, and general feedback welcome.",
      path: "/contact",
      ogType: "website",
    }}
  >
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-10 sm:py-16">
      <div class="max-w-narrow mx-auto">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <span class="eyebrow">/ Contact</span>
            <span class="h-px w-8 bg-hairline-strong" />
            <span class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">One field stack</span>
          </div>
          <h1 class="display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tightest leading-[1.02]">
            Get in touch.
          </h1>
          <p class="mt-5 text-base sm:text-lg text-ink-mute max-w-[560px] leading-relaxed">
            Spotted a bug, missing your society, or have an idea? Tell us — it's the fastest way to shape what we build
            next.
          </p>
        </div>
        <form action="/contact" method="post" class="mt-10 sm:mt-12 grid gap-8 sm:gap-10" novalidate>
          <FieldRow label="Your name" helper="So we can address you when we reply." optional>
            <TextInput id="contact-name" name="name" value={data.name} placeholder="e.g. Priya" error={errors.name} />
          </FieldRow>
          <FieldRow label="Email" helper="We only use this to reply to you." required>
            <TextInput
              id="contact-email"
              name="email"
              value={data.email}
              type="email"
              placeholder="you@example.com"
              error={errors.email}
            />
          </FieldRow>
          <FieldRow label="Type" helper="What is this about?" required>
            <RadioGroup name="category" options={categoryOptions} selected={data.category} layout="pills" />
            {errors.category ? <div class="text-xs text-danger mt-2">{errors.category}</div> : null}
          </FieldRow>
          <FieldRow label="Message" helper="Minimum 10 characters." required>
            <Textarea
              id="contact-message"
              name="message"
              value={data.message}
              placeholder="Tell us what happened, what you expected, or what you'd like to see."
              rows={6}
              maxChars={2000}
              error={errors.message}
            />
          </FieldRow>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-2 border-t border-hairline">
            <div class="text-xs text-ink-mute leading-relaxed max-w-[360px]">
              We read everything. Replies aren't guaranteed during preview, but bug reports are prioritised.
            </div>
            <div class="flex items-stretch sm:items-center">
              <button
                type="submit"
                class="inline-flex items-center justify-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight"
              >
                Send message
                <Arrow />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
    <Footer figLabel="Fig. 06 — Contact" />
    <CounterScript />
  </Layout>
);

const SuccessAction: FC<{ title: string; blurb: string; href: string }> = ({ title, blurb, href }) => (
  <a href={href} class="block bg-white border border-hairline p-5 hover:border-ink transition-colors group">
    <div class="text-sm font-medium text-ink mb-1.5 flex items-center justify-between gap-2">
      <span>{title}</span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-ink-faint group-hover:text-ink transition-colors">
        <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </div>
    <div class="text-xs text-ink-mute leading-relaxed">{blurb}</div>
  </a>
);

function successBlurb(category: string): string {
  switch (category) {
    case "bug":
      return "Thanks for the bug report — we'll look into it. Critical issues get triaged first.";
    case "feature":
      return "Thanks for the suggestion. We weigh feature ideas against what makes the data more trustworthy.";
    default:
      return "Thanks for writing in. We read everything that lands here.";
  }
}

export const ContactSuccess: FC<{ category: string }> = ({ category }) => (
  <Layout
    meta={{
      title: "Message sent — RentLens",
      description: "Thanks for getting in touch with RentLens.",
      path: "/contact/success",
      ogType: "website",
    }}
  >
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-14 sm:py-24">
      <div class="max-w-narrow mx-auto text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-marigold/15 mb-7">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" class="text-marigold">
            <path d="M8 16l5 5 11-11" stroke="currentColor" stroke-width="2.25" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
        </div>
        <div class="eyebrow mb-3">/ Message received</div>
        <h1 class="display text-4xl sm:text-6xl md:text-7xl font-normal tracking-tightest leading-[1] mb-6">Got it.</h1>
        <p class="text-base sm:text-xl text-ink-mute max-w-[560px] mx-auto leading-relaxed">{successBlurb(category)}</p>
        <div class="mt-12 sm:mt-14 grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-[520px] mx-auto text-left">
          <SuccessAction title="Back to home" blurb="Browse societies and see rents." href="/" />
          <SuccessAction title="How it works" blurb="Methodology, confidence labels, and FAQ." href="/how-it-works" />
        </div>
      </div>
    </main>
    <Footer figLabel="Fig. 06 — Contact success" />
  </Layout>
);
