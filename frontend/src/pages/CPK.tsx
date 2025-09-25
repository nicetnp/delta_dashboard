import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useLocation } from "react-router-dom";
import axios from 'axios';
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  test_program?: string | null;
  occ_idx?: number | null;
};


/* ---------- save state ---------- */
type OneDayState = {
  day: string;
  model: string;
  tester: string;
  minCpk: string;
  onlyWithLimits: boolean;
  pageSize: number;
};

const SS_KEY = "oneDaySearchState";

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

export default function CPK() {
  const today = new Date().toISOString().slice(0, 10);
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
  const [pageSize, setPageSize] = useState(50);

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
      window.history.replaceState({}, "");
      console.log("[CPK] hydrated from location.state:", backRows.length, "rows");
    }

    mountedRef.current = true;
  }, []);

  /* --- initial load only if not hydrated --- */
  useEffect(() => {
    if (!mountedRef.current) return;
    if (hydratedRef.current) {
      console.log("[CPK] skip initial load (hydrated)");
      return;
    }
    load();
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
      saveState({ day, model, tester, minCpk, onlyWithLimits, pageSize });
    } catch (err: any) {
      console.error("[CPK] load error:", err);
      setError(err?.response?.data?.detail || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/meta/cpk-filters`);
      setModelsFs(data.models || []);
      setTestersFs(data.testers || []);
    } catch (err) {
      console.warn("[CPK] loadMeta error:", err);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // Filtered and sorted data
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Apply query filter
    if (query) {
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val || "").toLowerCase().includes(query)
        )
      );
    }

    // Apply minCpk filter
    if (minCpk) {
      const minVal = parseFloat(minCpk);
      if (!isNaN(minVal)) {
        filtered = filtered.filter(row => (row.cpk || 0) >= minVal);
      }
    }

    // Apply onlyWithLimits filter
    if (onlyWithLimits) {
      filtered = filtered.filter(row => 
        row.lsl != null || row.usl != null
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === "asc" ? 1 : -1;
      if (bVal == null) return sortDir === "asc" ? -1 : 1;
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return filtered;
  }, [rows, query, minCpk, onlyWithLimits, sortKey, sortDir]);

  // Paginated data
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  const handleSort = (key: keyof CpkRow) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    resetPaging();
  };

  const exportCSV = () => {
    const headers = [
      "Day", "Model", "Tester", "Test Item", "Test Desc", "Step",
      "Mean", "CPK", "LSL", "USL", "Valid Count", "Raw Count", "Prog Rev"
    ];
    
    const csvRows = [
      headers.join(","),
      ...filteredRows.map(row => [
        csvEscape(row.day),
        csvEscape(row.model),
        csvEscape(row.tester),
        csvEscape(row.test_item),
        csvEscape(row.test_desc),
        csvEscape(row.step),
        csvEscape(row.mean_val?.toFixed(6)),
        csvEscape(row.cpk?.toFixed(3)),
        csvEscape(row.lsl?.toFixed(6)),
        csvEscape(row.usl?.toFixed(6)),
        csvEscape(row.valid_count),
        csvEscape(row.raw_count),
        csvEscape(row.prog_rev)
      ].join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpk-${day}-${model || "all"}-${tester || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 tracking-tight">
          CPK Analysis
        </h1>
        <p className="text-slate-400 text-lg font-medium">Process Capability Index monitoring and analysis</p>
      </div>

      {/* Filters */}
      <Card title="Search Filters" icon="🔍" variant="glass" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Date"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          
          <div>
            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Model</label>
            <input
              list="modelsList"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
              placeholder="All models"
            />
            <datalist id="modelsList">
              {modelsFs.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Tester</label>
            <input
              list="testersList"
              value={tester}
              onChange={(e) => setTester(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
              placeholder="All testers"
            />
            <datalist id="testersList">
              {testersFs.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input
            label="Search"
            value={queryLive}
            onChange={(e) => setQueryLive(e.target.value)}
            placeholder="Search all fields..."
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Min CPK
            </label>
            <input
              type="number"
              step="0.01"
              value={minCpk}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMinCpk(e.target.value)}
              placeholder="Enter minimum CPK value"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800/60 border border-gray-300 dark:border-slate-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 hover:border-gray-400 dark:hover:border-slate-500/70 transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 text-slate-200">
              <input
                type="checkbox"
                checked={onlyWithLimits}
                onChange={(e) => setOnlyWithLimits(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Only with limits</span>
            </label>
          </div>

          <Select
            label="Page Size"
            value={pageSize.toString()}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              resetPaging();
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button onClick={load} disabled={loading} variant="primary">
            {loading ? "Loading..." : "Search"}
          </Button>
          
          <Button onClick={exportCSV} disabled={!filteredRows.length} variant="secondary">
            Export CSV ({filteredRows.length})
          </Button>
        </div>
      </Card>

      {/* Results */}
      <Card title={`CPK Results (${filteredRows.length} records)`} variant="glass">
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-slate-400">Loading...</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600/30">
                    {[
                      { key: "day", label: "Day" },
                      { key: "model", label: "Model" },
                      { key: "tester", label: "Tester" },
                      { key: "test_item", label: "Test Item" },
                      { key: "test_desc", label: "Description" },
                      { key: "step", label: "Step" },
                      { key: "mean_val", label: "Mean" },
                      { key: "cpk", label: "CPK" },
                      { key: "lsl", label: "LSL" },
                      { key: "usl", label: "USL" },
                      { key: "valid_count", label: "Valid" },
                      { key: "prog_rev", label: "Rev" }
                    ].map(col => (
                      <th
                        key={col.key}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSort(col.key as keyof CpkRow)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <span className="text-blue-400">
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600/20">
                  {paginatedRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2 text-slate-200">{row.day}</td>
                      <td className="px-3 py-2 text-slate-200">{row.model}</td>
                      <td className="px-3 py-2 text-slate-200">{row.tester}</td>
                      <td className="px-3 py-2 text-slate-200">{row.test_item}</td>
                      <td className="px-3 py-2 text-slate-200 max-w-xs truncate" title={row.test_desc}>
                        {row.test_desc}
                      </td>
                      <td className="px-3 py-2 text-slate-200">{row.step}</td>
                      <td className="px-3 py-2 text-slate-200">
                        {row.mean_val?.toFixed(6) || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold ${
                          !row.cpk ? "text-slate-400" :
                          row.cpk >= 1.67 ? "text-green-400" :
                          row.cpk >= 1.33 ? "text-yellow-400" :
                          "text-red-400"
                        }`}>
                          {row.cpk?.toFixed(3) || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {row.lsl?.toFixed(6) || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {row.usl?.toFixed(6) || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-200">{row.valid_count || "-"}</td>
                      <td className="px-3 py-2 text-slate-200">{row.prog_rev || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-600/30">
                <div className="text-sm text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    variant="secondary"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="text-slate-200 px-3">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    variant="secondary"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
