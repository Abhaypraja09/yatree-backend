import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Image, Dimensions
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, ShieldAlert, Calendar, 
    BadgeIndianRupee, ChevronRight, Filter,
    ChevronLeft, Car, Wallet, ArrowLeft,
    Trash2, Eye, X, Upload, Save
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST } from '../utils/istUtils';

const { width, height } = Dimensions.get('window');

const BorderTaxScreen = () => {
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedVehicleId, setExpandedVehicleId] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Modals
    const [showForm, setShowForm] = useState(false);
    const [viewImage, setViewImage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [form, setForm] = useState({
        borderName: '', amount: '', date: todayIST(), remarks: '', driverId: ''
    });

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [vehRes, entryRes, dvrRes] = await Promise.all([
                api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=all`),
                api.get(`/api/admin/border-tax/${selectedCompany._id}`),
                api.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`)
            ]);
            
            const cleanVehicles = (vehRes.data.vehicles || []).filter(v => typeof v.carNumber === 'string' && !v.carNumber.includes('#'));
            setVehicles(cleanVehicles);
            setEntries(entryRes.data || []);
            setDrivers(dvrRes.data.drivers || []);
        } catch (err) {
            console.error('Failed to fetch border tax data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompany]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleSave = async () => {
        if (!form.borderName || !form.amount) return Alert.alert('Error', 'Location and Amount required');
        setSubmitting(true);
        try {
            const payload = { ...form, vehicleId: expandedVehicleId, companyId: selectedCompany._id };
            await api.post('/api/admin/border-tax/manual', payload);
            setShowForm(false);
            fetchData();
            Alert.alert('Success', 'Tax record archived');
        } catch (err) {
            Alert.alert('Error', 'Failed to save entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Record', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/api/admin/border-tax/${id}`);
                    fetchData();
                } catch (err) {
                    Alert.alert('Error', 'Deletion failed');
                }
            }}
        ]);
    };

    const shiftMonth = (val) => {
        let nMonth = selectedMonth + val;
        let nYear = selectedYear;
        if (nMonth < 0) { nMonth = 11; nYear--; }
        if (nMonth > 11) { nMonth = 0; nYear++; }
        setSelectedMonth(nMonth);
        setSelectedYear(nYear);
    };

    const totalPaid = entries.filter(e => {
        const d = new Date(e.date);
        return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
    }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const VehicleRow = ({ item }) => {
        const vehicleEntries = entries.filter(e => {
            const d = new Date(e.date);
            return e.vehicle?._id === item._id && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
        });
        const vehicleTotal = vehicleEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        return (
            <TouchableOpacity style={styles.card} onPress={() => setExpandedVehicleId(item._id)}>
                <View style={styles.cardInfo}>
                    <View style={styles.carIconBox}><Car size={22} color="rgba(255,255,255,0.4)" /></View>
                    <View style={styles.mainInfo}>
                        <Text style={styles.carNumber}>{item.carNumber}</Text>
                        <Text style={styles.carModel}>{item.model || 'Standard'}</Text>
                    </View>
                    <View style={styles.usageBox}>
                        <Text style={styles.usageLabel}>{months[selectedMonth].substring(0,3)} Paid</Text>
                        <Text style={[styles.usageAmount, { color: vehicleTotal > 0 ? '#10b981' : 'rgba(255,255,255,0.1)' }]}>₹{vehicleTotal.toLocaleString()}</Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
                </View>
            </TouchableOpacity>
        );
    };

    if (expandedVehicleId) {
        const vehicle = vehicles.find(v => v._id === expandedVehicleId);
        const filteredHistory = entries.filter(e => {
            const d = new Date(e.date);
            return e.vehicle?._id === expandedVehicleId && d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
        });

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.detailHeader}>
                    <TouchableOpacity onPress={() => setExpandedVehicleId(null)} style={styles.backBtn}><ArrowLeft size={24} color="white" /></TouchableOpacity>
                    <View><Text style={styles.detailTitle}>{vehicle?.carNumber}</Text><Text style={styles.detailSub}>{vehicle?.model}</Text></View>
                </View>

                <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.entryFormPreview}>
                        <View style={styles.pHeader}><ShieldAlert size={18} color="#fbbf24"/><Text style={styles.pTitle}>PRECISE TAX RECORDING</Text></View>
                        <TouchableOpacity style={styles.addRecordBtn} onPress={() => { setForm({...form, driverId: vehicle?.currentDriver?._id || ''}); setShowForm(true); }}>
                            <Plus size={20} color="#000" strokeWidth={3} /><Text style={styles.addRecordText}>ADD NEW TAX ENTRY</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.historyHead}><Calendar size={16} color="rgba(255,255,255,0.4)"/><Text style={styles.sectionTitle}>{months[selectedMonth]} TAX LOGS</Text></View>
                    
                    {filteredHistory.length === 0 ? (
                        <View style={styles.emptyHistory}><Text style={styles.emptyHistoryText}>No archived records for {months[selectedMonth]}.</Text></View>
                    ) : (
                        filteredHistory.map((entry, idx) => (
                            <View key={idx} style={styles.historyCard}>
                                <View style={styles.historyMain}>
                                    <View><Text style={styles.historyAmount}>₹{entry.amount}</Text><Text style={styles.historyBorder}>{entry.borderName}</Text></View>
                                    <Text style={styles.historyDate}>{formatDateIST(entry.date)}</Text>
                                </View>
                                <View style={styles.historyFooter}>
                                    <View style={styles.hRef}><MapPin size={10} color="rgba(255,255,255,0.3)"/><Text style={styles.historyRemarks} numberOfLines={1}>{entry.remarks || 'Electronic Receipt Verified'}</Text></View>
                                    <View style={styles.historyActions}>
                                        {entry.receiptPhoto && (
                                            <TouchableOpacity style={styles.actionIcon} onPress={() => setViewImage(entry.receiptPhoto)}><Eye size={18} color="#fbbf24" /></TouchableOpacity>
                                        )}
                                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleDelete(entry._id)}><Trash2 size={18} color="#f43f5e" /></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* ADD ENTRY MODAL */}
                <Modal visible={showForm} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Tax Log Details</Text><TouchableOpacity onPress={() => setShowForm(false)}><X size={24} color="white" /></TouchableOpacity></View>
                            <ScrollView>
                                <View style={styles.fG}><Text style={styles.fL}>LOCATION / STATE BORDER</Text><TextInput style={styles.fI} placeholder="e.g. Delhi Border" placeholderTextColor="rgba(255,255,255,0.2)" value={form.borderName} onChangeText={t => setForm({...form, borderName: t})} /></View>
                                <View style={styles.grid2}>
                                    <View style={[styles.fG, {flex:1, marginRight:10}]}><Text style={styles.fL}>TAX AMOUNT (₹)</Text><TextInput style={styles.fI} keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={form.amount} onChangeText={t => setForm({...form, amount: t})} /></View>
                                    <View style={[styles.fG, {flex:1}]}><Text style={styles.fL}>LOG DATE</Text><TextInput style={styles.fI} value={form.date} onChangeText={t => setForm({...form, date: t})} /></View>
                                </View>
                                <View style={styles.fG}><Text style={styles.fL}>ASSIGNED DRIVER</Text>
                                    <TouchableOpacity style={styles.fS} onPress={() => { Alert.alert('Select Driver', 'Choose driver', drivers.map(d => ({ text: d.name, onPress: () => setForm({...form, driverId: d._id}) }))) }}>
                                        <Text style={{color:'white'}}>{drivers.find(d=>d._id===form.driverId)?.name || 'Select Driver'}</Text><ChevronRight size={14} color="#fbbf24"/>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.fG, {marginTop:10}]}><Text style={styles.fL}>REMARKS (OPTIONAL)</Text><TextInput style={styles.fI} placeholder="Note down specifics..." placeholderTextColor="rgba(255,255,255,0.2)" value={form.remarks} onChangeText={t => setForm({...form, remarks: t})} /></View>
                            </ScrollView>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="#000"/> : <><Save size={20} color="#000"/><Text style={styles.submitBtnT}>SUBMIT RECORD</Text></>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.summaryBox}>
                    <View style={styles.sbLeft}><Wallet size={24} color="#fbbf24"/><View><Text style={styles.sbL}>FLEET TOTAL ({months[selectedMonth].toUpperCase()})</Text><Text style={styles.sbV}>₹{totalPaid.toLocaleString()}</Text></View></View>
                    <ShieldAlert size={28} color="rgba(251, 191, 36, 0.1)"/>
                </View>
            </View>

            <View style={styles.controlsHeader}>
                <View style={styles.monthPicker}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.arrowBtn}><ChevronLeft size={20} color="white" /></TouchableOpacity>
                    <Text style={styles.dateDisplayText}>{months[selectedMonth]} {selectedYear}</Text>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.arrowBtn}><ChevronRight size={20} color="white" /></TouchableOpacity>
                </View>
                <View style={styles.searchBar}><Search size={18} color="rgba(255,255,255,0.3)" /><TextInput placeholder="Locate vehicle asset..." placeholderTextColor="rgba(255,255,255,0.3)" style={styles.input} value={searchTerm} onChangeText={setSearchTerm}/></View>
            </View>

            {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View> : (
                <FlatList
                    data={vehicles.filter(v => v.carNumber.toLowerCase().includes(searchTerm.toLowerCase()))}
                    renderItem={VehicleRow}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                />
            )}

            <Modal visible={!!viewImage} transparent animationType="fade">
                <View style={styles.imageOverlay}>
                    <TouchableOpacity style={styles.closeImage} onPress={() => setViewImage(null)}><X size={30} color="white"/></TouchableOpacity>
                    <Image source={{ uri: viewImage }} style={styles.bigImage} resizeMode="contain" />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    header: { padding: 25 },
    summaryBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 25, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sbLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    sbL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '950', letterSpacing: 1.5 },
    sbV: { color: 'white', fontSize: 26, fontWeight: '1000', marginTop: 4 },
    controlsHeader: { paddingHorizontal: 25, marginBottom: 15, gap: 15 },
    monthPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#161B2A', padding: 6, borderRadius: 16 },
    arrowBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
    dateDisplayText: { color: 'white', fontWeight: '900', fontSize: 15 },
    searchBar: { flexDirection: 'row', backgroundColor: '#161B2A', borderRadius: 16, paddingHorizontal: 15, height: 54, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    input: { color: 'white', flex: 1, marginLeft: 12, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center' },
    listContent: { padding: 25, paddingTop: 0, paddingBottom: 100 },
    card: { backgroundColor: '#161B2A', borderRadius: 28, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardInfo: { flexDirection: 'row', alignItems: 'center' },
    carIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    mainInfo: { flex: 1 },
    carNumber: { color: 'white', fontSize: 18, fontWeight: '950' },
    carModel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', marginTop: 2 },
    usageBox: { alignItems: 'flex-end', marginRight: 15 },
    usageLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800' },
    usageAmount: { fontSize: 18, fontWeight: '1000', marginTop: 2 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 25, gap: 15, backgroundColor: '#0D111D' },
    backBtn: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#161B2A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    detailTitle: { color: 'white', fontSize: 22, fontWeight: '1000' },
    detailSub: { color: '#fbbf24', fontSize: 12, fontWeight: '800', marginTop: 2 },
    detailContent: { padding: 25, paddingBottom: 120 },
    entryFormPreview: { backgroundColor: 'rgba(251, 191, 36, 0.04)', borderRadius: 24, padding: 25, marginBottom: 35, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(251, 191, 36, 0.2)' },
    pHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    pTitle: { color: 'white', fontSize: 10, fontWeight: '950', letterSpacing: 1 },
    addRecordBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fbbf24', height: 56, borderRadius: 16, justifyContent: 'center' },
    addRecordText: { color: '#000', fontWeight: '1000', fontSize: 13 },
    historyHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    historyCard: { backgroundColor: '#161B2A', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    historyMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    historyAmount: { color: '#10b981', fontSize: 20, fontWeight: '1000' },
    historyBorder: { color: 'white', fontSize: 13, fontWeight: '800', marginTop: 4 },
    historyDate: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700' },
    historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 15 },
    hRef: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    historyRemarks: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
    historyActions: { flexDirection: 'row', gap: 15 },
    actionIcon: { padding: 5 },
    emptyHistory: { padding: 60, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 24, borderStyle: 'dotted', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyHistoryText: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '1000' },
    fG: { marginBottom: 20 },
    fL: { color: '#fbbf24', fontSize: 9, fontWeight: '950', marginBottom: 12, letterSpacing: 1 },
    fI: { backgroundColor: '#0D111D', borderRadius: 16, height: 54, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    fS: { backgroundColor: '#0D111D', borderRadius: 16, height: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    grid2: { flexDirection: 'row' },
    submitBtn: { backgroundColor: '#fbbf24', height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10 },
    submitBtnT: { color: '#000', fontSize: 16, fontWeight: '1000' },
    imageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    bigImage: { width: '90%', height: '80%' },
    closeImage: { position: 'absolute', top: 50, right: 30, zIndex: 10 }
});

export default BorderTaxScreen;
