type EHProps = {
  values: number[];
  bins?: number;
  height?: number;
  className?: string;
  p5?: number | null;
  p95?: number | null;
  mean?: number | null;
  lsl?: number | null;
  usl?: number | null;
  median?: number | null;
};

export default function EnhancedHistogram({
  values,
  bins = 24,
  height = 160,
  className = "",
  p5,
  p95,
  lsl,
  usl,
  mean,
  median,
}: EHProps) {
  if (!values?.length) {
    return <div className="text-sm text-slate-500">No data</div>;
  }

  // --- àÅ×Í¡ªØ´àÊé¹ÍÑµâ¹ÁÑµÔ: ÁÕ lsl/usl -> ãªéÊà»¤, äÁè§Ñé¹ fallback ä» p5/p95 ---
  const useSpec = (lsl != null && isFinite(lsl)) || (usl != null && isFinite(usl));
  const primaryLines = useSpec
    ? [
        lsl != null && isFinite(lsl) ? { v: lsl as number, label: "LSL", tone: "rose" as const } : null,
        usl != null && isFinite(usl) ? { v: usl as number, label: "USL", tone: "rose" as const } : null,
      ]
    : [
        p5  != null && isFinite(p5)   ? { v: p5  as number, label: "P5",  tone: "rose" as const }     : null,
        p95 != null && isFinite(p95)  ? { v: p95 as number, label: "P95", tone: "emerald" as const }  : null,
      ];

  const extraLines = [
    mean   != null && isFinite(mean)   ? { v: mean   as number, label: "Mean",   tone: "sky"    as const } : null,
    median != null && isFinite(median) ? { v: median as number, label: "Median", tone: "violet" as const } : null,
  ];

  const lines = [...primaryLines, ...extraLines].filter(Boolean) as {
    v: number; label: string; tone: "sky" | "violet" | "rose" | "emerald";
  }[];

  // --- domain ÃÇÁ¤èÒ¨ÃÔ§ + àÊé¹ (¡Ñ¹àÊé¹ËÅØ´¡ÃÍº) ---
  const allForDomain = [
    ...values,
    ...lines.map(l => l.v),
  ];
  const minDomain = Math.min(...allForDomain);
  const maxDomain = Math.max(...allForDomain);
  const span = (maxDomain - minDomain) || 1;

  const width = 620;
  const barW = width / bins;

  // --- ÊÃéÒ§ bins/¹Ñº¤ÇÒÁ¶Õè â´Âãªé domain ÃÇÁà´ÕÂÇ¡Ñ¹¡Ñº·ÕèÇÒ´àÊé¹ ---
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const pos = ((v - minDomain) / span) * bins;
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(pos)));
    counts[idx] += 1;
  }
  const maxCount = Math.max(...counts) || 1;

  const xPos = (v: number) => ((v - minDomain) / span) * width;

  const Marker = ({ x, tone }: { x: number; tone: "sky" | "violet" | "rose" | "emerald"; }) => {
    const colors: Record<string, string> = {
      sky: "stroke-sky-500 fill-sky-500",
      violet: "stroke-violet-500 fill-violet-500",
      rose: "stroke-rose-500 fill-rose-500",
      emerald: "stroke-emerald-500 fill-emerald-500",
    };
    return (
      <g transform={`translate(${x},0)`}>
        <line y1={8} y2={height - 18} className={`stroke-2 ${colors[tone]}`} />
      </g>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-2 text-xs">
        {useSpec ? (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> LSL/USL
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> P95
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> P5
            </span>
          </>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
          <span className="w-2 h-2 rounded-full bg-sky-500" /> Mean
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">
          <span className="w-2 h-2 rounded-full bg-violet-500" /> Median
        </span>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* grid */}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = 8 + ((height - 26) * i) / 5;
          return <line key={i} x1={0} x2={width} y1={y} y2={y} className="stroke-slate-200" />;
        })}

        {/* gradient bars */}
        <defs>
          <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {counts.map((c, i) => {
          const h = (c / maxCount) * (height - 26);
          return (
            <rect
              key={i}
              x={i * barW + 1}
              y={height - 18 - h}
              width={Math.max(0, barW - 2)}
              height={h}
              rx={3}
              fill="url(#barGrad)"
            />
          );
        })}

        {/* lines (spec ËÃ×Í percentile) + mean/median */}
        {lines.map((l, i) => (
          <Marker key={i} x={xPos(l.v)} tone={l.tone} />
        ))}

        {/* axis labels */}
        <text x={0} y={height - 2} className="fill-slate-500 text-[10px]">
          {minDomain.toFixed(3)}
        </text>
        <text x={width - 40} y={height - 2} className="fill-slate-500 text-[10px]">
          {maxDomain.toFixed(3)}
        </text>
      </svg>
    </div>
  );
}
