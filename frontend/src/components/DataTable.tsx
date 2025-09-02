import type { FailureRow, StationKey } from "../types/failure";
import { STATION_KEYS, stationMap } from "../types/failure";
import { useNavigate } from "react-router-dom";

export default function DataTable({ rows, lineId }: { rows: FailureRow[]; lineId: string }) {
    const navigate = useNavigate();

    const go = (stationKey: StationKey, workDate: string) => {
        const mapped = stationMap[stationKey];
        const params = new URLSearchParams({ lineId, station: mapped, workDate, _ts: String(Date.now()) });
        navigate(`/station-detail?${params.toString()}`);
    };

    if (rows.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Data Available</h3>
                <p className="text-gray-400">Please adjust your filters or check your connection.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <div className="min-w-full">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <Th>Work Date</Th>
                            {STATION_KEYS.map((k) => (
                                <Th key={k}>{k}</Th>
                            ))}
                            <Th>Total</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors duration-200">
                                <Td className="font-medium">{r.workDate}</Td>
                                {STATION_KEYS.map((k) => {
                                    const val = Number((r as any)[k.toLowerCase()]);
                                    const clickable = val > 0;
                                    return (
                                        <Td
                                            key={`${idx}-${k}`}
                                            className={`text-center ${
                                                clickable 
                                                    ? "cursor-pointer hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-200 font-medium" 
                                                    : "text-gray-500"
                                            }`}
                                            onClick={() => clickable && go(k, r.workDate)}
                                        >
                                            {val > 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                                                    {val}
                                                </span>
                                            ) : (
                                                val
                                            )}
                                        </Td>
                                    );
                                })}
                                <Td className="text-center font-bold text-lg">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30">
                                        {r.total}
                                    </span>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider ${className}`}>
            {children}
        </th>
    );
}

function Td({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
    return (
        <td 
            onClick={onClick} 
            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-300 ${className}`}
        >
            {children}
        </td>
    );
}