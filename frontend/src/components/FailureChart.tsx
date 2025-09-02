import { useEffect, useRef } from "react";
import "../chartTheme";
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
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            stack: "failures",
        }));

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    // Exact segment selection like the template behavior
                    intersect: true,
                    mode: 'nearest',
                },
                plugins: {
                    legend: {
                        labels: {
                            color: "#e2e8f0",
                            font: {
                                size: 12,
                                weight: 'normal'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                        },
                        position: 'top',
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: "Date",
                            color: "#94a3b8",
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#cbd5e1",
                            font: {
                                size: 12
                            }
                        },
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Number of Failures",
                            color: "#94a3b8",
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#cbd5e1",
                            font: {
                                size: 12
                            }
                        },
                    },
                },
                onHover: (evt, elements) => {
                    const target = evt.native?.target as HTMLCanvasElement | undefined;
                    if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
                },
                onClick: (evt) => {
                    const chart = chartRef.current;
                    if (!chart) return;
                    // Compute exact bar segment under cursor
                    const els = chart.getElementsAtEventForMode(evt as unknown as Event, 'nearest', { intersect: true }, true) as ActiveElement[];
                    if (!els.length) return;
                    const el = els[0];
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

        // Double click event listener for zoom
        const canvas = canvasRef.current;
        const chart = chartRef.current;
        const handleDoubleClick = () => {
            if (!chart) return;

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
    }, [data, lineId, navigate]);

    return (
        <div className="w-full h-[500px] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl"></div>
            <canvas ref={canvasRef} className="relative z-10" />
        </div>
    );
}
