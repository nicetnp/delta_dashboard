import { useEffect, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Select from "../components/Select";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { API_CONFIG } from "../config/routes";

interface CalibrationRow {
    ID: number;
    Station?: string;
    Equipment?: string;
    Brand?: string;
    Model?: string;
    DT?: string;
    StartDate?: string;
    EndDate?: string;
    Status?: string;
    LineID?: string;
    Responsible?: string;
    AssetNumber?: string;
    Seriesnumber?: string;
    Comment?: string;
    Timestamp?: string;
}

interface DropdownOptions {
    stations: string[];
    equipment: string[];
    brands: string[];
    models: { [brand: string]: string[] };
    lines: string[];
    responsible: string[];
    statuses: string[];
}

interface ToastType {
    id: string;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
}

const CAL_API = "/calibration";

export default function Calibration() {
    const [rows, setRows] = useState<CalibrationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [stationFilter, setStationFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [lineFilter, setLineFilter] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [toasts, setToasts] = useState<ToastType[]>([]);
    const [formData, setFormData] = useState<Partial<CalibrationRow>>({});
    const [isDueSoonModalOpen, setIsDueSoonModalOpen] = useState(false);
    const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
        stations: [],
        equipment: [],
        brands: [],
        models: {},
        lines: [],
        responsible: [],
        statuses: ['Spare', 'Missing', 'Damage', 'On-Station', 'On-Calibration']
    });
    const [dueSoonItems, setDueSoonItems] = useState<CalibrationRow[]>([]);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [, setHistorySerialNumber] = useState("");
    const [historyEquipmentName, setHistoryEquipmentName] = useState("");
    const [sortConfig, setSortConfig] = useState<{key: string | null, direction: 'asc' | 'desc'}>({
        key: 'EndDate',
        direction: 'asc'
    });

    // Load dropdown options from API
    async function loadDropdownOptions() {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${CAL_API}/choices`);
            if (res.ok) {
                const choices = await res.json();
                setDropdownOptions(prev => ({
                    ...prev,
                    stations: choices.stations || [],
                    equipment: choices.equipment || [],
                    brands: choices.brands || [],
                    models: choices.models || {},
                    lines: choices.lines || [],
                    responsible: choices.responsible || []
                }));
            }
        } catch (err) {
            console.warn('Failed to load dropdown options:', err);
        }
    }

    // Ensure choice exists with password protection
    async function ensureChoiceExists(kind: string, value: string): Promise<boolean> {
        if (!value) return true;
        
        let exists = false;
        switch (kind) {
            case 'station':
                exists = dropdownOptions.stations.includes(value);
                break;
            case 'equipment':
                exists = dropdownOptions.equipment.includes(value);
                break;
            case 'brand':
                exists = dropdownOptions.brands.includes(value);
                break;
            case 'model':
                exists = formData.Brand ? (dropdownOptions.models[formData.Brand] || []).includes(value) : false;
                break;
            case 'line':
                exists = dropdownOptions.lines.includes(value);
                break;
            case 'responsible':
                exists = dropdownOptions.responsible.includes(value);
                break;
            case 'status':
                exists = dropdownOptions.statuses.includes(value);
                break;
        }
        
        if (exists) return true;
        
        const password = prompt(`เพิ่มค่าใหม่ "${value}" ใน ${kind}\nกรอกรหัสยืนยัน:`);
        if (!password) return false;
        
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${CAL_API}/add_choice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, value, passcode: password })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to add choice');
            }
            
            addToast('success', 'เพิ่มสำเร็จ', `${kind} "${value}" ถูกบันทึกแล้ว`);
            await loadDropdownOptions(); // Reload options
            return true;
        } catch (err: any) {
            addToast('error', 'เพิ่มไม่สำเร็จ', err.message);
            return false;
        }
    }

    async function fetchCalibrations() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${CAL_API}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            
            // First, find latest timestamp for each Serial Number (including Missing/Damage)
            const latestBySerial = data.reduce((acc: {[key: string]: CalibrationRow}, current: CalibrationRow) => {
                if (!current.Seriesnumber) return acc;
                
                const existing = acc[current.Seriesnumber];
                if (!existing) {
                    acc[current.Seriesnumber] = current;
                } else {
                    const currentTimestamp = current.Timestamp ? new Date(current.Timestamp) : new Date(0);
                    const existingTimestamp = existing.Timestamp ? new Date(existing.Timestamp) : new Date(0);
                    
                    if (currentTimestamp > existingTimestamp) {
                        acc[current.Seriesnumber] = current;
                    }
                }
                return acc;
            }, {});
            
            // Filter out Serial Numbers where latest timestamp has Missing or Damage status
            const validSerialNumbers = Object.keys(latestBySerial).filter(sn => {
                const latestRecord = latestBySerial[sn];
                return latestRecord.Status !== "Missing";
            });
            
            // Filter data to only include valid Serial Numbers and exclude Missing/Damage
            const filteredData = data.filter((r: CalibrationRow) => {
                if (r.Status === "Missing") return false;
                if (!r.Seriesnumber) return true; // Keep records without SN
                return validSerialNumbers.includes(r.Seriesnumber);
            });
            
            // Remove duplicates by keeping only latest timestamp per SN
            const uniqueData = filteredData.reduce((acc: CalibrationRow[], current: CalibrationRow) => {
                if (!current.Seriesnumber) {
                    acc.push(current);
                    return acc;
                }
                
                const existingIndex = acc.findIndex(item => item.Seriesnumber === current.Seriesnumber);
                if (existingIndex === -1) {
                    acc.push(current);
                } else {
                    const currentTimestamp = current.Timestamp ? new Date(current.Timestamp) : new Date(0);
                    const existingTimestamp = acc[existingIndex].Timestamp ? new Date(acc[existingIndex].Timestamp) : new Date(0);
                    
                    if (currentTimestamp > existingTimestamp) {
                        acc[existingIndex] = current;
                    }
                }
                return acc;
            }, []);
            
            setRows(uniqueData);
        } catch (err: any) {
            setError(err.message);
            addToast('error', 'Failed to load calibrations', err.message);
        } finally {
            setLoading(false);
        }
    }

    // Toast functions
    const addToast = (type: 'success' | 'error' | 'warning', title: string, message?: string) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, title, message: message || '' }]);
        setTimeout(() => removeToast(id), 5000);
    };
    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Status badge function
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, string> = {
            'Spare': 'bg-gray-100 text-gray-800',
            'Missing': 'bg-gray-100 text-gray-800',
            'Damage': 'bg-gray-100 text-gray-800',
            'On-Station': 'bg-green-100 text-green-800',
            'On-Calibration': 'bg-yellow-100 text-yellow-800'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-800';
    };

    // Countdown bar function
    const getCountdownBar = (startDate: string, endDate: string) => {
        if (!endDate) return null;
        
        const today = new Date();
        const start = startDate ? new Date(startDate) : today;
        const end = new Date(endDate);
        
        const total = end.getTime() - start.getTime();
        const remaining = end.getTime() - today.getTime();
        
        if (total <= 0) return null;
        
        const percent = Math.max(0, Math.min(100, (remaining / total) * 100));
        const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
        
        let color = "bg-green-500";
        if (percent <= 30) color = "bg-red-500";
        else if (percent <= 60) color = "bg-yellow-500";
        
        return (
            <div className="mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full`} style={{width: `${percent}%`}}></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                    {days >= 0 ? `${days} days left` : "Expired"}
                </div>
            </div>
        );
    };

    // Function to get row highlight class based on expiry and status
    const getRowHighlight = (_startDate: string, endDate: string, status: string) => {
        // Gray highlight for damaged equipment
        if (status === 'Damage') {
            return "bg-gray-500/20 border-l-4 border-gray-500 hover:bg-gray-500/30";
        }
        if (status === 'On-Calibration') {
            return "bg-yellow-500/20 border-l-4 border-yellow-500 hover:bg-yellow-500/30";
        }

        if (!endDate) return "hover:bg-slate-800/30";
        
        const today = new Date();
        const end = new Date(endDate);
        const isExpired = end.getTime() < today.getTime();
        
        if (isExpired) {
            if (status === 'On-Calibration') {
                // Yellow highlight for expired items that are On-Calibration
                return "bg-yellow-500/20 border-l-4 border-yellow-500 hover:bg-yellow-500/30";
            } else {
                // Red highlight for expired items
                return "bg-red-500/20 border-l-4 border-red-500 hover:bg-red-500/30";
            }
        }
        
        return "hover:bg-slate-800/30";
    };

    // Modal functions
    const openModal = (id?: number) => {
        setEditingId(id || null);
        if (id) {
            const row = rows.find(r => r.ID === id);
            if (row) setFormData(row);
        } else {
            setFormData({});
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({});
    };

    // CRUD operations with password-protected custom entries
    const handleSave = async () => {
        try {
            // For Add: Check all custom values with password protection
            // For Edit: Only require password confirmation
            if (!editingId) {
                const checks = await Promise.all([
                    ensureChoiceExists("station", formData.Station || ""),
                    ensureChoiceExists("equipment", formData.Equipment || ""),
                    ensureChoiceExists("brand", formData.Brand || ""),
                    ensureChoiceExists("model", formData.Model || ""),
                    ensureChoiceExists("line", formData.LineID || ""),
                    ensureChoiceExists("responsible", formData.Responsible || ""),
                    ensureChoiceExists("status", formData.Status || "")
                ]);
                
                // If any check failed (user cancelled password), stop saving
                if (checks.includes(false)) return;
            } else {
                // For Edit: Require password confirmation
                const password = prompt('กรอกรหัสยืนยันเพื่อแก้ไขข้อมูล:');
                if (!password) return;
                
                // Verify password with backend
                try {
                    const verifyRes = await fetch(`${API_CONFIG.BASE_URL}${CAL_API}/verify_password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ passcode: password })
                    });
                    
                    if (!verifyRes.ok) {
                        addToast('error', 'รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง');
                        return;
                    }
                } catch (err) {
                    addToast('error', 'ไม่สามารถตรวจสอบรหัสผ่านได้', 'กรุณาลองใหม่อีกครั้ง');
                    return;
                }
            }
            
            const url = editingId 
                ? `${API_CONFIG.BASE_URL}${CAL_API}/${editingId}`
                : `${API_CONFIG.BASE_URL}${CAL_API}/`;
            
            const method = editingId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                addToast('success', editingId ? 'Updated' : 'Created', 'Record saved successfully');
                closeModal();
                fetchCalibrations();
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err: any) {
            addToast('error', 'Save failed', err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this record?')) return;
        
        // Require password confirmation for delete
        const password = prompt('กรอกรหัสยืนยันเพื่อลบข้อมูล:');
        if (!password) return;
        
        try {
            // Verify password with backend
            const verifyRes = await fetch(`${API_CONFIG.BASE_URL}${CAL_API}/verify_password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: password })
            });
            
            if (!verifyRes.ok) {
                addToast('error', 'รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง');
                return;
            }
            
            const res = await fetch(`${API_CONFIG.BASE_URL}${CAL_API}/${id}?deleted_by=Web User`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                addToast('success', 'Deleted', 'Record deleted successfully');
                fetchCalibrations();
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err: any) {
            addToast('error', 'Delete failed', err.message);
        }
    };

    const showDueSoonModal = () => {
        const today = new Date();
        
        // Filter for Due Soon from already filtered rows (which already exclude SNs with Missing/Damage latest timestamp)
        const dueSoon = filteredRows.filter(row => {
            if (!row.EndDate) return false;
            
            const endDate = new Date(row.EndDate);
            const diffTime = endDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return daysLeft <= 30; // Show items due within 30 days (including overdue)
        });
        
        setDueSoonItems(dueSoon);
        setIsDueSoonModalOpen(true);
    };

    const viewHistory = async (serialNumber: string, equipmentName: string) => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/calibration/history/${serialNumber}`);
            if (!response.ok) throw new Error('Failed to fetch history');
            const historyData = await response.json();
            
            if (!historyData.length) {
                addToast('warning', 'ไม่พบประวัติย้อนหลัง', '');
                return;
            }
            
            setHistoryData(historyData);
            setHistorySerialNumber(serialNumber);
            setHistoryEquipmentName(equipmentName);
            setIsHistoryModalOpen(true);
        } catch (error) {
            console.error('Error fetching history:', error);
            addToast('error', 'เกิดข้อผิดพลาดในการโหลดประวัติ', '');
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    useEffect(() => {
        loadDropdownOptions();
        // Don't load data automatically on page load
        // User needs to select filters first
    }, []);

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

    // Filter and sort rows based on search, filters, and sort config
    const filteredAndSortedRows = (() => {
        // First filter
        const filtered = rows.filter(row => {

            if (row.Status === 'Missing') {
                return false;
            }
            
            const matchesSearch = !searchQuery || 
                [row.Station, row.Equipment, row.Brand, row.Model, row.Seriesnumber, row.DT, row.LineID, row.Responsible, row.Comment]
                    .some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesStation = !stationFilter || row.Station === stationFilter;
            const matchesStatus = !statusFilter || row.Status === statusFilter;
            const matchesLine = !lineFilter || row.LineID === lineFilter;
            
            return matchesSearch && matchesStation && matchesStatus && matchesLine;
        });

        // Then sort
        if (!sortConfig.key) return filtered;

        return [...filtered].sort((a, b) => {
            const aValue = a[sortConfig.key as keyof CalibrationRow];
            const bValue = b[sortConfig.key as keyof CalibrationRow];

            // Handle date sorting
            if (sortConfig.key === 'StartDate' || sortConfig.key === 'EndDate') {
                const aDate = aValue ? new Date(aValue as string).getTime() : 0;
                const bDate = bValue ? new Date(bValue as string).getTime() : 0;
                return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
            }

            // Handle string sorting
            const aStr = (aValue || '').toString().toLowerCase();
            const bStr = (bValue || '').toString().toLowerCase();
            
            if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    })();

    // Keep filteredRows for backward compatibility
    const filteredRows = filteredAndSortedRows;

    return (
        <>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 tracking-tight">
                            Calibration Management
                        </h1>
                        <p className="text-slate-400 text-lg font-medium">Professional equipment calibration tracking system</p>
                    </div>
                </div>
            </div>

            {/* Equipment Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card variant="glass" className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">On Station</p>
                            <p className="text-2xl font-bold text-green-400 mt-1">
                                {filteredRows.filter(r => r.Status === 'On-Station').length}
                            </p>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-full">
                            <span className="text-2xl">🟢</span>
                        </div>
                    </div>
                </Card>

                <Card variant="glass" className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Spare</p>
                            <p className="text-2xl font-bold text-blue-400 mt-1">
                                {filteredRows.filter(r => r.Status === 'Spare').length}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-full">
                            <span className="text-2xl">🔵</span>
                        </div>
                    </div>
                </Card>

                <Card variant="glass" className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">On Calibration</p>
                            <p className="text-2xl font-bold text-yellow-400 mt-1">
                                {filteredRows.filter(r => r.Status === 'On-Calibration').length}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-500/20 rounded-full">
                            <span className="text-2xl">🟡</span>
                        </div>
                    </div>
                </Card>

                <Card variant="glass" className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Damage</p>
                            <p className="text-2xl font-bold text-gray-400 mt-1">
                                {filteredRows.filter(r => r.Status === 'Damage').length}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-500/20 rounded-full">
                            <span className="text-2xl">⚫</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions - Moved to top */}
            <Card title="Quick Actions" icon="⚡" variant="glass" className="mb-6">
                <div className="flex flex-wrap gap-4">
                    <Button
                        onClick={fetchCalibrations}
                        variant="secondary"
                        size="lg"
                        icon="🔄"
                        className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                    >
                        Refresh Data
                    </Button>
                    <Button
                        onClick={() => openModal()}
                        variant="primary"
                        size="lg"
                        icon="➕"
                        className="flex-1 min-w-[180px] hover:scale-105 transition-transform shadow-lg cursor-pointer"
                    >
                        Add New Equipment
                    </Button>
                    <Button
                        onClick={showDueSoonModal}
                        variant="danger"
                        size="lg"
                        icon="⚠️"
                        className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                    >
                        Due Soon ({filteredRows.filter(r => {
                            if (!r.EndDate) return false;
                            const endDate = new Date(r.EndDate);
                            const today = new Date();
                            const diffTime = endDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays <= 30;
                        }).length})
                    </Button>
                </div>
            </Card>

            {/* Filter Controls - Moved below actions */}
            <Card title="Advanced Filters" icon="🎛️" variant="glass" className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Input
                        label="Global Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search equipment, brand, model, serial..."
                        icon="🔍"
                        className="col-span-1 md:col-span-2 lg:col-span-1"
                    />
                    <Select
                        label="Production Line"
                        value={lineFilter}
                        onChange={(e) => setLineFilter(e.target.value)}
                        icon="🏭"
                        className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                    >
                        <option value="">All Lines</option>
                        {[...new Set(rows.map(r => r.LineID))].filter(Boolean).sort().map(line => (
                            <option key={line} value={line}>{line}</option>
                        ))}
                    </Select>
                    <Select
                        label="Work Station"
                        value={stationFilter}
                        onChange={(e) => setStationFilter(e.target.value)}
                        icon="⚙️"
                        className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                    >
                        <option value="">All Stations</option>
                        {[...new Set(rows.map(r => r.Station))].filter(Boolean).sort().map(station => (
                            <option key={station} value={station}>{station}</option>
                        ))}
                    </Select>
                    <Select
                        label="Equipment Status"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            if (e.target.value && rows.length === 0) {
                                fetchCalibrations();
                            }
                        }}
                        icon="📊"
                        className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="Spare">🔵 Spare</option>
                        <option value="On-Station">🟢 On-Station</option>
                        <option value="On-Calibration">🟡 On-Calibration</option>
                        <option value="Damage">⚫ Damage</option>
                    </Select>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-600/30">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">
                            {rows.length > 0 ? `Showing ${filteredRows.length} of ${rows.length} records` : 'No data loaded'}
                        </div>
                        <div className="flex gap-2" >
                            {rows.length === 0 && (
                                <Button
                                    onClick={() => fetchCalibrations()}
                                    variant="primary"
                                    size="sm"
                                    icon="📊"
                                    className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                                >
                                    Load Data
                                </Button>
                            )}
                            {(searchQuery || lineFilter || stationFilter || statusFilter) && (
                                <Button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setLineFilter('');
                                        setStationFilter('');
                                        setStatusFilter('');
                                    }}
                                    variant="secondary"
                                    size="sm"
                                    icon="🗑️"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Data Table */}
            <Card 
                title="Equipment Records" 
                subtitle={`${filteredRows.length} active records • Last updated: ${new Date().toLocaleTimeString('th-TH')}`}
                icon="📋" 
                variant="glass" 
                className="mb-6"
            >
                {error && (
                    <div className="text-red-600 bg-red-100 px-3 py-2 rounded-lg mb-3">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading…</div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔍</div>
                        <div className="text-xl text-slate-300 mb-2">Select Filters to Load Data</div>
                        <div className="text-slate-400 mb-6">Choose equipment status, station, or line to view calibration records</div>
                        <Button 
                            onClick={() => fetchCalibrations()}
                            variant="primary"
                            icon="📊"
                            className="flex-1 min-w-[180px] hover:scale-105 transition-transform cursor-pointer"
                        >
                            Load All Records
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-slate-600/30">
                            <tr>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('LineID')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Line
                                        {sortConfig.key === 'LineID' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('Station')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Station
                                        {sortConfig.key === 'Station' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('Equipment')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Equipment
                                        {sortConfig.key === 'Equipment' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('Brand')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Brand / Model
                                        {sortConfig.key === 'Brand' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('AssetNumber')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Asset / SN
                                        {sortConfig.key === 'AssetNumber' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('DT')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        DT
                                        {sortConfig.key === 'DT' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('StartDate')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Start
                                        {sortConfig.key === 'StartDate' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('EndDate')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Due Date
                                        {sortConfig.key === 'EndDate' && (
                                            <span className="text-blue-400 font-bold">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase cursor-pointer hover:bg-slate-700/50 transition-colors select-none"
                                    onClick={() => handleSort('Status')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Status
                                        {sortConfig.key === 'Status' && (
                                            <span className="text-blue-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-200 tracking-wide uppercase">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-600/20">
                            {filteredRows.map((row) => (
                                <tr key={row.ID} className={`${getRowHighlight(row.StartDate || '', row.EndDate || '', row.Status || '')} transition-colors duration-200 group`}>
                                    <td className="px-3 py-2 text-slate-200 text-sm text-center">{row.LineID}</td>
                                    <td className="px-3 py-2 text-slate-200 text-sm text-center">{row.Station}</td>
                                    <td className="px-3 py-2 text-slate-200 text-sm text-center">{row.Equipment}</td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-slate-200 text-sm">{row.Brand}</div>
                                        <div className="text-slate-400 text-xs">{row.Model}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-slate-200 text-sm">{row.AssetNumber}</div>
                                        <div className="text-slate-400 text-xs font-mono">{row.Seriesnumber}</div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-200 font-mono text-xs text-center">{row.DT}</td>
                                    <td className="px-3 py-2 text-slate-200 text-sm text-center">
                                        {row.StartDate
                                            ? new Date(row.StartDate).toLocaleDateString('th-TH', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: '2-digit'
                                            })
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-slate-200 text-sm">
                                            {row.EndDate
                                                ? new Date(row.EndDate).toLocaleDateString('th-TH', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: '2-digit'
                                                })
                                                : "-"}
                                        </div>
                                        {getCountdownBar(row.StartDate || '', row.EndDate || '')}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusBadge(row.Status || '')}`}>
                                            {row.Status === 'Spare' && '🔵'}
                                            {row.Status === 'On-Station' && '🟢'}
                                            {row.Status === 'On-Calibration' && '🟡'}
                                            {row.Status === 'Damage' && '⚫'}
                                            {row.Status === 'Missing' && '⚪'}
                                            <span className="ml-1 text-xs">{row.Status}</span>
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button 
                                                onClick={() => openModal(row.ID)}
                                                className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-all duration-200 cursor-pointer" 
                                                title="Edit Equipment"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(row.ID)}
                                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all duration-200 cursor-pointer" 
                                                title="Delete Equipment"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => viewHistory(row.Seriesnumber || '', row.Equipment || '')}
                                                className="p-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-all duration-200 cursor-pointer" 
                                                title="View History"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {!filteredRows.length && !loading && (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">📋</div>
                                <div className="text-xl text-slate-300 mb-2">No Equipment Records Found</div>
                                <div className="text-slate-400">Try adjusting your filters or add new equipment</div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Modal for Add/Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingId ? 'Edit Calibration' : 'Add Calibration'}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Line ID *</label>
                            {editingId ? (
                                <Select
                                    value={formData.LineID || ''}
                                    onChange={(e) => setFormData({...formData, LineID: e.target.value})}
                                >
                                    <option value="">Select Line</option>
                                    {dropdownOptions.lines.map(line => (
                                        <option key={line} value={line}>{line}</option>
                                    ))}
                                </Select>
                            ) : (
                                <>
                                    <input
                                        list="lineList"
                                        value={formData.LineID || ''}
                                        onChange={(e) => setFormData({...formData, LineID: e.target.value})}
                                        className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                        placeholder="Type or choose line"
                                        required
                                    />
                                    <datalist id="lineList">
                                        {dropdownOptions.lines.map(line => (
                                            <option key={line} value={line} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Station *</label>
                            {editingId ? (
                                <Select
                                    value={formData.Station || ''}
                                    onChange={(e) => setFormData({...formData, Station: e.target.value})}
                                >
                                    <option value="">Select Station</option>
                                    {dropdownOptions.stations.map(station => (
                                        <option key={station} value={station}>{station}</option>
                                    ))}
                                </Select>
                            ) : (
                                <>
                                    <input
                                        list="stationList"
                                        value={formData.Station || ''}
                                        onChange={(e) => setFormData({...formData, Station: e.target.value})}
                                        className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                        placeholder="Type or choose station"
                                        required
                                    />
                                    <datalist id="stationList">
                                        {dropdownOptions.stations.map(station => (
                                            <option key={station} value={station} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Equipment *</label>
                            {editingId ? (
                                <input
                                    value={formData.Equipment || ''}
                                    className="w-full px-4 py-3.5 bg-slate-700/40 border border-slate-500/30 rounded-xl text-slate-300 cursor-not-allowed transition-all duration-300"
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <>
                                    <input
                                        list="equipmentList"
                                        value={formData.Equipment || ''}
                                        onChange={(e) => setFormData({...formData, Equipment: e.target.value})}
                                        className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                        placeholder="Type or choose equipment"
                                        required
                                    />
                                    <datalist id="equipmentList">
                                        {dropdownOptions.equipment.map(equipment => (
                                            <option key={equipment} value={equipment} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Brand *</label>
                            {editingId ? (
                                <input
                                    value={formData.Brand || ''}
                                    className="w-full px-4 py-3.5 bg-slate-700/40 border border-slate-500/30 rounded-xl text-slate-300 cursor-not-allowed transition-all duration-300"
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <>
                                    <input
                                        list="brandList"
                                        value={formData.Brand || ''}
                                        onChange={(e) => {
                                            setFormData({...formData, Brand: e.target.value, Model: ''}); // Reset model when brand changes
                                        }}
                                        className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                        placeholder="Type or choose brand"
                                        required
                                    />
                                    <datalist id="brandList">
                                        {dropdownOptions.brands.map(brand => (
                                            <option key={brand} value={brand} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Model *</label>
                            {editingId ? (
                                <input
                                    value={formData.Model || ''}
                                    className="w-full px-4 py-3.5 bg-slate-700/40 border border-slate-500/30 rounded-xl text-slate-300 cursor-not-allowed transition-all duration-300"
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <>
                                    <input
                                        list="modelList"
                                        value={formData.Model || ''}
                                        onChange={(e) => setFormData({...formData, Model: e.target.value})}
                                        className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                        placeholder="Type or choose model"
                                        required
                                    />
                                    <datalist id="modelList">
                                        {formData.Brand && dropdownOptions.models[formData.Brand] ? 
                                            dropdownOptions.models[formData.Brand].map(model => (
                                                <option key={model} value={model} />
                                            )) : null
                                        }
                                    </datalist>
                                </>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Serial Number *</label>
                            {editingId ? (
                                <input
                                    value={formData.Seriesnumber || ''}
                                    className="w-full px-4 py-3.5 bg-slate-700/40 border border-slate-500/30 rounded-xl text-slate-300 cursor-not-allowed transition-all duration-300"
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <input
                                    value={formData.Seriesnumber || ''}
                                    onChange={(e) => setFormData({...formData, Seriesnumber: e.target.value})}
                                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                    placeholder="Type serial number"
                                    required
                                />
                            )}
                        </div>
                        <Input
                            label="DT *"
                            value={formData.DT || ''}
                            onChange={(e) => setFormData({...formData, DT: e.target.value})}
                            placeholder="Type dt"
                        />
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Asset Number *</label>
                            {editingId ? (
                                <input
                                    value={formData.AssetNumber || ''}
                                    className="w-full px-4 py-3.5 bg-slate-700/40 border border-slate-500/30 rounded-xl text-slate-300 cursor-not-allowed transition-all duration-300"
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <input
                                    value={formData.AssetNumber || ''}
                                    onChange={(e) => setFormData({...formData, AssetNumber: e.target.value})}
                                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                    placeholder="Type asset number"
                                    required
                                />
                            )}
                        </div>

                        <Input
                            label="Start Date *"
                            type="datetime-local"
                            value={formData.StartDate ? new Date(formData.StartDate).toISOString().slice(0,16) : ''}
                            onChange={(e) => setFormData({...formData, StartDate: e.target.value})}
                        />
                        <Input
                            label="End Date *"
                            type="datetime-local"
                            value={formData.EndDate ? new Date(formData.EndDate).toISOString().slice(0,16) : ''}
                            onChange={(e) => setFormData({...formData, EndDate: e.target.value})}
                        />

                        <Select
                            label="Status *"
                            value={formData.Status || ''}
                            onChange={(e) => setFormData({...formData, Status: e.target.value})}
                        >
                            <option value="">Select Status</option>
                            {dropdownOptions.statuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </Select>
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Responsible *</label>
                            {editingId ? (
                                <Select
                                    value={formData.Responsible || ''}
                                    onChange={(e) => setFormData({...formData, Responsible: e.target.value})}
                                >
                                    <option value="">Select Responsible</option>
                                    {dropdownOptions.responsible.map(person => (
                                        <option key={person} value={person}>{person}</option>
                                    ))}
                                </Select>
                            ) : (
                                <>
                                    <input
                                        list="responsibleList"
                                        value={formData.Responsible || ''}
                                        onChange={(e) => setFormData({...formData, Responsible: e.target.value})}
                                        className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                                        placeholder="Type or choose responsible person"
                                        required
                                    />
                                    <datalist id="responsibleList">
                                        {dropdownOptions.responsible.map(person => (
                                            <option key={person} value={person} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </div>

                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-200 tracking-tight mb-2">Comment</label>
                        <textarea
                            value={formData.Comment || ''}
                            onChange={(e) => setFormData({...formData, Comment: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70 resize-none"
                            placeholder="Optional note..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <button 
                            type="submit" 
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
                        >
                            {editingId ? 'Update Equipment' : 'Add Equipment'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Due Soon Modal */}
            <Modal
                isOpen={isDueSoonModalOpen}
                onClose={() => setIsDueSoonModalOpen(false)}
                title="Equipment Due Soon (Within 30 Days)"
                size="xl"
            >
                <div className="space-y-4 " >
                    {dueSoonItems.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">✅</div>
                            <div className="text-xl text-slate-300 mb-2">All Equipment Up to Date</div>
                            <div className="text-slate-400">No equipment requires calibration within 30 days</div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-300 text-lg">⚠️</span>
                                    <span className="text-yellow-200 font-medium">
                                        {dueSoonItems.length} equipment items require attention within 30 days
                                    </span>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-700/60 border-b border-slate-500/40">
                                        <tr>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Station</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Equipment</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Brand / Model</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">DT</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Due Date</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Days Left</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Status</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-600/20">
                                        {dueSoonItems
                                            .sort((a, b) => {
                                                const aDate = new Date(a.EndDate || '');
                                                const bDate = new Date(b.EndDate || '');
                                                return aDate.getTime() - bDate.getTime();
                                            })
                                            .map((item) => {
                                                const endDate = new Date(item.EndDate || '');
                                                const today = new Date();
                                                const diffTime = endDate.getTime() - today.getTime();
                                                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                const isOverdue = daysLeft < 0;
                                                
                                                return (
                                                    <tr key={item.ID} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                                    <td className="p-3 text-slate-200 text-center">{item.Station}</td>
                                                    <td className="p-3 text-slate-200 text-center">{item.Equipment}</td>
                                                    <td className="p-3 text-center">
                                                        <div className="text-slate-200 text-sm">{item.Brand}</div>
                                                        <div className="text-slate-400 text-xs">{item.Model}</div>
                                                    </td>
                                                    <td className="p-3 text-slate-200 font-mono text-xs text-center">{item.DT}</td>
                                                    <td className="p-3 text-slate-200 font-medium text-center">
                                                        {endDate.toLocaleDateString('th-TH', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="p-3 text-slate-200 text-center">
                                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${
                                                            isOverdue 
                                                                ? 'bg-red-500/30 text-red-200 border border-red-500/50' 
                                                                : daysLeft <= 7 
                                                                    ? 'bg-orange-500/30 text-orange-200 border border-orange-500/50'
                                                                    : 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50'
                                                        }`}>
                                                            {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-slate-200 text-center">
                                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${
                                                            item.Status === 'Spare' ? 'bg-gray-500/30 text-gray-200 border-gray-500/50' :
                                                            item.Status === 'On-Station' ? 'bg-green-500/30 text-green-200 border-green-500/50' :
                                                            item.Status === 'On-Calibration' ? 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50' :
                                                            'bg-slate-500/30 text-slate-200 border-slate-500/50'
                                                        }`}>
                                                            {item.Status === 'Damage' && '⚫'}
                                                            {item.Status === 'Spare' && '🔵'}
                                                            {item.Status === 'On-Station' && '🟢'}
                                                            {item.Status === 'On-Calibration' && '🟡'}
                                                            <span className="ml-1">{item.Status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-slate-200 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(item.ID);
                                                                    setFormData(item);
                                                                    setIsModalOpen(true);
                                                                    setIsDueSoonModalOpen(false);
                                                                }}
                                                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all duration-200 group cursor-pointer"
                                                                title="Edit Calibration"
                                                            >
                                                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    
                    <div className="flex justify-end pt-4 border-t border-slate-600/30">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsDueSoonModalOpen(false)}
                            className="cursor-pointer"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                title={`History for ${historyEquipmentName}`}
                size="xl"
            >
                <div className="space-y-4">
                    {historyData.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">📋</div>
                            <div className="text-xl text-slate-300 mb-2">No History Found</div>
                            <div className="text-slate-400">No calibration history available for this equipment</div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-700/60 border-b border-slate-500/40">
                                    <tr>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Action</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Line ID</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Station</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">DT</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Date</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Comment</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Responsible</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-100">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-600/20">
                                    {historyData.map((record, index) => (
                                        <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-3 py-2 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                                    record.ActionType === 'INSERT' ? 'bg-green-500/20 text-green-300' :
                                                    record.ActionType === 'UPDATE' ? 'bg-blue-500/20 text-blue-300' :
                                                    record.ActionType === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                                                    'bg-slate-500/20 text-slate-300'
                                                }`}>
                                                    {record.ActionType === 'INSERT' && '➕'}
                                                    {record.ActionType === 'UPDATE' && '✏️'}
                                                    {record.ActionType === 'DELETE' && '🗑️'}
                                                    <span className="ml-1">{record.ActionType || ''}</span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-300 text-center">{record.LineID || ''}</td>
                                            <td className="px-3 py-2 text-slate-300 text-center">{record.Station || ''}</td>
                                            <td className="px-3 py-2 text-slate-300 text-center">{record.DT || ''}</td>
                                            <td className="px-3 py-2 text-slate-300 text-center">
                                                {record.ActionDate ? new Date(record.ActionDate).toLocaleDateString('th-TH', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : ''}
                                            </td>
                                            <td className="px-3 py-2 text-slate-300 text-center">{record.Comment || ''}</td>
                                            <td className="px-3 py-2 text-slate-300 text-center">{record.Responsible || ''}</td>
                                            <td className="px-3 py-2 text-slate-300 text-center">{record.Status || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    <div className="flex justify-end pt-4 border-t border-slate-600/30">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsHistoryModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

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
        </>
    );
}
