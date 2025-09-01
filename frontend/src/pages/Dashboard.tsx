import { useMemo } from "react";
import FailureChart from "../components/FailureChart";
import DataTable from "../components/DataTable";
import Notification from "../components/Notification";
import { useFailuresWS } from "../hooks/useFailuresWS";
import { useSessionState } from "../hooks/useSessionState";
import type { FailureRow } from "../types/failure";

export default function Dashboard() {
    const today = useMemo(() => new Date().toISOString().split("T")[0], []);
    const [lineId, setLineId] = useSessionState<string>("lineId", "BMA01");
    const [startDate, setStartDate] = useSessionState<string>("startDate", today);
    const [endDate, setEndDate] = useSessionState<string>("endDate", today);

    const { data, connected } = useFailuresWS({ lineId, startDate, endDate });

    const triggerKey = useMemo(() => (data.length ? `${data[0].workDate}-${data.length}` : ""), [data]);

    const goFixture = () => {
        const params = new URLSearchParams({ lineId, startDate, endDate });
        window.location.href = `/fixture-detail?${params.toString()}`;
    };

    const goTester = () => {
        const workDate = startDate || new Date().toISOString().split("T")[0];
        const params = new URLSearchParams({ lineId, workDate, startDate, endDate });
        window.location.href = `/tester-detail?${params.toString()}`;
    };

    return (
        <div className="text-center p-5">
            <Notification triggerKey={triggerKey} />

            <div className="max-w-[90%] mx-auto bg-neutral-900 p-5 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">BMW Failures Summary</h2>

                {/* Controls */}
                <div className="flex flex-wrap justify-center items-center gap-3 mb-5">
                    <label className="font-bold">Line:</label>
                    <select
                        value={lineId}
                        onChange={(e) => setLineId(e.target.value)}
                        className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                        <option value="BMA01">BMA01</option>
                        <option value="B3">B3</option>
                    </select>

                    <label className="font-bold">Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />

                    <label className="font-bold">End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                </div>

                {/* Buttons */}
                <div className="flex justify-center gap-4 mb-5">
                    <button onClick={goFixture} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded text-white">
                        Fixture Failure
                    </button>
                    <button onClick={goTester} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded text-white">
                        Tester Failure
                    </button>
                </div>

                {/* Chart */}
                <FailureChart data={data as FailureRow[]} lineId={lineId} />

                {/* Table */}
                <h3 className="text-xl mt-6 mb-3">Summary Table</h3>
                <DataTable rows={data as FailureRow[]} lineId={lineId} />

                <div className="mt-4 text-xs text-neutral-400">
                    WS: {connected ? "connected" : "disconnected"}
                </div>
            </div>
        </div>
    );
}