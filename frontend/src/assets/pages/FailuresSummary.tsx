import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChartBar from "../components/ChartBar";
import TableSummary from "../components/TableSummary";

interface FailureData {
  workDate: string;
  vflash1: number;
  hipot1: number;
  ats1: number;
  heatup: number;
  vibration: number;
  burnin: number;
  hipot2: number;
  ats2: number;
  vflash2: number;
  ats3: number;
  total: number;
}

const stationKeys = ["VFlash1","Hipot1","ATS1","Heatup","Vibration","BurnIn","Hipot2","ATS2","VFlash2","ATS3"] as const;
const stationMap: Record<string, string> = { VFlash1: "%LASH", Hipot1: "%IPOT_1", ATS1: "%TS1", Heatup: "%TUP", Vibration: "%RATION", BurnIn: "%RN_IN", Hipot2: "%IPOT_2", ATS2: "%TS2", VFlash2: "%LASH2", ATS3: "%TS3"};
const stationColors: Record<string,string> = { VFlash1:"#ffa94d", Hipot1:"#ffd54f", ATS1:"#ff5733", Heatup:"#f7941d", Vibration:"#d6412b", BurnIn:"rgba(126,15,15)", Hipot2:"#f9e79f", ATS2:"#ffc300", VFlash2:"#555555", ATS3:"#888888" };

const BMWFailuresSummary: React.FC = () => {
  const [lineId, setLineId] = useState("BMA01");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<FailureData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  const reloadData = () => {
    if (wsRef.current) wsRef.current.close();
    const ts = Date.now();
    let wsUrl = `ws://localhost:8000/failures/ws/filter?lineId=${lineId}&_ts=${ts}`;
    if(startDate) wsUrl += `&startDate=${startDate}`;
    if(endDate) wsUrl += `&endDate=${endDate}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (event) => setData(JSON.parse(event.data));
  };

  useEffect(() => { reloadData(); return () => wsRef.current?.close(); }, [lineId,startDate,endDate]);

  const handleBarClick = (station: string, workDate: string) => {
    navigate(`/tester-detail?lineId=${lineId}&station=${station}&workDate=${workDate}`);
  };

  const handleCellClick = (station: string, workDate: string) => {
    navigate(`/tester-detail?lineId=${lineId}&station=${station}&workDate=${workDate}`);
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 rounded-lg text-white">
      <h2 className="text-2xl mb-4">BMW Failures Summary</h2>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div>
          <label className="font-bold mr-2">Line:</label>
          <select className="bg-gray-800 px-2 py-1 rounded" value={lineId} onChange={e => setLineId(e.target.value)}>
            <option value="BMA01">BMA01</option>
            <option value="B3">B3</option>
          </select>
        </div>
        <div>
          <label className="font-bold mr-2">Start Date:</label>
          <input type="date" className="bg-gray-800 px-2 py-1 rounded" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="font-bold mr-2">End Date:</label>
          <input type="date" className="bg-gray-800 px-2 py-1 rounded" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded" onClick={() => navigate(`/fixture-detail?lineId=${lineId}&startDate=${startDate}&endDate=${endDate}`)}>Fixture Failure</button>
        <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded" onClick={() => navigate(`/tester-detail?lineId=${lineId}&workDate=${startDate}&startDate=${startDate}&endDate=${endDate}`)}>Tester Failure</button>
      </div>
      <div className="w-full h-96 mb-6">
        <ChartBar
          data={data}
          stationKeys={stationKeys}
          stationMap={stationMap}
          stationColors={stationColors}
          lineId={lineId}
          onBarClick={handleBarClick}
        />
      </div>
      <h3 className="text-xl mb-2">Summary Table</h3>
      <TableSummary
        data={data}
        stationKeys={stationKeys}
        stationMap={stationMap}
        lineId={lineId}
        onCellClick={handleCellClick}
      />
    </div>
  );
};

export default BMWFailuresSummary;
