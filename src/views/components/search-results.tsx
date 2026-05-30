import type { FC } from "hono/jsx";
import type { Society } from "../../data/society";

// Port of components/search_results.templ — the autocomplete dropdown body.
// picker=false (homepage hero): rows are <a> that navigate to the society.
// picker=true (submit form): rows are <button data-pick> handled by
// pickerScript, which fills the form's society inputs without navigating.

const rowHref = (s: Society) => `/societies/${s.slug}`;

function rowMeta(soc: Society): string {
  let reports = "— reports";
  if (soc.reportCount != null) reports = soc.reportCount === 1 ? "1 report" : `${soc.reportCount} reports`;
  return soc.locality === "" ? reports : `${soc.locality} · ${reports}`;
}

const rowClass = (last: boolean) =>
  "flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-parchment-deep/50 transition-colors no-underline cursor-pointer" +
  (last ? "" : " border-b border-hairline");

const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-ink-faint flex-shrink-0">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const RowBody: FC<{ soc: Society }> = ({ soc }) => (
  <>
    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-ink truncate leading-tight">{soc.name}</div>
      <div class="text-xs text-ink-faint mt-0.5 truncate num">{rowMeta(soc)}</div>
    </div>
    <Arrow />
  </>
);

// Picker buttons additionally carry the society's locality so the submit
// form's area input pre-fills on pick (user feedback 2026-05-30). The
// PICKER_SCRIPT writes the locality only when data-locality is non-empty —
// picks against legacy seed rows with no locality won't clobber whatever the
// user already typed. Duplicate-name societies in different areas are
// disambiguated by the row metadata (locality shown in the second line);
// once the user picks the right row, locality fills from that row.
const SearchRow: FC<{ soc: Society; last: boolean; picker: boolean }> = ({ soc, last, picker }) =>
  picker ? (
    <button
      type="button"
      data-pick
      data-name={soc.name}
      data-slug={soc.slug}
      data-locality={soc.locality}
      data-target-name="submit-society-name"
      data-target-slug="submit-society-slug"
      data-target-locality="submit-locality"
      data-target-results="submit-society-results"
      class={rowClass(last) + " w-full text-left bg-transparent"}
    >
      <RowBody soc={soc} />
    </button>
  ) : (
    <a href={rowHref(soc)} class={rowClass(last)}>
      <RowBody soc={soc} />
    </a>
  );

const MatchList: FC<{ results: Society[]; picker: boolean }> = ({ results, picker }) => (
  <div class="bg-white border border-hairline shadow-md overflow-hidden">
    {results.map((soc, i) => (
      <SearchRow soc={soc} last={i === results.length - 1} picker={picker} />
    ))}
  </div>
);

// searchAddNewAffordance: lets a contributor pick their typed name as a new
// society (fills society_name, leaves society_slug empty → pending-society).
const AddNewAffordance: FC<{ query: string }> = ({ query }) => (
  <div class="bg-white border border-hairline shadow-md overflow-hidden">
    <button
      type="button"
      data-pick
      data-name={query}
      data-slug=""
      data-target-name="submit-society-name"
      data-target-slug="submit-society-slug"
      data-target-results="submit-society-results"
      class="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-parchment-deep/50 transition-colors bg-transparent cursor-pointer"
    >
      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-marigold/15 text-marigold-deep flex-shrink-0 font-medium text-base leading-none">
        +
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-sm text-ink leading-tight">
          Add new society: <span class="font-medium">"{query}"</span>
        </div>
        <div class="text-xs text-ink-faint mt-0.5 leading-tight">
          We'll review and add it — your rental data goes into the queue.
        </div>
      </div>
      <Arrow />
    </button>
  </div>
);

const EmptyState: FC<{ query: string }> = ({ query }) => (
  <div class="bg-white border border-hairline shadow-md p-5">
    <div class="eyebrow mb-2">No matches</div>
    <p class="text-sm text-ink-mute leading-relaxed">
      We don't have a society called "{query}" yet.
      <a href="/submit" class="text-marigold hover:text-marigold-deep font-medium ml-1 link-u">
        Tell us about it →
      </a>
    </p>
  </div>
);

export const SearchResults: FC<{ query: string; results: Society[]; picker: boolean }> = ({
  query,
  results,
  picker,
}) => {
  if (results.length > 0) return <MatchList results={results} picker={picker} />;
  if (query !== "" && picker && query.length >= 3) return <AddNewAffordance query={query} />;
  if (query !== "" && !picker) return <EmptyState query={query} />;
  return <></>;
};
