import { useEffect, useRef, useState, useMemo } from "react";
import { Chart } from "chart.js/auto";
import Button from "./Button";

interface TimeRangeChartProps {
  data: any[];
  title: string;
  onTimeRangeChange?: (startTime: string, endTime: string) => void;
}

export default function TimeRangeChart({ data, title, onTimeRangeChange }: TimeRangeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate time range: 7:00 today to 7:00 tomorrow
  const timeRange = useMemo(() => {
    const today = new Date(selectedDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startTime = new Date(today);
    startTime.setHours(7, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(7, 0, 0, 0);
    
    return {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      startFormatted: startTime.toLocaleString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      endFormatted: endTime.toLocaleString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  }, [selectedDate]);

  // Filter data for the selected time range
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Try different date fields that might exist in the data
      const itemTime = new Date(item.datetime || item.timestamp || item.workDate || item.date);
      return itemTime >= new Date(timeRange.start) && itemTime <= new Date(timeRange.end);
    });
  }, [data, timeRange]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    // Generate time labels (every hour)
    const timeLabels = [];
    const startTime = new Date(timeRange.start);
    const endTime = new Date(timeRange.end);
    
    for (let time = new Date(startTime); time <= endTime; time.setHours(time.getHours() + 1)) {
      timeLabels.push(time.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    }

    // Group data by hour
    const hourlyData = new Array(24).fill(0);
    filteredData.forEach(item => {
      const itemTime = new Date(item.datetime || item.timestamp || item.workDate || item.date);
      const hour = itemTime.getHours();
      if (hour >= 0 && hour < 24) {
        hourlyData[hour]++;
      }
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: timeLabels,
        datasets: [{
          label: 'Failures',
          data: hourlyData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              title: (context) => `เวลา ${context[0].label}`,
              label: (context) => `Failures: ${context.parsed.y}`
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "เวลา",
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
            beginAtZero: true,
            title: {
              display: true,
              text: "จำนวน Failures",
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
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [filteredData, timeRange]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (onTimeRangeChange) {
      onTimeRangeChange(timeRange.start, timeRange.end);
    }
  };

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    handleDateChange(currentDate.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    handleDateChange(currentDate.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    handleDateChange(new Date().toISOString().split("T")[0]);
  };

  return (
    <div className="relative">
      {/* Chart Container */}
      <div className="w-full h-[400px] relative">
        <canvas ref={canvasRef} />
      </div>

      {/* Control Panel - Centered */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800/90 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl z-10">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          
          {/* Date Display */}
          <div className="text-sm text-slate-300">
            <div>ช่วงเวลา: {timeRange.startFormatted}</div>
            <div>ถึง: {timeRange.endFormatted}</div>
          </div>

          {/* Date Input */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 bg-slate-700/60 border border-slate-600/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              onClick={goToPreviousDay}
              variant="secondary"
              size="sm"
              icon="⬅️"
            >
              วันก่อน
            </Button>
            
            <Button
              onClick={goToToday}
              variant="primary"
              size="sm"
              icon="📅"
            >
              วันนี้
            </Button>
            
            <Button
              onClick={goToNextDay}
              variant="secondary"
              size="sm"
              icon="➡️"
            >
              วันถัดไป
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="text-xs text-slate-400">
            <div>Total Failures: {filteredData.length}</div>
            <div>Time Range: 24 ชั่วโมง</div>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="absolute top-4 right-4">
        <Button
          onClick={() => setIsVisible(!isVisible)}
          variant="secondary"
          size="sm"
          icon={isVisible ? "👁️" : "👁️‍🗨️"}
          className="opacity-70 hover:opacity-100"
        >
          {isVisible ? "ซ่อน" : "แสดง"}
        </Button>
      </div>

      {/* Overlay when controls are hidden */}
      {!isVisible && (
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Button
            onClick={() => setIsVisible(true)}
            variant="primary"
            size="md"
            icon="⚙️"
          >
            แสดงการควบคุม
          </Button>
        </div>
      )}
    </div>
  );
}
