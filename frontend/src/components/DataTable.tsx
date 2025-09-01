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

    return (
        <div className="overflow-x-auto">
            <table className="w-[90%] mx-auto border-collapse">
                <thead>
                <tr>
                    <Th>Work Date</Th>
                    {STATION_KEYS.map((k) => (
                        <Th key={k}>{k}</Th>
                    ))}
                    <Th>Total</Th>
                </tr>
                </thead>
                <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td className="text-center py-3" colSpan={STATION_KEYS.length + 2}>
                            Loading...
                        </td>
                    </tr>
                ) : (
                    rows.map((r, idx) => (
                        <tr key={idx} className={idx % 2 ? "bg-neutral-800" : "bg-neutral-900"}>
                            <Td>{r.workDate}</Td>
                            {STATION_KEYS.map((k) => {
                                const val = Number((r as any)[k.toLowerCase()]);
                                const clickable = val > 0;
                                return (
                                    <Td
                                        key={`${idx}-${k}`}
                                        className={clickable ? "cursor-pointer hover:bg-neutral-700" : undefined}
                                        onClick={() => clickable && go(k, r.workDate)}
                                    >
                                        {val}
                                    </Td>
                                );
                            })}
                            <Td>{r.total}</Td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="border border-neutral-700 px-2 py-1 bg-neutral-800 text-white text-sm">{children}</th>;
}

function Td({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
    return (
        <td onClick={onClick} className={`border border-neutral-700 px-2 py-1 text-sm ${className ?? ""}`}>
            {children}
        </td>
    );
}