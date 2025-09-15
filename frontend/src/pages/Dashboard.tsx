import { useMemo, useCallback, useState, useEffect } from "react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import StatusBadge from "../components/StatusBadge";
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
    const [showScrollTop, setShowScrollTop] = useState(false);

    const { data, connected } = useFailuresWS({ lineId, startDate, endDate });
    const triggerKey = useMemo(() => (data.length ? `${data[0].workDate}-${data.length}` : ""), [data]);

    const goFixture = useCallback(() => {
        const params = new URLSearchParams({ lineId, startDate, endDate });
        window.location.href = `/fixture-detail?${params.toString()}`;
    }, [lineId, startDate, endDate]);

    const goTester = useCallback(() => {
        const workDate = startDate || new Date().toISOString().split("T")[0];
        const params = new URLSearchParams({ lineId, workDate, startDate, endDate });
        window.location.href = `/tester-detail?${params.toString()}`;
    }, [lineId, startDate, endDate]);

    const resetFilters = useCallback(() => {
        setStartDate(today);
        setEndDate(today);
    }, [setStartDate, setEndDate, today]);

    // Handle scroll to show/hide scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Calculate summary statistics with useMemo for performance
    const summaryStats = useMemo(() => {
        const totalFailures = data.reduce((sum, row) => sum + (row.total || 0), 0);
        const avgFailures = data.length > 0 ? (totalFailures / data.length).toFixed(1) : '0';
        const latestDate = data.length > 0 ? data[data.length - 1]?.workDate : 'N/A';
        return { totalFailures, avgFailures, latestDate };
    }, [data]);

    return (
        <Layout>
            <Notification triggerKey={triggerKey} />
            
            {/* Header Section */}
            <div className="mb-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 tracking-tight">
                            Failures Dashboard
                        </h1>
                        <p className="text-slate-400 text-lg font-medium">Real-time failure analysis and monitoring</p>
                    </div>
                    <StatusBadge status={connected ? 'connected' : 'disconnected'} size="lg" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card title="Total Failures" icon="📊" variant="elevated" className="text-center group hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl font-bold text-slate-100 mb-2 group-hover:text-blue-400 transition-colors duration-300">{summaryStats.totalFailures}</div>
                    <p className="text-slate-400 text-sm font-medium">All time failures</p>
                </Card>
                
                <Card title="Average Daily" icon="📈" variant="elevated" className="text-center group hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl font-bold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors duration-300">{summaryStats.avgFailures}</div>
                    <p className="text-slate-400 text-sm font-medium">Failures per day</p>
                </Card>
                
                <Card title="Data Points" icon="📅" variant="elevated" className="text-center group hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl font-bold text-slate-100 mb-2 group-hover:text-purple-400 transition-colors duration-300">{data.length}</div>
                    <p className="text-slate-400 text-sm font-medium">Days recorded</p>
                </Card>
                
                <Card title="Latest Update" icon="🕒" variant="elevated" className="text-center group hover:scale-105 transition-transform duration-300">
                    <div className="text-xl font-bold text-slate-100 mb-2 group-hover:text-amber-400 transition-colors duration-300">{summaryStats.latestDate}</div>
                    <p className="text-slate-400 text-sm font-medium">Most recent data</p>
                </Card>
            </div>

            {/* Controls Section */}
            <Card title="Filter Controls" icon="🎛️" variant="glass" className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Select
                        label="Production Line"
                        value={lineId}
                        onChange={(e) => setLineId(e.target.value)}
                        icon="🏭"
                    >
                        <option value="BMA01">BMA01</option>
                        <option value="B3">B3</option>
                    </Select>

                    <Input
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        icon="📅"
                    />

                    <Input
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        icon="📅"
                    />

                    <div className="flex items-end">
                        <Button
                            onClick={resetFilters}
                            variant="secondary"
                            size="md"
                            className="w-full"
                            icon="🔄"
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Action Buttons */}
            <Card title="Quick Actions" icon="⚡" variant="glass" className="mb-10">
                <div className="flex flex-wrap gap-4">
                    <Button
                        onClick={goFixture}
                        variant="primary"
                        size="lg"
                        icon="🔧"
                        className="flex-1 min-w-[200px]"
                    >
                        Fixture Failure Analysis
                    </Button>
                    <Button
                        onClick={goTester}
                        variant="primary"
                        size="lg"
                        icon="⚙️"
                        className="flex-1 min-w-[200px]"
                    >
                        Tester Failure Analysis
                    </Button>
                </div>
            </Card>

            {/* Chart Section */}
            <Card title="Failure Trends" subtitle="Click on chart segments to drill down" icon="📊" variant="elevated" className="mb-10">
                <FailureChart data={data as FailureRow[]} lineId={lineId} />
            </Card>

            {/* Data Table Section */}
            <Card title="Summary Table" subtitle="Click on failure counts to view details" icon="📋" variant="elevated">
                <DataTable rows={data as FailureRow[]} lineId={lineId} />
            </Card>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    title="Scroll to Top"
                    aria-label="Scroll to Top"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}
        </Layout>
    );
}