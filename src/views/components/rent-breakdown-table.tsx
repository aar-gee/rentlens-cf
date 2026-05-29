import type { FC } from "hono/jsx";
import type { RentBreakdownRow } from "../../data/society-detail";
import { formatINR, formatINRRange } from "../../lib/format";

// RentBreakdownTable — BHK × floor-band table. null median rows show a
// "limited data" treatment; a "/ 3 BHK" separator is injected when the BHK
// column changes; the 2nd row of each BHK band gets the alternating tint.

const GRID = "grid grid-cols-[1.4fr_1fr_1.2fr_0.7fr]";

// rentRowTint — re-index within each BHK section; the 2nd row gets tinted.
function rentRowTint(rows: RentBreakdownRow[], idx: number): boolean {
  const bhk = rows[idx].bhk;
  let count = 0;
  for (let i = 0; i <= idx; i++) if (rows[i].bhk === bhk) count++;
  return count === 2;
}

const rangeLabel = (row: RentBreakdownRow): string =>
  row.rangeLow == null || row.rangeHigh == null ? "—" : formatINRRange(row.rangeLow, row.rangeHigh);

const Cells: FC<{ row: RentBreakdownRow }> = ({ row }) => (
  <>
    <div>
      {row.bhk} · {row.floorBand}
    </div>
    <div class="text-right num">{formatINR(row.median as number)}</div>
    <div class="text-right num text-ink-mute">{rangeLabel(row)}</div>
    <div class="text-right num text-ink-mute">{row.reports}</div>
  </>
);

const Row: FC<{ row: RentBreakdownRow; tint: boolean; isLast: boolean }> = ({ row, tint, isLast }) => {
  const border = isLast ? "" : " border-b border-hairline";
  if (row.median == null) {
    return (
      <div class={`${GRID} text-sm px-5 py-3.5${border} items-center`}>
        <div class="text-ink-faint">
          {row.bhk} · {row.floorBand}
        </div>
        <div class="text-right num text-ink-faint">—</div>
        <div class="text-right num text-ink-faint italic">limited data</div>
        <div class="text-right num text-ink-faint">{row.reports}</div>
      </div>
    );
  }
  const tintClass = tint ? " bg-parchment-deep/20" : "";
  return (
    <div class={`${GRID} text-sm px-5 py-3.5${border} items-center${tintClass}`}>
      <Cells row={row} />
    </div>
  );
};

export const RentBreakdownTable: FC<{ rows: RentBreakdownRow[] }> = ({ rows }) => (
  <div class="bg-white border border-hairline overflow-hidden">
    <div
      class={`${GRID} text-xs text-ink-mute eyebrow !normal-case px-5 py-3 border-b border-hairline bg-parchment-deep/40`}
    >
      <div>BHK · floor band</div>
      <div class="text-right">Median</div>
      <div class="text-right">Range</div>
      <div class="text-right">Reports</div>
    </div>
    {rows.map((row, i) => (
      <>
        {i > 0 && rows[i - 1].bhk !== row.bhk ? (
          <div class="px-5 py-2 bg-parchment-deep/60 border-b border-hairline">
            <span class="eyebrow !text-ink-faint">/ {row.bhk}</span>
          </div>
        ) : null}
        <Row row={row} tint={rentRowTint(rows, i)} isLast={i === rows.length - 1} />
      </>
    ))}
  </div>
);
