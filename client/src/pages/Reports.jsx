import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Calendar, CalendarIcon, Search, Download, Eye, ArrowUpRight, ArrowDownLeft,
    User as UserIcon, Users, Car, FileText, ChevronLeft, ChevronRight, X,
    Edit2, Trash2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import AttendanceModal from '../components/reports/AttendanceModal';
import EditAttendanceModal from '../components/reports/EditAttendanceModal';
import { todayIST, toISTDateString, firstDayOfMonthIST, formatTimeIST, nowIST } from '../utils/istUtils';
import PremiumDateInput from '../components/common/PremiumDateInput';

/* ─── tiny helpers ─── */
const fmt = (d) => { if (!d) return '--'; const [y, m, dd] = (typeof d === 'string' ? d.split('T')[0] : toISTDateString(new Date(d))).split('-'); return `${dd}/${m}/${y}`; };
const fmtTime = (t) => t ? formatTimeIST(t) : '--';

const styles = `
  .flex-resp { display: flex; flex-wrap: wrap; gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .hide-mobile { display: block; }
  .show-mobile { display: none; }
  
  .table-responsive-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
    padding-bottom: 10px;
  }
  .table-responsive-wrapper::-webkit-scrollbar { height: 4px; }
  .table-responsive-wrapper::-webkit-scrollbar-track { background: transparent; }
  .table-responsive-wrapper::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }

  .premium-compact-input:focus {
    background: rgba(255,255,255,0.08) !important;
    border-color: rgba(251, 191, 36, 0.4) !important;
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.05);
  }

  @media (max-width: 1200px) {
    .header-actions-group { flex: 1; width: 100%; }
  }

  @media (max-width: 768px) {
    .flex-resp { flex-direction: column; align-items: stretch !important; }
    .grid-2 { grid-template-columns: 1fr; }
    .hide-mobile { display: none !important; }
    .show-mobile { display: block !important; }
    
    .reports-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 25px !important;
    }
    
    .header-actions-group {
        width: 100% !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 15px !important;
    }

    .premium-tab-container {
        width: 100% !important;
        overflow-x: auto !important;
        padding-bottom: 5px !important;
        display: flex !important;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }
    .premium-tab-container::-webkit-scrollbar { display: none; }
  }
`;

/* ─── shared table theme tokens ─── */
const TAB_CONFIG = {
    drivers: { label: 'Staff Duties', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: UserIcon },
    freelancers: { label: 'Freelancer Duties', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Users },
    parking: { label: 'Parking & Toll', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: ArrowUpRight },
    fastag: { label: 'Fastag Recharges', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: FileText },
    logbook: { label: 'Overall Log Book', color: 'var(--primary)', bg: 'rgba(251,191,36,0.12)', icon: FileText },
};

/* ─── Chip (summary stat) ─── */
const Chip = ({ label, value, color }) => (
    <div style={{ padding: '8px 14px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}30`, flexShrink: 0 }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ color, fontWeight: '900', fontSize: '14px', marginTop: '2px', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
);

/* ─── Section Banner ─── */
const SectionBanner = ({ tabId, count, chips, fromDate, toDate }) => {
    const cfg = TAB_CONFIG[tabId] || { label: tabId, color: '#fff', bg: 'rgba(255,255,255,0.05)', icon: FileText };
    const Icon = cfg.icon;
    return (
        <div style={{ padding: '18px 24px', background: `linear-gradient(135deg, ${cfg.bg}, transparent)`, borderBottom: `1px solid ${cfg.color}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 'max-content' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: cfg.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${cfg.color}30` }}>
                    <Icon size={18} color={cfg.color} />
                </div>
                <div>
                    <div style={{ color: 'white', fontWeight: '900', fontSize: '15px' }}>{cfg.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700' }}>{count} records · {fromDate === toDate ? fmt(fromDate) : `${fmt(fromDate)} – ${fmt(toDate)}`}</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: 'auto' }} className="flex-resp">
                {chips}
            </div>
        </div>
    );
};

/* ─── Shared TH ─── */
const Th = ({ color, children, align, width, style }) => (
    <th style={{ padding: '12px 16px', color: color || 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.02)', textAlign: align || 'left', width, ...style }}>
        {children}
    </th>
);

/* ─── Status badge ─── */
const StatusBadge = ({ ok, okLabel = '✓ Done', badLabel = '⏳ Active' }) => (
    <span style={{ fontSize: '10px', fontWeight: '900', padding: '5px 12px', borderRadius: '10px', whiteSpace: 'nowrap', background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: ok ? '#10b981' : 'var(--primary)', border: `1px solid ${ok ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {ok ? okLabel : badLabel}
    </span>
);

/* ─── Action Buttons ─── */
const ActionBtns = ({ onView, onEdit, onDelete }) => (
    <div style={{ display: 'flex', gap: '8px' }}>
        {onView && <button onClick={onView} title="View Details" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#38bdf8', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} className="btn-hover-scale"><Eye size={16} /></button>}
        {onEdit && <button onClick={onEdit} title="Edit" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: 'var(--primary)', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} className="btn-hover-scale"><Edit2 size={16} /></button>}
        {onDelete && <button onClick={onDelete} title="Delete" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} className="btn-hover-scale"><Trash2 size={16} /></button>}
    </div>
);

/* ─── TableSection ─── */
const TableSection = ({ tabId, rows, headers, chips, fromDate, toDate, colSummaries, empty }) => {
    const cfg = TAB_CONFIG[tabId] || { label: tabId, color: '#fff', bg: 'rgba(255,255,255,0.05)', icon: FileText };
    return (
        <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${cfg.color || '#fff'}20`, borderRadius: '20px', overflow: 'hidden', marginBottom: '28px' }}>
            <SectionBanner tabId={tabId} count={rows?.length || 0} chips={chips} fromDate={fromDate} toDate={toDate} />
            <div className="table-responsive-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', minWidth: '1000px' }}>
                    <thead>
                        {colSummaries && (
                            <tr>
                                {headers.map((h, i) => (
                                    <th key={'sum-' + i} style={{ padding: '12px 16px 4px', background: 'rgba(255,255,255,0.02)' }}>
                                        {colSummaries[h] && (
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: colSummaries[h].color || 'white',
                                                fontSize: '11px',
                                                fontWeight: '950'
                                            }}>
                                                {colSummaries[h].value}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        )}
                        <tr>
                            {headers.map((h, i) => {
                                const isCenter = ['Type', 'Open KM', 'Close KM', 'Total KM', 'KM Run', 'Model'].includes(h);
                                return <Th key={i} color={cfg.color} align={isCenter ? 'center' : 'left'}>{h}</Th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows?.length === 0
                            ? <tr><td colSpan={headers.length} style={{ padding: '50px', textAlign: 'center', color: 'rgba(231, 25, 25, 0.2)', fontSize: '13px' }}>{empty || 'No records found.'}</td></tr>
                            : rows
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* ─── TR wrapper ─── */
const TR = ({ children, idx }) => (
    <motion.tr
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(idx * 0.02, 0.5) }}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'all 0.3s' }}
        className="hover-row-premium"
    >
        {children}
    </motion.tr>
);
const TD = ({ children, noWrap, align, style }) => <td style={{ padding: '20px 16px', whiteSpace: noWrap ? 'nowrap' : undefined, verticalAlign: 'top', textAlign: align || 'left', ...style }}>{children}</td>;

/* ─── Loading skeleton ─── */
const LoadingRow = ({ cols }) => (
    <tr>
        <td colSpan={cols} style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.3)' }}>
                <div className="spinner" /><span>Loading data…</span>
            </div>
        </td>
    </tr>
);

/* ═══════════════════════════════════════════════════════ MAIN COMPONENT */
const Reports = ({ isSubComponent = false }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { selectedCompany } = useCompany();
    const location = useLocation();

    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = userRole === 'admin' || userRole === 'superadmin' || (userRole.includes('admin') && userRole !== 'executive');
    // If they don't have logBook or driversService explicit permission, they can only view (e.g. from Vehicles Life)
    const canEditRecords = isAdmin || user?.permissions?.logBook || user?.permissions?.driversService;

    const [selectedMonth, setSelectedMonth] = useState(new Date(todayIST()).getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date(todayIST()).getFullYear());
    const [selectedDay, setSelectedDay] = useState(new Date(todayIST()).getDate().toString());
    const [fromDate, setFromDate] = useState(todayIST());
    const [toDate, setToDate] = useState(todayIST());

    const [reportsData, setReportsData] = useState({
        attendance: [],
        parking: [],
        fuel: [],
        maintenance: [],
        advances: [],
        borderTax: [],
        accidentLogs: [],
        partsWarranty: []
    });
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [remarkPopup, setRemarkPopup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('driver');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');
        const fromParam = params.get('from');
        const toParam = params.get('to');

        if (searchParam) setSearchTerm(searchParam);
        if (monthParam) {
            setSelectedMonth(Number(monthParam) - 1);
            setSelectedDay('All');
        }
        if (yearParam) setSelectedYear(Number(yearParam));
        if (dayParam) setSelectedDay(dayParam);

        if (fromParam) setFromDate(fromParam);
        if (toParam) setToDate(toParam);
    }, [location.search]);

    // ── AUTO-RESET ON NAVIGATION ──
    // Every time the user clicks a menu item, we reset the search and date to 'Today'
    useEffect(() => {
        setSearchTerm('');
        setSelectedItem(null);
        setEditingItem(null);

        // Reset to current date as default on every fresh entry
        const istDate = new Date(todayIST());
        setSelectedMonth(istDate.getMonth());
        setSelectedYear(istDate.getFullYear());
        setSelectedDay(istDate.getDate().toString());
    }, [location.pathname, location.key]);

    const tabList = useMemo(() => {
        return Object.entries(TAB_CONFIG)
            .filter(([id]) => {
                // Filter by URL path first
                if (location.pathname.includes('driver-duty')) return id === 'drivers';
                if (location.pathname.includes('freelancer-duty')) return id === 'freelancers';
                if (location.pathname.includes('outside-cars')) return id === 'outsideCars';
                if (location.pathname.includes('log-book')) {
                    const p = user?.permissions || {};
                    if (user?.role === 'Admin' || p.logBook || p.vehiclesManagement || p.driversService) {
                        return id === 'drivers' || id === 'freelancers' || id === 'outsideCars';
                    }
                    return false;
                }

                // Administrative overrides/permissions for standard /admin/reports
                if (user?.role === 'Admin') return true;
                const p = user?.permissions || {};
                const driversTabs = ['drivers', 'freelancers'];
                if (driversTabs.includes(id)) return p.driversService;

                return true;
            })
            .map(([id, v]) => ({ id, ...v }));
    }, [user?.role, user?.permissions, location.pathname]);

    const [activeTabs, setActiveTabs] = useState([]);

    // Initialize based on URL path or first available tab
    useEffect(() => {
        if (tabList.length > 0) {
            if (location.pathname.includes('driver-duty')) {
                setActiveTabs(['drivers']);
            } else if (location.pathname.includes('freelancer-duty')) {
                setActiveTabs(['freelancers']);
            } else if (location.pathname.includes('log-book')) {
                setActiveTabs(['drivers', 'freelancers', 'outsideCars']); // All active by default in Log Book
            } else if (activeTabs.length === 0) {
                setActiveTabs([tabList[0].id]);
            }
        }
    }, [tabList, location.pathname]);

    useEffect(() => {
        if (selectedDay === 'All') {
            const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const end = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            setFromDate(start);
            setToDate(end);
        } else {
            const d = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
            setFromDate(d);
            setToDate(d);
        }
    }, [selectedMonth, selectedYear, selectedDay]);

    const toggleTab = (id) => {
        if (location.pathname.includes('log-book')) {
            setActiveTabs(prev => {
                const bothActive = prev.length > 1;
                const onlyThisActive = prev.length === 1 && prev[0] === id;

                if (bothActive) {
                    // Both active → click one = show ONLY that one
                    return [id];
                } else if (onlyThisActive) {
                    // Same tab clicked again when solo → restore both
                    return ['drivers', 'freelancers'];
                } else {
                    // Other tab clicked → switch to only that one
                    return [id];
                }
            });
        } else {
            // Standard toggle for other views
            setActiveTabs(prev => {
                if (prev.includes(id)) {
                    if (prev.length === 1) return prev; // Don't clear last one
                    return prev.filter(t => t !== id);
                }
                return [...prev, id];
            });
        }
    };

    const handleSelectAll = () => {
        const allIds = tabList.map(t => t.id);
        const isAllActive = activeTabs.length === allIds.length;
        if (isAllActive) {
            setActiveTabs([allIds[0]]); // Keep just one active instead of none for better UX
        } else {
            setActiveTabs(allIds);
        }
    };
    // const selectAllTabs = () => setActiveTabs(prev => prev.length === tabList.length ? (tabList.length > 0 ? [tabList[0].id] : []) : tabList.map(t => t.id));

    // Auto-toggle range based on tab selection (REMOVED as per user request to keep calendar single)
    /*
    useEffect(() => {
        const rangeNeeded = ['fuel', 'parking', 'freelancers', 'outsideCars', 'events', 'maintenance', 'advances', 'fastag'];
        const hasRangeTab = activeTabs.some(t => rangeNeeded.includes(t));

        if (hasRangeTab && !isRange) {
            setIsRange(true);
            setFromDate(firstDayOfMonthIST());
            setToDate(todayIST());
        } else if (!hasRangeTab && isRange) {
            setIsRange(false);
            setFromDate(todayIST());
            setToDate(todayIST());
        }
    }, [activeTabs]);
    */

    useEffect(() => { if (selectedCompany) fetchReports(); }, [selectedCompany, fromDate, toDate, activeTabs]);

    const fetchReports = async () => {
        if (!selectedCompany) return;
        if (reportsData.attendance.length === 0) setLoading(true); // Flicker-free background updates
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/reports/${selectedCompany._id}?from=${fromDate}&to=${toDate}&_t=${Date.now()}`, { headers: { Authorization: `Bearer ${userInfo.token}` } });

            setReportsData(data);
        } catch (err) { console.error('fetchReports error:', err?.response?.status, err?.response?.config?.url || err.message); }
        finally { setLoading(false); }
    };

    // ── AI AGENT: Summary Stats Helper ──
    const getColSummaries = (data) => {
        if (!searchTerm || data.length === 0) return null;

        const term = searchTerm.toLowerCase();
        // Check if the search term matches any car number
        const hasCarMatch = data.some(r => (r.vehicle?.carNumber || r.carNumber || '').toLowerCase().includes(term));
        // Check if it matches any driver name
        const hasDriverMatch = data.some(r => (r.driver?.name || r.driverName || '').toLowerCase().includes(term));

        // Logic: Only show summaries if it's a vehicle search. 
        // We assume it's a vehicle search if it matches a car number AND (either doesn't match a driver or has digits like a car plate)
        if (!hasCarMatch || (hasDriverMatch && !/\d/.test(term) && term.length < 4)) return null;

        const tKM = data.reduce((s, r) => {
            const open = Number(r.punchIn?.km);
            const close = Number(r.punchOut?.km);
            const km = Number(r.totalKM) || ((open && close) ? (close - open) : 0);
            return s + km;
        }, 0);
        
        const tFuel = data.reduce((s, r) => s + (Number(r.fuel?.amount) || 0), 0);
        const tPark = data.reduce((s, r) => {
            const entryType = r.entryType || 'attendance';
            return s + ((entryType === 'parking' ? Number(r.amount) : Number(r.punchOut?.tollParkingAmount)) || 0);
        }, 0);
        const tSal = data.reduce((s, r) => {
            const isOutside = r.entryType === 'outsideCar';
            const wage = Number(r.dailyWage) || 0;
            const bonus = Math.max((Number(r.punchOut?.allowanceTA) || 0) + (Number(r.punchOut?.nightStayAmount) || 0), Number(r.outsideTrip?.bonusAmount) || 0);
            return s + (isOutside ? (Number(r.dutyAmount) || 0) : (wage + bonus));
        }, 0);

        return {
            'Total KM': { value: tKM.toLocaleString() + ' KM', color: 'var(--primary)' },
            'Fuel (₹)': { value: '₹' + tFuel.toLocaleString(), color: '#fbbf24' },
            'Parking': { value: '₹' + tPark.toLocaleString(), color: '#818cf8' },
            'Salary': { value: '₹' + tSal.toLocaleString(), color: '#10b981' }
        };
    };

    const handleUpdateAttendance = async (id, updateData) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.put(`/api/admin/attendance/${id}`, updateData, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            setEditingItem(null);
            fetchReports();
            alert('Updated successfully');
        } catch (error) { alert('Failed: ' + (error.response?.data?.message || error.message)); }
    };

    const handleDelete = async (item) => {
        if (!window.confirm('Delete this record? This cannot be undone.')) return;
        const endpoints = {
            attendance: `/api/admin/attendance/${item._id}`,
            fuel: `/api/admin/fuel/${item._id}`,
            parking: `/api/admin/parking/${item._id}`,
            advance: `/api/admin/advances/${item._id}`,
            maintenance: `/api/admin/maintenance/${item._id}`,
            borderTax: `/api/admin/border-tax/${item._id}`,
            accidentLog: `/api/admin/accident-logs/${item._id}`,
            partsWarranty: `/api/admin/parts-warranty/${item._id}`,
            voucher: `/api/admin/vehicles/${item._id}`,
            fastag: `/api/admin/vehicles/${item.vehicleId}/fastag-recharge/${item._id}`
        };
        const endpoint = endpoints[item.entryType];
        if (!endpoint) return alert('Delete not supported for this type.');
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(endpoint, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            fetchReports();
        } catch (error) { alert('Failed: ' + (error.response?.data?.message || error.message)); }
    };

    const handleDeleteBonus = async (item) => {
        if (!window.confirm('Clear all bonus amounts for this duty? (TA/DA/Trip Bonus will be set to zero)')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const updateData = {
                "punchOut.allowanceTA": 0,
                "punchOut.nightStayAmount": 0,
                "outsideTrip.occurred": false,
                "outsideTrip.bonusAmount": 0
            };
            await axios.put(`/api/admin/attendance/${item._id}`, updateData, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            fetchReports();
            alert('Bonus cleared successfully');
        } catch (error) { alert('Failed: ' + (error.response?.data?.message || error.message)); }
    };

    /* ── Smart Excel Export ── */
    const handleDownloadExcel = () => {
        const isLogbookPage = location.pathname.includes('log-book');
        const tabsToExport = isLogbookPage ? ['logbook', ...activeTabs] : activeTabs;
        if (tabsToExport.length === 0) return alert('No report categories selected.');

        const wb = XLSX.utils.book_new();
        let sheetsAdded = 0;

        const getSheetData = (tabId) => {
            const cfg = TAB_CONFIG[tabId] || {};
            let data = [];
            switch (tabId) {
                case 'drivers':
                case 'freelancers': {
                    const raw = tabId === 'drivers' ? staffDrivers : freelancerDrivers;
                    data = applySearch(raw).map(r => ({
                        'Date': fmt(r.date),
                        'Type': (r.isFreelancer || r.driver?.isFreelancer) ? 'Freelancer' : 'Staff',
                        'Driver': r.driver?.name || r.driverName || '---',
                        'Mobile': r.driver?.mobile || '---',
                        'Vehicle': r.vehicle?.carNumber?.split('#')[0] || '---',
                        'Open KM': r.punchIn?.km || 0,
                        'Close KM': r.punchOut?.km || 0,
                        'Total KM': (r.punchOut?.km && r.punchIn?.km) ? (r.punchOut.km - r.punchIn.km) : (r.totalKM || 0),
                        'Fuel (₹)': r.fuel?.amount || 0,
                        'Parking (₹)': r.punchOut?.tollParkingAmount || 0,
                        'Salary (₹)': (Number(r.dailyWage) || 0) + Math.max((Number(r.punchOut?.allowanceTA) || 0) + (Number(r.punchOut?.nightStayAmount) || 0), Number(r.outsideTrip?.bonusAmount) || 0),
                        'Pick-up': r.pickUpLocation || '',
                        'Drop': r.dropLocation || ''
                    }));
                    break;
                }
                case 'outsideCars': {
                    data = applySearch(outsideCars).map(r => ({
                        'Date': fmt(r.carNumber?.includes('#') ? r.carNumber.split('#')[1] : r.date),
                        'Partner/Vendor': r.ownerName || '---',
                        'Vehicle Number': r.carNumber?.split('#')[0] || '---',
                        'Model': r.model || '---',
                        'Duty Type': r.dutyType || '---',
                        'Transaction': r.transactionType || '---',
                        'Amount (₹)': r.dutyAmount || 0,
                        'Status': 'Partner Duty'
                    }));
                    break;
                }
                case 'logbook': {
                    const raw = [...staffDriversRaw, ...freelancerDriversRaw, ...outsideCars].sort((a, b) => new Date(b.date) - new Date(a.date));
                    data = applySearch(raw).map(r => {
                        const isOutside = r.entryType === 'outsideCar';
                        const isFreelancer = r.isFreelancer || r.driver?.isFreelancer;
                        return {
                            'Date': fmt(isOutside && r.carNumber?.includes('#') ? r.carNumber.split('#')[1] : r.date),
                            'Type': isOutside ? 'Partner' : (isFreelancer ? 'Freelancer' : 'Staff'),
                            'Driver/Owner': isOutside ? (r.ownerName || 'Vendor') : (r.driver?.name || 'Unknown'),
                            'Vehicle': isOutside ? (r.carNumber?.split('#')[0]) : (r.vehicle?.carNumber || '---'),
                            'Open KM/From': r.punchIn?.km || '--',
                            'Close KM/To': isOutside ? '--' : (r.punchOut?.km || '--'),
                            'Total KM/Model': isOutside ? r.model : (r.totalKM || '--'),
                            'Fuel (₹)': r.fuel?.amount || 0,
                            'Parking (₹)': (isOutside ? 0 : r.punchOut?.tollParkingAmount) || 0,
                            'Salary/Duty (₹)': isOutside ? (r.dutyAmount || 0) : ((Number(r.dailyWage) || 0) + Math.max((Number(r.punchOut?.allowanceTA) || 0) + (Number(r.punchOut?.nightStayAmount) || 0), Number(r.outsideTrip?.bonusAmount) || 0)),
                        };
                    });
                    break;
                }
                default: break;
            }
            return { data, name: cfg.label || (tabId === 'logbook' ? 'Log Book' : tabId) };
        };

        tabsToExport.forEach(id => {
            const { data, name } = getSheetData(id);
            if (data && data.length > 0) {
                const sheetName = name.substring(0, 31).replace(/[\[\]\*\?\/\\]/g, '');
                // Avoid adding duplicate sheets (e.g. if logbook and drivers are both in list)
                if (!wb.SheetNames.includes(sheetName)) {
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    sheetsAdded++;
                }
            }
        });

        if (sheetsAdded === 0) return alert('No data found for the selected categories.');

        const dateSuffix = selectedDay === 'All' ? `${fromDate}_to_${toDate}` : fromDate;
        XLSX.writeFile(wb, `Reports_${dateSuffix}.xlsx`);
    };


    /* ── filtered attendance partitions ── */
    const staffDriversRaw = useMemo(() => reportsData.attendance.filter(r => r.driver && !r.vehicle?.isOutsideCar && !r.isOutsideCar && !r.isFreelancer && !r.driver?.isFreelancer).map(r => ({ ...r, entryType: 'attendance' })), [reportsData.attendance]);
    const freelancerDriversRaw = useMemo(() => reportsData.attendance.filter(r => r.driver && (r.isFreelancer || r.driver?.isFreelancer)).map(r => ({ ...r, entryType: 'attendance' })), [reportsData.attendance]);

    const staffDrivers = useMemo(() => staffDriversRaw, [staffDriversRaw]);
    const freelancerDrivers = useMemo(() => freelancerDriversRaw, [freelancerDriversRaw]);
    const outsideCars = useMemo(() => (reportsData.outsideCars || []).map(r => ({ ...r, entryType: 'outsideCar' })), [reportsData.outsideCars]);
    const standaloneParking = useMemo(() => (reportsData.parking || []).map(r => ({ ...r, entryType: 'parking' })), [reportsData.parking]);

    const applySearch = (list) => {
        if (!searchTerm) return list;
        const t = searchTerm.toLowerCase();
        return list.filter(r => (r.driver?.name || r.driverName || '').toLowerCase().includes(t) || (r.vehicle?.carNumber || '').toLowerCase().includes(t) || (r.driver?.mobile || '').includes(t));
    };

    /* navigate dates */
    const shiftDays = (n) => {
        if (selectedDay === 'All') {
            // Shift Month
            let nm = selectedMonth + n;
            let ny = selectedYear;
            if (nm < 0) { nm = 11; ny--; }
            if (nm > 11) { nm = 0; ny++; }
            setSelectedMonth(nm);
            setSelectedYear(ny);
        } else {
            // Shift Day
            const baseDate = new Date(selectedYear, selectedMonth, parseInt(selectedDay));
            baseDate.setDate(baseDate.getDate() + n);
            setSelectedYear(baseDate.getFullYear());
            setSelectedMonth(baseDate.getMonth());
            setSelectedDay(baseDate.getDate().toString());
        }
    };

    /* ── Attendance row renderer (shared for Staff + Freelancers + Outside) ── */
    const ATT_HEADERS = ['Date', 'Type', 'Driver & Vehicle', 'Punch In', 'Punch Out', 'Open KM', 'Close KM', 'Total KM', 'Fuel (₹)', 'Parking', 'Salary', 'Status', 'Action'];
    const LOGBOOK_HEADERS = ['Date', 'Type', 'Driver & Vehicle', 'Punch In', 'Punch Out', 'Open KM', 'Close KM', 'Total KM', 'Fuel (₹)', 'Parking', 'Salary', 'Status', 'Action'];

    /* ── Attendance row renderer ── */
    const AttRow = ({ r, idx, isLogbook = false }) => {
        const entryType = r.entryType || 'attendance';
        const isCompleted = r.status === 'completed';
        const isOutside = entryType === 'outsideCar';

        let displayDate = r.date;
        if (isOutside && r.carNumber?.includes('#')) {
            displayDate = r.carNumber.split('#')[1];
        }

        const inTime = fmtTime(r.punchIn?.time);
        const outTime = fmtTime(r.punchOut?.time);
        const openKM = r.punchIn?.km ?? '--';
        const closeKM = r.punchOut?.km ?? '--';
        const totalKM = r.totalKM ?? (typeof openKM === 'number' && typeof closeKM === 'number' ? closeKM - openKM : '--');

        const wage = Number(r.dailyWage) || 0;
        const bonus = Math.max((Number(r.punchOut?.allowanceTA) || 0) + (Number(r.punchOut?.nightStayAmount) || 0), Number(r.outsideTrip?.bonusAmount) || 0);
        const parkAmt = (entryType === 'parking' ? Number(r.amount) : Number(r.punchOut?.tollParkingAmount)) || 0;
        const parkBy = r.punchOut?.parkingPaidBy || (entryType === 'parking' ? 'Office' : 'Self');
        const fuelAmt = Number(r.fuel?.amount) || 0;

        // Total to show in salary column (Wage + Bonus)
        const rowSalaryTotal = isOutside ? (Number(r.dutyAmount) || 0) : (wage + bonus);
        const isFreelancer = r.isFreelancer || r.driver?.isFreelancer;

        let typeLabel = isFreelancer ? 'Freelancer' : 'Staff';
        let typeColor = isFreelancer ? '#a78bfa' : '#34d399';
        let typeBg = isFreelancer ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)';
        let typeBorder = isFreelancer ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)';

        if (isOutside) {
            typeLabel = 'Partner';
            typeColor = '#f472b6';
            typeBg = 'rgba(236,72,153,0.1)';
            typeBorder = 'rgba(236,72,153,0.2)';
        } else if (entryType === 'parking') {
            typeLabel = 'Parking (Exp)';
            typeColor = '#818cf8';
            typeBg = 'rgba(129,140,248,0.1)';
            typeBorder = 'rgba(129,140,248,0.2)';
        }

        return (
            <>
                <TR idx={idx}>
                    <TD noWrap>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: '13px' }}>{fmt(displayDate)}</span>
                        </div>
                    </TD>
                    <TD noWrap align="center">
                        <span style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: typeBg,
                            color: typeColor,
                            border: `1px solid ${typeBorder}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'inline-block'
                        }}>
                            {typeLabel}
                        </span>
                    </TD>
                    <TD>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div
                                onClick={() => {
                                    const remarks = (r.punchOut?.remarks && r.punchOut.remarks !== 'Manual Entry' ? r.punchOut.remarks : '') + (r.punchOut?.otherRemarks ? (r.punchOut.remarks && r.punchOut.remarks !== 'Manual Entry' ? ' | ' : '') + r.punchOut.otherRemarks : '') || r.remarks || 'No remarks recorded';
                                    setRemarkPopup({ name: r.driver?.name || 'Driver', remarks });
                                }}
                                title={(r.punchOut?.remarks && r.punchOut.remarks !== 'Manual Entry' ? r.punchOut.remarks : '') + (r.punchOut?.otherRemarks ? (r.punchOut.remarks && r.punchOut.remarks !== 'Manual Entry' ? ' | ' : '') + r.punchOut.otherRemarks : '') || r.remarks || 'View Remarks'}
                                style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, cursor: 'pointer' }}
                            >
                                <UserIcon size={15} color={((r.punchOut?.remarks && r.punchOut.remarks !== 'Manual Entry') || r.punchOut?.otherRemarks || (r.remarks && r.remarks !== 'Manual Entry')) ? '#10b981' : '#38bdf8'} />
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{isOutside ? (r.ownerName || 'Vendor') : (r.driver?.name || 'Unknown')}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
                                    {isOutside ? (r.carNumber?.split('#')[0]) : (r.vehicle?.carNumber || 'No Machine')}
                                </div>
                            </div>
                        </div>
                    </TD>
                    <TD noWrap>{entryType.includes('attendance') ? <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: '800', fontSize: '13px' }}><ArrowUpRight size={13} />{inTime}</div> : (isOutside ? <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Partner Fleet</div> : '--')}</TD>
                    <TD noWrap>
                        {entryType.includes('attendance') ? (isCompleted
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f43f5e', fontWeight: '800', fontSize: '13px' }}><ArrowDownLeft size={13} />{outTime}</div>
                            : <StatusBadge ok={false} badLabel="⏳ On Duty" />) : (isOutside ? <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dutyType}</div> : '--')}
                    </TD>
                    <TD noWrap align="center">
                        <div style={{ color: entryType.includes('attendance') ? '#38bdf8' : 'rgba(255,255,255,0.1)', fontWeight: '900', fontSize: '14px' }}>{openKM}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', fontWeight: '800' }}>{isOutside ? 'FROM' : 'OPEN KM'}</div>
                    </TD>
                    <TD noWrap align="center">
                        <div style={{ color: (entryType.includes('attendance') && isCompleted) ? '#f43f5e' : 'rgba(255,255,255,0.1)', fontWeight: '900', fontSize: '14px' }}>{isOutside ? '--' : closeKM}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', fontWeight: '800' }}>{isOutside ? 'TO' : 'CLOSE KM'}</div>
                    </TD>
                    <TD noWrap align="center">
                        <div style={{ color: entryType.includes('attendance') ? 'white' : 'rgba(255,255,255,0.1)', fontWeight: '900', fontSize: '14px' }}>{isOutside ? (r.model || '--') : (totalKM !== '--' ? totalKM : '--')}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', fontWeight: '800' }}>{isOutside ? 'MODEL' : 'KM RUN'}</div>
                    </TD>
                    <TD>
                        {fuelAmt > 0
                            ? <div><span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '13px' }}>₹{fuelAmt}</span><div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{(r.fuel?.entries?.length || 1)} fill</div></div>
                            : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                    </TD>

                    <TD>
                        {parkAmt > 0
                            ? <div>
                                <span style={{ color: '#818cf8', fontWeight: '900', fontSize: '13px' }}>₹{parkAmt}</span>
                                <div style={{ fontSize: '9px', fontWeight: '800', marginTop: '2px', color: parkBy === 'Office' ? '#10b981' : '#a78bfa' }}>{parkBy === 'Office' ? 'Office Paid' : ''}</div>
                            </div>
                            : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                    </TD>
                    <TD><div><span style={{ color: '#10b981', fontWeight: '900', fontSize: '14px' }}>₹{rowSalaryTotal.toLocaleString()}</span>{!isOutside && bonus > 0 && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Base ₹{wage} + ₹{bonus} T/A</div>}{isOutside && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{r.transactionType || 'Duty'}</div>}</div></TD>
                    <TD noWrap>
                        {isLogbook ? (
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '900',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: (r.punchOut?.nightStayAmount > 0 || String(r.outsideTrip?.tripType).toLowerCase().includes('night')) ? 'rgba(139, 92, 246, 0.12)' : (r.outsideTrip?.occurred ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                                color: (r.punchOut?.nightStayAmount > 0 || String(r.outsideTrip?.tripType).toLowerCase().includes('night')) ? '#10b981' : (r.outsideTrip?.occurred ? '#10b981' : '#10b981'),
                                border: `1px solid ${(r.punchOut?.nightStayAmount > 0 || String(r.outsideTrip?.tripType).toLowerCase().includes('night')) ? 'rgba(139, 92, 246, 0.2)' : (r.outsideTrip?.occurred ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)')}`,
                                textTransform: 'uppercase'
                            }}>
                                {(r.punchOut?.nightStayAmount > 0 || String(r.outsideTrip?.tripType).toLowerCase().includes('night'))
                                    ? 'NIGHT'
                                    : (r.outsideTrip?.occurred ? 'SAME DAY' : 'CITY LOCAL')}
                            </span>
                        ) : (
                            isOutside ? <StatusBadge ok={true} okLabel="✓ Partner" /> : (entryType.includes('attendance') ? <StatusBadge ok={isCompleted} okLabel="✓ Done" badLabel="⏳ Active" /> : <StatusBadge ok={true} okLabel="✓ Recorded" />)
                        )}
                    </TD>
                    <TD>
                        <ActionBtns
                            onView={() => setSelectedItem({ ...r, entryType: isOutside ? 'outsideCar' : (entryType === 'parking' ? 'parking' : 'attendance'), mode: 'view' })}
                            onEdit={(!canEditRecords || isOutside || (isFreelancer && !isCompleted) || (isLogbook && userRole === 'executive')) ? null : (() => setEditingItem(r))}
                            onDelete={(!canEditRecords || isOutside || (isLogbook && userRole === 'executive')) ? null : (() => handleDelete({ ...r, entryType: isOutside ? 'voucher' : (entryType === 'parking' ? 'parking' : 'attendance') }))}
                            onDeleteBonus={(canEditRecords && !isOutside && isFreelancer && bonus > 0 && isCompleted) ? (() => handleDeleteBonus(r)) : null}
                        />
                    </TD>
                </TR>
            </>
        );
    };



    /* ── render the active tab content ── */
    const renderSingleTab = (tabId) => {
        const cfg = TAB_CONFIG[tabId] || {};
        switch (tabId) {
            /* ── STAFF DRIVERS ── */
            case 'drivers': {
                const data = applySearch(staffDrivers);
                return (
                    <TableSection tabId="drivers" fromDate={fromDate} toDate={toDate}
                        headers={ATT_HEADERS}
                        rows={data.map((r, i) => <AttRow key={r._id || `staff-${i}`} r={r} idx={i} />)}
                        colSummaries={getColSummaries(data)}
                        empty="No staff driver records found."
                    />
                );
            }

            /* ── FREELANCERS ── */
            case 'freelancers': {
                const data = applySearch(freelancerDrivers);
                return (
                    <TableSection tabId="freelancers" fromDate={fromDate} toDate={toDate}
                        headers={ATT_HEADERS}
                        rows={data.map((r, i) => <AttRow key={r._id || `freelance-${i}`} r={r} idx={i} showFreelancerCols />)}
                        colSummaries={getColSummaries(data)}
                        empty="No freelancer records found."
                    />
                );
            }

            /* ── PARKING ── */
            case 'parking': {
                const data = applySearch(standaloneParking);
                return (
                    <TableSection tabId="parking" fromDate={fromDate} toDate={toDate}
                        headers={ATT_HEADERS}
                        rows={data.map((r, i) => <AttRow key={r._id} r={r} idx={i} />)}
                        colSummaries={getColSummaries(data)}
                        empty="No standalone parking records found."
                    />
                );
            }

            /* ── FASTAG RECHARGES ── */
            case 'fastag': {
                const data = applySearch(reportsData.fastagRecharges || []);
                return (
                    <TableSection tabId="fastag" fromDate={fromDate} toDate={toDate}
                        headers={['Date', 'Vehicle', 'Amount (₹)', 'Method', 'Remarks', 'Action']}
                        rows={data.map((r, i) => (
                            <TR key={r._id || i} idx={i}>
                                <TD noWrap>{fmt(r.date)}</TD>
                                <TD>
                                    <div style={{ fontSize: '13px', fontWeight: '900' }}>{r.carNumber || 'Unknown'}</div>
                                </TD>
                                <TD><span style={{ color: '#fbbf24', fontWeight: '900' }}>₹{r.amount}</span></TD>
                                <TD>{r.method || 'Cash'}</TD>
                                <TD style={{ maxWidth: '200px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{r.remarks || '--'}</TD>
                                <TD>
                                    <ActionBtns 
                                        onDelete={() => handleDelete({ ...r, entryType: 'fastag' })} 
                                    />
                                </TD>
                            </TR>
                        ))}
                        empty="No Fastag recharges found in this period."
                    />
                );
            }

            case 'outsideCars': {
                const data = applySearch(outsideCars);
                return (
                    <TableSection tabId="outsideCars" fromDate={fromDate} toDate={toDate}
                        headers={ATT_HEADERS}
                        rows={data.map((r, i) => <AttRow key={r._id || `outside-${i}`} r={r} idx={i} isOutside={true} />)}
                        colSummaries={getColSummaries(data)}
                        empty="No partner duty records found."
                    />
                );
            }

            default: return null;
        }
    };

    const renderContent = () => {
        if (loading) return (
            <div style={{ padding: '80px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    <div className="spinner" /><span style={{ fontSize: '14px' }}>Loading data...</span>
                </div>
            </div>
        );

        if (location.pathname.includes('log-book')) {
            const rawData = [...staffDriversRaw, ...freelancerDriversRaw, ...outsideCars].filter(r => {
                const isFreelancer = r.isFreelancer || r.driver?.isFreelancer;
                const isOutside = r.entryType === 'outsideCar';
                if (isFreelancer) return activeTabs.includes('freelancers') || activeTabs.length > 2;
                if (isOutside) return activeTabs.includes('outsideCars') || activeTabs.length > 2;
                return activeTabs.includes('drivers') || activeTabs.length > 2;
            });

            const data = rawData.sort((a, b) => new Date(b.date) - new Date(a.date));
            const searchedData = applySearch(data);

            return (
                <TableSection tabId="logbook" fromDate={fromDate} toDate={toDate}
                    headers={LOGBOOK_HEADERS}
                    rows={searchedData.map((r, i) => <AttRow key={r._id} r={r} idx={i} isLogbook />)}
                    colSummaries={getColSummaries(searchedData)}
                    empty="No log book records found."
                />
            );
        }

        return <>{activeTabs.map(t => <React.Fragment key={t}>{renderSingleTab(t)}</React.Fragment>)}</>;
    };

    return (
        <div className={isSubComponent ? "sub-component" : "container-fluid"} style={{ paddingBottom: '60px', background: 'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.03), transparent 40%)' }}>
            <style>{styles}</style>
            {!isSubComponent && <SEO title="Daily Reports" description="Premium daily fleet reports with attendance, fuel, maintenance, advances and more." />}

            {/* ── Header ── */}
            {!isSubComponent && (
                <header className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 4px', gap: '20px', marginTop: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                        <div className="hide-mobile" style={{
                            width: '64px', height: '64px', borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05))',
                            display: 'grid',
                            placeItems: 'center',
                            paddingTop: '15px',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            boxShadow: '0 10px 25px rgba(251, 191, 36, 0.1)',
                            position: 'relative',
                            flexShrink: 0
                        }}>
                            <div style={{ position: 'absolute', inset: '-2px', borderRadius: '22px', border: '1px solid rgba(251, 191, 36, 0.1)', opacity: 0.5, pointerEvents: 'none' }}></div>
                            <FileText size={30} color="var(--primary)" strokeWidth={2.5} style={{ display: 'block' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '950', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '6px' }}>Operational Insights</div>
                            <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: '1000', margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>
                                {location.pathname.includes('driver-duty') ? 'Driver ' : (location.pathname.includes('freelancer-duty') ? 'Freelancer ' : (location.pathname.includes('log-book') ? 'Overall ' : 'Daily '))}
                                <span style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.2))' }}>{location.pathname.includes('log-book') ? 'Log Book' : 'Duty'}</span>
                            </h1>
                        </div>
                    </div>

                    {/* Controls Group */}
                    <div className="header-actions-group" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                        {/* 1. Integrated Control Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(15, 23, 42, 0.4)',
                            padding: '6px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            {/* Date Input */}
                            <div style={{ width: '150px' }}>
                                <PremiumDateInput
                                    value={selectedDay === 'All' 
                                        ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01` 
                                        : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
                                    }
                                    onChange={v => {
                                        const [y, m, d] = v.split('-');
                                        setSelectedYear(parseInt(y));
                                        setSelectedMonth(parseInt(m) - 1);
                                        setSelectedDay(parseInt(d).toString());
                                    }}
                                />
                            </div>

                            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>

                            {/* Search */}
                            <div style={{ position: 'relative' }}>
                                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                <input
                                    type="text"
                                    placeholder="Search Logs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="premium-compact-input"
                                    style={{
                                        height: '42px',
                                        paddingLeft: '38px',
                                        width: '180px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>

                            {/* Selectors */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '5px' }}>
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: 'white', height: '38px', padding: '0 5px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
                                >
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => <option key={m} value={i} style={{ background: '#0f172a' }}>{m}</option>)}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: 'white', height: '38px', padding: '0 5px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
                                >
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 2. Actions Group */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {selectedDay !== 'All' && (
                                <motion.button
                                    whileHover={{ y: -2 }}
                                    onClick={() => setSelectedDay('All')}
                                    style={{ height: '54px', padding: '0 20px', borderRadius: '18px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', color: 'var(--primary)', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                >
                                    <Calendar size={14} /> Full Month
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ y: -2, background: 'rgba(16, 185, 129, 0.2)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownloadExcel}
                                style={{
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    color: '#10b981',
                                    padding: '0 25px',
                                    height: '54px',
                                    borderRadius: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '12px',
                                    fontWeight: '950',
                                    cursor: 'pointer',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase'
                                }}
                            >
                                <Download size={18} /> DOWNLOAD EXCEL
                            </motion.button>
                        </div>
                    </div>
                </header>
            )}

            {/* Sub-component quick header (Date/Search) */}
            {isSubComponent && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', padding: '0 4px', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>Operational Duty Logs</h2>
                        <button onClick={handleDownloadExcel} style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Download size={12} /> EXCEL
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PremiumDateInput
                            value={fromDate}
                            onChange={v => setFromDate(v)}
                        />
                    </div>
                </div>
            )}

            {/* ── Tab Bar (multi-select) ── */}
            {tabList.length > 1 && (
                <div className="premium-tab-container" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '22px' }}>
                    {/* Primary Tab Group */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '5px', display: 'flex', gap: '5px' }}>
                        {tabList.map(tab => {
                            const isLogbook = location.pathname.includes('log-book');
                            const isBothActive = activeTabs.length > 1;
                            const isSoloActive = activeTabs.includes(tab.id) && activeTabs.length === 1;

                            const isActive = isLogbook ? isSoloActive : (activeTabs.includes(tab.id) && activeTabs.length === 1);
                            const isBothRunning = isLogbook && isBothActive && activeTabs.includes(tab.id);
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => toggleTab(tab.id)}
                                    title={isLogbook && isBothActive ? `Click to show only ${tab.label}` : isLogbook && isSoloActive ? `Click to show both` : ''}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '11px', fontWeight: '900',
                                        background: isActive ? `${tab.color}15` : isBothRunning ? `${tab.color}15` : 'transparent',
                                        color: isActive ? tab.color : isBothRunning ? tab.color : 'rgba(255,255,255,0.4)',
                                        border: 'none',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    <Icon size={16} color="currentColor" />{tab.label}
                                    {isBothRunning && !isActive && (
                                        <span style={{ fontSize: '8px', background: tab.color, color: '#000', borderRadius: '4px', padding: '1px 5px', fontWeight: '900', marginLeft: '2px' }}>ON</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* ── Main Content ── */}
            {renderContent()}

            {/* ── Modals ── */}
            <AnimatePresence>
                {selectedItem && (
                    <AttendanceModal
                        key="view-modal"
                        item={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                    />
                )}
                {editingItem && <EditAttendanceModal key="edit-modal" item={editingItem} onClose={() => setEditingItem(null)} onUpdate={handleUpdateAttendance} />}

                {remarkPopup && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setRemarkPopup(null)}>
                        <motion.div
                            key="remark-popup"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '380px', padding: '30px', background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <MessageSquare size={18} color="#38bdf8" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '900' }}>Duty Remarks</h3>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>{remarkPopup.name}</p>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '100px', display: 'flex', alignItems: 'center' }}>
                                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6', fontWeight: '500' }}>{remarkPopup.remarks}</p>
                            </div>

                            <button
                                onClick={() => setRemarkPopup(null)}
                                style={{ width: '100%', marginTop: '20px', padding: '12px', borderRadius: '12px', background: '#38bdf8', color: 'black', border: 'none', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(56, 189, 248, 0.2)' }}
                            >
                                CLOSE DETAILS
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reports;
