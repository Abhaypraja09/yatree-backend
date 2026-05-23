import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';
import {
    Calendar, Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight, Car, PlusCircle,
    User, MapPin, Target, Briefcase, X, Save, FileSpreadsheet, Users, Building2, TruckIcon, Wallet, Navigation, Download, FileText, IndianRupee
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../context/CompanyContext';
import SEO from '../components/SEO';
import * as XLSX from 'xlsx-js-style';
import PremiumDateInput from '../components/common/PremiumDateInput';
import {
    todayIST,
    toISTDateString,
    firstDayOfMonthIST,
    formatDateIST,
    nowIST,
    formatTimeIST,
    currentTimeIST
} from '../utils/istUtils';

const EventManagement = () => {
    const { selectedCompany } = useCompany();
    const location = useLocation();
    const [events, setEvents] = useState([]); // This will store ONLY events for CURRENT tab for easier usage in existing map
    const [allMasterEvents, setAllMasterEvents] = useState([]); // This will store ALL events for counts
    const [vehicles, setVehicles] = useState([]);
    const [allVehiclesMaster, setAllVehiclesMaster] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12 or 'All'
    const [selectedYear, setSelectedYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [statusTab, setStatusTab] = useState('Running');
    const [selectedEventDetails, setSelectedEventDetails] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        if (selectedMonth === 'All') {
            const start = `${selectedYear}-04-01`;
            const end = `${selectedYear + 1}-03-31`;
            setFromDate(start);
            setToDate(end);
        } else {
            const calendarYear = (selectedMonth >= 1 && selectedMonth <= 3) ? selectedYear + 1 : selectedYear;
            if (selectedDay === 'All') {
                const start = toISTDateString(new Date(calendarYear, selectedMonth - 1, 1));
                const end = toISTDateString(new Date(calendarYear, selectedMonth, 0));
                setFromDate(start);
                setToDate(end);
            } else {
                const d = toISTDateString(new Date(calendarYear, selectedMonth - 1, parseInt(selectedDay)));
                setFromDate(d);
                setToDate(d);
            }
        }
    }, [selectedMonth, selectedYear, selectedDay]);

    // Handle 'Completed' tab defaulting to 'All Months'
    useEffect(() => {
        if (statusTab === 'Close') {
            setSelectedMonth('All');
            setSelectedDay('All');
        }
    }, [statusTab]);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const getToday = () => todayIST();

    const [monthlyTarget, setMonthlyTarget] = useState(0);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDutyModal, setShowDutyModal] = useState(false);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [isEditingDuty, setIsEditingDuty] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const handleOpenDuty = () => {
        setIsEditingDuty(false);
        let defaultDate = '';
        if (selectedDay !== 'All') {
            defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
        } else {
            const now = new Date();
            if (now.getMonth() === selectedMonth && now.getFullYear() === selectedYear) {
                defaultDate = todayIST();
            } else {
                defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, 1));
            }
        }
        setDutyFormData({ carNumber: '', model: '', dropLocation: '', date: defaultDate, eventId: '', dutyAmount: '', driverName: '', vehicleSource: 'Fleet', dutyType: '', dutyTime: currentTimeIST(), remarks: '', guestCount: '' });
        setShowDutyModal(true);
    };

    const handleOpenEvent = () => {
        setIsEditingEvent(false);
        let defaultDate = '';
        if (selectedDay !== 'All') {
            defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
        } else {
            const now = new Date();
            if (now.getMonth() === selectedMonth && now.getFullYear() === selectedYear) {
                defaultDate = todayIST();
            } else {
                defaultDate = toISTDateString(new Date(selectedYear, selectedMonth, 1));
            }
        }
        setEventFormData({
            name: '',
            client: '',
            date: defaultDate,
            location: '',
            description: '',
            status: 'Upcoming'
        });
        setShowEventModal(true);
    };

    const handleEditEvent = (ev) => {
        setIsEditingEvent(true);
        setSelectedId(ev._id);
        setEventFormData({
            name: ev.name,
            client: ev.client,
            date: toISTDateString(new Date(ev.date)),
            location: ev.location || '',
            description: ev.description || '',
            status: ev.status || 'Upcoming'
        });
        setShowEventModal(true);
    };

    const fetchEventDetails = async (eventId) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/details/${eventId}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setSelectedEventDetails(data);
            setShowDetailsModal(true);
        } catch (err) { alert('Error fetching details'); }
    };

    const [eventFormData, setEventFormData] = useState({
        name: '', client: '', date: '', location: '', description: '',
        status: 'Upcoming'
    });
    const [dutyFormData, setDutyFormData] = useState({
        carNumber: '', model: '', dropLocation: '', date: '',
        eventId: '', dutyAmount: '', driverName: '', vehicleSource: 'Fleet',
        dutyType: '', remarks: '', guestCount: ''
    });

    useEffect(() => {
        if (selectedCompany?._id) {
            const savedTarget = localStorage.getItem(`eventTarget_${selectedCompany._id}`);
            if (savedTarget) setMonthlyTarget(Number(savedTarget));
            fetchEvents();
            fetchVehicles();
            fetchMasterVehicles();
        }
    }, [selectedCompany, fromDate, toDate, statusTab]);

    // ── AI AGENT SEARCH INTEGRATION ──
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchParam = params.get('search') || params.get('name') || params.get('event');
        const clientParam = params.get('client');
        const monthParam = params.get('month');
        const yearParam = params.get('year');
        const dayParam = params.get('day');
        const tabParam = params.get('tab') || params.get('status');

        if (searchParam) setSearchTerm(searchParam);
        if (clientParam) setClientFilter(clientParam);
        if (monthParam) setSelectedMonth(parseInt(monthParam) - 1); // 0-indexed
        if (yearParam) setSelectedYear(parseInt(yearParam));
        if (dayParam) setSelectedDay(dayParam);
        if (tabParam) setStatusTab(tabParam);
    }, [location.search]);

    const fetchEvents = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/events/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });

            const todayStr = todayIST();
            const allWithVisualStatus = (data || []).map(e => {
                const evDate = toISTDateString(new Date(e.date));
                let visualStatus = e.status || 'Upcoming';
                if (visualStatus === 'Upcoming' && evDate <= todayStr) visualStatus = 'Running';
                return { ...e, visualStatus };
            });
            setAllMasterEvents(allWithVisualStatus);
        } catch (err) { console.error(err); }
    };

    const filteredMasterByDate = React.useMemo(() => {
        return allMasterEvents.filter(e => {
            const evDate = toISTDateString(new Date(e.date));
            return evDate >= fromDate && evDate <= toDate;
        });
    }, [allMasterEvents, fromDate, toDate]);

    const currentTabEvents = React.useMemo(() => {
        const currentTargetStatus = statusTab === 'Start' ? 'Upcoming' : statusTab === 'Close' ? 'Closed' : 'Running';
        return filteredMasterByDate.filter(e => e.visualStatus === currentTargetStatus);
    }, [filteredMasterByDate, statusTab]);

    useEffect(() => {
        setEvents(currentTabEvents);
    }, [currentTabEvents]);

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const headers = { Authorization: `Bearer ${userInfo.token}` };

            // 1. Fetch Outside Duties
            const outsideRes = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=outside&from=${fromDate}&to=${toDate}`, { headers });
            const outsideDuties = (outsideRes.data.vehicles || [])
                .filter(v => v.eventId)
                .map(v => ({
                    ...v,
                    vehicleSource: v.vehicleSource || 'External'
                }));

            // 2. Fetch Fleet Attendance for the same range
            const attendanceRes = await axios.get(`/api/admin/reports/${selectedCompany._id}?from=${fromDate}&to=${toDate}`, { headers });

            const attendanceDuties = (attendanceRes.data.attendance || [])
                .filter(a => a.eventId)
                .map(a => ({
                    _id: a._id,
                    carNumber: a.vehicle?.carNumber || 'N/A',
                    model: a.vehicle?.model || 'N/A',
                    driverName: a.driver?.name || 'N/A',
                    vehicleSource: 'Fleet',
                    eventId: a.eventId?._id || a.eventId,
                    dutyAmount: a.dailyWage || 0,
                    dropLocation: a.dropLocation || '',
                    date: a.date,
                    isAttendance: true,
                    dutyType: a.dutyType || a.punchOut?.remarks || 'Fleet Duty',
                    dutyTime: a.dutyTime || '',
                    remarks: a.remarks || '',
                    guestCount: a.guestCount || ''
                }));

            setVehicles([...outsideDuties, ...attendanceDuties]);
        } catch (err) {
            console.error('Fetch duties error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setAllVehiclesMaster(data.vehicles || []);
        } catch (err) { console.error(err); }
    };

    const shiftDays = (n) => {
        let baseDate;
        if (selectedDay === 'All') {
            baseDate = new Date(selectedYear, selectedMonth, 1);
        } else {
            baseDate = new Date(selectedYear, selectedMonth, parseInt(selectedDay));
        }

        baseDate.setDate(baseDate.getDate() + n);

        setSelectedYear(baseDate.getFullYear());
        setSelectedMonth(baseDate.getMonth());
        setSelectedDay(baseDate.getDate().toString());
    };

    const handleCarNumberChange = (val) => {
        const upVal = val.toUpperCase();
        const normVal = upVal.replace(/[^A-Z0-9]/g, '');

        const existingFleet = allVehiclesMaster.find(v => (v.carNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normVal);
        if (existingFleet) {
            setDutyFormData(prev => ({ ...prev, carNumber: upVal, model: existingFleet.model || prev.model, vehicleSource: 'Fleet' }));
            return;
        }

        const existingDuty = vehicles.find(v => (v.carNumber || '').split('#')[0].toUpperCase().replace(/[^A-Z0-9]/g, '') === normVal);
        if (existingDuty) {
            setDutyFormData(prev => ({ ...prev, carNumber: upVal, model: existingDuty.model || prev.model, vehicleSource: existingDuty.vehicleSource || 'External' }));
        } else {
            setDutyFormData(prev => ({ ...prev, carNumber: upVal }));
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (isEditingEvent) {
                await axios.put(`/api/admin/events/${selectedId}`, eventFormData, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            } else {
                await axios.post('/api/admin/events', { ...eventFormData, companyId: selectedCompany._id }, { headers: { Authorization: `Bearer ${userInfo.token}` } });
            }
            setShowEventModal(false);
            fetchEvents();
            alert('Event saved successfully');
        } catch (err) { alert('Error saving event'); }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event? This will also remove associated external car duties.')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/events/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchEvents();
            alert('Event deleted successfully');
        } catch (err) { alert('Error deleting event'); }
    };

    const handleSubmitDuty = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const selectedDuty = isEditingDuty ? vehicles.find(v => v._id === selectedId) : null;

            if (selectedDuty?.isAttendance) {
                // Update Fleet Attendance Record
                const attendancePayload = {
                    eventId: dutyFormData.eventId || undefined,
                    dropLocation: dutyFormData.dropLocation,
                    dutyType: dutyFormData.dutyType,
                    dutyTime: dutyFormData.dutyTime,
                    remarks: dutyFormData.remarks,
                    guestCount: Number(dutyFormData.guestCount) || 0,
                    dailyWage: Number(dutyFormData.dutyAmount) || 0
                };
                await axios.put(`/api/admin/attendance/${selectedId}`, attendancePayload, config);
            } else {
                // Handle Outside Car (Virtual Record)
                let internalCarNumber = `${dutyFormData.carNumber}#${dutyFormData.date}`;
                if (!isEditingDuty) {
                    internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
                } else {
                    const parts = selectedDuty?.carNumber?.split('#') || [];
                    if (dutyFormData.carNumber === parts[0] && dutyFormData.date === parts[1] && parts[2]) {
                        internalCarNumber += `#${parts[2]}`;
                    } else {
                        internalCarNumber += `#${Math.random().toString(36).substring(2, 7)}`;
                    }
                }
                const vehiclePayload = {
                    carNumber: internalCarNumber,
                    model: dutyFormData.model?.trim(),
                    dropLocation: dutyFormData.dropLocation?.trim() || '',
                    dutyAmount: Number(dutyFormData.dutyAmount) || 0,
                    eventId: dutyFormData.eventId,
                    companyId: selectedCompany._id,
                    isOutsideCar: true,
                    createdAt: dutyFormData.date,
                    driverName: dutyFormData.driverName?.trim() || '',
                    vehicleSource: dutyFormData.vehicleSource,
                    dutyType: dutyFormData.dutyType,
                    dutyTime: dutyFormData.dutyTime,
                    remarks: dutyFormData.remarks,
                    guestCount: Number(dutyFormData.guestCount) || 0
                };

                if (isEditingDuty && selectedId) {
                    await axios.put(`/api/admin/vehicles/${selectedId}`, vehiclePayload, config);
                } else {
                    const data = new FormData();
                    Object.keys(vehiclePayload).forEach(key => data.append(key, vehiclePayload[key]));
                    data.append('permitType', 'Contract');
                    data.append('carType', 'Other');
                    await axios.post('/api/admin/vehicles', data, config);
                }
            }
            setShowDutyModal(false);
            fetchVehicles();
            if (showDetailsModal && selectedEventDetails?._id) {
                fetchEventDetails(selectedEventDetails._id);
            }
            setDutyFormData({ carNumber: '', model: '', dropLocation: '', date: '', eventId: '', dutyAmount: '', driverName: '', vehicleSource: 'Fleet', dutyType: '', dutyTime: '', remarks: '', guestCount: '' });
        } catch (err) {
            console.error('Save Error:', err.response?.data || err.message);
            alert('Error saving duty entry: ' + (err.response?.data?.message || 'Check connection'));
        }
    };

    const handleDeleteDuty = async (id, isAttendanceFlag) => {
        if (!window.confirm('Remove this vehicle duty?')) return;
        try {
            const duty = vehicles.find(d => d._id === id);
            // Use flag if provided, otherwise fallback to finding in state
            const isAttendance = (isAttendanceFlag !== undefined) ? isAttendanceFlag : duty?.isAttendance;

            if (isAttendance) {
                // For attendance, we just clear the eventId, we don't delete the whole attendance record usually
                // BUT if they want to delete, we call deleteAttendance
                await axios.delete(`/api/admin/attendance/${id}`, { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` } });
            } else {
                await axios.delete(`/api/admin/vehicles/${id}`, { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}` } });
            }
            fetchVehicles();
            if (showDetailsModal && selectedEventDetails?._id) {
                fetchEventDetails(selectedEventDetails._id);
            }
        } catch (err) { alert('Error deleting'); }
    };

    const handleEditDuty = (v) => {
        setDutyFormData({
            carNumber: v.carNumber?.split('#')[0] || '',
            model: v.model,
            dropLocation: v.dropLocation || '',
            date: v.carNumber?.split('#')[1] || getToday(),
            eventId: v.eventId || '',
            dutyAmount: v.dutyAmount || v.dailyWage || '',
            driverName: v.driverName || '',
            vehicleSource: v.vehicleSource || 'External',
            dutyType: v.dutyType || '',
            dutyTime: v.dutyTime || '',
            remarks: v.remarks || '',
            guestCount: v.guestCount || ''
        });
        setSelectedId(v._id);
        setIsEditingDuty(true);
        setShowDutyModal(true);
    };

    const handleTargetChange = (val) => {
        const num = Number(val);
        setMonthlyTarget(num);
        if (selectedCompany?._id) localStorage.setItem(`eventTarget_${selectedCompany._id}`, num.toString());
    };

    // OPTIMIZATION: Memoize filtered results to prevent "hanging" during re-renders (Search/Typing)
    const filtered = React.useMemo(() => {
        return vehicles.filter(v => {
            const plate = (v.carNumber || '').split('#')[0];
            const event = events.find(e => e._id === v.eventId);
            const eventName = event?.name || '';
            const clientName = event?.client || '';
            const eventStatus = event?.status || '';

            // ONLY show duties belonging to events in the CURRENT status tab phase
            const currentTabStatus = statusTab === 'Start' ? 'Upcoming' : statusTab === 'Close' ? 'Closed' : 'Running';
            if (v.eventId && eventStatus !== currentTabStatus) return false;

            const matchesSearch =
                plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesClient = clientFilter === 'All' || clientName === clientFilter;
            const matchesSource = sourceFilter === 'All' || (v.vehicleSource || 'External') === sourceFilter;

            return matchesSearch && matchesClient && matchesSource;
        }).sort((vA, vB) => {
            const dA = (vA.date || vA.carNumber?.split('#')[1] || '');
            const dB = (vB.date || vB.carNumber?.split('#')[1] || '');
            return dB.localeCompare(dA);
        });
    }, [vehicles, events, searchTerm, clientFilter, fromDate, toDate, sourceFilter, statusTab]);

    // SMART DYNAMIC SUGGESTIONS (SAME AS OUTSIDE CARS)
    const dutyTypeSuggestions = React.useMemo(() => {
        return ['Airport PickUp', 'Airport Drop', 'RSD PickUp', 'RSD Drop', 'Bus Stand PickUp', 'Bus Stand Drop'].sort();
    }, []);

    const dropLocationSuggestions = React.useMemo(() => {
        const d = dutyFormData.date;
        if (!d || d.endsWith('-01')) return []; // Reset on 1st
        const [y, m] = d.split('-');
        const currentMonthData = vehicles.filter(v => (v.date || v.carNumber?.split('#')[1])?.startsWith(`${y}-${m}`));
        return [...new Set(currentMonthData.map(v => v.dropLocation).filter(Boolean))].sort();
    }, [vehicles, dutyFormData.date]);

    // OPTIMIZATION: Memoize statistics
    const stats = React.useMemo(() => {
        const uniqueEvents = [...new Set(filtered.map(v => v.eventId).filter(Boolean))].length;
        const fleetAmount = filtered.filter(v => (v.vehicleSource || 'External') === 'Fleet').reduce((sum, v) => sum + (Number(v.dutyAmount || v.dailyWage) || 0), 0);
        const extAmount = filtered.filter(v => (v.vehicleSource || 'External') === 'External').reduce((sum, v) => sum + (Number(v.dutyAmount || v.dailyWage) || 0), 0);
        const totalAmount = fleetAmount + extAmount;
        const uniqueClients = [...new Set(events.map(e => e.client).filter(Boolean))].sort();
        return { totalEvents: uniqueEvents, totalAmount, fleetAmount, extAmount, uniqueClients };
    }, [filtered, events]);

    const { totalEvents, totalAmount, fleetAmount, extAmount, uniqueClients } = stats;

    const now = nowIST();
    const curMonth = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const curYear = now.getUTCFullYear().toString();
    const currentMonthDuties = vehicles.filter(v => {
        const d = v.carNumber?.split('#')[1];
        return d && d.startsWith(`${curYear}-${curMonth}`);
    }).length;

    const targetPercentage = monthlyTarget > 0 ? Math.min(Math.round((currentMonthDuties / monthlyTarget) * 100), 100) : 0;

    const exportExcel = () => {
        const data = filtered.map(v => {
            const event = events.find(e => e._id === v.eventId);
            return {
                'Date': v.carNumber?.split('#')[1] ? formatDateIST(v.carNumber.split('#')[1]) : '',
                'Vehicle': v.carNumber?.split('#')[0],
                'Model': v.model,
                'Driver': v.driverName || '-',
                'Source': v.vehicleSource || 'External',
                'Event': event?.name || 'N/A',
                'Client': event?.client || 'N/A',
                'Duty Type': v.dutyType || '',
                'Drop Loc': v.dropLocation || '',
                'Amount': v.dutyAmount || 0
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Events Report");
        XLSX.writeFile(wb, `Event_Duties_${fromDate}_to_${toDate}.xlsx`);
    };

    const exportEventSpecificExcel = (eventData) => {
        if (!eventData) return;
        const allDuties = [...eventData.fleetDuties, ...eventData.externalDuties];
        const data = allDuties.map(v => ({
            'Date': formatDateIST(v.date || v.createdAt),
            'Vehicle': (v.vehicle?.carNumber || v.vehicleNumber || v.carNumber?.split('#')[0] || 'N/A').toUpperCase(),
            'Model': v.vehicle?.model || v.model || 'N/A',
            'Driver': v.driver?.name || v.driverName || 'N/A',
            'Source': v.vehicleSource || 'EXTERNAL',
            'Duty Type': v.dutyType || 'General Duty',
            'Location': v.dropLocation || 'BASE',
            'Amount': Number(v.dutyAmount || v.dailyWage || 0)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Event Duty Logs");
        XLSX.writeFile(wb, `Event_Log_${eventData.event.name.replace(/\s+/g, '_')}_${toISTDateString(new Date(eventData.event.date))}.xlsx`);
    };

    const formatDateDisplay = (dateStr) => formatDateIST(dateStr);

    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            if (!url) return resolve(null);
            let finalUrl = url;
            if (!url.startsWith('http') && !url.startsWith('/')) {
                finalUrl = `https://superadmin.yatreedestination.com/uploads/${url}`;
            }
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (finalUrl.startsWith('http')) {
                img.src = `/api/admin/proxy-image?url=${encodeURIComponent(finalUrl)}`;
            } else {
                img.src = finalUrl;
            }
        });
    };

    const handleExportEventPDF = async (mode = 'internal') => {
        try {
            if (!selectedEventDetails) {
                alert("No event data available.");
                return;
            }
            // Load assets
            const logo = await loadImage(selectedCompany?.logoUrl || '/logos/logo.png').catch(() => null);
            const signature = await loadImage(selectedCompany?.ownerSignatureUrl || '/logos/signature.png').catch(() => null);

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. HEADER (STUNNING MODERN STYLE)
            doc.setFillColor(15, 23, 42); // Slate 900
            doc.rect(0, 0, pageWidth, 50, 'F');

            // Premium Logo Container
            if (logo) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'F'); // White background for logo
                doc.addImage(logo, 'PNG', 14, 10, 30, 30);
            } else {
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.roundedRect(12, 8, 34, 34, 3, 3, 'D');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text('LOGO', 24, 26, { align: 'center' });
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text((selectedCompany?.name || 'FLEET MANAGEMENT').toUpperCase(), 52, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            doc.text('Premium Fleet Management & Travel Solutions', 52, 30);
            doc.setTextColor(251, 191, 36);
            doc.text(selectedCompany?.website || '', 52, 37);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('EVENT SUMMARY', pageWidth - 15, 22, { align: 'right' });
            doc.setFontSize(10);
            doc.text((selectedEventDetails.event?.name || 'GENERIC MISSION').toUpperCase(), pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`DATE: ${formatDateIST(new Date())}`, pageWidth - 15, 37, { align: 'right' });

            // 2. EVENT SPECIFICATIONS
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('EVENT SPECIFICATIONS', 15, 65);
            doc.setDrawColor(251, 191, 36);
            doc.setLineWidth(0.5);
            doc.line(15, 68, 50, 68);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('MISSION NAME', 15, 76);
            doc.text('CLIENT', 15, 84);
            doc.text('EVENT DATE', 15, 92);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(selectedEventDetails.event?.name?.toUpperCase() || 'N/A', 50, 76);
            doc.text(selectedEventDetails.event?.client?.toUpperCase() || 'N/A', 50, 84);
            doc.text(formatDateIST(selectedEventDetails.event?.date), 50, 92);

            // Summary Stats Box
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pageWidth / 2, 60, pageWidth / 2 - 15, 45, 3, 3, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('MISSION STATISTICS', pageWidth / 2 + 5, 70);

            const allDuties = [...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties];
            const totalEarned = allDuties.reduce((sum, d) => sum + (Number(d.dutyAmount || d.dailyWage) || 0), 0);
            const fleetCount = selectedEventDetails.fleetDuties.length;
            const extCount = selectedEventDetails.externalDuties.length;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);

            if (mode === 'client') {
                doc.text('Total Mission Vehicles:', pageWidth / 2 + 5, 83);
                doc.text('Total Operations Logistics:', pageWidth / 2 + 5, 88);

                doc.setTextColor(15, 23, 42);
                doc.text(allDuties.length.toString(), pageWidth - 20, 83, { align: 'right' });
                doc.text('Verified', pageWidth - 20, 88, { align: 'right' });
            } else {
                doc.text('Vanguard Vehicles (Fleet):', pageWidth / 2 + 5, 78);
                doc.text('External Support (Cars):', pageWidth / 2 + 5, 83);
                doc.text('Total Resource Count:', pageWidth / 2 + 5, 88);

                doc.setTextColor(15, 23, 42);
                doc.text(fleetCount.toString(), pageWidth - 20, 78, { align: 'right' });
                doc.text(extCount.toString(), pageWidth - 20, 83, { align: 'right' });
                doc.text(allDuties.length.toString(), pageWidth - 20, 88, { align: 'right' });
            }

            doc.setDrawColor(203, 213, 225);
            doc.line(pageWidth / 2 + 5, 92, pageWidth - 20, 92);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text('GRAND TOTAL VALUE:', pageWidth / 2 + 5, 100);
            doc.text(`Rs. ${totalEarned.toLocaleString('en-IN')}`, pageWidth - 20, 100, { align: 'right' });

            // 3. DUTY LOGS TABLE
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('OPERATIONAL LOGS', 15, 115);

            const headers = mode === 'client'
                ? [['DATE', 'VEHICLE ID', 'RESOURCES', 'MISSION ROLE', 'SERVICE VAL']]
                : [['DATE', 'VEHICLE ID', 'LOG SOURCE', 'OPERATIVE', 'MISSION ROLE', 'SETTLEMENT']];

            const body = allDuties.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)).map(d => {
                const dateText = formatDateIST(d.date || d.createdAt);
                const vehNo = (d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0] || 'N/A').toUpperCase();
                const amount = `${Number(d.dutyAmount || d.dailyWage || 0).toLocaleString('en-IN')}`;

                if (mode === 'client') {
                    // Match the 5 client headers: ['DATE', 'VEHICLE ID', 'RESOURCES', 'MISSION ROLE', 'SERVICE VAL']
                    return [dateText, vehNo, d.vehicle?.model || d.model || 'N/A', d.dutyType || 'MISSION SUPPORT', amount];
                } else {
                    return [dateText, vehNo, d.vehicleSource?.toUpperCase() || 'EXTERNAL', d.isAttendance ? d.driver?.name : d.driverName, d.dutyType || 'General', amount];
                }
            });

            autoTable(doc, {
                head: headers,
                body: body,
                startY: 120,
                theme: 'grid',
                headStyles: { fillColor: mode === 'client' ? [30, 41, 59] : [15, 23, 42], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center', textColor: [51, 65, 85] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
                    5: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
                },
                margin: { left: 15, right: 15 }
            });

            // 4. SIGNATURE SECTION
            let footerY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 35;
            if (footerY > pageHeight - 60) { doc.addPage(); footerY = 30; }

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text('This is a computer-generated operational report for missions logistical audit.', 15, footerY);

            const sigX = pageWidth - 75;
            if (signature) {
                doc.addImage(signature, 'PNG', sigX, footerY - 20, 55, 22);
            }
            doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6);
            doc.line(sigX - 5, footerY + 5, pageWidth - 15, footerY + 5);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text((selectedCompany?.ownerName || 'AUTHORISED SIGNATORY').toUpperCase(), sigX - 2, footerY + 12);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text('Operations Controller', sigX - 2, footerY + 17);
            doc.text(`${selectedCompany?.name || 'LogKaro'}`, sigX - 2, footerY + 21);

            doc.save(`${mode === 'client' ? 'Client' : 'Internal'}_Report_${(selectedEventDetails.event?.name || 'Report').replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Error generating mission PDF report: " + error.message);
        }
    };

    return (
        <div className="container-fluid" style={{ paddingBottom: '60px' }}>
            <SEO title="Event Command Center" description="Unified tracking for company and external vehicles assigned to events." />

            {/* ═══ PREMIUM DYNAMIC HEADER ═══ */}
            <div className="header-top" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'clamp(20px, 4vw, 40px)',
                marginBottom: 'clamp(30px, 5vw, 48px)',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 20px)' }}>
                    <div style={{
                        width: 'clamp(56px, 12vw, 72px)',
                        height: 'clamp(56px, 12vw, 72px)',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        borderRadius: 'clamp(14px, 3vw, 22px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        flexShrink: 0
                    }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: `radial-gradient(circle at 30% 30%, var(--primary)33, transparent 70%)` }}></div>
                        <Target size={32} color="var(--primary)" style={{ filter: `drop-shadow(0 0 10px var(--primary)66)` }} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div className="pulse-dot"></div>
                            <span className="label-text">Mission Control</span>
                        </div>
                        <h1 className="main-title">
                            Event <span className="text-gradient-yellow">Logistics</span>
                        </h1>
                    </div>
                </div>

                <div className="flex-resp" style={{ flex: 1, justifyContent: 'flex-end', width: '100%', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                            <div className="calendar-controls">
                                <button onClick={() => shiftMonth(-1)} className="shift-btn"><ChevronLeft size={16} /></button>
                                <button onClick={() => shiftMonth(1)} className="shift-btn"><ChevronRight size={16} /></button>

                                {selectedDay !== 'All' && (
                                    <motion.button
                                        whileHover={{ background: 'rgba(251,191,36,0.2)' }}
                                        onClick={() => setSelectedDay('All')}
                                        style={{
                                            padding: '0 12px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: 'rgba(251,191,36,0.1)',
                                            border: 'none',
                                            color: 'var(--primary)',
                                            fontSize: '11px',
                                            fontWeight: '950',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Calendar size={14} /> Full Month
                                    </motion.button>
                                )}

                                <select
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(e.target.value === 'All' ? 'All' : parseInt(e.target.value));
                                        setSelectedDay('All');
                                    }}
                                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'white', height: '36px', borderRadius: '10px', padding: '0 8px', outline: 'none', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
                                >
                                    <option value="All" style={{ background: '#0a0f1d' }}>Full Year</option>
                                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map(m => (
                                        <option key={m} value={m} style={{ background: '#0a0f1d' }}>
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(parseInt(e.target.value));
                                        setSelectedDay('All');
                                    }}
                                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'white', height: '36px', borderRadius: '10px', padding: '0 8px', outline: 'none', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
                                >
                                    {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y} style={{ background: '#0a0f1d' }}>FY {y}-{y + 1}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid - High Fidelity */}
                    <div className="stats-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        flex: '1',
                        maxWidth: '600px',
                        width: '100%'
                    }}>
                        {[
                            { label: 'Total Events', value: totalEvents, color: 'var(--primary)', icon: <Target size={18} /> },
                            { label: 'Total Revenue', value: `₹${totalAmount.toLocaleString()}`, color: '#10b981', icon: <Wallet size={18} /> },
                            { label: 'Fleet Amount', value: `₹${fleetAmount.toLocaleString()}`, color: '#38bdf8', icon: <Car size={18} /> },
                            { label: 'External Amount', value: `₹${extAmount.toLocaleString()}`, color: '#a855f7', icon: <Users size={18} /> },
                        ].map((s, i) => (
                            <motion.div key={s.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    padding: '12px 16px', borderRadius: '16px',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    border: `1px solid rgba(255,255,255,0.05)`,
                                    borderLeft: `3px solid ${s.color}`,
                                    display: 'flex', flexDirection: 'column', gap: '4px',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '8px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{s.label}</span>
                                    <div style={{ color: s.color, opacity: 0.5 }}>{s.icon}</div>
                                </div>
                                <span style={{ color: 'white', fontSize: '16px', fontWeight: '900' }}>{s.value}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ PREMIUM STATUS NAVIGATION ═══ */}
            <div className="status-nav" style={{
                position: 'relative',
                marginBottom: 'clamp(24px, 5vw, 40px)',
                padding: 'clamp(8px, 2vw, 12px)',
                background: 'rgba(15, 23, 42, 0.45)',
                borderRadius: 'clamp(20px, 4vw, 30px)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 'clamp(8px, 2vw, 12px)',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                flexWrap: 'wrap'
            }}>
                {[
                    { id: 'Start', label: 'Upcoming', color: '#10b981', icon: <Navigation size={20} />, count: filteredMasterByDate.filter(e => e.visualStatus === 'Upcoming').length },
                    { id: 'Running', label: 'Live Now', color: 'var(--primary)', icon: <Target size={20} />, count: filteredMasterByDate.filter(e => e.visualStatus === 'Running').length },
                    { id: 'Close', label: 'Completed', color: '#f87171', icon: <FileSpreadsheet size={20} />, count: filteredMasterByDate.filter(e => e.visualStatus === 'Closed').length }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setStatusTab(t.id)}
                        style={{
                            flex: 1,
                            minWidth: 'clamp(140px, 30vw, 200px)',
                            padding: 'clamp(12px, 3vw, 16px)',
                            borderRadius: 'clamp(14px, 3vw, 20px)',
                            border: 'none',
                            background: statusTab === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: statusTab === t.id ? 'white' : 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(8px, 2vw, 12px)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            width: 'clamp(36px, 10vw, 44px)',
                            height: 'clamp(36px, 10vw, 44px)',
                            borderRadius: 'clamp(10px, 3vw, 14px)',
                            background: statusTab === t.id ? `${t.color}25` : 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: statusTab === t.id ? t.color : 'rgba(255,255,255,0.4)',
                            transition: '0.3s',
                            boxShadow: statusTab === t.id ? `0 0 15px ${t.color}30` : 'none',
                            position: 'relative',
                            flexShrink: 0
                        }}>
                            {t.id === 'Running' && statusTab === 'Running' && (
                                <div style={{
                                    position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px',
                                    background: 'var(--primary)', borderRadius: '50%', border: '2px solid #0a0f1d',
                                    animation: 'pulse 1.5s infinite'
                                }} />
                            )}
                            {t.icon}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: '950', letterSpacing: '-0.2px' }}>{t.label}</div>
                            <div style={{ fontSize: 'clamp(8px, 2vw, 10px)', color: 'rgba(255,255,255,0.25)', fontWeight: '800', marginTop: '2px', textTransform: 'uppercase' }}>
                                {t.count} {t.count === 1 ? 'Event' : 'Events'}
                            </div>
                        </div>
                        {statusTab === t.id && (
                            <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: '0', left: '20%', right: '20%', height: '3px', background: t.color, borderRadius: '3px 3px 0 0', boxShadow: `0 0 10px ${t.color}` }} />
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ COMMAND BAR ═══ */}
            <div className="command-bar" style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '32px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 'clamp(280px, 100%, 400px)' }}>
                    <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} size={18} />
                    <input
                        className="premium-input-event"
                        placeholder="Scan missions, client tags, or venue signals..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', height: '56px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.06)', padding: '0 20px 0 55px', color: 'white',
                            fontSize: '14px', fontWeight: '600', outline: 'none', transition: '0.3s',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    />
                </div>

                <div className="flex-resp" style={{ display: 'flex', gap: '12px', width: 'auto' }}>
                    {statusTab !== 'Close' && (
                        <button onClick={() => {
                            setIsEditingEvent(false);
                            setEventFormData({
                                name: '',
                                client: '',
                                date: getToday(),
                                status: statusTab === 'Running' ? 'Running' : 'Upcoming'
                            });
                            setShowEventModal(true);
                        }}
                            className="primary-btn-premium"
                            style={{
                                height: '56px', padding: '0 24px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #d97706 100%)', color: 'black',
                                fontSize: '13px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px',
                                boxShadow: '0 10px 30px rgba(251,191,36,0.2)', transition: '0.3s', letterSpacing: '0.5px',
                                flex: 1, whiteSpace: 'nowrap'
                            }}
                        >
                            <PlusCircle size={20} strokeWidth={2.5} /> NEW MISSION
                        </button>
                    )}
                    {statusTab !== 'Start' && (
                        <button onClick={() => {
                            setIsEditingDuty(false);
                            setDutyFormData({
                                carNumber: '', model: '', dropLocation: '', date: getToday(), eventId: '', dutyAmount: '', driverName: '', vehicleSource: 'Fleet', dutyType: '', remarks: '', guestCount: ''
                            });
                            setShowDutyModal(true);
                        }}
                            style={{
                                height: '56px', padding: '0 20px', borderRadius: '18px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)',
                                color: '#10b981', fontSize: '13px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer', transition: '0.3s', letterSpacing: '0.5px', flex: 1, whiteSpace: 'nowrap'
                            }}
                        >
                            <Car size={20} strokeWidth={2.5} /> Add Vehicle
                        </button>
                    )}
                    {statusTab === 'Close' && (
                        <button onClick={exportExcel}
                            style={{
                                height: '56px', padding: '0 18px', borderRadius: '18px', border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.05)',
                                color: '#38bdf8', fontSize: '13px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer', transition: '0.3s', letterSpacing: '0.5px', flex: 1
                            }}
                            title="Export all completed duties to Excel"
                        >
                            <Download size={20} strokeWidth={2.5} /> EXCEL
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ EVENT ROW LIST ═══ */}
            <div className="event-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(12px, 3vw, 16px)',
                marginBottom: '40px'
            }}>
                {events.length === 0 ? (
                    <div style={{ padding: 'clamp(40px, 8vw, 80px)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Target size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                        <h3 style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '800', fontSize: 'clamp(16px, 4vw, 20px)' }}>No {statusTab} Events Found</h3>
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>Search returned no matching master records.</p>
                    </div>
                ) : events.filter(e => {
                    if (searchTerm) return e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.client.toLowerCase().includes(searchTerm.toLowerCase());
                    return true;
                }).map((ev, i) => (
                    <motion.div
                        key={ev._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => fetchEventDetails(ev._id)}
                        className="event-row event-row-hover"
                        style={{
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 'clamp(18px, 4vw, 24px)',
                            padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 24px)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(16px, 4vw, 24px)',
                            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backdropFilter: 'blur(20px)',
                            position: 'relative',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* 1. Date Block */}
                        {statusTab !== 'Start' && (
                            <div className="date-block" style={{
                                width: 'clamp(60px, 15vw, 80px)', padding: '10px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', flexShrink: 0
                            }}>
                                <div style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase' }}>{new Date(ev.date).toLocaleDateString('en-IN', { month: '2-digit' }) === 'Invalid Date' ? '--' : new Date(ev.date).toLocaleDateString('en-IN', { month: 'short' })}</div>
                                <div style={{ fontSize: 'clamp(20px, 5vw, 24px)', color: 'white', fontWeight: '950', lineHeight: 1 }}>{new Date(ev.date).getDate()}</div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>{new Date(ev.date).getFullYear()}</div>
                            </div>
                        )}

                        {/* 2. Event Body */}
                        <div className="event-body" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <h3 style={{ color: 'white', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '950', margin: 0, letterSpacing: '-0.3px' }}>{ev.name}</h3>
                                <div className="status-badge" style={{
                                    padding: '3px 10px', borderRadius: '8px', fontSize: '8px', fontWeight: '900',
                                    background: ev.visualStatus === 'Running' ? 'rgba(251,191,36,0.1)' : ev.visualStatus === 'Upcoming' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
                                    color: ev.visualStatus === 'Running' ? 'var(--primary)' : ev.visualStatus === 'Upcoming' ? '#10b981' : '#f87171',
                                    border: `1px solid ${ev.visualStatus === 'Running' ? 'rgba(251,191,36,0.2)' : ev.visualStatus === 'Upcoming' ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                    {ev.visualStatus === 'Running' ? 'LIVE NOW' : ev.visualStatus.toUpperCase()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '700' }}>
                                    <Briefcase size={14} color="var(--primary)" /> {ev.client}
                                </div>
                                {ev.location && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: '600' }}>
                                        <MapPin size={14} color="#f87171" /> {ev.location}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Resource Matrix */}
                        <div className="resource-matrix" style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '0 24px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '900', marginBottom: '2px', letterSpacing: '0.5px' }}>FLEET</div>
                                <div style={{ color: '#38bdf8', fontSize: '16px', fontWeight: '950' }}>{ev.fleetCount || 0}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '900', marginBottom: '2px', letterSpacing: '0.5px' }}>EXTERNAL</div>
                                <div style={{ color: '#a855f7', fontSize: '16px', fontWeight: '950' }}>{ev.externalCount || 0}</div>
                            </div>
                        </div>

                        {/* 4. Settlement Summary */}
                        {statusTab !== 'Start' && (
                            <div className="settlement-summary" style={{
                                background: 'rgba(16,185,129,0.05)', padding: '10px 16px', borderRadius: '14px',
                                border: '1px solid rgba(16,185,129,0.1)', minWidth: '120px', textAlign: 'right'
                            }}>
                                <div style={{ fontSize: '8px', color: 'rgba(16,185,129,0.5)', fontWeight: '900', marginBottom: '2px', textTransform: 'uppercase' }}>Duty Value</div>
                                <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '950' }}>₹{Number(ev.totalRevenue || 0).toLocaleString()}</div>
                            </div>
                        )}

                        {/* 5. Actions */}
                        <div className="actions-block" style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleEditEvent(ev); }}
                                style={{
                                    width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}
                                className="action-btn-list"
                            >
                                <Edit size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev._id); }}
                                style={{
                                    width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(244,63,94,0.08)',
                                    border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}
                                className="action-btn-list"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ═══ MASTER GRID FOCUS ═══ */}
            {/* Removed global duty logs as requested by user to simplify and focus UI on Master Events */}

            {/* ═══ DUTY LOG MODAL ═══ */}
            <AnimatePresence>
                {showDutyModal && (
                    <div className="modal-overlay" style={{ zIndex: 10000 }}>
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            className="modal-container"
                            style={{
                                width: 'min(95%, 650px)',
                                borderRadius: '32px',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '95vh',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Dynamic Header */}
                            <div style={{
                                background: 'linear-gradient(to right, rgba(251, 191, 36, 0.05), rgba(14, 165, 233, 0.03))',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                padding: 'clamp(20px, 4vw, 28px) clamp(20px, 5vw, 32px)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backdropFilter: 'blur(20px)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 'clamp(32px, 8vw, 40px)', height: 'clamp(32px, 8vw, 40px)', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Briefcase size={20} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: '950', color: 'white', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                                            {isEditingDuty ? 'Update Duty' : 'Log Assignment'}
                                        </h3>
                                        <p className="hide-mobile" style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', letterSpacing: '0.2px', marginTop: '4px' }}>Operational Command Center Entry Flow</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDutyModal(false)} className="close-btn" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}><X size={20} /></button>
                            </div>

                            {/* Scrollable Body */}
                            <form onSubmit={handleSubmitDuty} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
                                <div style={{ padding: 'clamp(20px, 5vw, 32px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }} className="premium-scroll">

                                    {/* Section 1: Logistics Context */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {['Fleet', 'External'].map(src => (
                                                <button key={src} type="button" onClick={() => setDutyFormData(prev => ({ ...prev, vehicleSource: src }))}
                                                    style={{
                                                        flex: 1, height: '48px', borderRadius: '14px', border: `1px solid ${dutyFormData.vehicleSource === src ? (src === 'Fleet' ? '#10b98150' : 'var(--primary)50') : 'rgba(255,255,255,0.06)'}`,
                                                        background: dutyFormData.vehicleSource === src ? (src === 'Fleet' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)') : 'rgba(255,255,255,0.02)',
                                                        color: dutyFormData.vehicleSource === src ? (src === 'Fleet' ? '#10b981' : 'var(--primary)') : 'rgba(255,255,255,0.3)',
                                                        fontWeight: '900', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                                    }}>
                                                    {src === 'Fleet' ? <Building2 size={16} /> : <TruckIcon size={16} />}
                                                    {src.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="form-grid-2">
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Target size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                                    <label className="premium-label">Operational Event</label>
                                                </div>
                                                <select required value={dutyFormData.eventId} onChange={e => setDutyFormData({ ...dutyFormData, eventId: e.target.value })} className="premium-compact-input" style={{ appearance: 'none', height: '50px' }}>
                                                    <option value="" disabled>Select Master Event</option>
                                                    {events.map(e => <option key={e._id} value={e._id}>{e.name} • {e.client}</option>)}
                                                </select>
                                            </div>
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Calendar size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                                    <label className="premium-label">Log Date</label>
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <PremiumDateInput
                                                        value={dutyFormData.date}
                                                        onChange={val => setDutyFormData({ ...dutyFormData, date: val })}
                                                        required
                                                        style={{ colorScheme: 'dark', height: '50px', width: '100%', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 15px', borderRadius: '10px' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Resource Allocation */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: 'clamp(15px, 4vw, 24px)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div className="form-grid-2">
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Car size={12} color="#10b981" />
                                                    <label className="premium-label">Vehicle Numbers</label>
                                                </div>
                                                <input type="text" list={dutyFormData.vehicleSource === 'Fleet' ? "masterCars" : undefined} required value={dutyFormData.carNumber} onChange={e => handleCarNumberChange(e.target.value)} className="premium-compact-input" placeholder="Search Vehicle..." style={{ textTransform: 'uppercase', height: '50px' }} />
                                                {dutyFormData.vehicleSource === 'Fleet' && (
                                                    <datalist id="masterCars">
                                                        {allVehiclesMaster.map(v => <option key={v._id} value={v.carNumber} />)}
                                                    </datalist>
                                                )}
                                            </div>
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TruckIcon size={12} color="#10b981" />
                                                    <label className="premium-label">Vehicle Specification</label>
                                                </div>
                                                <input type="text" value={dutyFormData.model} onChange={e => setDutyFormData({ ...dutyFormData, model: e.target.value })} className="premium-compact-input" placeholder="e.g. Innova Crysta" style={{ height: '50px' }} />
                                            </div>
                                        </div>

                                        <div className="form-grid-2">
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={12} color="#10b981" />
                                                    <label className="premium-label">Operator / Driver</label>
                                                </div>
                                                <input type="text" value={dutyFormData.driverName} onChange={e => setDutyFormData({ ...dutyFormData, driverName: e.target.value })} className="premium-compact-input" placeholder="Enter full name" style={{ height: '50px' }} />
                                            </div>
                                            <div className="premium-input-group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Users size={12} color="#10b981" />
                                                    <label className="premium-label">Guest / Members Count</label>
                                                </div>
                                                <input type="number" value={dutyFormData.guestCount} onChange={e => setDutyFormData({ ...dutyFormData, guestCount: e.target.value })} className="premium-compact-input" placeholder="e.g. 4" style={{ height: '50px' }} />
                                            </div>
                                        </div>

                                    </div>

                                    {/* Section 3: Logistic Details */}
                                    <div className="form-grid-2">
                                        <div className="premium-input-group">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Briefcase size={12} color="var(--primary)" />
                                                <label className="premium-label">Service Category</label>
                                            </div>
                                            <input type="text" list="eventDutyTypes" value={dutyFormData.dutyType} onChange={e => setDutyFormData({ ...dutyFormData, dutyType: e.target.value })} className="premium-compact-input" placeholder="e.g. Airport Transfer" style={{ height: '50px' }} />
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                                {['Airport PickUp', 'Airport Drop', 'RSD PickUp', 'RSD Drop', 'Bus Stand PickUp', 'Bus Stand Drop'].map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setDutyFormData({ ...dutyFormData, dutyType: t })}
                                                        style={{
                                                            fontSize: '9px',
                                                            fontWeight: '900',
                                                            background: dutyFormData.dutyType === t ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                            color: dutyFormData.dutyType === t ? 'var(--primary)' : 'rgba(255, 255, 255, 0.4)',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            border: `1px solid ${dutyFormData.dutyType === t ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                            cursor: 'pointer',
                                                            transition: '0.2s'
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                            <datalist id="eventDutyTypes">
                                                {dutyTypeSuggestions.map(t => <option key={t} value={t} />)}
                                            </datalist>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Wallet size={12} color="#10b981" />
                                                <label className="premium-label">Revenue Amount (₹)</label>
                                            </div>
                                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '900', color: '#10b981' }}>₹</span>
                                                <input type="number" required value={dutyFormData.dutyAmount} onChange={e => setDutyFormData({ ...dutyFormData, dutyAmount: e.target.value })} className="premium-compact-input" placeholder="0" style={{ paddingLeft: '35px', color: '#10b981', fontWeight: '800', height: '50px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="premium-input-group" style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Navigation size={12} color="var(--primary)" />
                                            <label className="premium-label">Operational Destination</label>
                                        </div>
                                        <input type="text" list="eventDropLocs" value={dutyFormData.dropLocation} onChange={e => setDutyFormData({ ...dutyFormData, dropLocation: e.target.value })} className="premium-compact-input" placeholder="Specific drop point or venue..." style={{ height: '50px' }} />
                                        <datalist id="eventDropLocs">
                                            {dropLocationSuggestions.map(loc => <option key={loc} value={loc} />)}
                                        </datalist>
                                    </div>
                                    <div className="premium-input-group" style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                            <label className="premium-label">Operational Remarks / Guest Names</label>
                                        </div>
                                        <textarea rows="2" value={dutyFormData.remarks} onChange={e => setDutyFormData({ ...dutyFormData, remarks: e.target.value })} className="premium-compact-input" placeholder="Enter important mission notes here..." style={{ height: 'auto', padding: '12px', minHeight: '80px', resize: 'none' }} />
                                    </div>
                                </div>

                                {/* Fixed Footer */}
                                <div style={{
                                    padding: 'clamp(20px, 4vw, 24px) clamp(20px, 5vw, 32px)',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    display: 'flex',
                                    gap: '12px'
                                }}>
                                    <button type="button" onClick={() => setShowDutyModal(false)} style={{
                                        flex: 1, height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: '13px'
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 2, height: '50px', borderRadius: '14px', background: 'linear-gradient(to right, var(--primary), var(--primary))',
                                        color: 'black', fontWeight: '900', fontSize: '13px', border: 'none'
                                    }}>
                                        {isEditingDuty ? 'SAVE CHANGES' : 'GENERATE LOG'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* ═══ EVENT DETAILS MODAL ═══ */}
            <AnimatePresence>
                {showDetailsModal && selectedEventDetails && (
                    <div className="modal-overlay" style={{ zIndex: 10000 }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-container"
                            style={{
                                width: 'min(98%, 1000px)',
                                maxHeight: '95vh',
                                background: '#0a0f1d',
                                borderRadius: 'clamp(24px, 4vw, 32px)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ padding: 'clamp(20px, 4vw, 32px)', background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <h2 style={{ color: 'white', fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: '950', margin: 0 }}>{selectedEventDetails.event.name}</h2>
                                        {(() => {
                                            const evDate = toISTDateString(new Date(selectedEventDetails.event.date));
                                            const todayStr = todayIST();
                                            let vStat = selectedEventDetails.event.status || 'Upcoming';
                                            if (vStat === 'Upcoming' && evDate <= todayStr) vStat = 'Running';

                                            return (
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '950',
                                                    background: vStat === 'Running' ? 'var(--primary)33' : vStat === 'Closed' ? '#f8717133' : '#10b98133',
                                                    color: vStat === 'Running' ? 'var(--primary)' : vStat === 'Closed' ? '#f87171' : '#10b981',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {vStat}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '700' }}>
                                            <Building2 size={16} color="var(--primary)" /> {selectedEventDetails.event.client}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '700' }}>
                                            <Calendar size={16} color="var(--primary)" /> {formatDateIST(selectedEventDetails.event.date)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {selectedEventDetails.event?.status === 'Closed' && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => exportEventSpecificExcel(selectedEventDetails)} className="hide-mobile" style={{ height: '40px', padding: '0 15px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: '800', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><FileSpreadsheet size={16} /> EXCEL</button>
                                            <button onClick={() => handleExportEventPDF('client')} style={{ height: '40px', padding: '0 15px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: '800', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><Download size={16} /> PDF</button>
                                        </div>
                                    )}
                                    <button onClick={() => setShowDetailsModal(false)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24} /></button>
                                </div>
                            </div>

                            <div style={{ padding: 'clamp(16px, 4vw, 32px)', overflowY: 'auto' }} className="premium-scroll">
                                {/* Stats Summary */}
                                <div className="stats-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '32px',
                                    width: '100%'
                                }}>
                                    {[
                                        { label: 'Total Duties', value: (selectedEventDetails.fleetDuties.length + selectedEventDetails.externalDuties.length), color: 'var(--primary)', icon: <TruckIcon size={18} />, sub: 'All Resources' },
                                        { label: 'Fleet Revenue', value: `₹${(selectedEventDetails.fleetDuties.reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0)).toLocaleString()}`, color: '#38bdf8', icon: <Car size={18} />, sub: `${selectedEventDetails.fleetDuties.length} Fleet` },
                                        { label: 'External Rev', value: `₹${(selectedEventDetails.externalDuties.reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0)).toLocaleString()}`, color: '#a855f7', icon: <Users size={18} />, sub: `${selectedEventDetails.externalDuties.length} Market` },
                                        { label: 'Grand Total', value: `₹${([...selectedEventDetails.externalDuties, ...selectedEventDetails.fleetDuties].reduce((sum, d) => sum + (Number(d.dutyAmount) || 0), 0)).toLocaleString()}`, color: '#10b981', icon: <Target size={18} />, sub: 'Master Settlement' },
                                    ].map((s, i) => (
                                        <div key={s.label}
                                            style={{
                                                padding: '16px', borderRadius: '20px',
                                                background: 'rgba(15, 23, 42, 0.4)',
                                                border: `1px solid rgba(255,255,255,0.05)`,
                                                borderLeft: `3px solid ${s.color}`,
                                                display: 'flex', flexDirection: 'column', gap: '4px',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '8px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{s.label}</span>
                                                <div style={{ color: s.color, opacity: 0.5 }}>{s.icon}</div>
                                            </div>
                                            <span style={{ color: 'white', fontSize: '18px', fontWeight: '950' }}>{s.value}</span>
                                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>{s.sub}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* ═══ CONSOLIDATED DUTY LOG ═══ */}
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                                }}>
                                    <div style={{
                                        padding: '16px 24px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: 'rgba(255,255,255,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Briefcase size={18} color="var(--primary)" />
                                            <h4 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: '950' }}>OPERATIONAL LOGS</h4>
                                        </div>
                                    </div>

                                    <div className="hide-mobile">
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                    <th style={{ padding: '16px 24px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>TIMELINE</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>VEHICLE / RESOURCE</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>LOGISTICS</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'right', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>SETTLEMENT</th>
                                                    <th style={{ padding: '16px 24px', textAlign: 'right', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties]
                                                    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                                                    .map((d) => (
                                                        <tr key={d._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{formatDateIST(d.date || d.createdAt)}</div>
                                                                <div style={{ color: 'var(--primary)', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase' }}>{new Date(d.date || d.createdAt).toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: d.vehicleSource === 'Fleet' ? 'rgba(16,185,129,0.1)' : 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Car size={18} color={d.vehicleSource === 'Fleet' ? '#10b981' : '#a855f7'} />
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: 'white', fontWeight: '900', fontSize: '13px' }}>{d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0] || 'N/A'}</div>
                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{d.driver?.name || d.driverName || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <div className="badge-duty" style={{ fontSize: '10px' }}>{d.dutyType || 'General'}</div>
                                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '4px' }}>{d.dropLocation || '—'}</div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                                <div style={{ color: '#10b981', fontWeight: '900', fontSize: '14px' }}>₹{Number(d.dutyAmount || 0).toLocaleString()}</div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleEditDuty(d); }} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><Edit size={14} /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteDuty(d._id, d.isAttendance); }} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="show-mobile" style={{ padding: '16px' }}>
                                        {[...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties]
                                            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                                            .map((d) => (
                                                <div key={d._id} style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '16px',
                                                    padding: '16px',
                                                    marginBottom: '12px',
                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                        <div>
                                                            <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{formatDateIST(d.date || d.createdAt)}</div>
                                                            <div style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: '800' }}>{d.vehicleSource} Resource</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#10b981', fontWeight: '950', fontSize: '16px' }}>₹{Number(d.dutyAmount || 0).toLocaleString()}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px', fontWeight: '900' }}>SETTLEMENT</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: d.vehicleSource === 'Fleet' ? '#10b98120' : '#a855f720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Car size={20} color={d.vehicleSource === 'Fleet' ? '#10b981' : '#a855f7'} />
                                                        </div>
                                                        <div>
                                                            <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{d.vehicle?.carNumber || d.vehicleNumber || d.carNumber?.split('#')[0] || 'N/A'}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{d.driver?.name || d.driverName || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div className="badge-duty" style={{ fontSize: '10px' }}>{d.dutyType || 'General'}</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => handleEditDuty(d)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}><Edit size={16} /></button>
                                                            <button onClick={() => handleDeleteDuty(d._id, d.isAttendance)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e' }}><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {[...selectedEventDetails.fleetDuties, ...selectedEventDetails.externalDuties].length === 0 && (
                                        <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                            <TruckIcon size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                            <p style={{ margin: 0, fontWeight: '800', fontSize: '14px' }}>No operational logs recorded.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══ CONFIGURE EVENT MODAL ═══ */}
            <AnimatePresence>
                {showEventModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.98 }}
                            className="modal-container small"
                            style={{
                                width: 'min(95%, 480px)',
                                borderRadius: '32px',
                                background: '#0a101f',
                                border: '1px solid rgba(255,255,255,0.1)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                background: 'linear-gradient(to bottom right, rgba(251, 191, 36, 0.08), rgba(0,0,0,0))',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                padding: 'clamp(20px, 4vw, 28px) clamp(20px, 5vw, 32px)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 'clamp(32px, 8vw, 40px)', height: 'clamp(32px, 8vw, 40px)', borderRadius: '10px', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Target size={18} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: '950', color: 'white', letterSpacing: '-0.5px' }}>{isEditingEvent ? 'Update Event' : 'New Event'}</h3>
                                        <p className="hide-mobile" style={{ margin: 4, fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Create a high-level operational master</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowEventModal(false)} className="close-btn" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'white',
                                    padding: '8px'
                                }}><X size={18} /></button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleCreateEvent} style={{ padding: 'clamp(20px, 5vw, 32px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="form-grid-2">
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Target size={12} color="var(--primary)" />
                                            <label className="premium-label">Event Name *</label>
                                        </div>
                                        <input type="text" required value={eventFormData.name} onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })} className="premium-compact-input" placeholder="Event" style={{ height: '52px' }} />
                                    </div>
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building2 size={12} color="var(--primary)" />
                                            <label className="premium-label">Client *</label>
                                        </div>
                                        <input type="text" required value={eventFormData.client} onChange={e => setEventFormData({ ...eventFormData, client: e.target.value })} className="premium-compact-input" placeholder="Client Name" style={{ height: '52px' }} />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={12} color="var(--primary)" />
                                            <label className="premium-label">Focus Date</label>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <PremiumDateInput
                                                value={eventFormData.date}
                                                onChange={val => setEventFormData({ ...eventFormData, date: val })}
                                                required
                                                style={{ colorScheme: 'dark', height: '52px', width: '100%', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '0 15px', borderRadius: '10px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="premium-input-group">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Target size={12} color="var(--primary)" />
                                            <label className="premium-label">Phase / Status</label>
                                        </div>
                                        <select value={eventFormData.status} onChange={e => setEventFormData({ ...eventFormData, status: e.target.value })} className="premium-compact-input" style={{ height: '52px' }}>
                                            {!isEditingEvent && statusTab !== 'Running' && <option value="Upcoming">Upcoming (Start)</option>}
                                            <option value="Running">Running</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowEventModal(false)} className="hide-mobile" style={{
                                        flex: 1, height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: '14px'
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 2, height: '56px', borderRadius: '16px', background: 'linear-gradient(to right, var(--primary), var(--primary))',
                                        color: 'black', fontWeight: '900', fontSize: '15px', letterSpacing: '1px', border: 'none'
                                    }}>{isEditingEvent ? 'UPDATE' : 'SUBMIT'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .premium-icon-bg { width: clamp(40px,10vw,50px); height: clamp(40px,10vw,50px); background: linear-gradient(135deg, white, #f8fafc); border-radius: 16px; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 8px; }
                .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); animation: pulse 2s infinite; }
                .label-text { font-size: clamp(9px,2.5vw,10px); font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 1px; text-transform: uppercase; }
                .main-title { color: white; font-size: clamp(24px, 5vw, 32px); font-weight: 900; margin: 0; letter-spacing: -1px; }
                .text-gradient-yellow { background: linear-gradient(135deg, var(--primary) 0%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .subtitle-text { margin-top: 4px; font-size: 13px; color: rgba(255,255,255,0.6); margin: 0; }
                .flex-resp { display: flex; flex-wrap: wrap; gap: 16px; }
                .stat-card { padding: 12px 20px; min-width: 150px; display: flex; flex-direction: column; position: relative; overflow: hidden; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); }
                .stat-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                .stat-value { color: white; font-size: 20px; font-weight: 900; }
                .stat-unit { color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 700; margin-left: 4px; }
                
                .filter-container { display: flex; flex-wrap: wrap; gap: 12px; padding: 20px; align-items: center; background: rgba(15, 23, 42, 0.4) !important; margin-bottom: 20px; }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); }
                .search-input { width: 100%; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding-left: 45px; color: white; outline: none; transition: 0.3s; }
                .search-input:focus { border-color: var(--primary); background: rgba(0,0,0,0.3); }
                .select-field { flex: 1 1 140px; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; color: white; padding: 0 15px; outline: none; cursor: pointer; }
                .select-field option { background: #1e293b; color: white; }
                
                .calendar-controls { display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.25); padding: 4px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
                .shift-btn { width: 36px; height: 36px; border-radius: 12px; background: rgba(255,255,255,0.03); border: none; color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .shift-btn:hover { background: rgba(255,255,255,0.08); color: white; }
                .date-inputs { display: flex; gap: 5px; }
                .date-chip { padding: 0 15px; height: 36px; display: flex; align-items: center; gap: 8px; cursor: pointer; border-radius: 10px; position: relative; overflow: hidden; border: 1px solid transparent; }
                .date-chip.from { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.2); }
                .date-chip.to { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); }
                .date-chip span { font-size: 9px; font-weight: 900; opacity: 0.6; }
                .date-chip b { font-size: 11px; font-weight: 800; color: white; }
                .date-chip input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
                
                .toggle-btn-plus { width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; transition: 0.3s; }
                .toggle-btn-plus.active { background: var(--primary); color: black; }
                
                .action-buttons-row { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-top: 15px; flex-wrap: wrap; }
                .primary-btn { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 25px; border-radius: 14px; background: linear-gradient(135deg, var(--primary) 0%, #d97706 100%); color: black; font-weight: 800; border: none; cursor: pointer; box-shadow: 0 8px 15px rgba(251,191,36,0.2); transition: 0.2s; }
                .primary-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
                .secondary-btn { display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: white; font-weight: 700; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .secondary-btn:hover { background: rgba(255,255,255,0.08); }
                .target-input-inline { width: 60px; background: transparent; border: none; border-bottom: 2px solid rgba(251,191,36,0.5); color: var(--primary); font-weight: 900; font-size: 16px; outline: none; text-align: center; }

                /* ===== TABLE ===== */
                .main-table-container { padding: 0; border: 1px solid rgba(255,255,255,0.06); background: rgba(10, 16, 30, 0.6) !important; overflow: hidden; border-radius: 20px; }
                table { width: 100%; border-collapse: separate; border-spacing: 0; }
                th { padding: 16px 20px; text-align: left; background: rgba(255,255,255,0.025); color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; }
                .table-row-hover:hover { background: rgba(255,255,255,0.03) !important; }
                .table-row-hover td { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
                .table-row-hover:last-child td { border-bottom: none; }
                
                .action-btn-hover:hover { background: rgba(56,189,248,0.15) !important; color: #38bdf8 !important; border-color: rgba(56,189,248,0.3) !important; transform: scale(1.05); }
                .action-btn-hover-del:hover { background: rgba(244,63,94,0.15) !important; color: #f43f5e !important; border-color: rgba(244,63,94,0.3) !important; transform: scale(1.05); }

                /* ===== BADGES ===== */
                .badge-fleet { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
                .badge-ext { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; background: rgba(245,158,11,0.15); color: var(--primary); border: 1px solid rgba(245,158,11,0.3); }
                .badge-duty { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: rgba(251,191,36,0.12); color: var(--primary); border: 1px solid rgba(251,191,36,0.25); white-space: nowrap; }
                .badge-time { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); white-space: nowrap; }
                
                .amount-badge { display: inline-block; padding: 6px 14px; background: rgba(16,185,129,0.1); color: #10b981; font-weight: 900; font-size: 14px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.2); }

                /* ===== MODAL BASE (GLOBAL OVERLAYS) ===== */
                .modal-overlay { 
                    position: fixed; inset: 0; 
                    background: rgba(0,0,0,0.85); 
                    backdrop-filter: blur(14px); 
                    z-index: 2000; 
                    display: flex; justify-content: center; align-items: center; 
                    padding: clamp(10px, 3vw, 20px); 
                }

                .event-row-hover:hover { 
                    transform: translateX(8px); 
                    background: rgba(15, 23, 42, 0.6) !important;
                    border-color: rgba(251,191,36,0.2) !important;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.4) !important;
                }
                .action-btn-list:hover { 
                    transform: scale(1.1); 
                    filter: brightness(1.2);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }

                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .form-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                @media (max-width: 600px) { 
                    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; } 
                }
                
                .premium-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
                .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .premium-scroll::-webkit-scrollbar-thumb:hover { background: var(--primary); }

                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                
                @media (max-width: 1024px) {
                    .stats-grid { max-width: 100% !important; grid-template-columns: repeat(2, 1fr) !important; }
                }

                @media (max-width: 768px) { 
                    .flex-resp { flex-direction: column; }
                    .header-top { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
                    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; width: 100% !important; }
                    .status-nav { flex-wrap: wrap !important; }
                    .status-nav button { flex: 1 1 45% !important; padding: 12px !important; }
                    .command-bar { flex-direction: column !important; }
                    .command-bar > div { width: 100% !important; min-width: 100% !important; }
                    .event-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 20px !important; }
                    .event-row > div { width: 100% !important; border: none !important; padding: 0 !important; text-align: left !important; }
                    .event-row .resource-matrix { justify-content: flex-start !important; gap: 40px !important; }
                    .event-row .actions-block { justify-content: flex-end !important; }
                    .hide-mobile { display: none !important; }
                    .show-mobile { display: block !important; }
                }

                @media (max-width: 480px) {
                    .stats-grid { grid-template-columns: 1fr !important; }
                    .status-nav button { flex: 1 1 100% !important; }
                    .event-row .resource-matrix { gap: 20px !important; }
                }
            `}</style>
        </div>
    );
};

export default EventManagement;
