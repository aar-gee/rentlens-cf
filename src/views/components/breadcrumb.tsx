import type { FC } from "hono/jsx";

// BreadcrumbItem — one segment. Empty href marks the current page (plain text).
export type BreadcrumbItem = { label: string; href?: string };

// Breadcrumb — the strip beneath the header on the society page.
export const Breadcrumb: FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <div class="border-b border-hairline bg-parchment-deep/30">
    <div class="max-w-wide mx-auto px-5 sm:px-8 py-3 flex items-center gap-2 text-xs text-ink-mute">
      {items.map((it, i) => (
        <>
          {i > 0 ? <span class="text-ink-faint">/</span> : null}
          {!it.href || it.href === "" ? (
            <span class="text-ink">{it.label}</span>
          ) : (
            <a href={it.href} class="link-u hover:text-ink">
              {it.label}
            </a>
          )}
        </>
      ))}
    </div>
  </div>
);
