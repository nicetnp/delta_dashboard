import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Chart } from "chart.js/auto";
import clsx from "clsx";

interface FailureRecord {
    testerId: string;
    fixtureId: string;
    failItem: string;
    workDate: string;
}

export default function FixtureDetail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const lineId = searchParams.get("lineId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const [data, setData] = useState<FailureRecord[]>([]);
    const [filtered, setFiltered] = useState<FailureRecord[] | null>(null);
    const [chartType, setChartType] = useState<"fixtureId" | "failItem">("fixtureId");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ column: keyof FailureRecord; dir: "asc" | "desc" }>({
        column: "workDate",
        dir: "desc",
    });

    const chartRef = useRef<Chart<"bar"> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Connect WebSocket
    useEffect(() => {
        if (!lineId) return;
        let wsUrl = `ws://localhost:8000/failures/ws/fixture?lineId=${lineId}`;
        if (startDate) wsUrl += `&startDate=${startDate}`;
        if (endDate) wsUrl += `&endDate=${endDate}`;

        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            const payload: FailureRecord[] = JSON.parse(event.data);
            setData(payload || []);
            setFiltered(null);
        };
        return () => ws.close();
    }, [lineId, startDate, endDate]);

    // Draw Chart
    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const counts: Record<string, number> = {};
        const dataset =
            chartType === "failItem"
                ? data.map((d) => `${d.fixtureId || "N/A"} - ${d.failItem || "N/A"}`)
                : data.map((d) => d.fixtureId || "N/A");

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
                        label:
                            chartType === "failItem"
                                ? "Top 5 Fail Items"
                                : "Failures by Fixture",
                        data: entries.map(([, v]) => v),
                        backgroundColor: "#2ea4e3",
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
                    if (chartType === "failItem") {
                        setFiltered(
                            data.filter(
                                (r) => `${r.fixtureId || "N/A"} - ${r.failItem || "N/A"}` === label
                            )
                        );
                    } else {
                        setFiltered(data.filter((r) => r.fixtureId === label));
                    }
                },
            },
        });
    }, [data, chartType]);

    // Sort + Search
    const visibleData = (filtered || data)
        .filter(
            (r) =>
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
                Fixture Failures Dashboard — Line {lineId}
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
                        setChartType((prev) => (prev === "fixtureId" ? "failItem" : "fixtureId"))
                    }
                    className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700"
                >
                    {chartType === "fixtureId" ? "Top 5 Failed" : "By Fixture"}
                </button>
            </div>

            <table className="w-full border-collapse text-sm">
                <thead>
                <tr>
                    {["testerId", "fixtureId", "failItem", "workDate"].map((col) => (
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
                        <td colSpan={4} className="text-center py-4 text-neutral-400">
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
                className="mt-4 px-6 py-2 rounded bg-sky-600 hover:bg-sky-700"
            >
                Back to Summary
            </button>
        </div>
    );
}
