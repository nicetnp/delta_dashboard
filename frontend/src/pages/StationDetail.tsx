import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Chart } from "chart.js/auto";
import clsx from "clsx";
import Card from "../components/Card";
import { useRouteNavigation } from "../hooks/useRouteNavigation";
import { API_CONFIG } from "../config/routes";

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
    const { goBack } = useRouteNavigation();

    const lineId = searchParams.get("lineId") || "";
    const station = searchParams.get("station") || "";
    const workDate = searchParams.get("workDate") || "";
    const chartColor = searchParams.get("color") || "#f7941d";

    const [data, setData] = useState<FailureRecord[]>([]);
    const [chartType, setChartType] = useState<"testerId" | "failItem">("testerId");
    const [search, setSearch] = useState("");
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [sort, setSort] = useState<{ column: keyof FailureRecord; dir: "asc" | "desc" }>({
        column: "workDate",
        dir: "desc",
    });
    const [isLineChart, setIsLineChart] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    // Timer for click detection
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Connect WebSocket
    useEffect(() => {
        if (!lineId || !station) return;
        const wsUrl = `${API_CONFIG.WS_BASE_URL}/failures/ws/station?lineId=${lineId}&station=${station}&workDate=${workDate}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const payload: FailureRecord[] = JSON.parse(event.data);
            setData(payload);
        };
        return () => ws.close();
    }, [lineId, station, workDate]);

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

    // Draw chart
    useEffect(() => {
        if (!canvasRef.current || isLineChart) return;
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
                        borderColor: "#f7941d",
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
                animation: { 
                    duration: 800, 
                    easing: 'easeInOutCubic',
                    delay: (context) => context.dataIndex * 50,
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 400,
                            easing: 'easeOutQuart',
                        }
                    },
                    resize: {
                        animation: {
                            duration: 600,
                            easing: 'easeInOutQuart',
                        }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                    }
                },
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

                        setIsLineChart(true);
                        setSelectedCategory(label);
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


    }, [data, chartType, isLineChart]);

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
                            backgroundColor: chartColor,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    indexAxis: chartType === "failItem" ? 'y' : 'x',
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
                            createLineChart(filteredData, label, station, chartColor);
                        } else {
                            // This is a single click - filter table
                            clickTimerRef.current = setTimeout(() => {
                                const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                                const filteredData = data.filter(row => (row[filterColumn] || '') === label);
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
                pageTitle.textContent = `${station}`;
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
    }, [data, chartType, station, chartColor]);



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
        <>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">{station} Failures Dashboard</h1>
                    <p className="text-slate-400 text-lg font-medium">Line {lineId} - {workDate}</p>
                </div>

                {/* Data Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card variant="glass" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Total Records</p>
                                <p className="text-2xl font-bold text-white mt-1">{data.length.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-blue-500/20 rounded-full">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card variant="glass" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Filtered Records</p>
                                <p className="text-2xl font-bold text-orange-400 mt-1">{(filtered || []).length.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-orange-500/20 rounded-full">
                                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card variant="glass" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Duplicate Testers</p>
                                <p className="text-2xl font-bold text-green-400 mt-1">{Object.values(data.reduce((acc, item) => { acc[item.testerId] = (acc[item.testerId] || 0) + 1; return acc; }, {} as Record<string, number>)).filter(count => count > 1).length}</p>
                            </div>
                            <div className="p-3 bg-green-500/20 rounded-full">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </Card>

                    <Card variant="glass" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Duplicate Fail Items</p>
                                <p className="text-2xl font-bold text-purple-400 mt-1">{Object.values(data.reduce((acc, item) => { acc[item.failItem] = (acc[item.failItem] || 0) + 1; return acc; }, {} as Record<string, number>)).filter(count => count > 1).length}</p>
                            </div>
                            <div className="p-3 bg-purple-500/20 rounded-full">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                        </div>
                    </Card>
                </div>

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
                        onClick={goBack}
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
        </>
    );
}

