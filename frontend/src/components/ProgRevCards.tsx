import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/**
 * ProgRevCards.tsx
 * Card view (3 modes):
 *  1) Latest (tester / model / program / revision µÍ¹¹Õé)
 *  2) Periods (ªèÇ§µèÍà¹×èÍ§¢Í§ Program+Revision µèÍ tester)
 *  3) Changes (ÇÑ¹·Õèà»ÅÕèÂ¹ Program ËÃ×Í Revision ÀÒÂã¹ tester)
 *
 * Backend endpoints:
 *  - GET /cpk/prog-rev/latest-by-tester?model=&tester=
 *  - GET /cpk/prog-rev/periods?since_days=&model=&tester=
 */

// ---------------- Types ----------------
export type LatestRow = {
  tester: string;
  model: string | null;
  test_program: string | null;
  revision: string | null;
  last_seen?: string | null; // ISO datetime
  last_day?: string | null;  // YYYY-MM-DD
};

export type PeriodRow = {
  tester: string;
  model: string | null;
  test_program: string | null;
  revision: string | null;
  start_day: string; // YYYY-MM-DD
  end_day: string;   // YYYY-MM-DD
  days: number;
};

export type ChangeRow = {
  tester: string;
  day: string; // ÇÑ¹·Õèà»ÅÕèÂ¹ = start_day ¢Í§ªèÇ§ãËÁè
  prev: { model: string | null; program: string | null; revision: string | null } | null;
  curr: { model: string | null; program: string | null; revision: string | null };
};

// ---------------- Config ----------------
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ---------------- Helpers ----------------
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const keyOf = (p?: string | null, r?: string | null) => {
  if (!p && !r) return "UNKNOWN";
  if (p && r) return `${p}@r${r}`;
  if (p) return `${p}@r-`;
  return `-@r${r}`;
};

const colorOfKey = (key: string) => {
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360; const sat = 65; const lig = 50;
  return `hsl(${hue} ${sat}% ${lig}%)`;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try { const d = new Date(s!); return isNaN(d.getTime()) ? s! : d.toLocaleString(); } catch { return s!; }
};

// ---------------- Main Component ----------------
export default function ProgRevCards() {
  type Mode = "latest" | "periods" | "changes";
  const [mode, setMode] = useState<Mode>("latest");

  // filters
  const [model, setModel] = useState("");
  const [tester, setTester] = useState("");
  const [sinceDays, setSinceDays] = useState(60);

  // manual trigger (äÁèâËÅ´ÍÑµâ¹ÁÑµÔº¹ mount)
  const [runKey, setRunKey] = useState(0);
  const doSearch = () => setRunKey(k => k + 1);

  // data
  const [latest, setLatest] = useState<LatestRow[]>([]);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // cancel in-flight requests when re-search
  const abortRef = useRef<AbortController | null>(null);

  // fetch (lazy: run only when ¡´ Search)
  useEffect(() => {
    if (runKey === 0) return; // ÍÂèÒâËÅ´µÍ¹à»Ô´Ë¹éÒ

    abortRef.current?.abort("new-search");
    const controller = new AbortController();
    abortRef.current = controller;

    const m = (model || "").trim() || undefined;
    const t = (tester || "").trim() || undefined;

    (async () => {
      setLoading(true); setErr(null);
      try {
        if (mode === "latest") {
          const { data } = await axios.get(`${API_BASE}/cpk/prog-rev/latest-by-tester`, {
            params: { model: m, tester: t },
            signal: controller.signal,
          });
          setLatest(Array.isArray(data) ? data : []);
        } else {
          const safeSince = Number.isFinite(sinceDays) ? Math.min(365, Math.max(1, sinceDays)) : 60;
          const { data } = await axios.get(`${API_BASE}/cpk/prog-rev/periods`, {
            params: { since_days: safeSince, model: m, tester: t },
            signal: controller.signal,
          });
          setPeriods(Array.isArray(data) ? data : []);
        }
      } catch (e: any) {
        if (e?.name === "CanceledError" || axios.isCancel?.(e)) return;
        if (e?.response?.status === 422) setErr("since_days äÁè¶Ù¡µéÍ§ (ªèÇ§ 1–365 ÇÑ¹)");
        else setErr(e?.response?.data?.detail || e?.message || "Load failed");
        setLatest([]); setPeriods([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort("unmount-or-change");
  }, [runKey]);

  // derived: testers list
  const testers = useMemo(() => {
    const s = new Set<string>();
    (mode === "latest" ? latest : periods).forEach((r: any) => s.add(r.tester));
    return Array.from(s).sort();
  }, [mode, latest, periods]);

  // derived: changes from periods
  const changesByTester = useMemo(() => {
    if (mode === "latest") return {} as Record<string, ChangeRow[]>;
    const perTester: Record<string, PeriodRow[]> = {};
    for (const p of periods) (perTester[p.tester] ||= []).push(p);
    for (const t in perTester) perTester[t].sort((a,b)=>a.start_day.localeCompare(b.start_day));

    const out: Record<string, ChangeRow[]> = {};
    for (const t in perTester) {
      const rows = perTester[t];
      const list: ChangeRow[] = [];
      for (let i=0;i<rows.length;i++) {
        const curr = rows[i];
        const prev = rows[i-1];
        if (!prev) continue;
        if (prev.model === curr.model && prev.test_program === curr.test_program && prev.revision === curr.revision) continue;
        list.push({
          tester: t,
          day: curr.start_day,
          prev: { model: prev.model, program: prev.test_program, revision: prev.revision },
          curr: { model: curr.model, program: curr.test_program, revision: curr.revision },
        });
      }
      out[t] = list;
    }
    return out;
  }, [mode, periods]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="inline-flex rounded-xl border overflow-hidden">
          <button className={clsx("px-3 py-2 text-sm", mode==='latest' && "bg-slate-900 text-white")} onClick={()=>setMode('latest')}>1) Latest</button>
          <button className={clsx("px-3 py-2 text-sm", mode==='periods' && "bg-slate-900 text-white")} onClick={()=>setMode('periods')}>2) Periods</button>
          <button className={clsx("px-3 py-2 text-sm", mode==='changes' && "bg-slate-900 text-white")} onClick={()=>setMode('changes')}>3) Changes</button>
        </div>

        <input className="border rounded-xl px-2 py-2 w-48" placeholder="Filter model" value={model} onChange={(e)=>setModel(e.target.value)} />
        <input className="border rounded-xl px-2 py-2 w-48" placeholder="Filter tester" value={tester} onChange={(e)=>setTester(e.target.value)} />

        {mode !== "latest" && (
          <>
            <label className="text-sm text-slate-500 ml-2">Since (days)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              className="border rounded-xl px-2 py-2 w-24"
              value={sinceDays}
              onChange={(e) => {
                const v = parseInt(e.target.value || "60", 10);
                setSinceDays(Number.isFinite(v) ? Math.min(365, Math.max(1, v)) : 60);
              }}
              onBlur={(e) => {
                const v = parseInt(e.target.value || "60", 10);
                const clamped = Number.isFinite(v) ? Math.min(365, Math.max(1, v)) : 60;
                if (clamped !== sinceDays) setSinceDays(clamped);
              }}
            />
          </>
        )}

        {/* Manual Search */}
        <button
          onClick={doSearch}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          title="Search"
        >
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {/* Hint on first load */}
      {runKey === 0 && !loading && !err && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600">
           ...<b>Please search</b>...
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">{err}</div>
      )}

      {/* Content */}
      {mode === "latest" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 bg-white/60 animate-pulse">
              <div className="h-4 w-28 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-40 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-48 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
          )) : testers.map((t) => {
            const row = (latest || []).find(r => r.tester === t);
            const k = keyOf(row?.test_program, row?.revision);
            return (
              <div key={t} className="rounded-2xl border p-4 shadow-sm bg-white/70">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{t}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-block w-3 h-3 rounded" style={{ background: colorOfKey(k) }} />
                    <span className="text-slate-500 truncate max-w-[180px]" title={k}>{k}</span>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="text-slate-500">Model:</span> {row?.model ?? "-"}</div>
                  <div><span className="text-slate-500">Program:</span> {row?.test_program ?? "-"}</div>
                  <div><span className="text-slate-500">Revision:</span> {row?.revision ?? "-"}</div>
                  <div><span className="text-slate-500">Last:</span> {fmtDate(row?.last_seen ?? row?.last_day)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "periods" && (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 bg-white/60 animate-pulse h-36" />
          )) : testers.map((t) => {
            const rows = periods.filter(p => p.tester === t).sort((a, b) => a.start_day.localeCompare(b.start_day));
            return (
              <div key={t} className="rounded-2xl border p-4 shadow-sm bg-white/70">
                <div className="mb-2 font-semibold">{t}</div>
                <MiniTimeline rows={rows} />
                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  {rows.map((r, idx) => {
                    const k = keyOf(r.test_program, r.revision);
                    return (
                      <div key={idx} className="rounded-xl border p-2 text-xs flex items-center justify-between">
                        <div className="mr-2 min-w-0">
                          <div className="truncate" title={`${r.model ?? "-"} | ${r.test_program ?? "-"} | revision:${r.revision ?? "-"}`}>{r.model ?? "-"} | {r.test_program ?? "-"} | revision:{r.revision ?? "-"}</div>
                          <div className="text-slate-500">{r.start_day} to {r.end_day} ({r.days}d)</div>
                        </div>
                        <span className="inline-block w-3 h-3 rounded" style={{ background: colorOfKey(k) }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "changes" && (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 bg-white/60 animate-pulse h-24" />
          )) : testers.map((t) => {
            const list = changesByTester[t] || [];
            return (
              <div key={t} className="rounded-2xl border p-4 shadow-sm bg-white/70">
                <div className="mb-2 font-semibold">{t}</div>
                {!list.length ? (
                  <div className="text-sm text-slate-500">No change in selected window.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {list.map((c, idx) => {
                      const ck = keyOf(c.curr.program, c.curr.revision);
                      return (
                        <li key={idx} className="rounded-xl border p-2 flex items-start gap-2">
                          <div className="mt-1 w-2 h-2 rounded" style={{ background: colorOfKey(ck) }} />
                          <div className="min-w-0">
                            <div className="font-medium">{c.day}</div>
                            <div className="text-slate-600 truncate" title={`From ${c.prev?.model ?? "-"} | ${c.prev?.program ?? "-"} | revision:${c.prev?.revision ?? "-"}`}>
                              From: {c.prev?.model ?? "-"} | {c.prev?.program ?? "-"} | revision:{c.prev?.revision ?? "-"}
                            </div>
                            <div className="text-slate-600 truncate" title={`To ${c.curr.model ?? "-"} | ${c.curr.program ?? "-"} | revision:${c.curr.revision ?? "-"}`}>
                              To: {c.curr.model ?? "-"} | {c.curr.program ?? "-"} | revision:{c.curr.revision ?? "-"}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Small timeline bar ----------------
function MiniTimeline({ rows }: { rows: PeriodRow[] }) {
  if (!rows.length) return <div className="text-sm text-slate-500">No data</div>;
  const minT = new Date(rows[0].start_day + "T00:00:00").getTime();
  const maxT = new Date(rows[rows.length - 1].end_day + "T23:59:59").getTime();
  const span = Math.max(1, maxT - minT);

  return (
    <div className="relative w-full h-8 rounded-lg bg-slate-100 overflow-hidden">
      {rows.map((r, idx) => {
        const a = Math.max(minT, new Date(r.start_day + "T00:00:00").getTime());
        const b = Math.min(maxT, new Date(r.end_day + "T23:59:59").getTime());
        const left = ((a - minT) / span) * 100;
        const width = Math.max(0.6, ((b - a) / span) * 100);
        const k = keyOf(r.test_program, r.revision);
        return (
          <div
            key={idx}
            className="absolute top-0 bottom-0"
            style={{ left: `${left}%`, width: `${width}%`, background: colorOfKey(k) }}
            title={`${r.start_day} to ${r.end_day}`}
          >
            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/70" />
          </div>
        );
      })}
    </div>
  );
}
