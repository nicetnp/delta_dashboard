import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import Input from "../components/Input";
import Select from "../components/Select";

interface CalibrationRow {
    ID: number;
    Station: string;
    Equipment: string;
    Brand: string;
    Model: string;
    StartDate: string;
    EndDate: string;
    LineID: string;
    Status: string;
    Seriesnumber: string;
    Responsible: string;
    AssetNumber: string;
}

export default function Calibration() {
    const [rows, setRows] = useState<CalibrationRow[]>([]);
    const [search, setSearch] = useState("");
    const [lineId, setLineId] = useState<string>("BMA01");
    const [status, setStatus] = useState<string>("");

    useEffect(() => {
        async function load() {
            try {
                const qs = new URLSearchParams({ lineId, status }).toString();
                const res = await fetch(`/api/calibration?${qs}`);
                const data = await res.json();
                setRows(data || []);
            } catch (e) {
                console.error("load calibration error", e);
            }
        }
        load();
    }, [lineId, status]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return rows;
        return rows.filter(r =>
            (r.Station || "").toLowerCase().includes(s) ||
            (r.Equipment || "").toLowerCase().includes(s) ||
            (r.Brand || "").toLowerCase().includes(s) ||
            (r.Model || "").toLowerCase().includes(s) ||
            (r.Status || "").toLowerCase().includes(s) ||
            (r.Seriesnumber || "").toLowerCase().includes(s) ||
            (r.Responsible || "").toLowerCase().includes(s) ||
            (r.AssetNumber || "").toLowerCase().includes(s)
        );
    }, [rows, search]);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">Calibration</h1>
                    <p className="text-slate-400 text-lg font-medium">Equipment calibration overview</p>
                </div>

                <Card title="Filters" variant="glass" className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select label="Line" value={lineId} onChange={(e) => setLineId(e.target.value)}>
                            <option value="BMA01">BMA01</option>
                            <option value="B3">B3</option>
                        </Select>
                        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All</option>
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                            <option value="DueSoon">Due soon</option>
                        </Select>
                        <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find by station, model, asset..." />
                    </div>
                </Card>

                <Card title="Calibration List" variant="elevated">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm text-center">
                            <thead>
                            <tr>
                                {[
                                    "ID","Station","Equipment","Brand","Model","StartDate","EndDate","LineID","Status","Seriesnumber","Responsible","AssetNumber"
                                ].map(h => (
                                    <th key={h} className="border border-slate-600 px-3 py-2 text-slate-200">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="text-center py-4 text-slate-400">No data</td>
                                </tr>
                            ) : (
                                filtered.map((r) => (
                                    <tr key={r.ID} className="hover:bg-slate-700/40">
                                        <td className="px-3 py-2 text-slate-200">{r.ID}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Station}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Equipment}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Brand}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Model}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.StartDate?.toString().replace('T',' ')}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.EndDate?.toString().replace('T',' ')}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.LineID}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Status}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Seriesnumber}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.Responsible}</td>
                                        <td className="px-3 py-2 text-slate-200">{r.AssetNumber}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}


