import type { FC } from "hono/jsx";

// AddSocietyCard — the dashed "+ Add a society" tile leading the scroll row.
// Port of components/add_society_card.templ.
export const AddSocietyCard: FC = () => (
  <a
    href="#contribute"
    class="flex-shrink-0 w-[210px] sm:w-[230px] h-[230px] border border-dashed border-hairline-strong hover:border-marigold hover:bg-marigold/5 transition-all flex flex-col items-center justify-center gap-3 group"
  >
    <div class="w-10 h-10 rounded-full bg-parchment-deep group-hover:bg-marigold group-hover:text-parchment flex items-center justify-center transition-colors">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </div>
    <span class="text-sm font-medium text-ink-mute group-hover:text-marigold transition-colors">
      Add a society
    </span>
  </a>
);
