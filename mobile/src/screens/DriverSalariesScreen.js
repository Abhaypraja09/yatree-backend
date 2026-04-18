import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Switch
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Calendar, Wallet, 
    TrendingDown, CreditCard, ChevronRight, 
    ChevronLeft, FileText, User, ArrowUpRight, 
    CheckCircle, IndianRupee, Info, TrendingUp, 
    Zap, X, Save, Trash2, Edit2, AlertCircle
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';
import OperationalBreakdown from '../components/OperationalBreakdown';

const DriverSalariesScreen = () => {
    const { selectedCompany } = useCompany();
    const [salaries, setSalaries] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [loans, setLoans] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('salaries'); // 'salaries', 'advances', 'loans'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Modals
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [advanceForm, setAdvanceForm] = useState({ driverId: '', amount: '', date: todayIST(), remark: '' });
    const [loanForm, setLoanForm] = useState({ driverId: '', totalAmount: '', tenureMonths: '', monthlyEMI: '', startDate: todayIST(), remarks: '' });

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [salRes, advRes, loanRes, driversRes] = await Promise.all([
                api.get(`/api/admin/salary-summary/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}`),
                api.get(`/api/admin/advances/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}&isFreelancer=false`),
                api.get(`/api/admin/loans/${selectedCompany._id}`),
                api.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false`)
            ]);
            setSalaries(salRes.data || []);
            setAdvances(advRes.data || []);
            setLoans(loanRes.data || []);
            setDrivers(driversRes.data.drivers || []);
        } catch (err) {
            console.error('Failed to fetch salary data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompany, selectedMonth, selectedYear]);

    const shiftMonth = (val) => {
        let nMonth = selectedMonth + val;
        let nYear = selectedYear;
        if (nMonth < 1) { nMonth = 12; nYear--; }
        if (nMonth > 12) { nMonth = 1; nYear++; }
        setSelectedMonth(nMonth);
        setSelectedYear(nYear);
    };

    const handleActionAdvance = async () => {
        if (!advanceForm.driverId || !advanceForm.amount) return Alert.alert('Error', 'Driver and Amount required');
        setSubmitting(true);
        try {
            await api.post('/api/admin/advances', { ...advanceForm, companyId: selectedCompany._id });
            setShowAdvanceModal(false);
            fetchData();
            Alert.alert('Success', 'Advance payment recorded.');
        } catch (err) {
            Alert.alert('Error', 'Failed to record advance');
        } finally { setSubmitting(false); }
    };

    const handleActionLoan = async () => {
        if (!loanForm.driverId || !loanForm.totalAmount || !loanForm.tenureMonths) return Alert.alert('Error', 'Complete all loan fields');
        setSubmitting(true);
        try {
            await api.post('/api/admin/loans', { ...loanForm, companyId: selectedCompany._id });
            setShowLoanModal(false);
            fetchData();
            Alert.alert('Success', 'New loan initialized on cloud.');
        } catch (err) {
            Alert.alert('Error', 'Failed to save loan');
        } finally { setSubmitting(false); }
    };

    const totalPayout = salaries.reduce((sum, s) => sum + (s.netPayable || 0), 0);
    const grossEarnings = salaries.reduce((sum, s) => sum + (s.totalEarned || 0), 0);

    const SalaryCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedReport({ ...item, cycleStart: `${months[selectedMonth-1]} ${selectedYear}` }); setShowBreakdown(true); }}>
            <View style={styles.cardHeader}>
                <View style={styles.driverCore}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
                    <View>
                        <Text style={styles.driverName}>{item.name}</Text>
                        <View style={styles.rowCenter}><Zap size={10} color="#fbbf24" /><Text style={styles.metaT}>{item.dutyDays || 0} DUTIES VERIFIED</Text></View>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.netL}>NET PAYABLE</Text>
                    <Text style={styles.netV}>₹{item.netPayable?.toLocaleString()}</Text>
                </View>
            </View>
            <View style={styles.finGrid}>
                <View style={styles.finItem}><Text style={styles.finL}>EARNED</Text><Text style={styles.finV}>₹{item.totalEarned || 0}</Text></View>
                <View style={styles.sepV} />
                <View style={styles.finItem}><Text style={styles.finL}>ADVANCE</Text><Text style={[styles.finV, {color:'#f43f5e'}]}>-₹{item.totalAdvances || 0}</Text></View>
                <View style={styles.sepV} />
                <View style={styles.finItem}><Text style={styles.finL}>EMI</Text><Text style={[styles.finV, {color:'#f43f5e'}]}>-₹{item.totalEMI || 0}</Text></View>
            </View>
            <View style={styles.viewDetailed}><Text style={styles.viewDetailedT}>TAP TO INSPECT BREAKDOWN</Text><ChevronRight size={14} color="#fbbf24" /></View>
        </TouchableOpacity>
    );

    const AdvanceCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{flexDirection:'row', gap:12, alignItems:'center'}}>
                    <View style={[styles.avatar, {backgroundColor:'rgba(244, 63, 94, 0.1)'}]}><Text style={[styles.avatarText, {color:'#f43f5e'}]}>{item.driver?.name?.charAt(0)}</Text></View>
                    <View>
                        <Text style={styles.driverName}>{item.driver?.name}</Text>
                        <Text style={styles.metaT}>{formatDateIST(item.date)}</Text>
                    </View>
                </View>
                <Text style={[styles.netV, {color:'#f43f5e'}]}>-₹{item.amount}</Text>
            </View>
            <View style={styles.remarkBox}><Text style={styles.remarkT}>{item.remark || 'Standard Advance Deduction'}</Text></View>
        </View>
    );

    const LoanCard = ({ item }) => {
        const progress = (1 - (item.remainingAmount / item.totalAmount)) * 100;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.driverName}>{item.driver?.name}</Text>
                        <Text style={styles.metaT}>Started {formatDateIST(item.startDate)}</Text>
                    </View>
                    <View style={styles.loanBadge}><Text style={styles.loanBadgeT}>{item.status?.toUpperCase()}</Text></View>
                </View>
                <View style={styles.progRow}>
                    <View style={styles.progBar}><View style={[styles.progFill, {width: `${progress}%`}]} /></View>
                    <Text style={styles.progT}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.loanGrid}>
                    <View style={styles.loanItem}><Text style={styles.loanL}>PRINCIPAL</Text><Text style={styles.loanV}>₹{item.totalAmount?.toLocaleString()}</Text></View>
                    <View style={styles.loanItem}><Text style={styles.loanL}>BALANCE</Text><Text style={[styles.loanV, {color:'#fbbf24'}]}>₹{item.remainingAmount?.toLocaleString()}</Text></View>
                    <View style={styles.loanItem}><Text style={styles.loanL}>EMI</Text><Text style={styles.loanV}>₹{item.monthlyEMI?.toLocaleString()}</Text></View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.summaryArea}>
                <View style={styles.mainTotalCard}>
                    <View style={styles.sumTop}>
                        <View>
                            <Text style={styles.sumL}>{months[selectedMonth - 1]} Net Payroll Budget</Text>
                            <Text style={styles.sumV}>₹{totalPayout.toLocaleString()}</Text>
                        </View>
                        <TrendingDown size={36} color="rgba(244, 63, 94, 0.15)" />
                    </View>
                    <View style={styles.sumFoot}><Text style={styles.grossT}>Monthly Gross: ₹{grossEarnings.toLocaleString()}</Text></View>
                </View>
            </View>

            <View style={styles.tabBar}>
                {['salaries', 'advances', 'loans'].map(t => (
                    <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
                        <Text style={[styles.tabT, activeTab === t && {color:'#fbbf24'}]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.controls}>
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)}><ChevronLeft size={24} color="white" /></TouchableOpacity>
                    <Text style={styles.monthT}>{months[selectedMonth - 1]} {selectedYear}</Text>
                    <TouchableOpacity onPress={() => shiftMonth(1)}><ChevronRight size={24} color="white" /></TouchableOpacity>
                </View>
                <View style={styles.searchRow}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput style={styles.searchInput} placeholder="Search workforce..." placeholderTextColor="rgba(255,255,255,0.2)" value={searchTerm} onChangeText={setSearchTerm} />
                </View>
            </View>

            {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View> : (
                <FlatList
                    data={activeTab === 'salaries' ? salaries.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase())) :
                          activeTab === 'advances' ? advances.filter(a => a.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase())) :
                          loans.filter(l => l.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    }
                    renderItem={({ item }) => activeTab === 'salaries' ? <SalaryCard item={item} /> : activeTab === 'advances' ? <AdvanceCard item={item} /> : <LoanCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                    ListEmptyComponent={<View style={styles.empty}><Wallet size={48} color="rgba(255,255,255,0.05)" /><Text style={styles.emptyT}>No transaction logs found.</Text></View>}
                />
            )}

            <View style={styles.fabRow}>
                <TouchableOpacity style={[styles.miniFab, {backgroundColor:'#f43f5e'}]} onPress={() => setShowAdvanceModal(true)}><TrendingDown size={20} color="white" /></TouchableOpacity>
                <TouchableOpacity style={[styles.miniFab, {backgroundColor:'#3b82f6'}]} onPress={() => setShowLoanModal(true)}><CreditCard size={20} color="white" /></TouchableOpacity>
                <TouchableOpacity style={[styles.miniFab, {backgroundColor:'#fbbf24'}]} onPress={() => Alert.alert('Export', 'Generating Full Fleet Salary Sheet...')}><FileText size={20} color="#000" /></TouchableOpacity>
            </View>

            <OperationalBreakdown visible={showBreakdown} onClose={() => setShowBreakdown(false)} data={selectedReport} type="driver" />

            {/* ADVANCE MODAL */}
            <Modal visible={showAdvanceModal} animationType="fade" transparent>
                <View style={styles.mOverlay}>
                    <View style={styles.mBox}>
                        <View style={styles.mHeader}><Text style={styles.mT}>Issue Advance</Text><TouchableOpacity onPress={() => setShowAdvanceModal(false)}><X size={24} color="white" /></TouchableOpacity></View>
                        <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Target', 'Select Driver', drivers.map(d => ({ text: d.name, onPress: () => setAdvanceForm({...advanceForm, driverId: d._id}) })))}>
                            <Text style={{color:'white', fontWeight:'700'}}>{drivers.find(d => d._id === advanceForm.driverId)?.name || 'Select Driver Asset'}</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.mInput} placeholder="Amount (₹)" keyboardType="numeric" placeholderTextColor="gray" onChangeText={t => setAdvanceForm({...advanceForm, amount: t})} />
                        <TextInput style={styles.mInput} placeholder="Internal Remarks / Notes" placeholderTextColor="gray" onChangeText={t => setAdvanceForm({...advanceForm, remark: t})} />
                        <TouchableOpacity style={styles.saveB} onPress={handleActionAdvance} disabled={submitting}><Text style={styles.saveBT}>COMMIT ADVANCE</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* LOAN MODAL */}
            <Modal visible={showLoanModal} animationType="slide" transparent>
                <View style={styles.mOverlay}>
                    <View style={styles.mBox}>
                        <View style={styles.mHeader}><Text style={styles.mT}>New Loan Registration</Text><TouchableOpacity onPress={() => setShowLoanModal(false)}><X size={24} color="white" /></TouchableOpacity></View>
                        <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Target', 'Select Driver', drivers.map(d => ({ text: d.name, onPress: () => setLoanForm({...loanForm, driverId: d._id}) })))}>
                            <Text style={{color:'white', fontWeight:'700'}}>{drivers.find(d => d._id === loanForm.driverId)?.name || 'Select Driver'}</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.mInput} placeholder="Principal Amount (₹)" keyboardType="numeric" placeholderTextColor="gray" onChangeText={t => setLoanForm({...loanForm, totalAmount: t})} />
                        <View style={{flexDirection:'row', gap:10}}>
                            <TextInput style={[styles.mInput, {flex: 1}]} placeholder="EMI Amount" keyboardType="numeric" placeholderTextColor="gray" onChangeText={t => setLoanForm({...loanForm, monthlyEMI: t})} />
                            <TextInput style={[styles.mInput, {flex: 1}]} placeholder="Tenure (Months)" keyboardType="numeric" placeholderTextColor="gray" onChangeText={t => setLoanForm({...loanForm, tenureMonths: t})} />
                        </View>
                        <TextInput style={styles.mInput} placeholder="Remarks" placeholderTextColor="gray" onChangeText={t => setLoanForm({...loanForm, remarks: t})} />
                        <TouchableOpacity style={[styles.saveB, {backgroundColor:'#3b82f6'}]} onPress={handleActionLoan} disabled={submitting}><Text style={[styles.saveBT, {color:'white'}]}>INITIALIZE LOAN</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    summaryArea: { padding: 25 },
    mainTotalCard: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sumL: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    sumV: { color: 'white', fontSize: 32, fontWeight: '950', marginTop: 4 },
    sumFoot: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    grossT: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700' },
    tabBar: { flexDirection: 'row', paddingHorizontal: 25, gap: 10, marginBottom: 20 },
    tab: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    tabActive: { backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    tabT: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900' },
    controls: { paddingHorizontal: 25, gap: 15, marginBottom: 20 },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 8, borderRadius: 18 },
    monthT: { color: 'white', fontSize: 14, fontWeight: '950', letterSpacing: 1 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 52, borderRadius: 18, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { flex: 1, color: 'white', fontWeight: '600', marginLeft: 10 },
    center: { flex: 1, justifyContent: 'center' },
    list: { paddingHorizontal: 25, paddingBottom: 150 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    driverCore: { flexDirection: 'row', gap: 12, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fbbf24', fontSize: 18, fontWeight: '950' },
    driverName: { color: 'white', fontSize: 17, fontWeight: '900' },
    rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    metaT: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    netL: { color: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: '900', textAlign: 'right' },
    netV: { color: '#10b981', fontSize: 20, fontWeight: '950', marginTop: 2 },
    finGrid: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    finItem: { flex: 1, alignItems: 'center' },
    finL: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900' },
    finV: { color: 'white', fontSize: 14, fontWeight: '900', marginTop: 5 },
    sepV: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    viewDetailed: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    viewDetailedT: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900' },
    remarkBox: { marginTop: 15, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)' },
    remarkT: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
    loanBadge: { backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    loanBadgeT: { color: '#fbbf24', fontSize: 8, fontWeight: '900' },
    progRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 15 },
    progBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
    progFill: { height: '100%', backgroundColor: '#10b981' },
    progT: { color: '#10b981', fontSize: 10, fontWeight: '950' },
    loanGrid: { flexDirection: 'row', gap: 10 },
    loanItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 14 },
    loanL: { color: 'rgba(255,255,255,0.2)', fontSize: 7, fontWeight: '900' },
    loanV: { color: 'white', fontSize: 12, fontWeight: '900', marginTop: 5 },
    fabRow: { position: 'absolute', bottom: 30, right: 25, gap: 12 },
    miniFab: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8 },
    empty: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyT: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700' },
    mOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'center', padding: 25 },
    mBox: { backgroundColor: '#161B2A', borderRadius: 32, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    mT: { color: 'white', fontSize: 20, fontWeight: '950' },
    sel: { height: 56, backgroundColor: '#0D111D', borderRadius: 18, justifyContent: 'center', paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    mInput: { height: 56, backgroundColor: '#0D111D', borderRadius: 18, paddingHorizontal: 15, marginBottom: 15, color: 'white', fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    saveB: { height: 60, backgroundColor: '#fbbf24', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBT: { color: '#000', fontSize: 14, fontWeight: '950' }
});

export default DriverSalariesScreen;
