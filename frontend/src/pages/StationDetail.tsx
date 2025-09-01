import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

export default function StationDetail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const lineId = searchParams.get("lineId") || "";
    const station = searchParams.get("station") || "";
    const workDate = searchParams.get("workDate") || "";

    const [data, setData] = useState<FailureRecord[]>([]);
    const [chartType, setChartType] = useState<"testerId" | "failItem">("testerId");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ column: keyof FailureRecord; dir: "asc" | "desc" }>({
        column: "workDate",
        dir: "desc",
    });

    const chartRef = useRef<Chart<"bar"> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Connect WebSocket
    useEffect(() => {
        if (!lineId || !station) return;
        const wsUrl = `ws://localhost:8000/failures/ws/station?lineId=${lineId}&station=${station}&workDate=${workDate}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const payload: FailureRecord[] = JSON.parse(event.data);
            setData(payload);
        };
        return () => ws.close();
    }, [lineId, station, workDate]);

    // Draw chart
    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const counts: Record<string, number> = {};
        data.forEach((d) => {
            const key = d[chartType];
            if (key) counts[key] = (counts[key] || 0) + 1;
        });

        const entries = Object.entries(counts);
        const sorted =
            chartType === "failItem" ? entries.sort((a, b) => b[1] - a[1]).slice(0, 5) : entries;

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: sorted.map(([k]) => k),
                datasets: [
                    {
                        label: chartType === "testerId" ? "Failures by Tester" : "Top 5 Failed Items",
                        data: sorted.map(([, v]) => v),
                        backgroundColor: "#f7941d",
                    },
                ],
            },
            options: {
                responsive: true,
                onClick: (_, elements) => {
                    if (!elements.length) return;
                    const idx = elements[0].index;
                    const label = sorted[idx][0];
                    // single click → filter table
                    setFiltered(data.filter((r) => r[chartType] === label));
                },
            },
        });
    }, [data, chartType]);

    const [filtered, setFiltered] = useState<FailureRecord[] | null>(null);

    // Sort + search
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
                {station} Failures Dashboard — Line {lineId} ({workDate})
            </h2>

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
                    className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600"
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
                className="mt-4 px-6 py-2 rounded bg-orange-500 hover:bg-orange-600"
            >
                Back to Summary
            </button>
        </div>
    );
}
