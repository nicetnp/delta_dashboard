import React, { useEffect, useRef, useState } from "react";
import { Chart, type ChartEvent, type ActiveElement } from "chart.js/auto";
import { useNavigate, useLocation } from "react-router-dom";

interface TesterFailure {
  sn?: string;
  model: string;
  testerId: string;
  fixtureId: string;
  failItem?: string;
  workDate: string;
}

const stationColors: Record<string, string> = {
  VIBRATION: "#d6412b",
  ATS1: "#ff5733",
  HEATUP: "#f7941d",
  VFLASH1: "#ffa94d",
  ATS2: "#ffc300",
  HIPOT1: "#ffd54f",
  HIPOT2: "#f9e79f",
  BURNIN: "rgb(143,11,11)",
  ATS3: "#888888",
  VFLASH2: "#555555",
};

const mapStationName = (station: string) => {
  const mapping: Record<string, string> = {
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
  return mapping[station] || station;
};

const TesterDetail: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [originalData, setOriginalData] = useState<TesterFailure[]>([]);
  const [filteredData, setFilteredData] = useState<TesterFailure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTopFailedChart, setIsTopFailedChart] = useState(false);
  const [currentLineId, setCurrentLineId] = useState("");
  const [currentStation, setCurrentStation] = useState("");
  const [currentWorkDate, setCurrentWorkDate] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const wsRef = useRef<WebSocket | null>(null);

  const queryParams = new URLSearchParams(location.search);
  const lineIdFromUrl = queryParams.get("lineId") || "";
  const stationFromUrl = queryParams.get("station") || "";
  const workDateFromUrl = queryParams.get("workDate") || "";

  // WebSocket connection
  useEffect(() => {
    if (!lineIdFromUrl || !stationFromUrl) return;

    setCurrentLineId(lineIdFromUrl);
    setCurrentStation(stationFromUrl);
    setCurrentWorkDate(workDateFromUrl || "");

    const displayStationName = mapStationName(stationFromUrl);

    const wsUrl = `ws://localhost:8000/failures/ws/station?lineId=${lineIdFromUrl}&station=${stationFromUrl}${
      workDateFromUrl ? `&workDate=${workDateFromUrl}` : ""
    }`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log("WebSocket connected");
    ws.onmessage = (event) => {
      const data: TesterFailure[] = JSON.parse(event.data);
      if (!data || data.length === 0) {
        setOriginalData([]);
        setFilteredData([]);
        if (chartInstance.current) chartInstance.current.destroy();
        chartInstance.current = null;
        return;
      }
      setOriginalData(data);
      setFilteredData(data);
      updateChart(data, displayStationName, "testerId", false);
    };
    ws.onclose = () => console.log("WebSocket closed");
    ws.onerror = (err) => console.error("WebSocket error:", err);

    return () => ws.close();
  }, [lineIdFromUrl, stationFromUrl, workDateFromUrl]);

  // Filter table
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(originalData);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredData(
        originalData.filter(
          (row) =>
            (row.sn || "").toLowerCase().includes(lower) ||
            row.model.toLowerCase().includes(lower) ||
            row.testerId.toLowerCase().includes(lower) ||
            row.fixtureId.toLowerCase().includes(lower) ||
            (row.failItem || "").toLowerCase().includes(lower) ||
            row.workDate.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, originalData]);

  // Chart update
  const updateChart = (data: TesterFailure[], displayStationName: string, categoryType: "testerId" | "failItem", isHorizontal: boolean) => {
    const ctx = chartRef.current?.getContext("2d");
    if (!ctx) return;

    const counts: Record<string, number> = {};
    data.forEach((item) => {
      const key = item[categoryType];
      if (key) counts[key] = (counts[key] || 0) + 1;
    });

    let sortedCounts = Object.entries(counts);
    if (categoryType === "testerId") {
      sortedCounts.sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      sortedCounts = sortedCounts.sort((a, b) => b[1] - a[1]).slice(0, 5);
    }

    const labels = sortedCounts.map(([key]) => key);
    const values = sortedCounts.map(([, count]) => count);

    if (chartInstance.current) chartInstance.current.destroy();

    const color = stationColors[displayStationName.toUpperCase()] || "rgba(255,195,0,0.6)";

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: `${categoryType === "failItem" ? "Top 5 " : ""}Failures (${displayStationName})`,
            data: values,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isHorizontal ? "y" : "x",
        scales: {
          y: { beginAtZero: true, ticks: { color: "#dbe4eb" }, grid: { color: "#5a7081" } },
          x: { ticks: { color: "#dbe4eb" }, grid: { color: "#5a7081" } },
        },
        plugins: { legend: { labels: { color: "#dbe4eb" } } },
        onClick: (e: ChartEvent) => {
          const points: ActiveElement[] = chartInstance.current!.getElementsAtEventForMode(e, "nearest", { intersect: true }, true);
          if (points.length === 0) return;
          const first = points[0];
          const label = chartInstance.current!.data.labels![first.index] as string;
          const filterColumn = isTopFailedChart ? "failItem" : "testerId";
          const filtered = originalData.filter((row) => row[filterColumn] === label);
          setFilteredData(filtered);
        },
      },
    });
  };

  const toggleTopFailed = () => {
    if (!originalData.length) return;
    const displayStationName = mapStationName(currentStation);
    setIsTopFailedChart(!isTopFailedChart);
    updateChart(originalData, displayStationName, !isTopFailedChart ? "failItem" : "testerId", !isTopFailedChart);
    setFilteredData(originalData);
  };

  const goBack = () => {
    const savedLineId = sessionStorage.getItem("lineId") || currentLineId;
    const savedStartDate = sessionStorage.getItem("startDate") || currentWorkDate;
    const savedEndDate = sessionStorage.getItem("endDate") || currentWorkDate;
    navigate(`/summary?lineId=${savedLineId}&startDate=${savedStartDate}&endDate=${savedEndDate}`);
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 rounded-lg text-white">
      <h2 className="text-2xl mb-4">{mapStationName(currentStation)} Failure Count by Tester</h2>
      <div className="mb-4">
        Line: <span>{currentLineId}</span> | Station: <span>{mapStationName(currentStation)}</span> | Date: <span>{currentWorkDate}</span>
      </div>
      <div className="w-full h-96 mb-4">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="flex justify-between mb-4">
        <input
          type="text"
          className="bg-gray-800 px-2 py-1 rounded"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded" onClick={toggleTopFailed}>
          {!isTopFailedChart ? "Top 5 Failed" : "By Tester"}
        </button>
      </div>
      <table className="w-full border-collapse border border-gray-700 mb-4">
        <thead>
          <tr className="bg-gray-800">
            <th className="border px-2 py-1">SN</th>
            <th className="border px-2 py-1">Model</th>
            <th className="border px-2 py-1">Tester</th>
            <th className="border px-2 py-1">Fixture</th>
            <th className="border px-2 py-1">Fail Item</th>
            <th className="border px-2 py-1">Date/Time</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center">
                No matching data.
              </td>
            </tr>
          ) : (
            filteredData.map((row, idx) => (
              <tr key={idx} className="even:bg-gray-800">
                <td className="border px-2 py-1">{row.sn || "-"}</td>
                <td className="border px-2 py-1">{row.model}</td>
                <td className="border px-2 py-1">{row.testerId}</td>
                <td className="border px-2 py-1">{row.fixtureId}</td>
                <td className="border px-2 py-1">{row.failItem || "-"}</td>
                <td className="border px-2 py-1">{row.workDate.replace("T", " ")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded" onClick={goBack}>
        Back to Summary
      </button>
    </div>
  );
};

export default TesterDetail;
