import { useEffect, useRef, useState } from "react";
import type { FailureRow } from "../types/failure";
import { buildWebSocketUrl, getRouteByPath } from "../config/routes";

export function useFailuresWS({
                                  lineId,
                                  startDate,
                                  endDate,
                                  base,
                              }: {
    lineId: string;
    startDate?: string;
    endDate?: string;
    base?: string;
}) {
    const [data, setData] = useState<FailureRow[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const prevJSON = useRef<string>("[]");


    useEffect(() => {
        // Use centralized WebSocket URL if base is not provided
        const wsUrl = base || (() => {
            const route = getRouteByPath('/');
            return route ? buildWebSocketUrl(route, { lineId, startDate: startDate || '', endDate: endDate || '' }) : 'ws://localhost:8000/failures/ws/filter';
        })();
        
        const ts = Date.now();
        const url = new URL(wsUrl);
        url.searchParams.set("lineId", lineId);
        url.searchParams.set("_ts", String(ts));
        if (startDate) url.searchParams.set("startDate", startDate);
        if (endDate) url.searchParams.set("endDate", endDate);


        const ws = new WebSocket(url.toString());
        setConnected(false);
        setError(null);


        ws.onopen = () => setConnected(true);
        ws.onerror = () => setError("WebSocket error");
        ws.onclose = () => setConnected(false);


        ws.onmessage = (evt) => {
            try {
                const next: FailureRow[] = JSON.parse(evt.data);
                const nextJSON = JSON.stringify(next);
                if (nextJSON !== prevJSON.current) {
                    prevJSON.current = nextJSON;
                    setData(next);
                }
            } catch (e) {
                setError("Invalid data");
            }
        };


        return () => ws.close();
    }, [lineId, startDate, endDate, base]);


    return { data, connected, error };
}