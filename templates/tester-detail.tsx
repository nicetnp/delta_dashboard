import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Chart from 'chart.js/auto'; // Using Chart.js as a reliable alternative

// A helper function to parse query parameters from the URL
const getQueryParams = () => {
  const params = {};
  window.location.search.substring(1).split('&').forEach(param => {
    const parts = param.split('=');
    if (parts.length === 2) {
      params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1].replace(/\+/g, ' '));
    }
  });
  return params;
};

// A helper function to map the station codes to human-readable names
const mapStationName = (station) => {
  const mapping = {
    '%LASH': 'VFLASH1', '%IPOT_1': 'HIPOT1', '%TS1': 'ATS1',
    '%RATION': 'VIBRATION', '%TUP': 'HEATUP', '%RN_IN': 'BURNIN',
    '%IPOT_2': 'HIPOT2', '%TS2': 'ATS2', '%LASH2': 'VFLASH2', '%TS3': 'ATS3'
  };
  return mapping[station] || station || 'All Stations';
};

const stationColors = {
  'VIBRATION': '#d6412b',
  'ATS1': '#ff5733',
  'HEATUP': '#f7941d',
  'VFLASH1': '#ffa94d',
  'ATS2': '#ffc300',
  'HIPOT1': '#ffd54f',
  'HIPOT2': '#f9e79f',
  'BURNIN': 'rgba(114,9,9)',
  'ATS3': '#888888',
  'VFLASH2': '#555555',
  'ALL STATIONS': '#37B019FF'
};

const TesterDetail = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentStation, setCurrentStation] = useState('');
  const [sortStatus, setSortStatus] = useState({ column: 'workDate', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isTopFailedChart, setIsTopFailedChart] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [lineChartLabel, setLineChartLabel] = useState('');

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const ws = useRef(null);

  const {
    lineIdFromUrl,
    stationFromUrl,
    startDate,
    endDate,
  } = useMemo(() => {
    const params = getQueryParams();
    return {
      lineIdFromUrl: params.lineId || sessionStorage.getItem("lineId"),
      stationFromUrl: params.station,
      startDate: sessionStorage.getItem("startDate"),
      endDate: sessionStorage.getItem("endDate"),
    };
  }, []);

  const pageTitle = `${mapStationName(currentStation)} Failure Count by ${isTopFailedChart ? 'Fail Item' : 'Tester'}`;

  // WebSocket connection and data fetching logic
  useEffect(() => {
    if (!lineIdFromUrl || !startDate || !endDate) return;

    const stationParam = currentStation ? `&station=${currentStation}` : '';
    const startDateParam = startDate ? `&startDate=${startDate}` : '';
    const endDateParam = endDate ? `&endDate=${endDate}` : '';
    const wsUrl = `ws://localhost:8000/failures/ws/tester?lineId=${lineIdFromUrl}${stationParam}${startDateParam}${endDateParam}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        setData(newData || []);
      } catch (e) {
        console.error("Failed to parse WebSocket data:", e);
        setData([]);
      }
    };

    ws.current.onclose = () => console.log("WebSocket closed");
    ws.current.onerror = (err) => console.error("WebSocket error:", err);

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [lineIdFromUrl, currentStation, startDate, endDate]);

  // Initial station and data setup
  useEffect(() => {
    if (stationFromUrl) {
      setCurrentStation(stationFromUrl);
    } else {
      setCurrentStation('');
    }
  }, [stationFromUrl]);

  // Sorting and filtering logic
  useEffect(() => {
    let newFilteredData = [...data];

    // Apply search filter
    if (searchTerm) {
      const filter = searchTerm.toLowerCase();
      newFilteredData = newFilteredData.filter(row =>
        (row.sn || '').toLowerCase().includes(filter) ||
        (row.model || '').toLowerCase().includes(filter) ||
        (row.testerId || '').toLowerCase().includes(filter) ||
        (row.fixtureId || '').toLowerCase().includes(filter) ||
        (row.failItem || '').toLowerCase().includes(filter) ||
        (row.workDate || '').toLowerCase().includes(filter)
      );
    }

    // Apply sort
    newFilteredData.sort((a, b) => {
      let valA = a[sortStatus.column] || '';
      let valB = b[sortStatus.column] || '';

      if (sortStatus.column === 'workDate') {
        valA = new Date(valA);
        valB = new Date(valB);
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        return sortStatus.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (valA < valB) return sortStatus.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortStatus.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredData(newFilteredData);
  }, [data, searchTerm, sortStatus]);

  // Chart data processing and rendering logic with Chart.js
  useEffect(() => {
    if (!chartRef.current || data.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const categoryType = isTopFailedChart ? 'failItem' : 'testerId';
    const chartTitleText = isTopFailedChart ? 'Top 5 Failures' : 'Failures by Tester';
    const displayStationName = mapStationName(currentStation);
    const stationColor = stationColors[displayStationName.toUpperCase()] || '#37B019FF';

    let counts = {};
    if (chartType === 'line') {
      const allDates = generateDateRange(startDate, endDate);
      const timeSeriesData = new Map(allDates.map(date => [date, 0]));
      const filteredForLine = data.filter(item => (item.testerId || item.failItem) === lineChartLabel);

      filteredForLine.forEach(item => {
        const date = item.workDate.split('T')[0];
        if (timeSeriesData.has(date)) {
          timeSeriesData.set(date, timeSeriesData.get(date) + 1);
        }
      });
      const labels = allDates;
      const values = allDates.map(date => timeSeriesData.get(date));

      chartInstanceRef.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: lineChartLabel,
            data: values,
            borderColor: stationColor,
            backgroundColor: `${stationColor}45`,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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
                text: 'Date',
                color: '#dbe4eb'
              },
              ticks: { color: '#dbe4eb' },
              grid: { color: '#5a7081' }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#dbe4eb'
              }
            }
          },
        }
      });

    } else { // Bar chart
      data.forEach(item => {
        const category = item[categoryType];
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      });
      let sortedCounts = Object.entries(counts);
      if (categoryType === 'testerId') {
        sortedCounts = sortedCounts.sort((a, b) => a[0].localeCompare(b[0]));
      } else {
        sortedCounts = sortedCounts.sort((a, b) => b[1] - a[1]).slice(0, 5);
      }
      const labels = sortedCounts.map(([key]) => key);
      const values = sortedCounts.map(([, count]) => count);

      chartInstanceRef.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: chartTitleText,
            data: values,
            backgroundColor: stationColor,
            borderColor: stationColor,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: isTopFailedChart ? 'y' : 'x',
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: isTopFailedChart ? 'Fail Item' : 'Number of Failures',
                color: '#dbe4eb'
              },
              ticks: { stepSize: 1, color: '#dbe4eb' },
              grid: { color: '#5a7081' }
            },
            x: {
              title: {
                display: true,
                text: isTopFailedChart ? 'Number of Failures' : 'Tester ID',
                color: '#dbe4eb'
              },
              ticks: { color: '#dbe4eb' },
              grid: { color: '#5a7081' }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#dbe4eb'
              }
            }
          },
          onClick: (e) => {
            const activePoints = chartInstanceRef.current.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
            if (activePoints.length > 0) {
              const firstPoint = activePoints[0];
              const label = chartInstanceRef.current.data.labels[firstPoint.index];
              const filterColumn = isTopFailedChart ? 'failItem' : 'testerId';
              const filtered = data.filter(row => (row[filterColumn] || '') === label);

              setFilteredData(filtered);
              setChartType('line');
              setLineChartLabel(label);
            }
          }
        }
      });
    }

  }, [data, isTopFailedChart, chartType, currentStation, lineChartLabel, startDate, endDate]);

  const goBackToSummary = useCallback(() => {
    window.location.href = `index.html?lineId=${lineIdFromUrl}&startDate=${startDate}&endDate=${endDate}`;
  }, [lineIdFromUrl, startDate, endDate]);

  const handleStationChange = useCallback((e) => {
    setCurrentStation(e.target.value);
    setChartType('bar');
    setSearchTerm('');
    setSortStatus({ column: 'workDate', direction: 'desc' });
  }, []);

  const handleToggleChart = useCallback(() => {
    setIsTopFailedChart(prev => !prev);
    setChartType('bar');
  }, []);

  const handleSort = useCallback((column) => {
    setSortStatus(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleBackToBarChart = useCallback(() => {
    setChartType('bar');
    setFilteredData(data);
  }, [data]);

  // Helper function for line chart
  const generateDateRange = (s, e) => {
    if (!s || !e) return [];
    const dates = [];
    let currentDate = new Date(s);
    const end = new Date(e);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-5">
      <div className="container max-w-7xl mx-auto bg-[#1a1a1a] p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center" id="pageTitleHeader">
          {chartType === 'line' ? `${lineChartLabel} at ${mapStationName(currentStation)}` : pageTitle}
        </h2>
        <div className="text-lg font-bold mb-5 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-center">
          <span>Line: <span id="displayLineId">{lineIdFromUrl || 'N/A'}</span></span>
          <span className="hidden sm:inline">|</span>
          <span>Station: <span id="displayStation">{mapStationName(currentStation)}</span></span>
          <span className="hidden sm:inline">|</span>
          <span>Date: <span id="displayWorkDate">{startDate} to {endDate}</span></span>
        </div>

        {chartType === 'bar' && (
          <div className="station-controls flex justify-center items-center gap-4 mb-5 flex-wrap">
            <label htmlFor="stationSelect" className="text-lg">Select Station:</label>
            <select
              id="stationSelect"
              className="p-2 rounded-md border border-[#555] bg-[#2a2a2a] text-white focus:outline-none focus:border-[#ffc300] focus:ring-1 focus:ring-[#ffc300] transition"
              value={currentStation}
              onChange={handleStationChange}
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
        )}

        <div id="chartContainer" className="w-full h-[400px] mb-8">
          {data.length > 0 ? (
            <canvas ref={chartRef}></canvas>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No failure data for this selection.
            </div>
          )}
        </div>

        {chartType === 'line' && (
            <div className="flex justify-center mb-6">
                <button
                    onClick={handleBackToBarChart}
                    className="bg-[#37B019FF] text-white py-2 px-6 rounded-md cursor-pointer text-base transition-all duration-300 ease-in-out hover:bg-[#2d8f16] active:scale-95"
                >
                    Back to Bar Chart
                </button>
            </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center w-full mb-4">
          <input
            type="text"
            id="searchInput"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full sm:w-1/3 p-2 rounded-md border border-[#555] bg-[#2a2a2a] text-white focus:outline-none focus:border-[#ffc300] focus:ring-1 focus:ring-[#ffc300] transition mb-4 sm:mb-0"
          />
          <button
            id="toggleChartButton"
            onClick={handleToggleChart}
            className="bg-[#37B019FF] text-white py-2 px-6 rounded-md cursor-pointer text-base transition-all duration-300 ease-in-out hover:bg-[#2d8f16] active:scale-95"
          >
            {isTopFailedChart ? 'By Tester' : 'Top 5 Failed'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-md">
            <thead>
              <tr className="bg-[#2a2a2a]">
                <th
                  className="py-3 px-4 border border-[#444] text-center font-bold cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-[#333]"
                  onClick={() => handleSort('sn')}
                >
                  Serial Number
                  <span className="sort-icon ml-1 text-xs">
                    {sortStatus.column === 'sn' ? (sortStatus.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </th>
                <th
                  className="py-3 px-4 border border-[#444] text-center font-bold cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-[#333]"
                  onClick={() => handleSort('model')}
                >
                  Model
                  <span className="sort-icon ml-1 text-xs">
                    {sortStatus.column === 'model' ? (sortStatus.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </th>
                <th
                  className="py-3 px-4 border border-[#444] text-center font-bold cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-[#333]"
                  onClick={() => handleSort('testerId')}
                >
                  Tester
                  <span className="sort-icon ml-1 text-xs">
                    {sortStatus.column === 'testerId' ? (sortStatus.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </th>
                <th
                  className="py-3 px-4 border border-[#444] text-center font-bold cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-[#333]"
                  onClick={() => handleSort('fixtureId')}
                >
                  Fixture
                  <span className="sort-icon ml-1 text-xs">
                    {sortStatus.column === 'fixtureId' ? (sortStatus.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </th>
                <th
                  className="py-3 px-4 border border-[#444] text-center font-bold cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-[#333]"
                  onClick={() => handleSort('failItem')}
                >
                  Fail Item
                  <span className="sort-icon ml-1 text-xs">
                    {sortStatus.column === 'failItem' ? (sortStatus.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </th>
                <th
                  className="py-3 px-4 border border-[#444] text-center font-bold cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-[#333]"
                  onClick={() => handleSort('workDate')}
                >
                  Date/Time
                  <span className="sort-icon ml-1 text-xs">
                    {sortStatus.column === 'workDate' ? (sortStatus.direction === 'asc' ? '▲' : '▼') : ''}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody id="resultTableBody">
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={index} className="transition-colors duration-200 ease-in-out even:bg-[#1f1f1f] hover:bg-[#333]">
                    <td className="py-3 px-4 border border-[#444] text-center text-sm">{row.sn || '-'}</td>
                    <td className="py-3 px-4 border border-[#444] text-center text-sm">{row.model}</td>
                    <td className="py-3 px-4 border border-[#444] text-center text-sm">{row.testerId}</td>
                    <td className="py-3 px-4 border border-[#444] text-center text-sm">{row.fixtureId}</td>
                    <td className="py-3 px-4 border border-[#444] text-center text-sm">{row.failItem || '-'}</td>
                    <td className="py-3 px-4 border border-[#444] text-center text-sm">{row.workDate.replace('T', ' ')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-3 px-4 text-center">
                    {data.length > 0 ? "No matching data found." : "Waiting for data..."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={goBackToSummary}
          className="bg-[#37B019FF] text-white py-2 px-6 rounded-md cursor-pointer text-base transition-all duration-300 ease-in-out hover:bg-[#2d8f16] active:scale-95 mt-5"
        >
          Back to Summary
        </button>
      </div>
    </div>
  );
};

export default TesterDetail;
