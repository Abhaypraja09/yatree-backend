import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions, Platform, Linking
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import {
    Search, Plus, Users, Calendar,
    ShieldCheck, Clock, MapPin, Phone,
    ChevronRight, Filter, ChevronLeft,
    UserPlus, Mail, Briefcase, Trash2,
    Lock, Unlock, ShieldAlert, CreditCard,
    Zap, BadgeIndianRupee, X, CheckCircle,
    XCircle, CalendarClock, Settings,
    ChevronDown, Edit3
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, formatTimeIST, toISTDateString } from '../utils/istUtils';
import OperationalBreakdown from '../components/OperationalBreakdown';

const { width, height } = Dimensions.get('window');

const StaffScreen = () => {
    const { selectedCompany } = useCompany();
    const [staffList, setStaffList] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [payroll, setPayroll] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('list'); // 'list', 'attendance', 'leaves', 'payroll'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showBackdateModal, setShowBackdateModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailStaff, setDetailStaff] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [isEditing, setIsEditing] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', mobile: '', username: '', password: '', salary: '', monthlyLeaveAllowance: '4',
        email: '', designation: '', shiftTiming: { start: '09:00', end: '18:00' },
        staffType: 'Company', joiningDate: todayIST()
    });

    const [backdateForm, setBackdateForm] = useState({
        staffId: '', date: todayIST(), status: 'present', punchInTime: '', punchOutTime: ''
    });

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const fetchData = async () => {
        if (!selectedCompany?._id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const [staffRes, attRes, payrollRes, leaveRes] = await Promise.all([
                api.get(`/api/admin/staff/${selectedCompany._id}`),
                api.get(`/api/admin/staff-attendance/${selectedCompany._id}`),
                api.get(`/api/admin/staff-attendance/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}`),
                api.get(`/api/admin/leaves/pending/${selectedCompany._id}`)
            ]);

            setStaffList(staffRes.data || []);
            setAttendanceList(attRes.data || []);
            setPayroll(payrollRes.data.report || []);
            setPendingLeaves(leaveRes.data || []);
        } catch (err) {
            console.error('Staff fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [selectedCompany, selectedMonth, selectedYear]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAction = async (id, status) => {
        try {
            await api.patch(`/api/admin/leaves/${id}`, { status });
            Alert.alert('Success', `Leave ${status}`);
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Update failed');
        }
    };

    const toggleStaffStatus = async (item) => {
        const newStatus = item.status === 'blocked' ? 'active' : 'blocked';
        try {
            await api.put(`/api/admin/staff/${item._id}`, { status: newStatus });
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Status toggle failed');
        }
    };

    const handleAddStaff = async () => {
        if (!formData.name || !formData.mobile || !formData.username) {
            return Alert.alert('Error', 'Required fields missing');
        }
        setSubmitting(true);
        try {
            const payload = { ...formData, companyId: selectedCompany._id };
            if (isEditing) {
                await api.put(`/api/admin/staff/${editingStaffId}`, payload);
            } else {
                await api.post('/api/admin/staff', payload);
            }
            setShowAddModal(false);
            fetchData();
            Alert.alert('Success', isEditing ? 'Staff updated' : 'Staff added');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditStaff = (staff) => {
        setIsEditing(true);
        setEditingStaffId(staff._id);
        setFormData({
            name: staff.name, mobile: staff.mobile, username: staff.username,
            password: '', salary: staff.salary?.toString() || '', monthlyLeaveAllowance: staff.monthlyLeaveAllowance?.toString() || '4',
            email: staff.email || '', designation: staff.designation || '',
            shiftTiming: staff.shiftTiming || { start: '09:00', end: '18:00' },
            staffType: staff.staffType || 'Company', joiningDate: staff.joiningDate?.split('T')[0] || todayIST()
        });
        setShowAddModal(true);
    };

    const handleBackdate = async () => {
        if (!backdateForm.staffId || !backdateForm.date) return Alert.alert('Error', 'Staff and Date required');
        setSubmitting(true);
        try {
            await api.post('/api/admin/staff-attendance/backdate', {
                ...backdateForm,
                companyId: selectedCompany._id
            });
            setShowBackdateModal(false);
            fetchData();
            Alert.alert('Success', 'Attendance recorded');
        } catch (err) {
            Alert.alert('Error', 'Failed to save');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.mobile?.includes(searchTerm)
    );

    const filteredPayroll = payroll.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const shiftMonth = (val) => {
        let nMonth = selectedMonth + val;
        let nYear = selectedYear;
        if (nMonth < 1) { nMonth = 12; nYear--; }
        if (nMonth > 12) { nMonth = 1; nYear++; }
        setSelectedMonth(nMonth);
        setSelectedYear(nYear);
    };

    const StaffCard = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setDetailStaff({ type: 'directory', data: item })}>
            <View style={styles.cardHeader}>
                <View style={styles.coreInfo}>
                    <View style={styles.avatar}><Text style={styles.avatarT}>{item.name?.charAt(0)}</Text></View>
                    <View>
                        <Text style={styles.staffName}>{item.name}</Text>
                        <Text style={styles.staffRole}>{item.designation || 'Staff Member'}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'blocked' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'blocked' ? '#f43f5e' : '#10b981' }]}>{item.status?.toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.staffContact}>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.mobile}`)} style={styles.contactItem}>
                    <Phone size={14} color="#fbbf24" />
                    <Text style={styles.contactT}>{item.mobile}</Text>
                </TouchableOpacity>
                <View style={styles.contactItem}>
                    <Mail size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.contactT} numberOfLines={1}>{item.email || 'N/A'}</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <View style={styles.footerInfo}>
                    <Text style={styles.tagL}>SALARY</Text>
                    <Text style={styles.tagV}>₹{item.salary || 0}</Text>
                </View>
                <View style={styles.actionSet}>
                    <TouchableOpacity onPress={() => openEditStaff(item)} style={styles.iconBtn}><Edit3 size={16} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleStaffStatus(item)} style={styles.iconBtn}>{item.status === 'blocked' ? <Unlock size={16} color="#10b981" /> : <Lock size={16} color="#f43f5e" />}</TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const AttendanceCard = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setDetailStaff({ type: 'attendance', data: item })}>
            <View style={styles.attHeader}>
                <View>
                    <Text style={styles.staffName}>{item.staff?.name}</Text>
                    <Text style={styles.staffRole}>{formatDateIST(item.date)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'absent' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'absent' ? '#f43f5e' : '#10b981' }]}>{item.status?.toUpperCase() || 'PRESENT'}</Text>
                </View>
            </View>
            {item.status !== 'absent' && (
                <View style={styles.punchPairs}>
                    <View style={styles.punchBox}>
                        <Clock size={12} color="#10b981" />
                        <Text style={styles.punchVal}>{item.punchIn?.time ? formatTimeIST(item.punchIn.time) : '--:--'}</Text>
                        <Text style={styles.punchLbl}>PUNCH IN</Text>
                    </View>
                    <View style={styles.punchBox}>
                        <Clock size={12} color="#f43f5e" />
                        <Text style={styles.punchVal}>{item.punchOut?.time ? formatTimeIST(item.punchOut.time) : (item.punchIn?.time ? 'ON DUTY' : '--:--')}</Text>
                        <Text style={styles.punchLbl}>PUNCH OUT</Text>
                    </View>
                </View>
            )}
            <View style={styles.attFooter}>
                <MapPin size={12} color="rgba(255,255,255,0.2)" />
                <Text style={styles.locT} numberOfLines={1}>{item.punchIn?.location?.address || 'Verified Hub Location'}</Text>
            </View>
        </TouchableOpacity>
    );

    const LeaveCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.attHeader}>
                <View>
                    <Text style={styles.staffName}>{item.staff?.name}</Text>
                    <Text style={styles.staffRole}>{formatDateIST(item.startDate)} — {formatDateIST(item.endDate)}</Text>
                </View>
                <View style={styles.leaveType}><Text style={styles.leaveTypeT}>{item.type?.toUpperCase()}</Text></View>
            </View>
            <Text style={styles.leaveReason}>{item.reason || 'Personal leave request submitted via app.'}</Text>
            <View style={styles.leaveActions}>
                <TouchableOpacity style={[styles.leaveBtn, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]} onPress={() => handleAction(item._id, 'rejected')}>
                    <XCircle size={18} color="#f43f5e" />
                    <Text style={[styles.leaveBtnT, { color: '#f43f5e' }]}>REJECT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.leaveBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]} onPress={() => handleAction(item._id, 'approved')}>
                    <CheckCircle size={18} color="#10b981" />
                    <Text style={[styles.leaveBtnT, { color: '#10b981' }]}>APPROVE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.heroSection}>
                <View style={styles.heroSummary}>
                    <View style={[styles.statsCard, { borderLeftColor: '#fbbf24' }]}>
                        <Text style={styles.statsL}>HEADCOUNT</Text>
                        <Text style={styles.statsV}>{staffList.length}</Text>
                    </View>
                    <View style={[styles.statsCard, { borderLeftColor: '#10b981' }]}>
                        <Text style={styles.statsL}>ON DUTY</Text>
                        <Text style={styles.statsV}>{attendanceList.filter(a => a.date === todayIST()).length}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {[
                        { id: 'list', label: 'Directory', icon: Users },
                        { id: 'attendance', label: 'Records', icon: ShieldCheck },
                        { id: 'leaves', label: 'Leaves', icon: CalendarClock, count: pendingLeaves.length },
                        { id: 'payroll', label: 'Payroll', icon: CreditCard }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={14} color={activeTab === tab.id ? "#fbbf24" : "rgba(255,255,255,0.4)"} />
                            <Text style={[styles.tabT, activeTab === tab.id && styles.activeTabT]}>{tab.label}</Text>
                            {tab.count > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{tab.count}</Text></View>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.controlBar}>
                {(activeTab === 'attendance' || activeTab === 'payroll') && (
                    <View style={styles.monthSelector}>
                        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthArrow}><ChevronLeft size={20} color="white" /></TouchableOpacity>
                        <Text style={styles.monthLabel}>{months[selectedMonth - 1]} {selectedYear}</Text>
                        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthArrow}><ChevronRight size={20} color="white" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.searchBox}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput
                        placeholder="Filter list..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        style={styles.input}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
            </View>

            <FlatList
                data={activeTab === 'list' ? filteredStaff : (activeTab === 'attendance' ? attendanceList : (activeTab === 'leaves' ? pendingLeaves : filteredPayroll))}
                renderItem={({ item }) => {
                    if (activeTab === 'list') return <StaffCard item={item} />;
                    if (activeTab === 'attendance') return <AttendanceCard item={item} />;
                    if (activeTab === 'leaves') return <LeaveCard item={item} />;
                    return (
                        <TouchableOpacity style={styles.card} onPress={() => { setSelectedReport(item); setShowBreakdown(true); }}>
                            <View style={styles.payrollHeader}>
                                <View style={styles.coreInfo}>
                                    <View style={[styles.avatar, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}><Text style={styles.avatarT}>{item.name?.charAt(0)}</Text></View>
                                    <View><Text style={styles.staffName}>{item.name}</Text><Text style={styles.staffRole}>{item.designation || 'Staff'}</Text></View>
                                </View>
                                <View style={styles.netAmount}><Text style={styles.netL}>NET PAYABLE</Text><Text style={styles.netV}>₹{item.finalSalary?.toLocaleString()}</Text></View>
                            </View>
                            <View style={styles.salaryGrid}>
                                <View style={styles.sItem}><Text style={styles.sLabel}>WORKED</Text><Text style={styles.sValue}>{item.presentDays} D</Text></View>
                                <View style={styles.sItem}><Text style={styles.sLabel}>SUN BONUS</Text><Text style={styles.sValue}>₹{item.sundayBonus}</Text></View>
                                <View style={styles.sItem}><Text style={styles.sLabel}>DEDUCTION</Text><Text style={[styles.sValue, { color: '#f43f5e' }]}>-₹{item.deduction}</Text></View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                keyExtractor={item => item._id || item.staffId || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                ListEmptyComponent={<View style={styles.emptyView}><ActivityIndicator size="small" color="#fbbf24" /><Text style={styles.emptyT}>No operational data available</Text></View>}
            />

            <View style={styles.fabRow}>
                <TouchableOpacity style={[styles.miniFab, { backgroundColor: '#161B2A' }]} onPress={() => setShowBackdateModal(true)}>
                    <CalendarClock size={24} color="#fbbf24" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.fab} onPress={() => { setIsEditing(false); setShowAddModal(true); }}>
                    <Plus size={32} color="#000" strokeWidth={3} />
                </TouchableOpacity>
            </View>

            {/* MODALS OVERHAUL */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Modify Personnel' : 'New Registration'}</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                            <View style={styles.formSection}>
                                <Text style={styles.fL}>CORE IDENTITY</Text>
                                <TextInput style={styles.fInput} placeholder="Full Name" placeholderTextColor="rgba(255,255,255,0.2)" value={formData.name} onChangeText={t => setFormData({ ...formData, name: t })} />
                                <TextInput style={styles.fInput} placeholder="Mobile Number" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="phone-pad" value={formData.mobile} onChangeText={t => setFormData({ ...formData, mobile: t })} />
                                <TextInput style={styles.fInput} placeholder="Designation (Manager/Cleaner/Accountant)" placeholderTextColor="rgba(255,255,255,0.2)" value={formData.designation} onChangeText={t => setFormData({ ...formData, designation: t })} />
                            </View>
                            <View style={styles.formSection}>
                                <Text style={styles.fL}>SYSTEM CREDENTIALS</Text>
                                <TextInput style={styles.fInput} placeholder="Portal Username" placeholderTextColor="rgba(255,255,255,0.2)" autoCapitalize="none" value={formData.username} onChangeText={t => setFormData({ ...formData, username: t })} />
                                <TextInput style={styles.fInput} placeholder="Set Access Password" placeholderTextColor="rgba(255,255,255,0.2)" secureTextEntry value={formData.password} onChangeText={t => setFormData({ ...formData, password: t })} />
                            </View>
                            <View style={styles.formSection}>
                                <Text style={styles.fL}>FINANCIAL LOGISTICS</Text>
                                <View style={styles.grid2}>
                                    <TextInput style={[styles.fInput, { flex: 1, marginRight: 10 }]} placeholder="Base Salary" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="numeric" value={formData.salary} onChangeText={t => setFormData({ ...formData, salary: t })} />
                                    <TextInput style={[styles.fInput, { flex: 1 }]} placeholder="Leaves/Mo" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="numeric" value={formData.monthlyLeaveAllowance} onChangeText={t => setFormData({ ...formData, monthlyLeaveAllowance: t })} />
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleAddStaff} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnT}>{isEditing ? 'COMMIT UPDATES' : 'ENROLL STAFF'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* BACKDATE MODAL */}
            <Modal visible={showBackdateModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Backdate Attendance</Text>
                            <TouchableOpacity onPress={() => setShowBackdateModal(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <View style={styles.formSection}>
                            <Text style={styles.fL}>SELECT PERSONNEL</Text>
                            <TouchableOpacity style={styles.fSelect} onPress={() => {
                                Alert.alert('Staff Selection', 'Choose personnel', staffList.map(s => ({
                                    text: s.name, onPress: () => setBackdateForm({ ...backdateForm, staffId: s._id })
                                })));
                            }}>
                                <Text style={{ color: 'white' }}>{staffList.find(s => s._id === backdateForm.staffId)?.name || 'Select Staff'}</Text>
                                <ChevronDown size={14} color="#fbbf24" />
                            </TouchableOpacity>
                            <Text style={[styles.fL, { marginTop: 20 }]}>LOG DATE (YYYY-MM-DD)</Text>
                            <TextInput style={styles.fInput} placeholder="2024-05-15" placeholderTextColor="rgba(255,255,255,0.2)" value={backdateForm.date} onChangeText={t => setBackdateForm({ ...backdateForm, date: t })} />
                        </View>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleBackdate} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnT}>ARCHIVE ATTENDANCE</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <OperationalBreakdown visible={showBreakdown} onClose={() => setShowBreakdown(false)} data={selectedReport} type="staff" />

            {/* STAFF DOSSIER DETAIL MODAL */}
            <Modal visible={!!detailStaff} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        {detailStaff && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={styles.dhLeft}>
                                        <Text style={styles.targetLabel}>{detailStaff.type === 'attendance' ? 'ATTENDANCE DOSSIER' : 'PERSONNEL DOSSIER'}</Text>
                                        <Text style={styles.detailTitle}>{detailStaff.data.name || detailStaff.data.staff?.name}</Text>
                                        {detailStaff.type === 'directory' && (
                                            <Text style={styles.detailSub}>{detailStaff.data.designation || 'Staff Member'} • +91 {detailStaff.data.mobile}</Text>
                                        )}
                                        {detailStaff.type === 'attendance' && (
                                            <Text style={styles.detailSub}>{formatDateIST(detailStaff.data.date)}</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailStaff(null)}>
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                    {detailStaff.type === 'directory' && (
                                        <>
                                            <View style={styles.detailSection}>
                                                <View style={styles.sectionHead}>
                                                    <View>
                                                        <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>SYSTEM CREDENTIALS</Text>
                                                        <Text style={styles.sectionSub}>AUTHENTICATION STATUS</Text>
                                                    </View>
                                                    <View style={[styles.badge, { borderColor: detailStaff.data.status === 'blocked' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
                                                        <Text style={[styles.badgeT, { color: detailStaff.data.status === 'blocked' ? '#f43f5e' : '#10b981' }]}>{detailStaff.data.status === 'blocked' ? 'BLOCKED' : 'ACTIVE'}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.mRow}><Text style={styles.mL}>Portal Username</Text><Text style={styles.mV}>{detailStaff.data.username || 'N/A'}</Text></View>
                                                <View style={styles.mRow}><Text style={styles.mL}>Contact Email</Text><Text style={styles.mV}>{detailStaff.data.email || 'N/A'}</Text></View>
                                                <View style={styles.mRow}><Text style={styles.mL}>System Role</Text><Text style={styles.mV}>{detailStaff.data.staffType?.toUpperCase() || 'COMPANY'}</Text></View>
                                            </View>

                                            <View style={styles.detailSection}>
                                                <View style={styles.sectionHead}>
                                                    <View>
                                                        <Text style={[styles.sectionTitle, { color: '#10b981' }]}>FINANCIAL COMPENSATION</Text>
                                                        <Text style={styles.sectionSub}>WAGES AND LOGISTICS</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.boxGrid}>
                                                    <View style={styles.detailBox}>
                                                        <Text style={styles.miniStatL}>BASE SALARY</Text>
                                                        <Text style={styles.boxTime}>₹{(detailStaff.data.salary || 0).toLocaleString()}</Text>
                                                    </View>
                                                    <View style={styles.detailBox}>
                                                        <Text style={styles.miniStatL}>PAID LEAVES / MO</Text>
                                                        <Text style={styles.boxTime}>{detailStaff.data.monthlyLeaveAllowance || 0}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.mRow}><Text style={styles.mL}>Shift Timing</Text><Text style={[styles.mV, { color: '#fbbf24' }]}>{detailStaff.data.shiftTiming?.start || '09:00'} - {detailStaff.data.shiftTiming?.end || '18:00'}</Text></View>
                                                <View style={styles.mRow}><Text style={styles.mL}>Enrolled On</Text><Text style={styles.mV}>{formatDateIST(detailStaff.data.joiningDate)}</Text></View>
                                            </View>
                                        </>
                                    )}

                                    {detailStaff.type === 'attendance' && (
                                        <>
                                            <View style={styles.detailSection}>
                                                <View style={styles.sectionHead}>
                                                    <View>
                                                        <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>PUNCH LOGS</Text>
                                                        <Text style={styles.sectionSub}>ENTRY AND EXIT METRICS</Text>
                                                    </View>
                                                    <View style={[styles.badge, { borderColor: detailStaff.data.status === 'absent' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
                                                        <Text style={[styles.badgeT, { color: detailStaff.data.status === 'absent' ? '#f43f5e' : '#10b981' }]}>{detailStaff.data.status?.toUpperCase() || 'PRESENT'}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.boxGrid}>
                                                    <View style={[styles.detailBox, { borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                                                        <Text style={styles.miniStatL}>PUNCH IN</Text>
                                                        <Text style={[styles.boxTime, { color: '#10b981' }]}>{detailStaff.data.punchIn?.time ? formatTimeIST(detailStaff.data.punchIn.time) : '--:--'}</Text>
                                                    </View>
                                                    <View style={[styles.detailBox, { borderColor: 'rgba(244, 63, 94, 0.2)' }]}>
                                                        <Text style={styles.miniStatL}>PUNCH OUT</Text>
                                                        <Text style={[styles.boxTime, { color: '#f43f5e' }]}>{detailStaff.data.punchOut?.time ? formatTimeIST(detailStaff.data.punchOut.time) : '--:--'}</Text>
                                                    </View>
                                                </View>
                                                {detailStaff.data.punchIn && (
                                                    <View style={styles.mRow}><Text style={styles.mL}>Login Validated</Text><Text style={styles.mV}>Verified User App</Text></View>
                                                )}
                                            </View>
                                            {detailStaff.data.status === 'absent' && (
                                                <View style={styles.detailSection}>
                                                    <Text style={[styles.sectionTitle, { color: '#f43f5e', marginBottom: 15 }]}>ABSENCE PROTOCOL</Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 22 }}>
                                                        This staff member was marked absent for this date. No punch logs were recorded.
                                                    </Text>
                                                </View>
                                            )}
                                        </>

                                    )}
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    heroSection: { padding: 20 },
    heroSummary: { flexDirection: 'row', gap: 15 },
    statsCard: { flex: 1, backgroundColor: '#161B2A', padding: 18, borderRadius: 24, borderLeftWidth: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    statsL: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '950', letterSpacing: 1 },
    statsV: { color: 'white', fontSize: 28, fontWeight: '1000', marginTop: 5 },
    tabContainer: { paddingHorizontal: 20, marginBottom: 20 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    activeTab: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.2)' },
    tabT: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800' },
    activeTabT: { color: '#fbbf24' },
    countBadge: { backgroundColor: '#fbbf24', paddingHorizontal: 6, borderRadius: 6 },
    countText: { color: '#000', fontSize: 10, fontWeight: '900' },
    controlBar: { paddingHorizontal: 20, gap: 12, marginBottom: 15 },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 6, borderRadius: 16 },
    monthArrow: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
    monthLabel: { color: 'white', fontWeight: '900', fontSize: 14 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 52, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    input: { flex: 1, color: 'white', fontWeight: '600', marginLeft: 10 },
    listContent: { paddingHorizontal: 20, paddingBottom: 120 },
    card: { backgroundColor: '#161B2A', borderRadius: 28, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    coreInfo: { flexDirection: 'row', gap: 12, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center' },
    avatarT: { color: '#fbbf24', fontSize: 18, fontWeight: '1000' },
    staffName: { color: 'white', fontSize: 17, fontWeight: '900' },
    staffRole: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 8, fontWeight: '950' },
    staffContact: { marginTop: 15, gap: 8, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    contactT: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tagL: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '950' },
    tagV: { color: 'white', fontSize: 14, fontWeight: '900' },
    actionSet: { flexDirection: 'row', gap: 12 },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10 },
    attHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    punchPairs: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    punchBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 14, alignItems: 'center' },
    punchVal: { color: 'white', fontSize: 15, fontWeight: '900' },
    punchLbl: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', marginTop: 4 },
    attFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locT: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600' },
    leaveType: { backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    leaveTypeT: { color: '#fbbf24', fontSize: 9, fontWeight: '950' },
    leaveReason: { color: 'white', fontSize: 13, fontWeight: '600', marginBottom: 20, fontStyle: 'italic' },
    leaveActions: { flexDirection: 'row', gap: 10 },
    leaveBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    leaveBtnT: { fontSize: 12, fontWeight: '900' },
    payrollHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    netAmount: { alignItems: 'flex-end' },
    netL: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '950' },
    netV: { color: '#fbbf24', fontSize: 20, fontWeight: '1000' },
    salaryGrid: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 15, marginTop: 15 },
    sItem: { flex: 1, alignItems: 'center' },
    sLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 7, fontWeight: '950' },
    sValue: { color: 'white', fontSize: 13, fontWeight: '900', marginTop: 4 },
    fabRow: { position: 'absolute', bottom: 30, right: 30, alignItems: 'center', gap: 15 },
    fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(251, 191, 36, 0.4)' },
    miniFab: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '1000' },
    formSection: { marginBottom: 25 },
    fL: { color: '#fbbf24', fontSize: 10, fontWeight: '950', letterSpacing: 1.5, marginBottom: 15 },
    fInput: { backgroundColor: '#0D111D', height: 56, borderRadius: 16, paddingHorizontal: 18, color: 'white', fontWeight: '700', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    fSelect: { backgroundColor: '#0D111D', height: 56, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    grid2: { flexDirection: 'row' },
    submitBtn: { backgroundColor: '#fbbf24', height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10, boxShadow: '0 8px 15px rgba(251, 191, 36, 0.3)' },
    submitBtnT: { color: '#000', fontSize: 16, fontWeight: '1000' },
    emptyView: { padding: 80, alignItems: 'center', gap: 15 },
    emptyT: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '700' },

    // Detail Modal Styles
    detailOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    detailContent: { backgroundColor: '#0D111D', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '85%', padding: 25 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    dhLeft: { flex: 1 },
    targetLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '950', letterSpacing: 2 },
    detailTitle: { color: 'white', fontSize: 24, fontWeight: '950', marginTop: 4 },
    detailSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', marginTop: 4 },
    closeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#161B2A', justifyContent: 'center', alignItems: 'center' },
    detailSection: { backgroundColor: '#161B2A', borderRadius: 28, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '1000', letterSpacing: 1.5 },
    sectionSub: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', marginTop: 2 },
    boxGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    detailBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    miniStatL: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 4 },
    boxTime: { color: 'white', fontSize: 16, fontWeight: '950', marginTop: 4 },
    mRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    mL: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
    mV: { color: 'white', fontSize: 13, fontWeight: '900' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    badgeT: { fontSize: 9, fontWeight: '1000', letterSpacing: 1 },
    modalScroll: { marginBottom: 10 }
});

export default StaffScreen;
