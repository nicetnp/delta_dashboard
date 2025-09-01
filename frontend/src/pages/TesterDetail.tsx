import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Chart } from "chart.js/auto";
import clsx from "clsx";

interface FailureRecord {
    sn: string;
    model: string;
    testerId: string;
    fixtureId: string;
    failItem: string;
    workDate: string;
}

const stationMap: Record<string, string> = {
    "%LASH": "VFLASH1",
    "%IPOT_1": "HIPOT1",
    "%TS1": "ATS1",
    "%RATION": "VIBRATION",
    "%TUP": "HEATUP",
    "%RN_IN": "BURNIN",
    "%IPOT_2": "HIPOT2",
    "%TS2": "ATS2",
    "%LASH2": "VFLASH2",
    "%TS3": "ATS3",
};

export default function TesterDetail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const lineId = searchParams.get("lineId") || "";
    const station = searchParams.get("station") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const [data, setData] = useState<FailureRecord[]>([]);
    const [filtered, setFiltered] = useState<FailureRecord[] | null>(null);
    const [chartType, setChartType] = useState<"testerId" | "failItem">("testerId");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ column: keyof FailureRecord; dir: "asc" | "desc" }>({
        column: "workDate",
        dir: "desc",
    });

    const chartRef = useRef<Chart<"bar" | "line"> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Connect WebSocket
    useEffect(() => {
        if (!lineId) return;
        let wsUrl = `ws://localhost:8000/failures/ws/tester?lineId=${lineId}`;
        if (station) wsUrl += `&station=${station}`;
        if (startDate) wsUrl += `&startDate=${startDate}`;
        if (endDate) wsUrl += `&endDate=${endDate}`;

        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            const payload: FailureRecord[] = JSON.parse(event.data);
            setData(payload || []);
            setFiltered(null);
        };
        return () => ws.close();
    }, [lineId, station, startDate, endDate]);

    // Draw Chart
    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const counts: Record<string, number> = {};
        const dataset =
            chartType === "testerId"
                ? data.map((d) => d.testerId || "N/A")
                : data.map((d) => d.failItem || "N/A");

        dataset.forEach((key) => {
            counts[key] = (counts[key] || 0) + 1;
        });

        let entries = Object.entries(counts);
        if (chartType === "failItem") {
            entries = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
        } else {
            entries = entries.sort((a, b) => a[0].localeCompare(b[0]));
        }

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: entries.map(([k]) => k),
                datasets: [
                    {
                        label: chartType === "failItem" ? "Top 5 Fail Items" : "Failures by Tester",
                        data: entries.map(([, v]) => v),
                        backgroundColor: "#37b019",
                    },
                ],
            },
            options: {
                responsive: true,
                indexAxis: chartType === "failItem" ? "y" : "x",
                onClick: (_, elements) => {
                    if (!elements.length) return;
                    const idx = elements[0].index;
                    const label = entries[idx][0];
                    const filterColumn = chartType === "failItem" ? "failItem" : "testerId";
                    setFiltered(data.filter((r) => r[filterColumn] === label));
                },
            },
        });
    }, [data, chartType]);

    // Sort + Search
    const visibleData = (filtered || data)
        .filter(
            (r) =>
                r.sn.toLowerCase().includes(search.toLowerCase()) ||
                r.model.toLowerCase().includes(search.toLowerCase()) ||
                r.testerId.toLowerCase().includes(search.toLowerCase()) ||
                r.fixtureId.toLowerCase().includes(search.toLowerCase()) ||
                r.failItem.toLowerCase().includes(search.toLowerCase()) ||
                r.workDate.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const va = a[sort.column];
            const vb = b[sort.column];
            if (va < vb) return sort.dir === "asc" ? -1 : 1;
            if (va > vb) return sort.dir === "asc" ? 1 : -1;
            return 0;
        });

    return (
        <div className="max-w-6xl mx-auto p-6 bg-neutral-900 text-white rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-2">
                Tester Failures Dashboard — Line {lineId} ({stationMap[station] || "All Stations"})
            </h2>
            <p className="text-sm text-neutral-400 mb-4">
                Date range: {startDate} → {endDate}
            </p>

            {/* ✅ Dropdown เลือก Station */}
            <div className="mb-4">
                <label className="mr-2">Station:</label>
                <select
                    value={station}
                    onChange={(e) => {
                        const newStation = e.target.value;
                        const params = new URLSearchParams(searchParams);
                        if (newStation) {
                            params.set("station", newStation);
                        } else {
                            params.delete("station");
                        }
                        navigate(`?${params.toString()}`);
                    }}
                    className="px-3 py-2 rounded bg-neutral-800 border border-neutral-600 text-sm"
                >
                    <option value="">All Stations</option>
                    {Object.entries(stationMap).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="h-96 mb-4">
                <canvas ref={canvasRef}></canvas>
            </div>

            <div className="flex justify-between items-center mb-2">
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-3 py-2 rounded bg-neutral-800 border border-neutral-600 text-sm"
                />
                <button
                    onClick={() =>
                        setChartType((prev) => (prev === "testerId" ? "failItem" : "testerId"))
                    }
                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
                >
                    {chartType === "testerId" ? "Top 5 Failed" : "By Tester"}
                </button>
            </div>

            <table className="w-full border-collapse text-sm">
                <thead>
                <tr>
                    {["sn", "model", "testerId", "fixtureId", "failItem", "workDate"].map((col) => (
                        <th
                            key={col}
                            onClick={() =>
                                setSort({
                                    column: col as keyof FailureRecord,
                                    dir: sort.dir === "asc" ? "desc" : "asc",
                                })
                            }
                            className="border border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-800"
                        >
                            {col} {sort.column === col ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {visibleData.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-4 text-neutral-400">
                            No data
                        </td>
                    </tr>
                ) : (
                    visibleData.map((row, i) => (
                        <tr
                            key={i}
                            className={clsx(
                                "hover:bg-neutral-800",
                                i % 2 === 0 ? "bg-neutral-900" : "bg-neutral-800/30"
                            )}
                        >
                            <td className="px-3 py-2">{row.sn}</td>
                            <td className="px-3 py-2">{row.model}</td>
                            <td className="px-3 py-2">{row.testerId}</td>
                            <td className="px-3 py-2">{row.fixtureId}</td>
                            <td className="px-3 py-2">{row.failItem}</td>
                            <td className="px-3 py-2">{row.workDate.replace("T", " ")}</td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>

            <button
                onClick={() => navigate(-1)}
                className="mt-4 px-6 py-2 rounded bg-green-600 hover:bg-green-700"
            >
                Back to Summary
            </button>
        </div>
    );
}
