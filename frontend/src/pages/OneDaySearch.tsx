import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { fmtNum, parseNum, toNum } from "../utils/number";
import ProgRevCards from "../components/ProgRevCards";
import { API_CONFIG } from "../config/routes";
type CpkRow = {
  day: string;
  model: string;
  tester: string;
  test_item: string;
  test_desc: string;
  step: string;
  mean_val: number | null;
  cpk: number | null;
  order_idx: number | null;
  lsl?: number | null;
  usl?: number | null;
  valid_count?: number | null;
  raw_count?: number | null;
  prog_rev?: string | null;
  test_program?: string | null;   // lock ªØ´ä» detail
  occ_idx?: number | null;    // lock ªØ´ä» detail
};

const API_BASE = API_CONFIG.BASE_URL;
const COLS = 13;

/* ---------- save state: à¡çºà©¾ÒÐ¿ÔÅàµÍÃì (¡Ñ¹ quota) ---------- */
type OneDayState = {
  day: string;
  model: string;
  tester: string;
  minCpk: string;
  onlyWithLimits: boolean;
  pageSize: number;
};
const SS_KEY = "oneDaySearchState";
// function Mark({ text, q }: { text: string | number | null | undefined; q: string }) {
//   const s = (text ?? "").toString();
//   const query = q.trim();
//   if (!query) return <>{s}</>;
//   try {
//     const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`, "ig");
//     const parts = s.split(re);
//     return (
//       <>
//         {parts.map((p, i) =>
//           re.test(p) ? (
//             <mark key={i} className="bg-yellow-200 rounded px-0.5">{p}</mark>
//           ) : (
//             <span key={i}>{p}</span>
//           )
//         )}
//       </>
//     );
//   } catch {
//     return <>{s}</>;
//   }
// }
function restoreState(): OneDayState | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OneDayState;
  } catch {
    return null;
  }
}
function saveState(patch: Partial<OneDayState>) {
  const prev: OneDayState = restoreState() ?? {
    day: new Date().toISOString().slice(0, 10),
    model: "",
    tester: "",
    minCpk: "",
    onlyWithLimits: false,
    pageSize: 25,
  };
  const next: OneDayState = {
    day: patch.day ?? prev.day,
    model: patch.model ?? prev.model,
    tester: patch.tester ?? prev.tester,
    minCpk: patch.minCpk ?? prev.minCpk,
    onlyWithLimits: patch.onlyWithLimits ?? prev.onlyWithLimits,
    pageSize: patch.pageSize ?? prev.pageSize,
  };
  sessionStorage.setItem(SS_KEY, JSON.stringify(next));
}

/* ---------- csv helper ---------- */
const csvEscape = (value: unknown) => {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

/* ---------- small viz ---------- */
type EHProps = {
  values: number[];
  bins?: number;
  height?: number;
  className?: string;
  p5?: number | null;
  p95?: number | null;
  mean?: number | null;
  median?: number | null;
};
export function EnhancedHistogram({
  values, bins = 24, height = 160, className = "", p5, p95, mean, median,
}: EHProps) {
  if (!values?.length) return <div className="text-sm text-slate-500">No data</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 620;

  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(((v - min) / span) * bins)));
    counts[idx] += 1;
  }
  const maxCount = Math.max(...counts) || 1;
  const xPos = (v: number) => ((v - min) / span) * width;

  const Marker = ({ x, tone = "sky" }: { x: number; tone?: "sky" | "violet" | "rose" | "emerald" }) => {
    const colors: Record<string, string> = {
      sky: "stroke-sky-500 fill-sky-500",
      violet: "stroke-violet-500 fill-violet-500",
      rose: "stroke-rose-500 fill-rose-500",
      emerald: "stroke-emerald-500 fill-emerald-500",
    };
    const c = colors[tone];
    return <g transform={`translate(${x},0)`}><line y1={8} y2={height - 18} className={`stroke-2 ${c}`} /></g>;
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 mb-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> P95</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500" /> P5</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700"><span className="w-2 h-2 rounded-full bg-sky-500" /> Mean</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700"><span className="w-2 h-2 rounded-full bg-violet-500" /> Median</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {Array.from({ length: 6 }).map((_, i) => {
          const y = 8 + ((height - 26) * i) / 5;
          return <line key={i} x1={0} x2={width} y1={y} y2={y} className="stroke-slate-200" />;
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {counts.map((c, i) => {
          const h = (c / (maxCount || 1)) * (height - 26);
          return (
            <rect
              key={i}
              x={i * (width / bins) + 1}
              y={height - 18 - h}
              width={Math.max(0, (width / bins) - 2)}
              height={h}
              rx={3}
              fill="url(#barGrad)"
            />
          );
        })}
        {typeof mean === "number" && isFinite(mean) && <Marker x={xPos(mean)} tone="sky" />}
        {typeof median === "number" && isFinite(median) && <Marker x={xPos(median)} tone="violet" />}
        {typeof p5 === "number" && isFinite(p5) && <Marker x={xPos(p5)} tone="rose" />}
        {typeof p95 === "number" && isFinite(p95) && <Marker x={xPos(p95)} tone="emerald" />}

        <text x={0} y={height - 2} className="fill-slate-500 text-[10px]">{min.toFixed(3)}</text>
        <text x={width - 40} y={height - 2} className="fill-slate-500 text-[10px]">{max.toFixed(3)}</text>
      </svg>
    </div>
  );
}

const Badge = ({ label, tone = "slate" }: { label: string; tone?: "slate" | "green" | "amber" | "rose" | "blue" }) => {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${tones[tone]}`}>{label}</span>;
};
const CpkBadge = ({ cpk }: { cpk: number | null }) => {
  if (cpk == null) return <Badge label="-" tone="slate" />;
  if (cpk < 1) return <Badge label={fmtNum(cpk)} tone="rose" />;
  if (cpk < 1.33) return <Badge label={fmtNum(cpk)} tone="amber" />;
  if (cpk < 1.67) return <Badge label={fmtNum(cpk)} tone="blue" />;
  return <Badge label={fmtNum(cpk)} tone="green" />;
};

/* ---------- main page ---------- */
export default function OneDaySearch() {
  const today = new Date().toISOString().slice(0, 10);
  const navigate = useNavigate();
  const location = useLocation();

  // Filters
  const [day, setDay] = useState<string>(today);
  const [model, setModel] = useState<string>("");
  const [tester, setTester] = useState<string>("");

  // Quick filters
  const [minCpk, setMinCpk] = useState<string>("");
  const [onlyWithLimits, setOnlyWithLimits] = useState<boolean>(false);

  // Data + UI
  const [rows, setRows] = useState<CpkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table UI
  const [sortKey, setSortKey] = useState<keyof CpkRow>("order_idx");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // dropdown options
  const [modelsFs, setModelsFs] = useState<string[]>([]);
  const [testersFs, setTestersFs] = useState<string[]>([]);

  const [queryLive, setQueryLive] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // mount flags
  const mountedRef = useRef(false);
  const hydratedRef = useRef(false);

  /* --- restore filters + hydrate rows from location.state --- */
  useEffect(() => {
    const s = restoreState();
    if (s) {
      setDay(s.day);
      setModel(s.model);
      setTester(s.tester);
      setMinCpk(s.minCpk);
      setOnlyWithLimits(s.onlyWithLimits);
      setPageSize(s.pageSize);
    }

    const st: any = location.state;
    const backRows = st?.oneDayRows as CpkRow[] | undefined;
    if (Array.isArray(backRows) && backRows.length) {
      setRows(backRows);
      hydratedRef.current = true;
      // clear to free memory (optional)
      window.history.replaceState({}, "");
      console.log("[OneDaySearch] hydrated from location.state:", backRows.length, "rows");
    }

    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- initial load only if not hydrated --- */
  useEffect(() => {
    if (!mountedRef.current) return;
    if (hydratedRef.current) {
      console.log("[OneDaySearch] skip initial load (hydrated)");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedRef.current]);

  /* --- persist filters (save state) --- */
  useEffect(() => {
    saveState({ day, model, tester, minCpk, onlyWithLimits, pageSize });
  }, [day, model, tester, minCpk, onlyWithLimits, pageSize]);

  /* --- debounce query --- */
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryLive.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [queryLive]);

  const resetPaging = () => setPage(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<CpkRow[]>(
        `${API_BASE}/api/search/cpk-one-day`,
        { params: { day, model: model || undefined, tester: tester || undefined } }
      );
      setRows(data);
      setPage(1);
      // save à©¾ÒÐ¿ÔÅàµÍÃì
      saveState({ day, model, tester, minCpk, onlyWithLimits, pageSize });
      console.log("[OneDaySearch] loaded rows:", data.length);
    } catch (e: any) {
      setRows([]);
      setError(e?.response?.data?.detail || e?.message || "Load failed");
      console.log("[OneDaySearch] load error:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  const rowMatchesQuery = (r: CpkRow, q: string) => {
    if (!q) return true;
    const hay = [
      r.day, r.model, r.tester,
      r.test_item, r.test_desc, r.step,
      r.order_idx ?? "",
      // à¾ÔèÁ 3 µÑÇ¹Õé
      r.test_program ?? "",
      r.prog_rev ?? "",
      r.occ_idx ?? ""
].join(" | ").toLowerCase();

    return hay.includes(q);
  };

  const hasBothLimits = (r: CpkRow) =>
    r.lsl !== null && r.lsl !== undefined &&
    r.usl !== null && r.usl !== undefined;

  const filtered = useMemo(() => {
    const minC = parseNum(minCpk);
    return rows.filter((r) => {
      if (onlyWithLimits && !hasBothLimits(r)) return false;
      if (minC != null) {
        const c = parseNum(r.cpk);
        if (c != null && c > minC) return false; // logic à´ÔÁ¢Í§¤Ø³
      }
      if (!rowMatchesQuery(r, query)) return false;
      return true;
    });
  }, [rows, minCpk, onlyWithLimits, query]);

  const statsRows = useMemo(() => {
    return filtered.filter(r => hasBothLimits(r) && Number.isFinite(toNum(r.cpk)));
  }, [filtered]);

  const analysis = useMemo(() => {
    if (!statsRows.length) {
      return {
        count: 0, cpks: [] as number[],
        min: null as number | null, max: null as number | null,
        avg: null as number | null, median: null as number | null,
        p5: null as number | null, p95: null as number | null,
        below1: 0, below133: 0,
        byModel: [] as { key: string; worst: number | null; avg: number | null; count: number }[],
        byTester: [] as { key: string; worst: number | null; avg: number | null; count: number }[],
        byItem: [] as { key: string; worst: number | null; avg: number | null; count: number }[],
      };
    }
    const cpks = statsRows.map(r => r.cpk).filter((x): x is number => x != null && Number.isFinite(x));
    const min = Math.min(...cpks);
    const max = Math.max(...cpks);
    const avg = cpks.reduce((a, b) => a + b, 0) / cpks.length;
    const sortedCpks = [...cpks].sort((a, b) => a - b);
    const pct = (p: number) => sortedCpks[Math.floor((p / 100) * (sortedCpks.length - 1))];
    const median = pct(50);
    const p5 = pct(5);
    const p95 = pct(95);
    const below1 = cpks.filter(c => c < 1).length;
    const below133 = cpks.filter(c => c < 1.33).length;

    const group = (key: keyof CpkRow) => {
      const map = new Map<string, number[]>();
      statsRows.forEach((r) => {
        const k = String(r[key] ?? "");
        const c = r.cpk;
        if (c == null || !Number.isFinite(c)) return;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(c);
      });
      return Array.from(map.entries())
        .map(([k, arr]) => ({
          key: k || "(blank)",
          worst: Math.min(...arr),
          avg: arr.reduce((a, b) => a + b, 0) / arr.length,
          count: arr.length,
        }))
        .sort((a, b) => a.worst - b.worst)
        .slice(0, 10);
    };

    return {
      count: statsRows.length,
      cpks,
      min, max, avg, median, p5, p95,
      below1, below133,
      byModel: group("model"),
      byTester: group("tester"),
      byItem: group("test_item"),
    };
  }, [statsRows]);

  const sortedHeader = (key: keyof CpkRow, label: string) => {
    const is = sortKey === key;
    const dir = is ? (sortDir === "asc" ? "↑" : "↓") : "";
    return (
      <th
        className="py-2 pr-3 font-medium cursor-pointer select-none"
        onClick={() => {
          if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
          else { setSortKey(key); setSortDir("asc"); }
          resetPaging();
        }}
        title={`Sort by ${label}`}
      >
        {label} {dir}
      </th>
    );
  };

  const downloadCsv = () => {
    const header = ["day","model","tester","test_item","test_desc","step","lsl","usl","mean_val","cpk","test_program","prog_rev","order_idx"];
    const lines = [header.map(csvEscape).join(",")].concat(
      filtered.map((r) => header.map((k) => csvEscape((r as any)[k] ?? "")).join(","))
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpk_${day}${model ? `_m-${model}` : ""}${tester ? `_t-${tester}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // initial models
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<string[]>(`${API_BASE}/api/fs-meta/models`);
        const arr = data || [];
        setModelsFs(model && !arr.includes(model) ? [model, ...arr] : arr);
      } catch (e:any) {
        setModelsFs(model ? [model] : []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // testers when day/model changes
  useEffect(() => {
    (async () => {
      if (!model) { setTestersFs(tester ? [tester] : []); return; }
      try {
        const { data } = await axios.get<string[]>(
          `${API_BASE}/api/fs-meta/testers`, { params: { day, model } }
        );
        const arr = data || [];
        setTestersFs(tester && !arr.includes(tester) ? [tester, ...arr] : arr);
      } catch (e:any) {
        setTestersFs(tester ? [tester] : []);
      }
    })();
  }, [day, model]); // eslint-disable-line react-hooks/exhaustive-deps

  const onOpenDetail = (qs: string) => {
    // save à©¾ÒÐ¿ÔÅàµÍÃì¡èÍ¹ÍÍ¡
    saveState({ day, model, tester, minCpk, onlyWithLimits, pageSize });
    // Êè§ rows ä»¼èÒ¹ state (äÁèáµÐ sessionStorage)
    navigate(`/detail?${qs}`, { state: { oneDayRows: rows, ts: Date.now() } });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4">CPK Dashboard</h1>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow p-4 grid md:grid-cols-6 gap-4 mb-5">
          <div>
            <label className="block text-sm text-slate-500 mb-1">Day</label>
            <input
              type="date"
              className="w-full rounded-xl border-slate-300"
              value={day}
              onChange={(e) => { setDay(e.target.value); }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-slate-500 mb-1">Model</label>
            <select
              className="w-full rounded-xl border-slate-300"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">(All)</option>
              {!model || modelsFs.includes(model) ? null : (
                <option value={model}>{model} (current)</option>
              )}
              {modelsFs.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-slate-500 mb-1">Tester</label>
            <select
              className="w-full rounded-xl border-slate-300"
              value={tester}
              onChange={(e) => setTester(e.target.value)}
            >
              <option value="">(All)</option>
              {!tester || testersFs.includes(tester) ? null : (
                <option value={tester}>{tester} (current)</option>
              )}
              {testersFs.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { resetPaging(); load(); }}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow disabled:opacity-50"
              aria-label="Search"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>

          <div className="md:col-span-6 grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Min CPK</label>
              <input
                className="w-full rounded-xl border-slate-300"
                placeholder="e.g. 1.33"
                value={minCpk}
                onChange={(e) => { setMinCpk(e.target.value); resetPaging(); }}
              />
            </div>

            <div className="self-end">
              <button
                onClick={downloadCsv}
                disabled={!filtered.length}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-white shadow-sm disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-5">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm text-slate-500">
              Rows <span className="text-slate-400">(filtered)</span>
            </div>
            <div className="text-2xl font-semibold">{filtered.length}</div>
            <div className="text-xs text-slate-400 mt-1">
              Stats rows: {statsRows.length} (with LSL/USL & numeric CPK)
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm text-slate-500">Min CPK</div>
            <div className="text-2xl font-semibold">{fmtNum(statsRows.length ? Math.min(...statsRows.map(r => r.cpk as number)) : null)}</div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm text-slate-500">Avg CPK</div>
            <div className="text-2xl font-semibold">
              {fmtNum(statsRows.length ? statsRows.reduce((s, r) => s + (r.cpk as number), 0) / statsRows.length : null)}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm text-slate-500">Median CPK</div>
            <div className="text-2xl font-semibold">
              {(() => {
                if (!statsRows.length) return fmtNum(null);
                const arr = statsRows.map(r => r.cpk as number).sort((a,b)=>a-b);
                return fmtNum(arr[Math.floor((arr.length - 1) * 0.5)]);
              })()}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-sm text-slate-500">P5 / P95</div>
            <div className="text-2xl font-semibold text-sm">
              {(() => {
                if (!statsRows.length) return `${fmtNum(null)} — ${fmtNum(null)}`;
                const arr = statsRows.map(r => r.cpk as number).sort((a,b)=>a-b);
                const p5 = arr[Math.floor(0.05 * (arr.length - 1))];
                const p95 = arr[Math.floor(0.95 * (arr.length - 1))];
                return `${fmtNum(p5)} — ${fmtNum(p95)}`;
              })()}
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">CPK distribution</h2>
            <EnhancedHistogram
              values={statsRows.map(r => r.cpk as number)}
              mean={statsRows.length ? statsRows.reduce((s, r) => s + (r.cpk as number), 0) / statsRows.length : null}
              median={(() => {
                if (!statsRows.length) return null;
                const arr = statsRows.map(r => r.cpk as number).sort((a,b)=>a-b);
                return arr[Math.floor((arr.length - 1) * 0.5)];
              })()}
              p5={(() => {
                if (!statsRows.length) return null;
                const arr = statsRows.map(r => r.cpk as number).sort((a,b)=>a-b);
                return arr[Math.floor(0.05 * (arr.length - 1))];
              })()}
              p95={(() => {
                if (!statsRows.length) return null;
                const arr = statsRows.map(r => r.cpk as number).sort((a,b)=>a-b);
                return arr[Math.floor(0.95 * (arr.length - 1))];
              })()}
            />
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Pareto by model (worst first)</h2>
            {!analysis.byModel.length ? (
              <div className="text-sm text-slate-500">No data</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {analysis.byModel.map((g) => (
                  <li key={g.key} className="flex items-center justify-between">
                    <span className="truncate">{g.key}</span>
                    <span className="flex items-center gap-2">
                      <CpkBadge cpk={g.worst} />
                      <span className="text-slate-500">avg {fmtNum(g.avg)} • n={g.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Pareto by tester (worst first)</h2>
            {!analysis.byTester.length ? (
              <div className="text-sm text-slate-500">No data</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {analysis.byTester.map((g) => (
                  <li key={g.key} className="flex items-center justify-between">
                    <span className="truncate">{g.key}</span>
                    <span className="flex items-center gap-2">
                      <CpkBadge cpk={g.worst} />
                      <span className="text-slate-500">avg {fmtNum(g.avg)} • n={g.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 lg:col-span-3">
            <h2 className="text-lg font-semibold mb-2">Worst test items (top 10)</h2>
            {!analysis.byItem.length ? (
              <div className="text-sm text-slate-500">No data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-max min-w-[600px] text-sm">
                  <thead className="text-left border-b">
                    <tr>
                      <th className="py-2 pr-3">Test item</th>
                      <th className="py-2 pr-3">Worst CPK</th>
                      <th className="py-2 pr-3">Average CPK</th>
                      <th className="py-2 pr-3">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.byItem.map((g, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 pr-3">{g.key}</td>
                        <td className="py-2 pr-3"><CpkBadge cpk={g.worst} /></td>
                        <td className="py-2 pr-3">{fmtNum(g.avg)}</td>
                        <td className="py-2 pr-3">{g.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-8 bg-white rounded-2xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Program / Revision Cards</h2>
              <ProgRevCards />
            </div>

          </div>
        </div>

        {/* Results table */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Results</h2>

            <div className="flex items-center gap-3">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-60"
                placeholder="Search in table… (model/tester/item/step)"
                value={queryLive}
                onChange={(e) => { setQueryLive(e.target.value); setPage(1); }}
                aria-label="Search rows"
              />

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={onlyWithLimits}
                  onChange={(e) => { setOnlyWithLimits(e.target.checked); setPage(1); }}
                />
                <span>Clear row without LSL/USL</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500">Rows: {filtered.length}</div>
              <select
                className="text-sm rounded-lg border-slate-300"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                aria-label="Rows per page"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button
                onClick={downloadCsv}
                disabled={!filtered.length}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-white shadow-sm disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 flex items-center justify-between">
              <span>{error}</span>
              <button className="underline" onClick={load}>Retry</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-max min-w-[1200px] text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left border-b whitespace-nowrap">
                  {sortedHeader("day", "Day")}
                  {sortedHeader("model", "Model")}
                  {sortedHeader("tester", "Tester")}
                  {sortedHeader("test_item", "Test item")}
                  {sortedHeader("test_desc", "Test description")}
                  {sortedHeader("step", "Step")}
                  {sortedHeader("lsl", "LSL")}
                  {sortedHeader("usl", "USL")}
                  {sortedHeader("mean_val", "Mean")}
                  {sortedHeader("cpk", "CPK")}
                  {sortedHeader("test_program", "Program name")}
                  {sortedHeader("prog_rev", "Revision")}
                  {sortedHeader("order_idx", "Order")}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b animate-pulse">
                      {Array.from({ length: COLS }).map((__, j) => (
                        <td key={`skeleton-${i}-${j}`} className="py-3 pr-3">
                          <div className="h-3 w-24 bg-slate-200 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !filtered.length ? (
                  <tr>
                    <td colSpan={COLS} className="py-6 text-center text-slate-500">
                      No data
                    </td>
                  </tr>
                ) : (
                  filtered.slice((page-1)*pageSize, (page-1)*pageSize + pageSize).map((r) => {

                   const qsParams: Record<string, string> = {
                      day: r.day,
                      model: r.model,
                      tester: r.tester,
                      step: r.step,
                      test_item: r.test_item,
                      test_desc: r.test_desc,
                      order_idx: String(r.order_idx),
                    };
                    if (r.prog_rev != null) {
                      qsParams.prog_rev = String(r.prog_rev);
                    }
                    if (r.occ_idx != null) {
                      qsParams.occ_idx = String(r.occ_idx);
                    }
                    if (r.test_program != null) {
                      qsParams.test_program = String(r.test_program);
                    }

                    const qs = new URLSearchParams(qsParams).toString();

                    return (
                      <tr
                        key={`${r.day}|${r.model}|${r.tester}|${r.order_idx}|${r.test_item}`}
                        className="border-b hover:bg-slate-50 cursor-pointer"
                        onDoubleClick={() => onOpenDetail(qs)}
                      >
                        <td className="py-2 pr-3 font-medium">{r.day}</td>
                        <td className="py-2 pr-3">{r.model}</td>
                        <td className="py-2 pr-3">{r.tester}</td>
                        <td className="py-2 pr-3">{r.test_item}</td>
                        <td className="py-2 pr-3">{r.test_desc}</td>
                        <td className="py-2 pr-3">{r.step}</td>
                        <td className="py-2 pr-3">{fmtNum(r.lsl)}</td>
                        <td className="py-2 pr-3">{fmtNum(r.usl)}</td>
                        <td className="py-2 pr-3">{fmtNum(r.mean_val)}</td>
                        <td className="py-2 pr-3"><CpkBadge cpk={r.cpk} /></td>
                        <td className="py-2 pr-3" title={r.test_program ?? ""}>
                          {r.test_program ?? "-"}
                        </td>
                        <td className="py-2 pr-3" title={r.prog_rev ?? ""}>
                          {r.prog_rev ?? "-"}
                        </td>
                        <td className="py-2 pr-3">{r.order_idx ?? "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-slate-500">
              Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-slate-300 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-slate-300 disabled:opacity-50"
                onClick={() => setPage((p) => (p * pageSize < filtered.length ? p + 1 : p))}
                disabled={page * pageSize >= filtered.length}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Quick insights (optional) */}
      </div>
    </div>
  );
}
