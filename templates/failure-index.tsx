import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactApexChart from 'react-apexcharts';

// Define the data interface for type safety
interface SummaryData {
  workDate: string;
  total: number;
  [key: string]: number | string; // Allow for dynamic station keys
}

// Main React component for the summary dashboard
const FailuresSummary: React.FC = () => {
  // State variables for UI controls and data
  const [lineId, setLineId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<SummaryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // A ref to keep track of the WebSocket to prevent multiple connections
  const wsRef = useRef<WebSocket | null>(null);

  // Constants and mappings
  const stationColors: Record<string, string> = useMemo(() => ({
    'VFlash1': '#ffa94d',
    'Hipot1': '#ffd54f',
    'ATS1': '#ff5733',
    'Heatup': '#f7941d',
    'Vibration': '#d6412b',
    'BurnIn': '#7e0f0f',
    'Hipot2': '#f9e79f',
    'ATS2': '#ffc300',
    'VFlash2': '#555555',
    'ATS3': '#888888',
  }), []);

  const stationMap: Record<string, string> = useMemo(() => ({
    "VFlash1": "%LASH",
    "Hipot1": "%IPOT_1",
    "ATS1": "%TS1",
    "Heatup": "%TUP",
    "Vibration": "%RATION",
    "BurnIn": "%RN_IN",
    "Hipot2": "%IPOT_2",
    "ATS2": "%TS2",
    "VFlash2": "%LASH2",
    "ATS3": "%TS3"
  }), []);

  // Use this array for consistent ordering of stations
  const stationKeys = useMemo(() => [
    'VFlash1', 'Hipot1', 'ATS1', 'Heatup', 'Vibration', 'BurnIn', 'Hipot2', 'ATS2', 'VFlash2', 'ATS3'
  ], []);

  // Restore state from sessionStorage on component mount
  useEffect(() => {
    const savedLineId = sessionStorage.getItem("lineId");
    const savedStartDate = sessionStorage.getItem("startDate");
    const savedEndDate = sessionStorage.getItem("endDate");
    const today = new Date().toISOString().split('T')[0];

    setLineId(savedLineId || 'BMA01');
    setStartDate(savedStartDate || today);
    setEndDate(savedEndDate || today);
  }, []);

  // Save state to sessionStorage whenever state changes
  useEffect(() => {
    sessionStorage.setItem("lineId", lineId);
    sessionStorage.setItem("startDate", startDate);
    sessionStorage.setItem("endDate", endDate);
  }, [lineId, startDate, endDate]);

  // WebSocket connection effect
  useEffect(() => {
    // Check if lineId, startDate, and endDate are set before connecting
    if (!lineId || !startDate || !endDate) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsLoading(true);
    // Note: This URL is a placeholder. You must replace it with your actual WebSocket server URL.
    const wsUrl = `ws:///failures/ws/filter?lineId=${lineId}&startDate=${startDate}&endDate=${endDate}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected.");
      setData([]); // Clear old data
    };

    ws.onmessage = (event) => {
      const receivedData: SummaryData[] = JSON.parse(event.data);
      setData(receivedData);
      setIsLoading(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error: ", error);
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    wsRef.current = ws;

    // Cleanup function to close the WebSocket connection
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [lineId, startDate, endDate]);

  // ApexCharts series data format
  const chartSeries = useMemo(() => {
    return stationKeys.map(station => ({
      name: station,
      data: data.map(row => row[station.toLowerCase()] as number || 0),
    }));
  }, [data, stationKeys]);

  // ApexCharts options
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: true },
      zoom: { enabled: true },
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const { dataPointIndex, seriesIndex } = config;
          const selectedData = data[dataPointIndex];
          const stationKey = stationKeys[seriesIndex];
          const mappedStation = stationMap[stationKey];
          if (mappedStation && selectedData.workDate) {
            window.location.href = `station-detail.html?lineId=${lineId}&station=${mappedStation}&workDate=${selectedData.workDate}`;
          }
        },
      },
    },
    colors: stationKeys.map(key => stationColors[key]),
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        dataLabels: {
          total: {
            enabled: true,
            style: {
              fontSize: '13px',
              fontWeight: 900
            }
          }
        }
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: data.map(row => row.workDate),
      labels: { style: { colors: '#dbe4eb' } },
      title: { text: "Date", style: { color: '#dbe4eb' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      title: { text: "Failures", style: { color: '#dbe4eb' } },
      labels: { style: { colors: '#dbe4eb' } },
    },
    grid: {
      borderColor: '#5a7081',
      strokeDashArray: 3,
    },
    legend: {
      labels: { colors: '#dbe4eb' },
    },
    tooltip: {
      theme: 'dark',
    },
  }), [data, stationKeys, stationColors, stationMap, lineId]);

  // Helper function to handle cell click in the table
  const handleCellClick = (stationKey: string, workDate: string) => {
    const mappedStation = stationMap[stationKey];
    if (mappedStation && workDate) {
      window.location.href = `station-detail.html?lineId=${lineId}&station=${mappedStation}&workDate=${workDate}`;
    }
  };

  // Render the table body content
  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr className="bg-[#1f1f1f] text-center">
          <td colSpan={12} className="px-6 py-4">Loading...</td>
        </tr>
      );
    }
    if (data.length === 0) {
      return (
        <tr className="bg-[#1f1f1f] text-center">
          <td colSpan={12} className="px-6 py-4">No data available</td>
        </tr>
      );
    }
    return data.map((row, rowIndex) => (
      <tr key={rowIndex} className="bg-[#1f1f1f] border-b border-[#444444] hover:bg-[#2a2a2a] transition-colors">
        <td className="px-6 py-4">{row.workDate}</td>
        {stationKeys.map((station, colIndex) => {
          const value = row[station.toLowerCase()] as number || 0;
          return (
            <td
              key={colIndex}
              className={`px-6 py-4 ${value > 0 ? 'cursor-pointer hover:bg-[#333333]' : ''}`}
              onClick={() => value > 0 && handleCellClick(station, row.workDate)}
            >
              {value}
            </td>
          );
        })}
        <td className="px-6 py-4 font-bold">{row.total}</td>
      </tr>
    ));
  };

  return (
    <div className="bg-black text-white min-h-screen p-5 font-sans">
      <div className="container mx-auto p-5 bg-[#1a1a1a] rounded-xl shadow-xl max-w-7xl">
        <h2 className="text-3xl font-bold mb-5">BMW Failures Summary</h2>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <label className="text-sm font-bold">Line:</label>
          <select
            id="lineIdSelect"
            className="styled-select px-4 py-2 text-sm bg-[#2a2a2a] text-white rounded-md border border-[#555555] focus:outline-none focus:ring-2 focus:ring-[#ffc300] transition-all"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
          >
            <option value="BMA01">BMA01</option>
            <option value="B3">B3</option>
          </select>

          <label className="text-sm font-bold">Start Date:</label>
          <input
            type="date"
            id="startDate"
            className="styled-date px-4 py-2 text-sm bg-[#2a2a2a] text-white rounded-md border border-[#555555] focus:outline-none focus:ring-2 focus:ring-[#ffc300] transition-all"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <label className="text-sm font-bold">End Date:</label>
          <input
            type="date"
            id="endDate"
            className="styled-date px-4 py-2 text-sm bg-[#2a2a2a] text-white rounded-md border border-[#555555] focus:outline-none focus:ring-2 focus:ring-[#ffc300] transition-all"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-2 mb-6">
          <button
            id="fixtureButton"
            className="action-button px-6 py-2 bg-[#f7941d] text-white font-bold rounded-md shadow-lg transition-all transform hover:bg-[#d97b13] hover:scale-105 active:scale-95"
            onClick={() => {
              window.location.href = `fixture-detail.html?lineId=${lineId}&startDate=${startDate}&endDate=${endDate}`;
            }}
          >
            Fixture Failure
          </button>
          <button
            id="testerButton"
            className="action-button px-6 py-2 bg-[#f7941d] text-white font-bold rounded-md shadow-lg transition-all transform hover:bg-[#d97b13] hover:scale-105 active:scale-95"
            onClick={() => {
              const workDate = startDate || new Date().toISOString().split("T")[0];
              window.location.href = `tester-detail.html?lineId=${lineId}&workDate=${workDate}&startDate=${startDate}&endDate=${endDate}`;
            }}
          >
            Tester Failure
          </button>
        </div>

        {/* Chart Section */}
        <h3 className="text-xl font-bold mb-4">Failures by Station and Date</h3>
        <div id="chartContainer" className="w-full md:w-4/5 mx-auto h-[400px] mb-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-xl text-gray-400">Loading chart data...</div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xl text-gray-400">No data available for the selected range.</div>
          ) : (
            <ReactApexChart
              options={chartOptions as any}
              series={chartSeries}
              type="bar"
              height="100%"
            />
          )}
        </div>

        {/* Summary Table */}
        <h3 className="text-xl font-bold mb-4">Summary Table</h3>
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="w-full text-sm text-left text-white">
            <thead className="text-xs uppercase bg-[#2a2a2a] text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Work Date</th>
                {stationKeys.map(station => (
                  <th key={station} scope="col" className="px-6 py-3">{station}</th>
                ))}
                <th scope="col" className="px-6 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FailuresSummary;
