import React, { useEffect, useRef, useState } from "react";
import { Chart, ChartDataset } from "chart.js/auto";
import { useLocation, useNavigate } from "react-router-dom";

interface FixtureData {
  testerId: string;
  fixtureId: string;
  failItem: string;
  workDate: string;
}

const FixtureDetail: React.FC = () => {
  const ctxRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [currentLineId, setCurrentLineId] = useState<string>("");
  const [currentData, setCurrentData] = useState<FixtureData[]>([]);
  const [isTopFailedChart, setIsTopFailedChart] = useState<boolean>(false);
  const [sortStatus, setSortStatus] = useState({ column: "workDate", direction: "desc" });
  const [searchText, setSearchText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getQueryParams = () => {
    const params = new URLSearchParams(location.search);
    return {
      lineId: params.get("lineId") || "",
      startDate: params.get("startDate") || "",
      endDate: params.get("endDate") || ""
    };
  };

  // WebSocket
  useEffect(() => {
    const { lineId, startDate, endDate } = getQueryParams();
    if (!lineId) return;

    setCurrentLineId(lineId);
    const wsUrl = `ws://localhost:8000/failures/ws/fixture?lineId=${lineId}${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log(`✅ WebSocket opened for lineId=${lineId}`);
    ws.onmessage = (event) => {
      const data: FixtureData[] = JSON.parse(event.data) || [];
      setCurrentData(data);
      updateChart(data, "fixtureId", false);
    };
    ws.onerror = (err) => console.error("❗ WebSocket error:", err);
    ws.onclose = () => console.log("❌ WebSocket closed");

    return () => ws.close();
  }, [location.search]);

  // Chart
  const updateChart = (data: FixtureData[], categoryType: "fixtureId" | "failItem", isHorizontal: boolean) => {
    if (!ctxRef.current) return;
    const categoryCounts: Record<string, number> = {};
    const filteredData = data.filter((item) => item.fixtureId && item.fixtureId.toLowerCase() !== "onstation");

    filteredData.forEach((item) => {
      const key = categoryType === "failItem" ? `${item.fixtureId || "N/A"} - ${item.failItem || "N/A"}` : item.fixtureId || "N/A";
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });

    let sortedCategories = Object.entries(categoryCounts);
    if (categoryType === "failItem") sortedCategories = sortedCategories.sort((a, b) => b[1] - a[1]).slice(0, 5);
    else sortedCategories.sort((a, b) => a[0].localeCompare(b[0]));

    const labels = sortedCategories.map(([key]) => key);
    const values = sortedCategories.map(([, count]) => count);

    chartRef.current?.destroy();
    if (labels.length === 0) return;

    chartRef.current = new Chart(ctxRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: `${categoryType === "failItem" ? "Top 5" : "Total"} Failures`,
          data: values,
          backgroundColor: "#3b82f6",
          borderColor: "#2563eb",
          borderWidth: 1
        } as ChartDataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isHorizontal ? "y" : "x",
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { beginAtZero: true }
        },
        plugins: {
          legend: { display: true }
        },
        onClick: (e) => {
          const activePoints = chartRef.current?.getElementsAtEventForMode(e.native, "nearest", { intersect: true }, true);
          if (!activePoints || activePoints.length === 0) return;
          const firstPoint = activePoints[0];
          const label = chartRef.current?.data.labels?.[firstPoint.index] as string;
          const filteredData = isTopFailedChart
            ? currentData.filter(row => `${row.fixtureId || "N/A"} - ${row.failItem || "N/A"}` === label)
            : currentData.filter(row => row.fixtureId === label);
          setCurrentData(filteredData);
        }
      }
    });
  };

  const sortedAndFilteredData = () => {
    let data = [...currentData];
    if (searchText) {
      data = data.filter(row =>
        row.testerId.toLowerCase().includes(searchText.toLowerCase()) ||
        row.fixtureId.toLowerCase().includes(searchText.toLowerCase()) ||
        row.failItem.toLowerCase().includes(searchText.toLowerCase()) ||
        row.workDate.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    data.sort((a, b) => {
      let valA: any = a[sortStatus.column as keyof FixtureData] || "";
      let valB: any = b[sortStatus.column as keyof FixtureData] || "";
      if (sortStatus.column === "workDate") {
        valA = new Date(valA);
        valB = new Date(valB);
      }
      if (valA < valB) return sortStatus.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortStatus.direction === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  };

  const handleSort = (column: keyof FixtureData) => {
    setSortStatus(prev => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const navigateBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-gray-800 p-4 rounded shadow">
          <h2 className="text-2xl font-bold mb-2 md:mb-0">Fixture Failure Dashboard</h2>
          <span className="text-gray-300">Line ID: <span className="font-semibold">{currentLineId}</span></span>
        </div>

        {/* Chart Card */}
        <div className="bg-gray-800 rounded shadow p-4 h-96">
          <canvas ref={ctxRef} className="w-full h-full"></canvas>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
          <input
            type="text"
            placeholder="Search…"
            className="p-2 rounded bg-gray-700 text-white border border-gray-600 flex-1"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded md:ml-4"
            onClick={() => {
              setIsTopFailedChart(!isTopFailedChart);
              updateChart(currentData, isTopFailedChart ? "fixtureId" : "failItem", isTopFailedChart);
            }}
          >
            {isTopFailedChart ? "By Fixture" : "Top 5 Failed"}
          </button>
        </div>

        {/* Table Card */}
        <div className="overflow-x-auto bg-gray-800 rounded shadow p-4">
          <table className="min-w-full table-auto border-collapse text-center">
            <thead>
              <tr className="bg-gray-700">
                {["testerId", "fixtureId", "failItem", "workDate"].map((col) => (
                  <th key={col} onClick={() => handleSort(col as keyof FixtureData)}
                      className="cursor-pointer px-4 py-2 font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredData().map((row, idx) => (
                <tr key={idx} className="even:bg-gray-700 hover:bg-gray-600">
                  <td className="px-2 py-1">{row.testerId}</td>
                  <td className="px-2 py-1">{row.fixtureId}</td>
                  <td className="px-2 py-1">{row.failItem}</td>
                  <td className="px-2 py-1">{row.workDate.replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Back Button */}
        <div className="flex justify-end">
          <button onClick={navigateBack} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">Back to Summary</button>
        </div>
      </div>
    </div>
  );
};

export default FixtureDetail;
