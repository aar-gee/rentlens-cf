import type { FC } from "hono/jsx";

// renderEmphMarkers converts our curated <emph>/<accent> tokens to design-
// system spans. Input is hand-curated in-repo, so raw HTML is safe here.
export function renderEmphMarkers(s: string): string {
  return s
    .replaceAll("<emph>", '<span class="emph">')
    .replaceAll("</emph>", "</span>")
    .replaceAll("<accent>", '<span class="emph-accent">')
    .replaceAll("</accent>", "</span>");
}

// RawEmphParagraph renders marker text as an HTML fragment inline (caller
// controls surrounding text styling).
export const RawEmphParagraph: FC<{ text: string }> = ({ text }) => (
  <span dangerouslySetInnerHTML={{ __html: renderEmphMarkers(text) }} />
);

const notesFooter = (n: number) =>
  n === 1
    ? "Summarized from 1 open-ended note · individual notes are private"
    : `Summarized from ${n} open-ended notes · individual notes are private`;

// NotesSummary — the "Resident notes · summarized" block.
export const NotesSummary: FC<{ summary: string; sampleSize: number }> = ({ summary, sampleSize }) => (
  <div class="mt-6 bg-white border border-hairline p-6 sm:p-7">
    <div class="flex items-start gap-4">
      <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase mt-1 hidden sm:block">
        Resident notes
      </span>
      <div class="flex-1">
        <div class="eyebrow mb-2 sm:hidden">/ Resident notes · summarized</div>
        <p class="text-base text-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: renderEmphMarkers(summary) }} />
        <p class="text-xs text-ink-faint mt-3 num">{notesFooter(sampleSize)}</p>
      </div>
    </div>
  </div>
);
