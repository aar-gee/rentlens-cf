import type { FC } from "hono/jsx";
import { PROVENANCE_LABEL } from "../../data/society";

// ProvenanceBadge — a small honest label for where a society's numbers come
// from (Indicative / Estimated / Resident-reported), linking to the
// explanation on /how-it-works#labels. Dot: seed=faint, estimated=marigold,
// resident=success (so resident data visibly outranks bootstrap data).
export const ProvenanceBadge: FC<{ provenance: string }> = ({ provenance }) => {
  const label = PROVENANCE_LABEL[provenance] ?? PROVENANCE_LABEL.seed;
  const dot = provenance === "resident" ? "bg-success" : provenance === "estimated" ? "bg-marigold" : "bg-ink-faint";
  return (
    <a
      href="/how-it-works#labels"
      title="How we label our data — what this means"
      class="inline-flex items-center gap-1.5 num text-[10px] tracking-[0.14em] uppercase text-ink-mute bg-parchment-deep/60 border border-hairline rounded px-2 py-0.5 hover:border-ink-mute transition-colors no-underline"
    >
      <span class={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </a>
  );
};
