import { useEffect, useRef } from "react";
import { Chart, type ActiveElement } from "chart.js/auto";
import type { FailureRow, StationKey } from "../types/failure";
import { STATION_KEYS, stationColors, toProp, stationMap } from "../types/failure";
import { useNavigate } from "react-router-dom";

export default function FailureChart({
                                         data,
                                         lineId,
                                     }: {
    data: FailureRow[];
    lineId: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart<"bar"> | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const labels = data.map((r) => r.workDate);
        const datasets = STATION_KEYS.map((k: StationKey) => ({
            label: k,
            data: data.map((r) => Number(r[toProp(k)] as number)),
            backgroundColor: stationColors[k],
            borderColor: stationColors[k],
            borderWidth: 1,
            stack: "failures",
        }));

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        title: { display: true, text: "Date", color: "#dbe4eb" },
                        grid: { color: "#5a7081" },
                        ticks: { color: "#dbe4eb" },
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: { display: true, text: "Failures", color: "#dbe4eb" },
                        grid: { color: "#5a7081" },
                        ticks: { color: "#dbe4eb" },
                    },
                },
                plugins: { legend: { labels: { color: "#dbe4eb" } } },
                onClick: (_evt, els) => {
                    if (!els.length) return;
                    const el = els[0] as ActiveElement;
                    const datasetIndex = el.datasetIndex;
                    const index = el.index;
                    const station = STATION_KEYS[datasetIndex];
                    const mapped = stationMap[station];
                    const workDate = data[index]?.workDate;
                    if (mapped && workDate) {
                        const params = new URLSearchParams({
                            lineId,
                            station: mapped,
                            workDate,
                            _ts: String(Date.now()),
                        });
                        navigate(`/station-detail?${params.toString()}`);
                    }
                },
            },
        });

        // ✅ Double click event listener
        const canvas = canvasRef.current;
        const chart = chartRef.current;
        const handleDoubleClick = () => {
            if (!chart) return;

            // ตัวอย่าง: Zoom ให้เหลือเฉพาะ 10 จุดล่าสุด
            const total = chart.data.labels?.length || 0;
            if (total > 10) {
                chart.data.labels = chart.data.labels?.slice(total - 10);
                chart.data.datasets.forEach((ds) => {
                    ds.data = (ds.data as number[]).slice(total - 10);
                });
                chart.update();
            }
        };

        canvas?.addEventListener("dblclick", handleDoubleClick);

        return () => {
            canvas?.removeEventListener("dblclick", handleDoubleClick);
            chartRef.current?.destroy();
        };
    }, [data, lineId]);

    return (
        <div className="w-4/5 mx-auto h-[400px]">
            <canvas ref={canvasRef} />
        </div>
    );
}
