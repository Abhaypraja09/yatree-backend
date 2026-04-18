import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Calendar, 
    BadgeIndianRupee, ChevronRight, Filter,
    User, ArrowUpRight, CheckCircle, Info,
    ChevronLeft, CreditCard, Wallet, X, Save,
    TrendingUp, ArrowDownLeft, Landmark, Layers,
    Briefcase, Users, ChevronDown, Trash2
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const { width } = Dimensions.get('window');

const AdvancesScreen = () => {
    const { selectedCompany } = useCompany();
    const [advances, setAdvances] = useState([]);
    const [salarySummary, setSalarySummary] = useState([]);
    const [personnel, setPersonnel] = useState([]); // Both Staff and Drivers
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('summary'); 
    const [viewCategory, setViewCategory] = useState('Driver'); // 'Driver' or 'Staff'
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Form Modal
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        personId: '', amount: '', date: todayIST(), remark: '', type: 'advance'
    });

    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [advRes, salRes, driverRes, staffRes] = await Promise.all([
                api.get(`/api/admin/advances/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}&isFreelancer=false`),
                api.get(`/api/admin/salary-summary/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}`),
                api.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false`),
                api.get(`/api/admin/staff/${selectedCompany._id}`)
            ]);

            setAdvances(advRes.data || []);
            setSalarySummary(salRes.data || []);
            
            // Merge personnel for dropdown
            const staffs = (staffRes.data || []).map(s => ({ ...s, category: 'Staff' }));
            const drivers = (driverRes.data.drivers || []).map(d => ({ ...d, category: 'Driver' }));
            setPersonnel([...drivers, ...staffs]);
        } catch (err) {
            console.error('Failed to fetch advances data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [selectedCompany, selectedMonth, selectedYear]);

    const handleSave = async () => {
        if (!form.personId || !form.amount) return Alert.alert('Error', 'Personnel and Amount required');
        setSubmitting(true);
        try {
            const isStaff = personnel.find(p => p._id === form.personId)?.category === 'Staff';
            const payload = { 
                driverId: isStaff ? undefined : form.personId,
                staffId: isStaff ? form.personId : undefined,
                amount: form.amount,
                date: form.date,
                remark: form.remark,
                companyId: selectedCompany._id 
            };
            await api.post('/api/admin/advances', payload);
            setShowForm(false);
            setForm({ personId: '', amount: '', date: todayIST(), remark: '', type: 'advance' });
            fetchData();
            Alert.alert('Success', 'Cash transaction recorded');
        } catch (err) {
            Alert.alert('Error', 'Transaction failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Entry', 'Are you sure?', [
            { text: 'Cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/api/admin/advances/${id}`);
                    fetchData();
                } catch (err) { Alert.alert('Error', 'Deletion failed'); }
            }}
        ]);
    };

    const shiftMonth = (val) => {
        let nMonth = selectedMonth + val;
        let nYear = selectedYear;
        if (nMonth < 1) { nMonth = 12; nYear--; }
        if (nMonth > 12) { nMonth = 1; nYear++; }
        setSelectedMonth(nMonth);
        setSelectedYear(nYear);
    };

    const ledgerData = useMemo(() => salarySummary.filter(s => 
        (s.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (viewCategory === 'Staff' ? s.isStaff : !s.isStaff)
    ), [salarySummary, searchTerm, viewCategory]);

    const historyData = useMemo(() => advances.filter(a => {
        const name = a.driver?.name || a.staff?.name || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
        const isStaff = !!a.staff;
        const matchesCat = viewCategory === 'Staff' ? isStaff : !isStaff;
        return matchesSearch && matchesCat;
    }), [advances, searchTerm, viewCategory]);

    const LedgerCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.driverCore}>
                    <View style={[styles.avatar, { backgroundColor: item.netPayable >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}><Text style={[styles.avatarText, { color: item.netPayable >= 0 ? '#10b981' : '#f43f5e' }]}>{item.name?.charAt(0)}</Text></View>
                    <View>
                        <Text style={styles.driverName}>{item.name}</Text>
                        <Text style={styles.driverMeta}>{item.workingDays} ACTIVE DAYS THIS MONTH</Text>
                    </View>
                </View>
                <View style={[styles.statusTag, { backgroundColor: item.netPayable >= 0 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                    <Text style={[styles.statusText, { color: item.netPayable >= 0 ? '#0ea5e9' : '#f43f5e' }]}>{item.netPayable >= 0 ? 'LEDGER CLEAR' : 'OVERDRAWN'}</Text>
                </View>
            </View>
            <View style={styles.financeRow}>
                <View style={styles.financeBox}><Text style={styles.financeLabel}>ACCRUED EARNINGS</Text><Text style={styles.earnedVal}>₹{item.totalEarned?.toLocaleString()}</Text></View>
                <View style={[styles.financeBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.financeLabel}>TOTAL ADVANCE</Text><Text style={styles.advanceVal}>₹{item.pendingAdvance?.toLocaleString()}</Text></View>
            </View>
            <View style={styles.netBlock}>
                <View>
                    <Text style={styles.netLabel}>NET DISBURSEMENT</Text>
                    <Text style={[styles.netVal, { color: item.netPayable >= 0 ? '#10b981' : '#f43f5e' }]}>₹{Math.abs(item.netPayable || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.netIcon}><Landmark size={20} color={item.netPayable >= 0 ? '#10b981' : '#f43f5e'} /></View>
            </View>
        </View>
    );

    const HistoryCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.historyTop}>
                <View>
                    <Text style={styles.historyDriver}>{item.driver?.name || item.staff?.name}</Text>
                    <Text style={styles.historyDate}>{formatDateIST(item.date)}</Text>
                </View>
                <View style={styles.amountArea}>
                    <Text style={styles.historyAmount}>₹{item.amount?.toLocaleString()}</Text>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item._id)}><Trash2 size={14} color="rgba(255,255,255,0.2)"/></TouchableOpacity>
                </View>
            </View>
            <View style={styles.remarkBox}><Text style={styles.historyRemark}>{item.remark || 'Direct Cash Disbursement'}</Text></View>
            <View style={styles.recoverySection}>
                <View style={styles.recHeader}><Text style={styles.recL}>RECOVERY PROGRESS</Text><Text style={styles.recV}>{Math.round((item.recoveredAmount / item.amount) * 100)}%</Text></View>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, (item.recoveredAmount / (item.amount || 1)) * 100)}%` }]} /></View>
                <Text style={styles.recoveryText}>₹{item.recoveredAmount || 0} Recovered from settlement</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.overviewCard}>
                    <View style={styles.ovItem}><Text style={styles.ovL}>OUTSTANDING ADVANCES</Text><Text style={styles.ovV}>₹{salarySummary.reduce((sum, s) => sum + (s.pendingAdvance || 0), 0).toLocaleString()}</Text></View>
                    <View style={styles.ovIcon}><BadgeIndianRupee size={24} color="#fbbf24"/></View>
                </View>
            </View>

            <View style={styles.navBar}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'summary' && styles.activeTab]} onPress={() => setActiveTab('summary')}><Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>Ledger</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}><Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Logs</Text></TouchableOpacity>
                </View>
                <View style={styles.categoryBar}>
                    <TouchableOpacity style={[styles.catBtn, viewCategory === 'Driver' && styles.catA]} onPress={() => setViewCategory('Driver')}><Text style={[styles.catT, viewCategory === 'Driver' && styles.catTA]}>DRIVERS</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.catBtn, viewCategory === 'Staff' && styles.catA]} onPress={() => setViewCategory('Staff')}><Text style={[styles.catT, viewCategory === 'Staff' && styles.catTA]}>OFFICE STAFF</Text></TouchableOpacity>
                </View>
            </View>

            <View style={styles.controls}>
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.arrowBtn}><ChevronLeft size={20} color="white" /></TouchableOpacity>
                    <View style={styles.mInfo}><Calendar size={14} color="#fbbf24"/><Text style={styles.monthText}>{months[selectedMonth - 1]} {selectedYear}</Text></View>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.arrowBtn}><ChevronRight size={20} color="white" /></TouchableOpacity>
                </View>
                <View style={styles.searchRow}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput placeholder={activeTab === 'summary' ? "Search for accountant or driver..." : "Locate transaction..."} placeholderTextColor="rgba(255,255,255,0.2)" style={styles.input} value={searchTerm} onChangeText={setSearchTerm} />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View>
            ) : (
                <FlatList
                    data={activeTab === 'summary' ? ledgerData : historyData}
                    renderItem={({ item }) => activeTab === 'summary' ? <LedgerCard item={item} /> : <HistoryCard item={item} />}
                    keyExtractor={item => item._id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} tintColor="#fbbf24" />}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}><Plus size={32} color="#000" strokeWidth={3} /></TouchableOpacity>

            <Modal visible={showForm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Financial Disbursement</Text><TouchableOpacity onPress={() => setShowForm(false)}><X size={24} color="white" /></TouchableOpacity></View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}><Text style={styles.label}>BENEFICIARY PERSONNEL</Text>
                                <TouchableOpacity style={styles.mSelect} onPress={() => Alert.alert('Personnel', 'Select recipient', personnel.filter(p => p.category === viewCategory).map(p => ({ text: p.name, onPress: () => setForm({...form, personId: p._id}) })))}>
                                    <Text style={{color:'white', fontWeight:'700'}}>{personnel.find(p => p._id === form.personId)?.name || 'Select Recipient'}</Text>
                                    <ChevronDown size={14} color="#fbbf24" style={{transform:[{rotate:'90deg'}]}} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, {flex:1, marginRight:10}]}><Text style={styles.label}>TRANSACTION AMOUNT (₹)</Text><TextInput style={styles.mInput} keyboardType="numeric" value={form.amount} onChangeText={t => setForm({...form, amount: t})} placeholder="5000" placeholderTextColor="rgba(255,255,255,0.1)" /></View>
                                <View style={[styles.inputGroup, {flex:1}]}><Text style={styles.label}>PAYMENT DATE</Text><TextInput style={styles.mInput} value={form.date} onChangeText={t => setForm({...form, date: t})} /></View>
                            </View>
                            <View style={styles.inputGroup}><Text style={styles.label}>TRANSACTION TYPE</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity style={[styles.toggleB, form.type === 'advance' && styles.toggleBA]} onPress={() => setForm({...form, type: 'advance'})}><Text style={[styles.toggleBT, form.type === 'advance' && styles.toggleBTA]}>CASH ADVANCE</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.toggleB, form.type === 'salary' && styles.toggleBA]} onPress={() => setForm({...form, type: 'salary'})}><Text style={[styles.toggleBT, form.type === 'salary' && styles.toggleBTA]}>FULL SALARY</Text></TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.inputGroup}><Text style={styles.label}>NARRATION / REMARK</Text><TextInput style={styles.mInput} value={form.remark} onChangeText={t => setForm({...form, remark: t})} placeholder="Emergency medical / Advance" placeholderTextColor="rgba(255,255,255,0.1)" /></View>
                        </ScrollView>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000"/> : <><CreditCard size={20} color="#000"/><Text style={styles.saveBtnText}>INITIATE DISBURSEMENT</Text></>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    header: { padding: 25 },
    overviewCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 25, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    ovItem: { flex: 1 },
    ovL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '950', letterSpacing: 1.5 },
    ovV: { color: 'white', fontSize: 26, fontWeight: '1000', marginTop: 4 },
    ovIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center' },
    navBar: { paddingHorizontal: 25, gap: 15, marginBottom: 20 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', padding: 5, borderRadius: 18 },
    tab: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    activeTab: { backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    tabText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '900' },
    activeTabText: { color: '#fbbf24' },
    categoryBar: { flexDirection: 'row', gap: 10 },
    catBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    catA: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    catT: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '950', letterSpacing: 1 },
    catTA: { color: '#38bdf8' },
    controls: { paddingHorizontal: 25, gap: 12, marginBottom: 15 },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    mInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    arrowBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
    monthText: { color: 'white', fontWeight: '900', fontSize: 13 },
    searchRow: { flexDirection: 'row', backgroundColor: '#161B2A', borderRadius: 18, paddingHorizontal: 15, height: 52, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    input: { color: 'white', flex: 1, marginLeft: 10, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center' },
    listContent: { paddingHorizontal: 25, paddingBottom: 120 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    driverCore: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: '1000' },
    driverName: { color: 'white', fontSize: 18, fontWeight: '950' },
    driverMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusText: { fontSize: 8, fontWeight: '950' },
    financeRow: { flexDirection: 'row', marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    financeBox: { flex: 1, paddingHorizontal: 5 },
    financeLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '950', letterSpacing: 0.5 },
    earnedVal: { color: 'white', fontSize: 16, fontWeight: '900', marginTop: 5 },
    advanceVal: { color: '#fbbf24', fontSize: 16, fontWeight: '900', marginTop: 5 },
    netBlock: { marginTop: 18, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderStyle: 'dotted', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    netLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900' },
    netVal: { fontSize: 20, fontWeight: '1000' },
    netIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    historyDriver: { color: 'white', fontSize: 18, fontWeight: '950' },
    historyDate: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', marginTop: 2 },
    amountArea: { alignItems: 'flex-end', gap: 8 },
    historyAmount: { color: '#10b981', fontSize: 20, fontWeight: '1000' },
    delBtn: { padding: 4 },
    remarkBox: { marginTop: 15, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 },
    historyRemark: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
    recoverySection: { marginTop: 20, gap: 10 },
    recHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    recL: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '950', letterSpacing: 1 },
    recV: { color: '#10b981', fontSize: 10, fontWeight: '900' },
    progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10b981' },
    recoveryText: { color: 'rgba(16, 185, 129, 0.6)', fontSize: 9, fontWeight: '800' },
    fab: { position: 'absolute', bottom: 40, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', elevation: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '1000' },
    inputGroup: { marginBottom: 20 },
    label: { color: '#fbbf24', fontSize: 9, fontWeight: '950', marginBottom: 12, letterSpacing: 1.5 },
    mInput: { backgroundColor: '#0D111D', borderRadius: 16, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    mSelect: { backgroundColor: '#0D111D', borderRadius: 16, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    toggleRow: { flexDirection: 'row', backgroundColor: '#0D111D', padding: 5, borderRadius: 16 },
    toggleB: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    toggleBA: { backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    toggleBT: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '950' },
    toggleBTA: { color: '#fbbf24' },
    row: { flexDirection: 'row' },
    saveBtn: { backgroundColor: '#fbbf24', height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10 },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '1000' }
});

export default AdvancesScreen;
