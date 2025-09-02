import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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


    // Timer for click detection
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const chartRef = useRef<Chart | null>(null);
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

                    if (clickTimerRef.current) {
                        clearTimeout(clickTimerRef.current);
                        clickTimerRef.current = null;

                        // This is a double click - show line chart for the selected category
                        const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                        const filteredData = data.filter(row => (row[filterColumn] || '') === label);
                        createLineChart(filteredData, label, station, "#f7941d");
                    } else {
                        // This is a single click - filter table
                        clickTimerRef.current = setTimeout(() => {
                            const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                            const filteredData = data.filter(row => (row[filterColumn] || '') === label);
                            setFiltered(filteredData);
                            clickTimerRef.current = null;
                        }, 200); // 200ms delay for double click detection
                    }
                },
            },
        });


    }, [data, chartType]);

    // Function to create line chart for specific category (like in templates)
    const createLineChart = useCallback((data: any[], label: string, displayStationName: string, color: string) => {
        if (data.length === 0) return;

        // Set filtered data to show in table (like single click)
        setFiltered(data);

        // Get the workDate from the data to determine the time range
        const workDates = data.map(item => new Date(item.workDate)).filter(date => !isNaN(date.getTime()));
        if (workDates.length === 0) return;

        const earliestDate = new Date(Math.min(...workDates.map(d => d.getTime())));


        // Set time range from 7:00 of the earliest date to 7:00 of the next day
        const startTime = new Date(earliestDate);
        startTime.setHours(7, 0, 0, 0);

        const endTime = new Date(earliestDate);
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(7, 0, 0, 0);

        // Generate time labels (every hour from 7:00 to 7:00)
        const timeLabels = [];
        const currentTime = new Date(startTime);

        while (currentTime <= endTime) {
            timeLabels.push(currentTime.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            }));
            currentTime.setHours(currentTime.getHours() + 1);
        }

        // Group data by hour based on workDate within the specified time range
        const totalHours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
        const hourlyData = new Array(totalHours).fill(0);

        data.forEach(item => {
            try {
                const itemTime = new Date(item.workDate);
                if (!isNaN(itemTime.getTime())) {
                    const timeDiff = itemTime.getTime() - startTime.getTime();
                    const hourIndex = Math.floor(timeDiff / (1000 * 60 * 60));
                    if (hourIndex >= 0 && hourIndex < totalHours) {
                        hourlyData[hourIndex]++;
                    }
                }
            } catch (error) {
                console.warn('Invalid date format:', item.workDate);
            }
        });

        // Create line chart
        if (chartRef.current) chartRef.current.destroy();

        const newChart = new Chart(canvasRef.current!, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: `Failure Topic: ${label}`,
                    data: hourlyData,
                    borderColor: color,
                    backgroundColor: `${color}45`,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0, // Disable animation to prevent flickering
                    easing: 'linear'
                },
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

        chartRef.current = newChart;

        // Update page title
        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
            pageTitle.textContent = `${label}`;
        }

        // Show table and controls (don't hide them)
        const tableCard = document.querySelector('[data-table-card]');
        if (tableCard) {
            (tableCard as HTMLElement).style.display = 'block';
        }

        // Create back button
        createBackButton(label, displayStationName, color);

    }, [data, chartType]);

    // Function to create back button (like in templates)
    const createBackButton = useCallback((_label: string, _displayStationName: string, _color: string) => {
        // Remove existing back button if any
        const existingButton = document.getElementById('backToChartButton');
        if (existingButton) {
            existingButton.remove();
        }

        // Create new back button
        const backButton = document.createElement('button');
        backButton.id = 'backToChartButton';
        backButton.className = 'px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 font-medium';
        backButton.style.display = 'block';
        backButton.style.marginLeft = 'auto';
        backButton.style.marginRight = 'auto';
        backButton.style.marginTop = '20px';

        // Set button text based on chart type
        const buttonText = chartType === "failItem" ? 'Back to Top 5 Failed Chart' : 'Back to Tester Chart';
        backButton.textContent = buttonText;

        // Insert button before table controls
        const container = document.querySelector('.max-w-7xl');
        if (container) {
            container.appendChild(backButton);
        }

        // Add click handler
        backButton.onclick = () => {
            // Restore original chart
            if (chartRef.current) chartRef.current.destroy();

            // Recreate bar chart
            const counts: Record<string, number> = {};
            data.forEach((d) => {
                const key = d[chartType];
                if (key) counts[key] = (counts[key] || 0) + 1;
            });

            const entries = Object.entries(counts);
            const sorted = chartType === "failItem" ? entries.sort((a, b) => b[1] - a[1]).slice(0, 5) : entries;

            chartRef.current = new Chart(canvasRef.current!, {
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

                        if (clickTimerRef.current) {
                            clearTimeout(clickTimerRef.current);
                            clickTimerRef.current = null;

                            // This is a double click - show line chart for the selected category
                            const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                            const filteredData = data.filter(row => (row[filterColumn] || '0') === label);
                            createLineChart(filteredData, label, station, "#f7941d");
                        } else {
                            // This is a single click - filter table
                            clickTimerRef.current = setTimeout(() => {
                                const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                                const filteredData = data.filter(row => (row[filterColumn] || '0') === label);
                                setFiltered(filteredData);
                                clickTimerRef.current = null;
                            }, 200);
                        }
                    },
                },
            });

            // Restore page title
            const pageTitle = document.querySelector('h1');
            if (pageTitle) {
                pageTitle.textContent = `${station} Failures Dashboard`;
            }

            // Show table and controls
            const tableCard = document.querySelector('[data-table-card]');
            if (tableCard) {
                (tableCard as HTMLElement).style.display = 'block';
            }

            // Clear filtered data to show all data in table
            setFiltered(null);

            // Remove back button
            backButton.remove();
        };
    }, [data, chartType, station]);



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
            if (!va || !vb) return 0;
            if (va < vb) return sort.dir === "asc" ? -1 : 1;
            if (va > vb) return sort.dir === "asc" ? 1 : -1;
            return 0;
        });

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">{station} Failures Dashboard</h1>
                    <p className="text-slate-400 text-lg font-medium">Line {lineId} - {workDate}</p>
                </div>

                <Card title="Failure Analysis Chart" subtitle="Double click to view time range analysis" variant="elevated" className="mb-8">
                    <div className="h-96 flex items-center justify-center">
                        <canvas ref={canvasRef} className="max-w-full max-h-full"></canvas>
                    </div>
                </Card>



                <Card
                    title="Data Table"
                    subtitle={filtered ? `Showing filtered data for selected category` : "Click column headers to sort"}
                    variant="glass"
                    className="mb-6"
                    data-table-card
                >
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
                            className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white"
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
                                        {col} {sort.column === col ? (sort.dir === "asc" ? "" : "") : ""}
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
                        className="px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors duration-200"
                    >
                        Back to Summary
                    </button>
                </div>
            </div>
        </Layout>
    );
}

