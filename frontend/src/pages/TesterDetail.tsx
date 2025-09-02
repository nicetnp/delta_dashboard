import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Chart } from "chart.js/auto";
import clsx from "clsx";
import Layout from "../components/Layout";
import Card from "../components/Card";

interface FailureRecord {
    sn: string;
    model: string;
    testerId: string;
    fixtureId: string;
    failItem: string;
    workDate: string;
    station?: string; // Add station field
    datetime?: string;
    timestamp?: string;
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
    const [showTimeRangeChart, setShowTimeRangeChart] = useState(false);
    const [timeRangeData, setTimeRangeData] = useState<any[]>([]);
    const [timeRangeChartRef, setTimeRangeChartRef] = useState<Chart<"line"> | null>(null);
    const [timeRangeCanvasRef, setTimeRangeCanvasRef] = useState<HTMLCanvasElement | null>(null);

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

        // Add double click event listener
        const canvas = canvasRef.current;
        const handleDoubleClick = () => {
            // Calculate time range: 7:00 today to 7:00 tomorrow
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const startTime = new Date(today);
            startTime.setHours(7, 0, 0, 0);
            
            const endTime = new Date(tomorrow);
            endTime.setHours(7, 0, 0, 0);
            
            // Filter data for the selected time range based on workDate AND current station
            const filteredData = data.filter(item => {
                const itemTime = new Date(item.workDate);
                const isInTimeRange = itemTime >= startTime && itemTime <= endTime;
                // Filter by current station from URL parameter
                const isCurrentStation = station === "" || item.station === station;
                return isInTimeRange && isCurrentStation;
            });
            
            setTimeRangeData(filteredData);
            setShowTimeRangeChart(true);
            
            // Create time range chart after a short delay to ensure state is updated
            setTimeout(() => {
                createTimeRangeChart(filteredData);
            }, 100);
        };
        canvas?.addEventListener("dblclick", handleDoubleClick);

        return () => {
            canvas?.removeEventListener("dblclick", handleDoubleClick);
        };
    }, [data, chartType]);

    // Function to create time range chart
    const createTimeRangeChart = (chartData: any[]) => {
        if (!timeRangeCanvasRef) return;
        if (timeRangeChartRef) timeRangeChartRef.destroy();

        // Generate time labels (every hour from 7:00 to 7:00)
        const timeLabels = [];
        const startTime = new Date();
        startTime.setHours(7, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(7, 0, 0, 0);
        
        for (let time = new Date(startTime); time <= endTime; time.setHours(time.getHours() + 1)) {
            timeLabels.push(time.toLocaleTimeString('th-TH', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
        }

        // Group data by hour
        const hourlyData = new Array(24).fill(0);
        chartData.forEach(item => {
            const itemTime = new Date(item.workDate);
            const hour = itemTime.getHours();
            if (hour >= 0 && hour < 24) {
                hourlyData[hour]++;
            }
        });

        const newChart = new Chart(timeRangeCanvasRef, {
            type: "line",
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Failures',
                    data: hourlyData,
                    borderColor: '#37b019',
                    backgroundColor: 'rgba(55, 176, 25, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#37b019',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            title: (context) => `เวลา ${context[0].label}`,
                            label: (context) => `Failures: ${context.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "เวลา",
                            color: "#94a3b8",
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#cbd5e1",
                            font: {
                                size: 12
                            }
                        },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "จำนวน Failures",
                            color: "#94a3b8",
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#cbd5e1",
                            font: {
                                size: 12
                            }
                        },
                    },
                },
            },
        });

        setTimeRangeChartRef(newChart);
    };

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
            if (!va || !vb) return 0;
            if (va < vb) return sort.dir === "asc" ? -1 : 1;
            if (va > vb) return sort.dir === "asc" ? 1 : -1;
            return 0;
        });

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">Tester Failures Dashboard</h1>
                    <p className="text-slate-400 text-lg font-medium">Line {lineId} - {stationMap[station] || "All Stations"}</p>
                    <p className="text-slate-500 text-sm">Date range: {startDate} → {endDate}</p>
                </div>

                {/* Station Filter */}
                <Card title="Station Filter" variant="glass" className="mb-6">
                    <div className="flex items-center space-x-4">
                        <label className="text-slate-200 font-medium">Station:</label>
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
                            className="px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="">All Stations</option>
                            {Object.entries(stationMap).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </Card>

                <Card title="Failure Analysis Chart" subtitle="Double click to view time range analysis" variant="elevated" className="mb-8">
                    <div className="h-96 flex items-center justify-center">
                        <canvas ref={canvasRef} className="max-w-full max-h-full"></canvas>
                    </div>
                </Card>

                {/* Time Range Chart - Displayed directly */}
                {showTimeRangeChart && (
                    <Card title="Time Range Analysis (7:00 - 7:00)" subtitle="Failures by hour based on workDate" variant="elevated" className="mb-8">
                        <div className="h-96 flex items-center justify-center">
                            <canvas 
                                ref={(el) => {
                                    if (el) {
                                        setTimeRangeCanvasRef(el);
                                        // Create chart when canvas is ready
                                        if (timeRangeData.length > 0) {
                                            setTimeout(() => createTimeRangeChart(timeRangeData), 100);
                                        }
                                    }
                                }}
                                className="max-w-full max-h-full"
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => {
                                    setShowTimeRangeChart(false);
                                    if (timeRangeChartRef) {
                                        timeRangeChartRef.destroy();
                                        setTimeRangeChartRef(null);
                                    }
                                }}
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
                            >
                                ปิดกราฟ
                            </button>
                        </div>
                    </Card>
                )}

                <Card title="Data Table" subtitle="Click column headers to sort" variant="glass" className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="px-3 py-2 rounded bg-slate-700/60 border border-slate-600/50 text-slate-100 placeholder-slate-400"
                        />
                        <button
                            onClick={() =>
                                setChartType((prev) => (prev === "testerId" ? "failItem" : "testerId"))
                            }
                            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                        >
                            {chartType === "testerId" ? "Top 5 Failed" : "By Tester"}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
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
                                        className="border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-700/60 text-slate-200"
                                    >
                                        {col} {sort.column === col ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {visibleData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-slate-400">
                                        No data
                                    </td>
                                </tr>
                            ) : (
                                visibleData.map((row, i) => (
                                    <tr
                                        key={i}
                                        className={clsx(
                                            "hover:bg-slate-700/40",
                                            i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-700/20"
                                        )}
                                    >
                                        <td className="px-3 py-2 text-slate-200">{row.sn}</td>
                                        <td className="px-3 py-2 text-slate-200">{row.model}</td>
                                        <td className="px-3 py-2 text-slate-200">{row.testerId}</td>
                                        <td className="px-3 py-2 text-slate-200">{row.fixtureId}</td>
                                        <td className="px-3 py-2 text-slate-200">{row.failItem}</td>
                                        <td className="px-3 py-2 text-slate-200">{row.workDate.replace("T", " ")}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="text-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors duration-200"
                    >
                        Back to Summary
                    </button>
                </div>
            </div>
        </Layout>
    );
}
