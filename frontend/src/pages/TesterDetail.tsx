import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Chart from 'chart.js/auto';
import clsx from 'clsx';
import Card from '../components/Card';
import { useRouteNavigation } from '../hooks/useRouteNavigation';
import { API_CONFIG } from "../config/routes";

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
    const { goToDashboard } = useRouteNavigation();

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
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [selectedFailItem, setSelectedFailItem] = useState<string>("");

    // Timer for click detection
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const chartRef = useRef<Chart<"bar" | "line"> | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Connect WebSocket
    useEffect(() => {
        if (!lineId) return;
        let wsUrl = `${API_CONFIG.WS_BASE_URL}/failures/ws/tester?lineId=${lineId}`;
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

    // Get unique models from data
    const uniqueModels = Array.from(new Set(data.map(d => d.model).filter(Boolean))).sort();

    // Get unique failItems sorted by frequency (descending)
    const uniqueFailItems = useMemo(() => {
        const failItemCounts: Record<string, number> = {};
        data.forEach(d => {
            if (d.failItem) {
                failItemCounts[d.failItem] = (failItemCounts[d.failItem] || 0) + 1;
            }
        });
        
        return Object.entries(failItemCounts)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .map(([failItem]) => failItem);
    }, [data]);

    // Filter data by selected model and failitem with useMemo to prevent unnecessary re-renders
    const modelFilteredData = useMemo(() => {
        let filteredData = data;
        
        if (selectedModel) {
            filteredData = filteredData.filter(d => d.model === selectedModel);
        }
        
        if (selectedFailItem) {
            filteredData = filteredData.filter(d => d.failItem === selectedFailItem);
        }
        
        return filteredData;
    }, [data, selectedModel, selectedFailItem]);

    // Memoize chart data calculation to prevent unnecessary recalculations
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};
        let entries: [string, number][];
        let chartLabel = '';
        let backgroundColors: string | string[] = '#37B019';
        let borderColors: string | string[] = '#37B019';

        const displayStationName = station ? stationMap[station] || station : 'All Stations';

        if (!station && chartType === "testerId") {
            // --- All Station Aggregation Logic ---
            console.log('Sample testerId values from data:', modelFilteredData.slice(0, 20).map(d => d.testerId));
            
            modelFilteredData.forEach((d) => {
                const testerId = d.testerId || "";
                let stationName = "";

                console.log(`Processing testerId: ${testerId}`);

                // Check stationMap patterns first
                for (const [key, value] of Object.entries(stationMap)) {
                    const pattern = key.replace('%', '');
                    if (testerId.includes(pattern)) {
                        stationName = value;
                        console.log(`Matched stationMap: ${key} (${pattern}) -> ${value}`);
                        break;
                    }
                }

                // If no match, try extracting base name
                if (!stationName) {
                    const baseName = testerId.split('_')[0];
                    console.log(`Extracted baseName: ${baseName} from ${testerId}`);
                    
                    // Try direct mapping to known stations
                    if (baseName.includes('VF') || baseName.includes('LASH')) {
                        stationName = baseName.includes('2') ? 'VFLASH2' : 'VFLASH1';
                    } else if (baseName.includes('HP') || baseName.includes('IPOT')) {
                        stationName = baseName.includes('2') ? 'HIPOT2' : 'HIPOT1';
                    } else if (baseName.includes('AT') || baseName.includes('TS')) {
                        if (baseName.includes('3')) stationName = 'ATS3';
                        else if (baseName.includes('2')) stationName = 'ATS2';
                        else stationName = 'ATS1';
                    } else if (baseName.includes('VBT') || baseName.includes('RATION')) {
                        stationName = 'VIBRATION';
                    } else if (baseName.includes('HUP') || baseName.includes('TUP')) {
                        stationName = 'HEATUP';
                    } else if (baseName.includes('BI') || baseName.includes('RN')) {
                        stationName = 'BURNIN';
                    } else {
                        stationName = baseName; // Keep original if no pattern matches
                    }
                    
                    console.log(`Final mapping: ${testerId} -> ${stationName}`);
                }

                if (stationName) {
                    counts[stationName] = (counts[stationName] || 0) + 1;
                }
            });
            
            console.log('Final station counts:', counts);

            const stationOrder = ['VFLASH1', 'HIPOT1', 'ATS1', 'VIBRATION', 'HEATUP', 'BURNIN', 'HIPOT2', 'ATS2', 'VFLASH2', 'ATS3'];
            
            entries = Object.entries(counts)
                .filter(([, count]) => count > 0) // Filter out stations with no failures
                .sort((a, b) => {
                    const indexA = stationOrder.indexOf(a[0]);
                    const indexB = stationOrder.indexOf(b[0]);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a[0].localeCompare(b[0]);
                });

            chartLabel = `Failures by Station (${displayStationName})`;
            backgroundColors = entries.map(([stationName]) => stationColors[stationName] || '#37B019');
            borderColors = entries.map(([stationName]) => stationColors[stationName] || '#37B019');

        } else {
            // --- Default Logic for Specific Station or Fail Item ---
            const dataset =
                chartType === "testerId"
                    ? modelFilteredData.map((d) => d.testerId || "N/A")
                    : modelFilteredData.map((d) => d.failItem || "N/A");

            dataset.forEach((key) => {
                counts[key] = (counts[key] || 0) + 1;
            });

            entries = Object.entries(counts);
            if (chartType === "failItem") {
                entries = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
            } else {
                entries = entries.sort((a, b) => a[0].localeCompare(b[0]));
            }
            
            chartLabel = chartType === "testerId" ? `Failures by Tester (${displayStationName})` : `Top 5 Failed Items (${displayStationName})`;
            const stationColor = stationColors[displayStationName.toUpperCase()] || '#37B019';
            backgroundColors = stationColor;
            borderColors = stationColor;
        }

        return {
            entries,
            chartLabel,
            backgroundColors,
            borderColors
        };
    }, [modelFilteredData, chartType, station, selectedModel]);

    // Draw Chart
    useEffect(() => {
        if (!canvasRef.current || isLineChart) return;
        if (chartRef.current) chartRef.current.destroy();

        const { entries, chartLabel, backgroundColors, borderColors } = chartData;

        chartRef.current = new Chart(canvasRef.current!, {
            type: "bar",
            data: {
                labels: entries.map(([k]) => k),
                datasets: [
                    {
                        label: chartLabel,
                        data: entries.map(([, v]) => v),
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
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
                    easing: 'easeInOutCubic' as any,
                    delay: (context) => context.dataIndex * 50,
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 400,
                            easing: 'easeOutQuart' as any,
                        }
                    },
                    resize: {
                        animation: {
                            duration: 600,
                            easing: 'easeInOutQuart' as any,
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
                        let filteredData: FailureRecord[];
                        let colorForChart: string;

                        if (!station && chartType === "testerId") {
                            // All station view - filter by station
                            filteredData = modelFilteredData.filter(row => {
                                const testerId = row.testerId || "";
                                // Use same mapping logic as aggregation
                                for (const [key, value] of Object.entries(stationMap)) {
                                    const pattern = key.replace('%', '');
                                    if (testerId.includes(pattern) && value === label) {
                                        return true;
                                    }
                                }
                                // Check baseName patterns
                                const baseName = testerId.split('_')[0];
                                let stationName = "";
                                if (baseName.includes('VF') || baseName.includes('LASH')) {
                                    stationName = baseName.includes('2') ? 'VFLASH2' : 'VFLASH1';
                                } else if (baseName.includes('HP') || baseName.includes('IPOT')) {
                                    stationName = baseName.includes('2') ? 'HIPOT2' : 'HIPOT1';
                                } else if (baseName.includes('AT') || baseName.includes('TS')) {
                                    if (baseName.includes('3')) stationName = 'ATS3';
                                    else if (baseName.includes('2')) stationName = 'ATS2';
                                    else stationName = 'ATS1';
                                } else if (baseName.includes('VBT') || baseName.includes('RATION')) {
                                    stationName = 'VIBRATION';
                                } else if (baseName.includes('HUP') || baseName.includes('TUP')) {
                                    stationName = 'HEATUP';
                                } else if (baseName.includes('BI') || baseName.includes('RN')) {
                                    stationName = 'BURNIN';
                                } else {
                                    stationName = baseName;
                                }
                                return stationName === label;
                            });
                            colorForChart = stationColors[label] || '#37B019';
                        } else {
                            // Normal view
                            const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                            filteredData = modelFilteredData.filter(row => (row[filterColumn] || '') === label);
                            colorForChart = Array.isArray(backgroundColors) ? backgroundColors[idx] : backgroundColors as string;
                        }
                        
                        createLineChart(filteredData, label, displayStationName, colorForChart);
                    } else {
                        // This is a single click - filter table
                        clickTimerRef.current = setTimeout(() => {
                            let filteredData: FailureRecord[];

                            if (!station && chartType === "testerId") {
                                // All station view - filter by station
                                filteredData = modelFilteredData.filter(row => {
                                    const testerId = row.testerId || "";
                                    // Use same mapping logic as aggregation
                                    for (const [key, value] of Object.entries(stationMap)) {
                                        const pattern = key.replace('%', '');
                                        if (testerId.includes(pattern) && value === label) {
                                            return true;
                                        }
                                    }
                                    // Check baseName patterns
                                    const baseName = testerId.split('_')[0];
                                    let stationName = "";
                                    if (baseName.includes('VF') || baseName.includes('LASH')) {
                                        stationName = baseName.includes('2') ? 'VFLASH2' : 'VFLASH1';
                                    } else if (baseName.includes('HP') || baseName.includes('IPOT')) {
                                        stationName = baseName.includes('2') ? 'HIPOT2' : 'HIPOT1';
                                    } else if (baseName.includes('AT') || baseName.includes('TS')) {
                                        if (baseName.includes('3')) stationName = 'ATS3';
                                        else if (baseName.includes('2')) stationName = 'ATS2';
                                        else stationName = 'ATS1';
                                    } else if (baseName.includes('VBT') || baseName.includes('RATION')) {
                                        stationName = 'VIBRATION';
                                    } else if (baseName.includes('HUP') || baseName.includes('TUP')) {
                                        stationName = 'HEATUP';
                                    } else if (baseName.includes('BI') || baseName.includes('RN')) {
                                        stationName = 'BURNIN';
                                    } else {
                                        stationName = baseName;
                                    }
                                    return stationName === label;
                                });
                            } else {
                                // Normal view
                                const filterColumn = chartType === "failItem" ? 'failItem' : 'testerId';
                                filteredData = modelFilteredData.filter(row => (row[filterColumn] || '') === label);
                            }
                            
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
    }, [chartData, isLineChart]);

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
                    duration: 1200,
                    easing: 'easeInOutCubic',
                    delay: (context) => context.dataIndex * 30,
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 300,
                            easing: 'easeOutQuart',
                        }
                    }
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
        <>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">
                        {isLineChart ? `${selectedCategory} at ${selectedStation}` : `${displayStationName} Failure Count by Tester`}
                    </h1>
                    <p className="text-slate-400 text-lg font-medium">
                        Line {lineId} | Station {displayStationName} | Date {startDate} to {endDate}
                        {selectedModel && ` | Model: ${selectedModel}`}
                    </p>
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
                                <p className="text-2xl font-bold text-green-400 mt-1">{(() => {
                                    const counts = data.reduce((acc, item) => { 
                                        acc[item.testerId] = (acc[item.testerId] || 0) + 1; 
                                        return acc; 
                                    }, {} as Record<string, number>);
                                    return Object.keys(counts).filter(key => counts[key] > 1).length;
                                })()}</p>
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
                                <p className="text-2xl font-bold text-purple-400 mt-1">{(() => {
                                    const counts = data.filter(item => item.failItem).reduce((acc, item) => { 
                                        acc[item.failItem] = (acc[item.failItem] || 0) + 1; 
                                        return acc; 
                                    }, {} as Record<string, number>);
                                    return Object.keys(counts).filter(key => counts[key] > 1).length;
                                })()}</p>
                            </div>
                            <div className="p-3 bg-purple-500/20 rounded-full">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Station and Model Controls */}
                <Card title="Filter Controls" subtitle="Select station and model to filter data" variant="glass" className="mb-6">
                    <div className="flex justify-center items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-3">
                            <label htmlFor="stationSelect" className="text-slate-200 font-medium">Station:</label>
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
                                    window.location.search = params.toString();
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
                        
                        <div className="flex items-center gap-3">
                            <label htmlFor="modelSelect" className="text-slate-200 font-medium">Model:</label>
                            <select
                                id="modelSelect"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="px-4 py-2 rounded bg-slate-700/60 border border-slate-600/50 text-slate-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            >
                                <option value="">All Models</option>
                                {uniqueModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <label htmlFor="failItemSelect" className="text-slate-200 font-medium">Fail Item:</label>
                            <select
                                id="failItemSelect"
                                value={selectedFailItem}
                                onChange={(e) => setSelectedFailItem(e.target.value)}
                                className="px-4 py-2 rounded bg-slate-700/60 border border-slate-600/50 text-slate-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            >
                                <option value="">All Fail Items</option>
                                {uniqueFailItems.map(failItem => (
                                    <option key={failItem} value={failItem}>{failItem}</option>
                                ))}
                            </select>
                        </div>
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
                                        {col} {sort.column === col ? (sort.dir === "asc" ? "↑" : "↓") : ""}
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
                        onClick={() => goToDashboard()}
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
