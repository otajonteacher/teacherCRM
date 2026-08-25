/**
 * DIAGRAMMALAR — QO'LDA YOZILGAN SVG
 * ==================================
 *
 * Loyihaga diagramma kutubxonasi (recharts, chart.js va h.k.) QO'SHILMADI.
 * Sabab: bunday paket 100–300 KB JavaScript olib keladi va butun sahifani
 * klientga ko'chirishga majbur qiladi. Bizga esa faqat gorizontal ustunlar
 * kerak — bu oddiy SVG bilan bir necha qator kodda chiziladi.
 *
 * Natijada bu komponentlar SERVER komponent bo'lib qoladi ("use client" yo'q):
 * diagrammalar HTML bo'lib keladi, brauzerda hech qanday qo'shimcha kod
 * ishlamaydi, sahifa darhol ko'rinadi.
 *
 * RANG: har bir ustunning rangi tashqaridan beriladi va u `CHART_COLORS`
 * ro'yxatidan olinadi — tasodifiy rang ishlatilmaydi, aks holda ikki fan
 * bir xil rangda chiqib, egasining "diagrammalar bir-biriga qo'shilib
 * ketmasin" talabi buzilardi.
 */

export type ChartBar = {
  label: string;
  value: number;
  color: string;
};

export type ChartGroup = {
  label: string;
  bars: ChartBar[];
};

// SVG o'lchovlari nisbiy: `viewBox` + `w-full` tufayli diagramma konteynerga
// moslashadi, shuning uchun bu raqamlar piksel emas, proporsiya.
const LABEL_WIDTH = 150;
const PLOT_WIDTH = 420;
const VALUE_WIDTH = 46;
const TOTAL_WIDTH = LABEL_WIDTH + PLOT_WIDTH + VALUE_WIDTH;

function barWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  const safe = value < 0 ? 0 : value > max ? max : value;
  // Nolga teng bo'lmagan kichik qiymat ham ko'rinib turishi kerak.
  return Math.max((safe / max) * PLOT_WIDTH, value > 0 ? 2 : 0);
}

/** Oddiy gorizontal ustunli diagramma: bitta qator = bitta obyekt. */
export function BarChart({
  bars,
  max = 100,
}: {
  bars: ChartBar[];
  max?: number;
}) {
  if (bars.length === 0) return null;

  const rowHeight = 26;
  const height = bars.length * rowHeight + 8;

  return (
    <svg
      viewBox={`0 0 ${TOTAL_WIDTH} ${height}`}
      preserveAspectRatio="xMinYMin meet"
      className="w-full"
      role="img"
    >
      {bars.map((bar, index) => {
        const y = index * rowHeight + 4;
        const width = barWidth(bar.value, max);
        return (
          <g key={`${bar.label}-${index}`}>
            <text
              x={LABEL_WIDTH - 8}
              y={y + 14}
              textAnchor="end"
              fontSize="11"
              fill="#334155"
            >
              {bar.label}
            </text>
            <rect
              x={LABEL_WIDTH}
              y={y + 3}
              width={width}
              height={rowHeight - 10}
              rx="2"
              fill={bar.color}
            />
            <text
              x={LABEL_WIDTH + width + 6}
              y={y + 14}
              fontSize="11"
              fontWeight="600"
              fill="#0f172a"
            >
              {bar.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Guruhlangan diagramma: bitta guruh ichida bir necha ustun.
 *
 * Yil bo'yicha ko'rinish uchun kerak — har fan bir guruh, ichida choraklar
 * yonma-yon turadi. Shunda o'sish yoki pasayish ko'z bilan ko'rinadi.
 */
export function GroupedBarChart({
  groups,
  max = 100,
}: {
  groups: ChartGroup[];
  max?: number;
}) {
  if (groups.length === 0) return null;

  const barHeight = 14;
  const groupGap = 12;
  const groupHeights = groups.map((group) => group.bars.length * barHeight);
  const height =
    groupHeights.reduce((total, value) => total + value, 0) +
    groups.length * groupGap +
    8;

  let cursor = 4;

  return (
    <svg
      viewBox={`0 0 ${TOTAL_WIDTH} ${height}`}
      preserveAspectRatio="xMinYMin meet"
      className="w-full"
      role="img"
    >
      {groups.map((group, groupIndex) => {
        const top = cursor;
        cursor += group.bars.length * barHeight + groupGap;
        const middle = top + (group.bars.length * barHeight) / 2;

        return (
          <g key={`${group.label}-${groupIndex}`}>
            <text
              x={LABEL_WIDTH - 8}
              y={middle + 4}
              textAnchor="end"
              fontSize="11"
              fill="#334155"
            >
              {group.label}
            </text>
            {group.bars.map((bar, barIndex) => {
              const y = top + barIndex * barHeight;
              const width = barWidth(bar.value, max);
              return (
                <g key={`${group.label}-${bar.label}-${barIndex}`}>
                  <rect
                    x={LABEL_WIDTH}
                    y={y + 2}
                    width={width}
                    height={barHeight - 4}
                    rx="2"
                    fill={bar.color}
                  />
                  <text
                    x={LABEL_WIDTH + width + 6}
                    y={y + barHeight - 4}
                    fontSize="10"
                    fill="#475569"
                  >
                    {bar.value}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Ranglar izohi — guruhlangan diagrammada qaysi rang nima ekanini bildiradi. */
export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
