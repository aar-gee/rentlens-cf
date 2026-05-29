import type { FC } from "hono/jsx";

// Port of components/pill_row.templ.
export type PillItem = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  hint?: string;
  // Filter value emitted as data-value. Non-empty → interactive pill.
  // Use "*" for the reset pill ("All"/"Any"). Empty → static pill.
  value?: string;
};

// firstRowHint returns the first Hint from a non-disabled item — the
// row-level context note. Disabled items keep their hint inline.
function firstRowHint(items: PillItem[]): string {
  for (const it of items) {
    if (it.disabled) continue;
    if (it.hint) return it.hint;
  }
  return "";
}

const PillButton: FC<{ it: PillItem }> = ({ it }) => {
  if (it.disabled) {
    return (
      <button class="pill px-3 sm:px-3.5 py-1.5 text-sm text-ink-faint cursor-not-allowed" disabled>
        {it.label}
        {it.hint ? <span class="text-[10px] num ml-1">{it.hint}</span> : null}
      </button>
    );
  }
  if (it.value) {
    return it.active ? (
      <button
        type="button"
        class="pill is-active px-3 sm:px-3.5 py-1.5 text-sm bg-ink text-parchment"
        data-value={it.value}
        onclick="rentlensPillClick(this)"
      >
        {it.label}
      </button>
    ) : (
      <button
        type="button"
        class="pill px-3 sm:px-3.5 py-1.5 text-sm text-ink-mute"
        data-value={it.value}
        onclick="rentlensPillClick(this)"
      >
        {it.label}
      </button>
    );
  }
  return it.active ? (
    <button type="button" class="pill is-active px-3 sm:px-3.5 py-1.5 text-sm bg-ink text-parchment">
      {it.label}
    </button>
  ) : (
    <button type="button" class="pill px-3 sm:px-3.5 py-1.5 text-sm text-ink-mute">
      {it.label}
    </button>
  );
};

// PillRow — centred labelled row of filter pills (hero Area/BHK).
export const PillRow: FC<{ label: string; items: PillItem[] }> = ({ label, items }) => {
  const hint = firstRowHint(items);
  return (
    <div class="flex flex-wrap items-center justify-center gap-1.5">
      <span class="eyebrow mr-1 sm:mr-2 w-full sm:w-auto text-center">
        {label}
        {hint ? <span class="text-[10px] num ml-1">{hint}</span> : null}
      </span>
      {items.map((it) => (
        <PillButton it={it} />
      ))}
    </div>
  );
};

// PillRowLeft — left-aligned variant (society-page filter bar).
export const PillRowLeft: FC<{ label: string; items: PillItem[] }> = ({ label, items }) => (
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="eyebrow mr-2 w-20">{label}</span>
    {items.map((it) => (
      <PillButton it={it} />
    ))}
  </div>
);
