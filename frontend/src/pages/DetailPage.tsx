import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import EnhancedHistogram from "../components/EnhancedHistogram";
import { fmtNum } from "../utils/number";
import { assessRisk, probOutOfSpec } from "../utils/risk";
import { API_CONFIG } from "../config/routes";

const API_BASE = API_CONFIG.BASE_URL;

/* ---------- Types ---------- */
type DailyMeanItem  = { day: string; mean_val: number | null };
type DailyCpkItem   = { day: string; cpk: number | null };
type DailySigmaItem = { day: string; sigma_val: number | null; mean_val: number | null  };

/** ÃÙ»áºº response ¢Í§ /api/detail/samples */
type SamplesResponse = {
  sample: number[];           // ªØ´µÑÇÍÂèÒ§·Õèãªé plot
  lsl?: number | null;
  usl?: number | null;
  test_program?: string | null;
  prog_rev?: string | number | null;
};

/* =======================================================
   DetailPage
   - ÃÑº¤èÒ locked test_program/prog_rev ¨Ò¡ OneDaySearch
   - àÃÕÂ¡ API ¾ÃéÍÁ¾ÒÃÒÁÔàµÍÃì·Õè¨Óà»ç¹
   - µÃÇ¨ÊÍºÇèÒªØ´·Õè¨Ð plot ÁÕ program & revision µÃ§¡Ñ¹
   - áÊ´§ Program card º¹ËÑÇË¹éÒà¾¨
======================================================= */
export default function DetailPage() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ---- ÃÑº rows ·ÕèÊè§ÁÒ¨Ò¡ OneDaySearch à¾×èÍ hydrate µÍ¹¡´ Back ----
  const backRowsRef = useRef<any[] | null>(null);
  useEffect(() => {
    const st: any = location.state;
    if (Array.isArray(st?.oneDayRows)) {
      backRowsRef.current = st.oneDayRows;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- ÍèÒ¹ params ¨Ò¡ URL (ãªéà©¾ÒÐ search params) ----
  const params = useMemo(() => Object.fromEntries(sp.entries()), [sp.toString()]);

  // occ_idx (default = 1)
  const occ_idx = useMemo(() => {
    const n = Number(params.occ_idx ?? "1");
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [params.occ_idx]);

  // expected prog_rev / test_program ·ÕèÅçÍ¡¨Ò¡Ë¹éÒà´ÔÁ (ÍÒ¨ÇèÒ§)
  const expectedProg = (params.test_program ?? "").trim() || undefined;
  const expectedRevRaw = (params.prog_rev ?? "").trim();
  const expectedRev = expectedRevRaw === "" ? undefined : expectedRevRaw;
  const progRevDisplay = expectedRev ?? "-";

  // ---- à´×Í¹ default ¨Ò¡ day ËÃ×Í¤èÒ month ã¹ URL ----
  const defaultMonth = useMemo(() => {
    if (params.month) return String(params.month);
    const d = String(params.day ?? "");
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.slice(0, 7) : new Date().toISOString().slice(0, 7);
  }, [params.month, params.day]);

  const [month, setMonth] = useState<string>(defaultMonth);

  // ---- States ËÅÑ¡ ----
  const [samples, setSamples] = useState<number[]>([]);
  const [lsl, setLsl] = useState<number | null>(null);
  const [usl, setUsl] = useState<number | null>(null);

  const [dailyMean,  setDailyMean]  = useState<DailyMeanItem[]>([]);
  const [dailyCpk,   setDailyCpk]   = useState<DailyCpkItem[]>([]);
  const [dailySigma, setDailySigma] = useState<DailySigmaItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errSamples, setErrSamples] = useState<string | null>(null);
  const [errSeries, setErrSeries]   = useState<string | null>(null);

  // áÊ´§¼Å Program/Revision ·Õè "ãªé¨ÃÔ§" (ËÅÑ§âËÅ´áÅéÇ)
  const [selectedProg, setSelectedProg] = useState<string | undefined>(expectedProg);
  const [selectedRev,  setSelectedRev]  = useState<string | undefined>(expectedRev);
  const [note, setNote] = useState<string | null>(null);

  // ---- Common params ÊÓËÃÑºàÃÕÂ¡ API ----
  const commonParams = useMemo(() => {
    const p: Record<string, any> = {
      day: params.day,
      model: params.model,
      tester: params.tester,
      step: params.step,
      test_item: params.test_item,
      test_desc: params.test_desc,
      order_idx: Number(params.order_idx ?? 0),
      occ_idx,
    };
    if (expectedProg) p.test_program = expectedProg; // Êè§ä»ãËé backend ¡ÃÍ§ä´é´éÇÂ
    if (expectedRev)  p.prog_rev = expectedRev;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.day, params.model, params.tester,
    params.step, params.test_item, params.test_desc,
    params.order_idx, occ_idx, expectedProg, expectedRev
  ]);

  // ---- Loader ËÅÑ¡ ----
  useEffect(() => {
    // µéÍ§ÁÕ params ¾×é¹°Ò¹¤Ãº¡èÍ¹
    if (!params.day || !params.model || !params.tester || !params.step || !params.test_item || !params.test_desc) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrSamples(null);
      setErrSeries(null);
      setNote(null);

      try {
        // samples (ÇÑ¹à´ÕÂÇ) + series (·Ñé§à´×Í¹)
        const pSamples = axios.get<SamplesResponse>(`${API_BASE}/api/detail/samples`, { params: commonParams });
        const monthParams = { ...commonParams, month };
        const pMean  = axios.get<{ items: any[] }>(`${API_BASE}/api/detail/daily-mean`,  { params: monthParams });
        const pCpk   = axios.get<{ items: any[] }>(`${API_BASE}/api/detail/daily-cpk`,   { params: monthParams });
        const pSigma = axios.get<{ items: any[] }>(`${API_BASE}/api/detail/daily-sigma`, { params: monthParams });

        const [rS, rM, rC, rSi] = await Promise.allSettled([pSamples, pMean, pCpk, pSigma]);
        if (cancelled) return;

        /* ----- Samples ----- */
        if (rS.status === "fulfilled") {
          const d = rS.value.data ?? {};
          const arr = Array.isArray(d.sample) ? d.sample : [];
          setSamples(arr);
          setLsl(Number.isFinite(d.lsl as number) ? (d.lsl as number) : (d.lsl ?? null));
          setUsl(Number.isFinite(d.usl as number) ? (d.usl as number) : (d.usl ?? null));

          const gotProg = (d.test_program ?? undefined) as string | undefined;
          const gotRev  = (d.prog_rev    ?? undefined) as string | number | undefined;

          // ÍÑ»à´µ¤èÒ "·Õèãªé¨ÃÔ§" ÊÓËÃÑºâªÇìº¹¡ÒÃì´
          setSelectedProg(gotProg ?? expectedProg);
          setSelectedRev(gotRev != null ? String(gotRev) : expectedRev);

          // ¶éÒ user ÅçÍ¡¨Ò¡Ë¹éÒà´ÔÁ áÅéÇ¢éÍÁÙÅ·Õèä´é "äÁèµÃ§" ãËéá¨é§àµ×Í¹
          if ((expectedProg && gotProg && expectedProg !== gotProg) ||
              (expectedRev  && gotRev  != null && expectedRev  !== String(gotRev))) {
            setNote(
              `ªØ´·ÕèâËÅ´ÁÒ Program/Rev äÁèµÃ§¡Ñº¤èÒ·ÕèÅçÍ¡äÇé: ` +
              `expected: (${expectedProg ?? "-"}, ${expectedRev ?? "-"}) • ` +
              `got: (${gotProg ?? "-"}, ${gotRev ?? "-"})`
            );
          }
        } else {
          setSamples([]); setLsl(null); setUsl(null);
          setErrSamples(rS.reason?.message || "Load samples failed");
        }

        /* ----- Daily mean ----- */
        if (rM.status === "fulfilled") {
          const items = rM.value.data?.items ?? [];
          setDailyMean(items.map((x: any) => ({ day: x.day, mean_val: x.mean_val })));
        } else {
          setDailyMean([]);
          setErrSeries((prev) => prev ?? (rM.reason?.message || "Load series failed"));
        }

        /* ----- Daily cpk ----- */
        if (rC.status === "fulfilled") {
          const items = rC.value.data?.items ?? [];
          setDailyCpk(items.map((x: any) => ({ day: x.day, cpk: x.cpk })));
        } else {
          setDailyCpk([]);
          setErrSeries((prev) => prev ?? (rC.reason?.message || "Load series failed"));
        }

        /* ----- Daily sigma ----- */
        if (rSi.status === "fulfilled") {
          const items = rSi.value.data?.items ?? [];
            setDailySigma(items.map((x: any) => ({ day: x.day, sigma_val: x.sigma_val,mean_val: x.mean_val })));
        } else {
          setDailySigma([]);
          setErrSeries((prev) => prev ?? (rSi.reason?.message || "Load series failed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(commonParams), month]);

  // ---- Sync month -> URL (replace) ----
  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set("month", month);
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  /* ---------- Basic stats ¢Í§ samples (ËÅÑ§¼èÒ¹¡ÒÃ lock áÅéÇ) ---------- */
  const mean = useMemo(
    () => (samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null),
    [samples]
  );
  const sorted = useMemo(() => (samples.length ? [...samples].sort((a, b) => a - b) : []), [samples]);
  const median = useMemo(
    () => (sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.5)] : null),
    [sorted]
  );

  const handleBack = () => {
    if (Array.isArray(backRowsRef.current) && backRowsRef.current.length) {
      navigate("/one-day-search", { state: { oneDayRows: backRowsRef.current, ts: Date.now() } });
    } else {
      navigate(-1);
    }
  };

  /* ============================= Render ============================= */
const [minCpkLine, setMinCpkLine] = useState<string>(
  () => sessionStorage.getItem("detail_min_cpk_line") ?? ""
);
useEffect(() => {
  sessionStorage.setItem("detail_min_cpk_line", minCpkLine);
}, [minCpkLine]);

const minCpkNum = useMemo(() => {
  const n = Number(minCpkLine);
  return Number.isFinite(n) ? n : null;
}, [minCpkLine]);

const [sigmaMaxLine, setSigmaMaxLine] = useState<string>(
  () => sessionStorage.getItem("detail_sigma_max_line") ?? "2.0"
);
const sigmaMaxNum = useMemo(() => {
  const n = Number(sigmaMaxLine);
  return Number.isFinite(n) ? n : null;
}, [sigmaMaxLine]);
useEffect(() => {
  sessionStorage.setItem("detail_sigma_max_line", sigmaMaxLine);
}, [sigmaMaxLine]);


// ---- risk (ãªé¤èÒÅèÒÊØ´·ÕèäÁè null) + DEBUG LOG ----
const risk = useMemo(() => {
  const cpkSeries   = dailyCpk.map(d => d.cpk);
  const sigmaSeries = dailySigma.map(d => d.sigma_val);

  const cpkToday   = lastNonNull(dailyCpk,   d => d.cpk);
  const sigmaToday = lastNonNull(dailySigma, d => d.sigma_val);
  const muToday    = lastNonNull(dailySigma, d => d.mean_val);

  const detail = assessRisk({
    cpk: cpkToday,
    mu: muToday,
    sigma: sigmaToday,
    lsl, usl,
    sigmaMax: sigmaMaxNum,
    cpkSeries,
    sigmaSeries,
  });

  if (typeof window !== "undefined" && import.meta.env.DEV) {
    const pOOS = probOutOfSpec(muToday, sigmaToday, lsl ?? null, usl ?? null);
    console.groupCollapsed(
      "%c[RISK DEBUG] DetailPage",
      "color:#0ea5e9;font-weight:600"
    );
    console.table([{
      cpkToday,
      muToday,
      sigmaToday,
      lsl,
      usl,
      sigmaMax: sigmaMaxNum,
      pOutOfSpec: pOOS,
      score: detail.score,
      level: detail.level,
    }]);

    console.log("reasons:", detail.reasons);
    console.log("series.length:", { cpk: cpkSeries.length, sigma: sigmaSeries.length });
    console.groupEnd();
  }

  return detail;
}, [dailyCpk, dailySigma, lsl, usl, sigmaMaxNum]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Detail</h1>
        <button onClick={handleBack} className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
          Back to One Day Search
        </button>
      </div>

      {/* Key cards */}
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl shadow p-4 text-sm">
          <div><b>Model:</b> {params.model}</div>
          <div><b>Tester:</b> {params.tester}</div>
          <div><b>Day:</b> {params.day}</div>
          <div><b>Order:</b> {params.order_idx}</div>
          <div><b>Occ idx:</b> {occ_idx}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 text-sm">
          <div><b>Step:</b> {params.step}</div>
          <div><b>Test item:</b> {params.test_item}</div>
          <div><b>Description:</b> {params.test_desc}</div>
        </div>

        {/* Program card */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-sm text-slate-500">Program</div>
          <div className="text-lg font-semibold truncate" title={selectedProg ?? "-"}>
            {selectedProg ?? "-"}
          </div>

          <div className="mt-2 text-sm text-slate-500">Revision</div>
          <div className="text-lg font-semibold">{selectedRev ?? progRevDisplay}</div>

          {note && (
            <div className="mt-2 text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              {note}
            </div>
          )}
        </div>

                {/* AI Risk (rule-based) */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-sm text-slate-500">AI Risk (rule-based)</div>
          <div
            className={
              "text-lg font-semibold " +
              (risk.level==="high" ? "text-rose-600" :
               risk.level==="medium" ? "text-amber-600" : "text-emerald-600")
            }
          >
            {risk.level.toUpperCase()} • {risk.score}
          </div>
          <ul className="mt-2 text-xs text-slate-600 list-disc pl-5 space-y-1">
            {risk.reasons.slice(0, 3).map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

      </div>

      {/* 1) Distribution of samples */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5">
        <h2 className="text-lg font-semibold mb-2">Sample distribution (selected day)</h2>
        <EnhancedHistogram values={samples} mean={mean} median={median} lsl={lsl as any} usl={usl as any} />
        <div className="mt-2 text-sm text-slate-600">
          Count: {samples.length} • Mean: {fmtNum(mean)} • Median: {fmtNum(median)}
          {(lsl != null || usl != null) && <> • Spec (LSL–USL): {fmtNum(lsl)} – {fmtNum(usl)}</>}
          {errSamples && <span className="text-rose-600"> • {errSamples}</span>}
        </div>
      </div>

      {/* Month picker */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Selected month</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {/* 2) Daily Mean */}
     <div className="bg-white rounded-2xl shadow p-4 mb-5">
        <h3 className="text-base font-semibold mb-2">Daily Mean (selected month)</h3>
        <Line
          from={dailyMean.map(d => ({ x: d.day, y: d.mean_val }))}
          unit=""
          // ? ¨Ñ´»éÒÂâ´Â´Ù¤èÒ¹éÍÂ/ÁÒ¡¨ÃÔ§ à¾×èÍ¡Ñ¹¡Ã³Õ¢éÍÁÙÅÊÅÑº
          yRefs={(() => {
            const hasL = typeof lsl === "number" && isFinite(lsl as number);
            const hasU = typeof usl === "number" && isFinite(usl as number);
            if (!hasL && !hasU) return [];
            if (hasL && hasU) {
              const lo = Math.min(lsl as number, usl as number);
              const hi = Math.max(lsl as number, usl as number);
              return [
                { value: lo, label: "LSL", tone: "amber" as const },
                { value: hi, label: "USL", tone: "blue"  as const },
              ];
            }
            // ÁÕàÊé¹à´ÕÂÇ ¡ç¶×Íà»ç¹ LSL ä»¡èÍ¹ (µÒÁ¸ÃÃÁªÒµÔ¢Í§ mean spec)
            return [{ value: (hasL ? lsl : usl) as number, label: "LSL", tone: "amber" as const }];
          })()}
          includeYRefsInDomain={true}   // ? LSL/USL ¤ÇÃÁÕ¼ÅµèÍÊà¡Åá¡¹ Y
          valueFormat={(v) => fmtNum(v) ?? ""}
        />
      </div>

      {/* 3) Daily CPK */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">Daily CPK (selected month)</h3>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Min CPK</span>
            <input
              className="w-24 rounded-lg border border-slate-300 px-2 py-1"
              placeholder="e.g. 1.33"
              value={minCpkLine}
              onChange={(e) => setMinCpkLine(e.target.value)}
            />
          </label>
        </div>

        <Line
          from={dailyCpk.map(d => ({ x: d.day, y: d.cpk }))}
          unit=""
          yRefs={minCpkNum != null ? [{ value: minCpkNum, label: `Min ${minCpkNum}`, tone: "rose" }] : []}
        />
      </div>

  {/* 4a) Daily Sigma — Time series */}
<div className="bg-white rounded-2xl shadow p-4 mb-5">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-base font-semibold">Daily Sigma — Time series (selected month)</h3>
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">Max ?</span>
      <input
        className="w-24 rounded-lg border border-slate-300 px-2 py-1"
        placeholder="e.g. 2.0"
        value={sigmaMaxLine}
        onChange={(e) => setSigmaMaxLine(e.target.value)}
      />
    </label>
  </div>

  <Line
    from={dailySigma.map(d => ({ x: d.day, y: d.sigma_val }))}
    unit=""
    yRefs={sigmaMaxNum != null ? [{ value: sigmaMaxNum, label: `Maximum sigma threshold ${fmtNum(sigmaMaxNum)}`, tone: "rose" }]: []}
    includeYRefsInDomain={true}
    valueFormat={(v) => fmtNum(v) ?? ""}
    showPointValues={true}   // << áÊ´§µÑÇàÅ¢º¹¨Ø´
  />
</div>

  {/* 4b) Sigma ?–? Scatter (X=Mean, Y=Sigma) */}
  <div className="bg-white rounded-2xl shadow p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold">Sigma-Scatter (selected month)</h3>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">Max ?</span>
        <input
          className="w-24 rounded-lg border border-slate-300 px-2 py-1"
          placeholder="e.g. 2.0"
          value={sigmaMaxLine}
          onChange={(e) => setSigmaMaxLine(e.target.value)}
        />
      </label>
    </div>

    <Scatter
      points={dailySigma.map(d => ({
        x: d.mean_val,     // X = mean (?)
        y: d.sigma_val,    // Y = sigma (?)
        label: d.day,      // ÇÑ¹ (äÇéâªÇì¢éÒ§¨Ø´)
      }))}
      xUnit=""
      yUnit=""
      xLabel="Mean"
      yLabel="Sigma"
      yRefs={sigmaMaxNum != null ? [{ value: sigmaMaxNum, label: `Maximum sigma threshold ${fmtNum(sigmaMaxNum)}`, tone: "rose" }]: []}
      includeYRefsInDomain={true}
      showPointValues={true}          // << áÊ´§¤èÒÊigma¢éÒ§¨Ø´
      valueFormat={(v) => fmtNum(v) ?? ""}
    />
    {errSeries && <div className="mt-2 text-sm text-rose-600">{errSeries}</div>}
  </div>
      {loading && <div className="mt-3 text-sm text-slate-500">Loading…</div>}
    </div>
  );
}

function lastNonNull<T>(arr: T[], pick: (t:T)=>number|null|undefined): number|null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = pick(arr[i]);
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/** àÊé¹¡ÃÒ¿ SVG àºÒ æ (no deps) + ÃÍ§ÃÑºàÊé¹ÍéÒ§ÍÔ§á¡¹ Y (horizontal ref lines) */
type RefLine = {
  value: number;
  label?: string;
  tone?: "rose" | "amber" | "blue" | "emerald" | "violet" | "sky";
};

function Line({
  from,
  unit,
  yRefs = [],
  showPointValues = true,
  maxValueLabels = 40,
  valueFormat,
  includeYRefsInDomain = true,
  connectNulls = true,             // ? à¾ÔèÁ prop ãËÁè (¤èÒàÃÔèÁµé¹ = µèÍàÊé¹¢éÒÁ null)
}: {
  from: { x: string; y: number | null }[];
  unit: string;
  yRefs?: RefLine[];
  showPointValues?: boolean;
  maxValueLabels?: number;
  valueFormat?: (v: number) => string;
  includeYRefsInDomain?: boolean;
  connectNulls?: boolean;          // ? type ¢Í§ prop ãËÁè
}) {
  if (!from.length) return <div className="text-sm text-slate-500">No data</div>;

  const width = 720, height = 220, pad = 28;

  const xsAll = from.map(p => new Date(p.x).getTime()).filter(Number.isFinite);
  if (!xsAll.length) return <div className="text-sm text-slate-500">No data</div>;

  const pts = from
    .map(p => (typeof p.y === "number" ? { x: p.x, y: p.y as number } : null))
    .filter(Boolean) as { x: string; y: number }[];

  const ys = pts.map(p => p.y);
  const refVals = yRefs.map(r => r.value).filter(Number.isFinite);

  const domainYsSrc = includeYRefsInDomain ? [...ys, ...refVals] : ys;

  let minY = Math.min(...domainYsSrc);
  let maxY = Math.max(...domainYsSrc);
  if (!isFinite(minY) || !isFinite(maxY)) {
    if (refVals.length) { minY = Math.min(...refVals); maxY = Math.max(...refVals); }
    else { minY = 0; maxY = 1; }
  }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const spanPad = (maxY - minY || 1) * 0.05;
  minY -= spanPad; maxY += spanPad;

  const minX = Math.min(...xsAll), maxX = Math.max(...xsAll);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const X = (t: number) => pad + ((t - minX) / spanX) * (width - 2 * pad);
  const Y = (v: number) => height - pad - ((v - minY) / spanY) * (height - 2 * pad);

  // ? ÊÃéÒ§ path: ¶éÒ connectNulls=true ¨ÐµèÍàÊé¹¢éÒÁ null
  let d = "";
  let started = false;
  for (const p of from) {
    const t = new Date(p.x).getTime();
    if (!Number.isFinite(t)) continue;

    if (typeof p.y !== "number") {
      if (!connectNulls) started = false;   // µÑ´ªèÇ§à©¾ÒÐµÍ¹äÁèµèÍàÊé¹
      continue;
    }
    const cmd = started ? " L" : " M";
    d += `${cmd}${X(t)},${Y(p.y)}`;
    started = true;
  }

  const toneCls: Record<NonNullable<RefLine["tone"]>, string> = {
    rose: "stroke-rose-500",
    amber: "stroke-amber-500",
    blue: "stroke-blue-500",
    emerald: "stroke-emerald-500",
    violet: "stroke-violet-500",
    sky: "stroke-sky-500",
  };

  const fmt = valueFormat ?? ((v: number) => (Number.isFinite(v) ? v.toFixed(3) : ""));
  const labelStep = Math.max(1, Math.ceil(from.length / maxValueLabels));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <rect x={0} y={0} width={width} height={height} className="fill-slate-50" />
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad} x2={width - pad}
          y1={pad + (height - 2 * pad) * g}
          y2={pad + (height - 2 * pad) * g}
          className="stroke-slate-200" />
      ))}

      {yRefs.map((r, i) => (
        <g key={i}>
          <line x1={pad} x2={width - pad} y1={Y(r.value)} y2={Y(r.value)}
            className={`${toneCls[r.tone ?? "rose"]}`} strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={width - pad - 2} y={Y(r.value) - 3} textAnchor="end"
            className="text-[10px] fill-slate-600">
            {(r.label ?? r.value.toFixed(3)) + (unit || "")}
          </text>
        </g>
      ))}

      <path d={d} className="stroke-sky-500 fill-none" strokeWidth={2} />

      {/* ? ÇÒ´à©¾ÒÐ¨Ø´·ÕèÁÕ¤èÒ; ¢éÒÁ null ä»àÅÂ */}
      {from.map((p, i) => {
        if (typeof p.y !== "number") return null;
        const tx = new Date(p.x).getTime();
        if (!Number.isFinite(tx)) return null;
        const cx = X(tx), cy = Y(p.y);
        const dy = cy < pad + 14 ? 12 : -6;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={3} className="fill-sky-500" />
            {showPointValues && (i % labelStep === 0) && (
              <text x={cx + 4} y={cy + dy} className="text-[10px] fill-slate-700" pointerEvents="none">
                {fmt(p.y)}{unit}
              </text>
            )}
          </g>
        );
      })}

      {/* labels á¡¹ */}
      <text x={pad} y={height - 6} className="text-[10px] fill-slate-500">
        {new Date(minX).toISOString().slice(0, 10)}
      </text>
      <text x={width - pad - 60} y={height - 6} className="text-[10px] fill-slate-500">
        {new Date(maxX).toISOString().slice(0, 10)}
      </text>
      <text x={4} y={height - pad} className="text-[10px] fill-slate-500">
        {minY.toFixed(3)}{unit}
      </text>
      <text x={4} y={pad + 8} className="text-[10px] fill-slate-500">
        {maxY.toFixed(3)}{unit}
      </text>
    </svg>
  );
}

/** Scatter: X=mean, Y=sigma + àÊé¹ÍéÒ§ÍÔ§ Y */
type ScatterRefLine = {
  value: number;
  label?: string;
  tone?: "rose" | "amber" | "blue" | "emerald" | "violet" | "sky";
};
function Scatter({
  points,
  xLabel,
  yLabel,
  xUnit = "",
  yUnit = "",
  yRefs = [],
  includeYRefsInDomain = true,
  showPointValues = false,
  // maxValueLabels = 30,
  valueFormat,
}: {
  points: { x: number | null; y: number | null; label?: string }[];
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
  yRefs?: ScatterRefLine[];
  includeYRefsInDomain?: boolean;
  showPointValues?: boolean;
  maxValueLabels?: number;
  valueFormat?: (v: number) => string;
}) {
  const data = points.filter(p => typeof p.x === "number" && typeof p.y === "number") as {
    x: number; y: number; label?: string;
  }[];

  if (!data.length) return <div className="text-sm text-slate-500">No data</div>;

  const width = 720, height = 260, pad = 36;

  const xs = data.map(p => p.x);
  const ys = data.map(p => p.y);
  const refVals = yRefs.map(r => r.value).filter(Number.isFinite);

  // domain X
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  if (minX === maxX) { minX -= 1; maxX += 1; }
  const padX = (maxX - minX) * 0.05;
  minX -= padX; maxX += padX;

  // domain Y (ÃÇÁ yRefs ¶éÒµéÍ§¡ÒÃ)
  const baseY = includeYRefsInDomain ? [...ys, ...refVals] : ys;
  let minY = Math.min(...baseY), maxY = Math.max(...baseY);
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) { minY = Math.min(...ys); maxY = Math.max(...ys); }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const padY = (maxY - minY) * 0.05;
  minY -= padY; maxY += padY;

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const X = (v: number) => pad + ((v - minX) / spanX) * (width - 2*pad);
  const Y = (v: number) => height - pad - ((v - minY) / spanY) * (height - 2*pad);

  const toneCls: Record<NonNullable<ScatterRefLine["tone"]>, string> = {
    rose: "stroke-rose-500",
    amber: "stroke-amber-500",
    blue: "stroke-blue-500",
    emerald: "stroke-emerald-500",
    violet: "stroke-violet-500",
    sky: "stroke-sky-500",
  };
  const fmt = valueFormat ?? ((v: number) => (Number.isFinite(v) ? v.toFixed(3) : ""));

  // grid: 4 á¹ÇµÑé§ + 4 á¹Ç¹Í¹
  const gridSteps = [0.2, 0.4, 0.6, 0.8];

  // label step ¢Í§¨Ø´
  // const labelStep = Math.max(1, Math.ceil(data.length / maxValueLabels));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <rect x={0} y={0} width={width} height={height} className="fill-slate-50" />

      {/* grid á¹Ç¹Í¹ */}
      {gridSteps.map((g, i) => (
        <line key={`h-${i}`} x1={pad} x2={width - pad}
          y1={pad + (height - 2*pad) * g}
          y2={pad + (height - 2*pad) * g}
          className="stroke-slate-200" />
      ))}
      {/* grid á¹ÇµÑé§ */}
      {gridSteps.map((g, i) => (
        <line key={`v-${i}`} y1={pad} y2={height - pad}
          x1={pad + (width - 2*pad) * g}
          x2={pad + (width - 2*pad) * g}
          className="stroke-slate-200" />
      ))}

      {/* y-ref lines */}
      {yRefs.map((r, i) => (
        <g key={i}>
          <line x1={pad} x2={width - pad} y1={Y(r.value)} y2={Y(r.value)}
            className={`${toneCls[r.tone ?? "rose"]}`} strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={width - pad - 2} y={Y(r.value) - 4} textAnchor="end" className="text-[10px] fill-slate-600">
            {r.label ?? r.value.toFixed(3)}
          </text>
        </g>
      ))}

      {/* ¨Ø´ */}
      {data.map((p, i) => {
        const cx = X(p.x), cy = Y(p.y);
        const dy = cy < pad + 14 ? 12 : -6;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={3.5} className="fill-sky-600" />
            {showPointValues && (
              <>
                <text x={cx + 6} y={cy + dy} className="text-[10px] fill-slate-700">
                  {fmt(p.y)}{yUnit}
                </text>
                <text x={cx + 6} y={cy + dy + 12} className="text-[9px] fill-slate-500">
                  {p.label ?? ""}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* axis labels + min/max ticks */}
      {/* X ticks («éÒÂ/¢ÇÒ) */}
      <text x={pad} y={height - 6} className="text-[10px] fill-slate-500">{minX.toFixed(2)}{xUnit}</text>
      <text x={width - pad - 40} y={height - 6} className="text-[10px] fill-slate-500">{maxX.toFixed(2)}{xUnit}</text>
      {/* Y ticks (ÅèÒ§=¤èÒµèÓÊØ´, º¹=¤èÒÊÙ§ÊØ´) */}
      <text x={6} y={height - pad} className="text-[10px] fill-slate-500">{minY.toFixed(2)}{yUnit}</text>
      <text x={6} y={pad + 10} className="text-[10px] fill-slate-500">{maxY.toFixed(2)}{yUnit}</text>

      {/* ª×èÍá¡¹ (option) */}
      {xLabel && <text x={width/2} y={height - 4} textAnchor="middle" className="text-[10px] fill-slate-600">{xLabel}</text>}
      {yLabel && <text x={10} y={height/2} textAnchor="start" className="text-[10px] fill-slate-600 -rotate-90 origin-left">{yLabel}</text>}
    </svg>
  );
}
