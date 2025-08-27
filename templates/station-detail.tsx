import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define the data interface for type safety
interface FailureData {
  sn: string;
  model: string;
  testerId: string;
  fixtureId: string;
  failItem: string;
  workDate: string;
}

// Define the component for the Station Details Dashboard
const StationDetailDashboard: React.FC = () => {
  // State variables
  const [lineId, setLineId] = useState<string>('');
  const [station, setStation] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<FailureData[]>([]);
  const [filteredData, setFilteredData] = useState<FailureData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTopFailedChart, setIsTopFailedChart] = useState<boolean>(false);
  const [isLineChart, setIsLineChart] = useState<boolean>(false);
  const [lineChartLabel, setLineChartLabel] = useState<string>('');
  const [sortStatus, setSortStatus] = useState({ column: 'workDate', direction: 'desc' });
  const wsRef = useRef<WebSocket | null>(null);

  // Mappings and constants for UI and logic
  const stationColors: Record<string, string> = useMemo(() => ({
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
  }), []);

  const stationMapping: Record<string, string> = useMemo(() => ({
    '%LASH': 'VFLASH1', '%IPOT_1': 'HIPOT1', '%TS1': 'ATS1',
    '%RATION': 'VIBRATION', '%TUP': 'HEATUP', '%RN_IN': 'BURNIN',
    '%IPOT_2': 'HIPOT2', '%TS2': 'ATS2', '%LASH2': 'VFLASH2', '%TS3': 'ATS3'
  }), []);

  // Effect to read URL params and restore state from sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lineIdFromUrl = params.get('lineId') || sessionStorage.getItem('lineId') || '';
    const stationFromUrl = params.get('station') || sessionStorage.getItem('station') || '';
    const startDateFromUrl = params.get('startDate') || sessionStorage.getItem('startDate') || '';
    const endDateFromUrl = params.get('endDate') || sessionStorage.getItem('endDate') || '';

    setLineId(lineIdFromUrl);
    setStation(stationFromUrl);
    setStartDate(startDateFromUrl);
    setEndDate(endDateFromUrl);

    // Update document title and sessionStorage
    document.title = `${stationMapping[stationFromUrl] || stationFromUrl || 'All Stations'} Failures Dashboard`;
    sessionStorage.setItem('lineId', lineIdFromUrl);
    sessionStorage.setItem('station', stationFromUrl);
    sessionStorage.setItem('startDate', startDateFromUrl);
    sessionStorage.setItem('endDate', endDateFromUrl);
  }, [stationMapping]);

  // Effect to handle WebSocket connection and data fetching
  useEffect(() => {
    if (!lineId || !station || !startDate) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsLoading(true);
    const wsUrl = `wss://your-websocket-server-url/failures/ws/station?lineId=${lineId}&station=${station}&workDate=${startDate}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected.");
    };

    ws.onmessage = (event) => {
      const receivedData: FailureData[] = JSON.parse(event.data);
      setData(receivedData);
      setFilteredData(receivedData); // Initial state for filtered data
      setIsLoading(false);
      setIsLineChart(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error: ", error);
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [lineId, station, startDate]);

  // Helper function to handle sorting
  const sortData = (column: keyof FailureData) => {
    const direction = sortStatus.column === column && sortStatus.direction === 'asc' ? 'desc' : 'asc';
    setSortStatus({ column, direction });

    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[column] || '';
      const bValue = b[column] || '';

      if (column === 'workDate') {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        return direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      return direction === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });
    setFilteredData(sorted);
  };

  // Helper function for search filtering
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filter = event.target.value.toLowerCase();
    const filtered = data.filter(row =>
      (row.sn || '').toLowerCase().includes(filter) ||
      (row.model || '').toLowerCase().includes(filter) ||
      (row.testerId || '').toLowerCase().includes(filter) ||
      (row.fixtureId || '').toLowerCase().includes(filter) ||
      (row.failItem || '').toLowerCase().includes(filter) ||
      (row.workDate || '').toLowerCase().includes(filter)
    );
    setFilteredData(filtered);
    setSortStatus({ column: 'workDate', direction: 'desc' });
  };

  // Prepare data for the chart
  const getChartData = () => {
    if (isLineChart) {
      const timeSeriesData: Record<string, number> = {};
      const lineChartFilteredData = data.filter(item => {
        const filterColumn = isTopFailedChart ? 'failItem' : 'testerId';
        return (item as any)[filterColumn] === lineChartLabel;
      });

      lineChartFilteredData.forEach(item => {
        const hour = new Date(item.workDate).toLocaleString('th-TH', { hour: '2-digit', hour12: false });
        timeSeriesData[hour] = (timeSeriesData[hour] || 0) + 1;
      });

      const chartData = Object.keys(timeSeriesData).sort().map(hour => ({
        name: `${hour}:00`,
        failures: timeSeriesData[hour],
      }));
      return chartData;
    }

    let counts: Record<string, number> = {};
    const categoryType = isTopFailedChart ? 'failItem' : 'testerId';
    data.forEach(item => {
      const category = (item as any)[categoryType];
      if (category) {
        counts[category] = (counts[category] || 0) + 1;
      }
    });

    let sortedCounts = Object.entries(counts);
    if (isTopFailedChart) {
      sortedCounts.sort((a, b) => b[1] - a[1]);
    } else {
      sortedCounts.sort((a, b) => a[0].localeCompare(b[0]));
    }

    const chartData = sortedCounts.map(([key, count]) => ({
      name: key,
      failures: count,
    }));

    return isTopFailedChart ? chartData.slice(0, 5) : chartData;
  };

  const chartData = useMemo(() => getChartData(), [data, isLineChart, isTopFailedChart, lineChartLabel]);
  const stationName = stationMapping[station] || station || 'All Stations';
  const stationColor = stationColors[stationName.toUpperCase()] || 'rgb(55,176,25)';

  // Handle double click on Bar Chart
  const handleBarClick = (barData: any) => {
    if (!isLineChart) {
      setIsLineChart(true);
      setLineChartLabel(barData.name);
    }
  };

  // Handle back to summary button click
  const goBackToSummary = () => {
    window.location.href = `index.html?lineId=${lineId}&startDate=${startDate}&endDate=${endDate}`;
  };

  return (
    <div className="bg-black text-white min-h-screen p-5 font-sans text-center">
      <div className="container mx-auto p-5 bg-[#1a1a1a] rounded-xl shadow-xl max-w-7xl">
        <h2 id="pageTitleHeader" className="text-3xl font-bold mb-5">
          {isLineChart ? `${lineChartLabel} Failures Over Time` : `${stationName} Failure Count by Tester`}
        </h2>

        {/* Display Line, Station, and Date info */}
        <div className="text-lg font-bold mb-5">
          Line: <span id="displayLineId">{lineId}</span> |
          Station: <span id="displayStation">{stationName}</span> |
          Date: <span id="displayWorkDate">{startDate}</span>
        </div>

        {/* Dynamic Controls */}
        <div className="flex justify-center flex-wrap gap-4 mb-8">
          <button
            className="px-6 py-2 bg-[#f7941d] text-white font-bold rounded-md shadow-lg transition-all transform hover:bg-[#d97b13] hover:scale-105 active:scale-95"
            onClick={() => setIsTopFailedChart(!isTopFailedChart)}
            disabled={isLineChart || data.length === 0}
          >
            {isTopFailedChart ? 'View By Tester' : 'View Top 5 Failed'}
          </button>
          {isLineChart && (
            <button
              className="px-6 py-2 bg-[#37B019FF] text-white font-bold rounded-md shadow-lg transition-all transform hover:bg-[#2d8f16] hover:scale-105 active:scale-95"
              onClick={() => {
                setIsLineChart(false);
                setFilteredData(data); // Restore full data
              }}
            >
              Back to Bar Chart
            </button>
          )}
        </div>

        {/* Chart Section */}
        <div id="chartContainer" className="w-full md:w-4/5 mx-auto h-[400px] mb-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-xl text-gray-400">Loading chart data...</div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xl text-gray-400">No data available for the selected criteria.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {isLineChart ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#5a7081" />
                  <XAxis dataKey="name" stroke="#dbe4eb" tick={{ fill: '#dbe4eb' }} />
                  <YAxis stroke="#dbe4eb" tick={{ fill: '#dbe4eb' }} label={{ value: 'Number of Failures', angle: -90, position: 'insideLeft', fill: '#dbe4eb' }} />
                  <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }} />
                  <Legend />
                  <Line type="monotone" dataKey="failures" stroke={stationColor} fill={stationColor} strokeWidth={2} name={lineChartLabel} />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onClick={handleBarClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#5a7081" />
                  <XAxis dataKey="name" stroke="#dbe4eb" tick={{ fill: '#dbe4eb' }} />
                  <YAxis stroke="#dbe4eb" tick={{ fill: '#dbe4eb' }} label={{ value: 'Number of Failures', angle: -90, position: 'insideLeft', fill: '#dbe4eb' }} />
                  <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }} />
                  <Legend />
                  <Bar dataKey="failures" fill={stationColor} name={isTopFailedChart ? 'Top 5 Failures' : 'Failures'} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Table Controls */}
        {!isLineChart && (
          <div className="flex justify-between items-center w-full md:w-4/5 mx-auto mb-4">
            <input
              type="text"
              id="searchInput"
              placeholder="Search..."
              className="px-4 py-2 text-sm bg-[#2a2a2a] text-white rounded-md border border-[#555555] focus:outline-none focus:ring-2 focus:ring-[#ffc300] transition-all"
              onChange={handleSearch}
            />
          </div>
        )}

        {/* Summary Table */}
        {!isLineChart && (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="w-full text-sm text-center text-white">
              <thead className="text-xs uppercase bg-[#2a2a2a] text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => sortData('sn')}>Serial Number {sortStatus.column === 'sn' && (sortStatus.direction === 'asc' ? '▲' : '▼')}</th>
                  <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => sortData('model')}>Model {sortStatus.column === 'model' && (sortStatus.direction === 'asc' ? '▲' : '▼')}</th>
                  <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => sortData('testerId')}>Tester {sortStatus.column === 'testerId' && (sortStatus.direction === 'asc' ? '▲' : '▼')}</th>
                  <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => sortData('fixtureId')}>Fixture {sortStatus.column === 'fixtureId' && (sortStatus.direction === 'asc' ? '▲' : '▼')}</th>
                  <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => sortData('failItem')}>Fail Item {sortStatus.column === 'failItem' && (sortStatus.direction === 'asc' ? '▲' : '▼')}</th>
                  <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => sortData('workDate')}>Date/Time {sortStatus.column === 'workDate' && (sortStatus.direction === 'asc' ? '▲' : '▼')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <tr key={index} className="bg-[#1f1f1f] border-b border-[#444444] hover:bg-[#2a2a2a] transition-colors">
                      <td className="px-6 py-4">{row.sn || '-'}</td>
                      <td className="px-6 py-4">{row.model}</td>
                      <td className="px-6 py-4">{row.testerId}</td>
                      <td className="px-6 py-4">{row.fixtureId}</td>
                      <td className="px-6 py-4">{row.failItem || '-'}</td>
                      <td className="px-6 py-4">{row.workDate.replace('T', ' ')}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-[#1f1f1f] text-center">
                    <td colSpan={6} className="px-6 py-4">No matching data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Buttons */}
        <div className="flex justify-center mt-8 space-x-4">
          <button
            className="px-6 py-2 bg-[#37B019FF] text-white font-bold rounded-md shadow-lg transition-all transform hover:bg-[#2d8f16] hover:scale-105 active:scale-95"
            onClick={goBackToSummary}
          >
            Back to Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default StationDetailDashboard;
