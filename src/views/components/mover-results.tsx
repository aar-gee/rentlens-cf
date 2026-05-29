import type { FC } from "hono/jsx";

// MoverResults — picker-mode dropdown for the submit form's mover
// autocomplete. Canonical-match rows stamp data-canonical="true"; the add-new
// affordance stamps "false" so the handler sets moverNeedsReview. Port of
// components/mover_results.templ.
const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-ink-faint flex-shrink-0">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const MatchRow: FC<{ name: string; last: boolean }> = ({ name, last }) => (
  <button
    type="button"
    data-pick
    data-name={name}
    data-canonical="true"
    data-target-name="submit-mover-name"
    data-target-results="submit-mover-results"
    data-target-canonical="submit-mover-canonical"
    class={
      "flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-parchment-deep/50 transition-colors no-underline cursor-pointer w-full text-left bg-transparent" +
      (last ? "" : " border-b border-hairline")
    }
  >
    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-ink truncate leading-tight">{name}</div>
    </div>
    <Arrow />
  </button>
);

const AddNewRow: FC<{ query: string; hasPriorRows: boolean }> = ({ query, hasPriorRows }) => (
  <button
    type="button"
    data-pick
    data-name={query}
    data-canonical="false"
    data-target-name="submit-mover-name"
    data-target-results="submit-mover-results"
    data-target-canonical="submit-mover-canonical"
    class={
      "flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-parchment-deep/50 transition-colors bg-transparent cursor-pointer" +
      (hasPriorRows ? " border-t border-hairline" : "")
    }
  >
    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-marigold/15 text-marigold-deep flex-shrink-0 font-medium text-base leading-none">
      +
    </span>
    <div class="min-w-0 flex-1">
      <div class="text-sm text-ink leading-tight">
        Add new mover: <span class="font-medium">"{query}"</span>
      </div>
      <div class="text-xs text-ink-faint mt-0.5 leading-tight">We'll review duplicates and merge later.</div>
    </div>
    <Arrow />
  </button>
);

export const MoverResults: FC<{ query: string; matches: string[]; exact: boolean }> = ({ query, matches, exact }) => {
  if (query === "") return <></>;
  if (matches.length === 0) {
    return (
      <div class="bg-white border border-hairline shadow-md overflow-hidden">
        <AddNewRow query={query} hasPriorRows={false} />
      </div>
    );
  }
  return (
    <div class="bg-white border border-hairline shadow-md overflow-hidden">
      {matches.map((name, i) => (
        <MatchRow name={name} last={i === matches.length - 1 && exact} />
      ))}
      {!exact ? <AddNewRow query={query} hasPriorRows={true} /> : null}
    </div>
  );
};
