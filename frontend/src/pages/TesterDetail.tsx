import { useEffect, useRef, useState, useCallback } from "react";
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
    station?: string;
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

const stationColors: Record<string, string> = {
    'VIBRATION': '#d6412b',
    'ATS1': '#ff5733',
    'HEATUP': '#f7941d',
    'VFLASH1': '#ffa94d',
    'ATS2': '#ffc300',
    'HIPOT1': '#ffd54f',
    'HIPOT2': '#f9e79f',
    'BURNIN': 'rgba(114,9,9)',
    'ATS3': '#888888',
    'VFLASH2': '#555555'
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
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [sort, setSort] = useState<{ column: keyof FailureRecord; dir: "asc" | "desc" }>({
        column: "workDate",
        dir: "desc",
    });
    const [isLineChart, setIsLineChart] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedStation, setSelectedStation] = useState<string>("");

    // Timer for click detection
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setIsLineChart(false);
            setSelectedCategory("");
        };
        return () => ws.close();
    }, [lineId, station, startDate, endDate]);

    // Handle scroll to show/hide scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Draw Chart
    useEffect(() => {
        if (!canvasRef.current || isLineChart) return;
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

        const displayStationName = station ? stationMap[station] || station : 'All Stations';
        const stationColor = stationColors[displayStationName.toUpperCase()] || '#37B019';

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: entries.map(([k]) => k),
                datasets: [
                    {
                        label: chartType === "testerId" ? `Failures by Tester (${displayStationName})` : `Top 5 Failed Items (${displayStationName})`,
                        data: entries.map(([, v]) => v),
                        backgroundColor: stationColor,
                        borderColor: stationColor,
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: chartType === "failItem" ? "y" : "x",
                animation: { duration: 300, easing: 'easeOutQuart' as any },
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 8 as any,
                        titleFont: { size: 14, weight: 'bold' } as any,
                        bodyFont: { size: 13 } as any,
                    }
                },
                onClick: (_, elements) => {
                    if (!elements.length) return;
                    const idx = elements[0].index;
                    const label = entries[idx][0];

                    if (clickTimerRef.current) {
                        clearTimeout(clickTimerRef.current);
                        clickTimerRef.current = null;

                        // This is a double click - show line chart for the selected category
                        const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                        const filteredData = data.filter(row => (row[filterColumn] || '') === label);
                        createLineChart(filteredData, label, displayStationName, stationColor);
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
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Failures',
                            color: '#dbe4eb'
                        },
                        ticks: { stepSize: 1, color: '#dbe4eb' },
                        grid: { color: '#5a7081' }
                    },
                    x: {
                        title: {
                            display: true,
                            text: chartType === "testerId" ? 'Tester ID' : 'Fail Item',
                            color: '#dbe4eb'
                        },
                        ticks: { color: '#dbe4eb' },
                        grid: { color: '#5a7081' }
                    }
                }
            },
        });
    }, [data, chartType, station, isLineChart]);

    // Function to create line chart for specific category (like in templates)
    const createLineChart = useCallback((data: FailureRecord[], label: string, displayStationName: string, color: string) => {
        if (data.length === 0) return;

        setIsLineChart(true);
        setSelectedCategory(label);
        setSelectedStation(displayStationName);
        // Set filtered data to show in table (like single click)
        setFiltered(data);

        // Generate date range from startDate to endDate
        const generateDateRange = (start: string, end: string) => {
            const dates = [];
            let currentDate = new Date(start);
            const endDate = new Date(end);

            while (currentDate <= endDate) {
                dates.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return dates;
        };

        const allDates = generateDateRange(startDate, endDate);
        const timeSeriesData = new Map(allDates.map(date => [date, 0]));

        data.forEach(item => {
            const date = item.workDate.split('T')[0];
            if (timeSeriesData.has(date)) {
                timeSeriesData.set(date, timeSeriesData.get(date)! + 1);
            }
        });

        const counts = allDates.map(date => timeSeriesData.get(date) || 0);

        // Create line chart
        if (chartRef.current) chartRef.current.destroy();

        chartRef.current = new Chart(canvasRef.current!, {
            type: 'line',
            data: {
                labels: allDates,
                datasets: [{
                    label: `${label}`,
                    data: counts,
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
                    duration: 0,
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
                            title: (context) => `วันที่ ${context[0].label}`,
                            label: (context) => `Failures: ${context.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "วันที่",
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
    }, [startDate, endDate]);

    // Function to create back button (like in templates)
    const createBackButton = useCallback(() => {
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
            setIsLineChart(false);
            setSelectedCategory("");
            setSelectedStation("");
            // Clear filtered data to show all data in table
            setFiltered(null);

            // Remove back button
            backButton.remove();
        };
    }, [chartType]);

    // Create back button when line chart is shown
    useEffect(() => {
        if (isLineChart) {
            createBackButton();
        }
    }, [isLineChart, createBackButton]);

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

    const displayStationName = station ? stationMap[station] || station : 'All Stations';

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">
                        {isLineChart ? `${selectedCategory} at ${selectedStation}` : `${displayStationName} Failure Count by Tester`}
                    </h1>
                    <p className="text-slate-400 text-lg font-medium">
                        Line {lineId} | Station {displayStationName} | Date {startDate} to {endDate}
                    </p>
                </div>

                {/* Station Controls */}
                <Card title="Station Selection" subtitle="Select specific station to filter data" variant="glass" className="mb-6">
                    <div className="flex justify-center items-center gap-4">
                        <label htmlFor="stationSelect" className="text-slate-200 font-medium">Select Station:</label>
                        <select
                            id="stationSelect"
                            value={station}
                            onChange={(e) => {
                                const newStation = e.target.value;
                                const params = new URLSearchParams(searchParams);
                                if (newStation) {
                                    params.set('station', newStation);
                                } else {
                                    params.delete('station');
                                }
                                navigate(`?${params.toString()}`);
                            }}
                            className="px-4 py-2 rounded bg-slate-700/60 border border-slate-600/50 text-slate-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                        >
                            <option value="">All Stations</option>
                            <option value="%LASH">VFlash1</option>
                            <option value="%IPOT_1">Hipot1</option>
                            <option value="%TS1">ATS1</option>
                            <option value="%TUP">Heatup</option>
                            <option value="%RATION">Vibration</option>
                            <option value="%RN_IN">BurnIn</option>
                            <option value="%IPOT_2">Hipot2</option>
                            <option value="%TS2">ATS2</option>
                            <option value="%LASH2">VFlash2</option>
                            <option value="%TS3">ATS3</option>
                        </select>
                    </div>
                </Card>

                <Card
                    title={isLineChart ? "Time Range Analysis" : "Failure Analysis Chart"}
                    subtitle={isLineChart ? `Showing failures for ${selectedCategory}` : "Single click to filter table, Double click to view time range analysis"}
                    variant="elevated"
                    className="mb-8"
                >
                    <div className="h-96 flex items-center justify-center">
                        <canvas ref={canvasRef} className="max-w-full max-h-full"></canvas>
                    </div>
                </Card>

                <Card
                    title="Data Table"
                    subtitle={isLineChart ? `Showing filtered data for ${selectedCategory}` : "Click column headers to sort"}
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
                            className="px-3 py-2 rounded bg-slate-700/60 border border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                        />
                        <button
                            onClick={() =>
                                setChartType((prev) => (prev === "testerId" ? "failItem" : "testerId"))
                            }
                            className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white transition-colors duration-200 font-medium"
                        >
                            {chartType === "testerId" ? "Top 5 Failed" : "By Tester"}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm text-center">
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
                                        className="border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-700/60 text-slate-200 transition-colors duration-200 text-center"
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
                                            "hover:bg-slate-700/40 transition-colors duration-200",
                                            i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-700/20"
                                        )}
                                    >
                                        <td className="px-3 py-2 text-slate-200 text-center">{row.sn || '-'}</td>
                                        <td className="px-3 py-2 text-slate-200 text-center">{row.model}</td>
                                        <td className="px-3 py-2 text-slate-200 text-center">{row.testerId}</td>
                                        <td className="px-3 py-2 text-slate-200 text-center">{row.fixtureId || '-'}</td>
                                        <td className="px-3 py-2 text-slate-200 text-center">{row.failItem || '-'}</td>
                                        <td className="px-3 py-2 text-slate-200 text-center">{row.workDate.replace("T", " ")}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors duration-200"
                    >
                        Back to Summary
                    </button>
                </div>
            </div>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    title="Scroll to Top"
                    aria-label="Scroll to Top"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}
        </Layout>
    );
}
