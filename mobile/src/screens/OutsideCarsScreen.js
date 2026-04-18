import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Car, Calendar, 
    BadgeIndianRupee, ChevronRight, Filter,
    Briefcase, User, Layers, ShoppingCart, TrendingUp,
    ChevronLeft, ArrowUpRight, Trash2, X, Save,
    MapPin, Truck, Zap, Info, Building
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const OutsideCarsScreen = () => {
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [transactionFilter, setTransactionFilter] = useState('Buy'); 
    
    // Date Range Logic (Parity with Web)
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Form Modal
    const [showForm, setShowForm] = useState(false);
    const [detailDuty, setDetailDuty] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        carNumber: '', ownerName: '', contactNumber: '', model: '',
        dutyAmount: '', dutyType: 'Point to Point', property: 'General',
        transactionType: 'Buy', date: todayIST(), dropLocation: ''
    });

    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=outside`);
            setVehicles(data.vehicles?.filter(v => v.isOutsideCar && !v.eventId) || []);
        } catch (err) {
            console.error('Failed to fetch outside cars', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompany]);

    const handleSave = async () => {
        if (!form.carNumber || !form.dutyAmount) return Alert.alert('Error', 'Plate and Amount required');
        setSubmitting(true);
        try {
            // PORT WEB LOGIC: PLATE#YYYY-MM-DD#HASH
            const uniqueHash = Math.random().toString(36).substring(2, 7);
            const internalCarNumber = `${form.carNumber.trim().toUpperCase()}#${form.date}#${uniqueHash}`;
            
            const payload = { 
                ...form, 
                carNumber: internalCarNumber,
                companyId: selectedCompany._id, 
                isOutsideCar: true 
            };
            await api.post('/api/admin/vehicles', payload);
            setShowForm(false);
            setForm({ carNumber: '', ownerName: '', contactNumber: '', model: '', dutyAmount: '', dutyType: 'Point to Point', property: 'General', transactionType: 'Buy', date: todayIST(), dropLocation: '' });
            fetchData();
            Alert.alert('Success', 'Outside duty archived');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Duty', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/api/admin/vehicles/${id}`);
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

    const targetYearMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const filtered = vehicles.filter(v => {
        const dutyTagDateStr = v.carNumber?.split('#')[1];
        if (!dutyTagDateStr) return false;
        const dateMatch = dutyTagDateStr.startsWith(targetYearMonth);
        const transMatch = (v.transactionType || 'Buy') === transactionFilter;
        const searchMatch = v.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || v.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
        return dateMatch && transMatch && searchMatch;
    }).sort((a, b) => (b.carNumber?.split('#')[1] || '').localeCompare(a.carNumber?.split('#')[1] || ''));

    const totalVal = filtered.reduce((sum, v) => sum + (Number(v.dutyAmount) || 0), 0);

    const VehicleCard = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setDetailDuty(item)}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardPlate}>{item.carNumber?.split('#')[0]}</Text>
                    <Text style={styles.cardDate}>{formatDateIST(item.carNumber?.split('#')[1])}</Text>
                </View>
                <View style={styles.amountArea}>
                    <Text style={[styles.cardAmount, { color: item.transactionType === 'Sell' ? '#f43f5e' : '#10b981' }]}>₹{Number(item.dutyAmount).toLocaleString()}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: item.transactionType === 'Sell' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}><Text style={[styles.typeText, { color: item.transactionType === 'Sell' ? '#f43f5e' : '#10b981' }]}>{item.transactionType?.toUpperCase() || 'BUY'}</Text></View>
                </View>
            </View>
            <View style={styles.detailsGrid}>
                <View style={styles.infoBlock}><Text style={styles.infoLabel}>VENDOR / OWNER</Text><Text style={styles.infoValue} numberOfLines={1}>{item.ownerName || '-'}</Text></View>
                <View style={styles.infoBlock}><Text style={styles.infoLabel}>ENTITY / PROPERTY</Text><Text style={styles.infoValue} numberOfLines={1}>{item.property || 'General'}</Text></View>
                <View style={[styles.infoBlock, {marginTop: 12}]}><Text style={styles.infoLabel}>DUTY TYPE</Text><Text style={styles.infoValue} numberOfLines={1}>{item.dutyType || '-'}</Text></View>
                <View style={[styles.infoBlock, {marginTop: 12, alignItems: 'flex-end'}]}><Text style={styles.infoLabel}>DROP LOCATION</Text><Text style={styles.infoValue} numberOfLines={1}>{item.dropLocation || 'City Local'}</Text></View>
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item._id)}><Trash2 size={16} color="rgba(255,255,255,0.2)"/></TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerPanel}>
                <View style={styles.statCard}>
                    <View style={styles.statContent}>
                        <Text style={styles.statLabel}>{transactionFilter === 'Buy' ? 'TOTAL VENDOR PAYABLE' : 'TOTAL CLIENT RECEIVABLE'}</Text>
                        <Text style={styles.statValue}>₹{totalVal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statIcon}><BadgeIndianRupee size={22} color="#fbbf24" /></View>
                </View>
            </View>

            <View style={styles.filterSection}>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity style={[styles.toggleBtn, transactionFilter === 'Buy' && styles.toggleActive]} onPress={() => setTransactionFilter('Buy')}><Text style={[styles.toggleText, transactionFilter === 'Buy' && styles.activeText]}>FLEET IN</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, transactionFilter === 'Sell' && styles.toggleActive]} onPress={() => setTransactionFilter('Sell')}><Text style={[styles.toggleText, transactionFilter === 'Sell' && styles.activeText]}>FLEET OUT</Text></TouchableOpacity>
                </View>
                <View style={styles.monthRow}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.mArrow}><ChevronLeft size={20} color="white" /></TouchableOpacity>
                    <View style={styles.mDisplay}><Calendar size={14} color="#fbbf24"/><Text style={styles.monthDisplay}>{months[selectedMonth]} {selectedYear}</Text></View>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.mArrow}><ChevronRight size={20} color="white" /></TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchSection}><Search size={18} color="rgba(255,255,255,0.2)" /><TextInput placeholder="Search fleet or vendor..." placeholderTextColor="rgba(255,255,255,0.2)" style={styles.si} value={searchTerm} onChangeText={setSearchTerm}/></View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View>
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={({ item }) => <VehicleCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} tintColor="#fbbf24" />}
                    ListEmptyComponent={<View style={styles.empty}><Info size={40} color="rgba(255,255,255,0.05)"/><Text style={styles.emptyT}>No outside duties recorded for this period</Text></View>}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}><Plus size={32} color="#000" strokeWidth={3} /></TouchableOpacity>

            <Modal visible={showForm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Manual Duty Archive</Text><TouchableOpacity onPress={() => setShowForm(false)}><X size={24} color="white" /></TouchableOpacity></View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formToggle}>
                                <TouchableOpacity style={[styles.ftBtn, form.transactionType === 'Buy' && styles.ftBtnA]} onPress={() => setForm({...form, transactionType: 'Buy'})}><Text style={[styles.ftT, form.transactionType === 'Buy' && styles.ftTA]}>PURCHASED (BUY)</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.ftBtn, form.transactionType === 'Sell' && styles.ftBtnA]} onPress={() => setForm({...form, transactionType: 'Sell'})}><Text style={[styles.ftT, form.transactionType === 'Sell' && styles.ftTA]}>BUSINESS (SELL)</Text></TouchableOpacity>
                            </View>
                            
                            <View style={styles.inputGroup}><Text style={styles.label}>FLEET PLATE NUMBER</Text><TextInput style={styles.mInput} placeholder="DL1C AB 1234" placeholderTextColor="rgba(255,255,255,0.1)" value={form.carNumber} onChangeText={t => setForm({...form, carNumber: t.toUpperCase()})} /></View>
                            
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, {flex:1, marginRight:10}]}><Text style={styles.label}>DUTY AMOUNT (₹)</Text><TextInput style={styles.mInput} keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.1)" value={form.dutyAmount} onChangeText={t => setForm({...form, dutyAmount: t})} /></View>
                                <View style={[styles.inputGroup, {flex:1}]}><Text style={styles.label}>DUTY DATE</Text><TextInput style={styles.mInput} value={form.date} onChangeText={t => setForm({...form, date: t})} /></View>
                            </View>

                            <View style={styles.inputGroup}><Text style={styles.label}>VENDOR / PARTY NAME</Text><TextInput style={styles.mInput} placeholder="Assign a vendor" placeholderTextColor="rgba(255,255,255,0.1)" value={form.ownerName} onChangeText={t => setForm({...form, ownerName: t})} /></View>
                            
                            <View style={styles.inputGroup}><Text style={styles.label}>ENTITY (PROPERTY)</Text>
                                <TouchableOpacity style={styles.mSelect} onPress={() => Alert.alert('Property', 'Select Property', [
                                    { text: 'General', onPress: () => setForm({...form, property: 'General'}) },
                                    { text: 'Corporate', onPress: () => setForm({...form, property: 'Corporate'}) },
                                    { text: 'Airport Duty', onPress: () => setForm({...form, property: 'Airport Duty'}) }
                                ])}><Text style={{color:'white'}}>{form.property}</Text><ChevronRight size={14} color="#fbbf24"/></TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}><Text style={styles.label}>DESTINATION / REMARK</Text><TextInput style={styles.mInput} value={form.dropLocation} onChangeText={t => setForm({...form, dropLocation: t})} placeholder="Airport Drop / Outstation" placeholderTextColor="rgba(255,255,255,0.1)" /></View>
                        </ScrollView>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000"/> : <><Save size={20} color="#000"/><Text style={styles.saveBtnText}>CONFIRM TRANSACTION</Text></>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* VENDOR DUTY DOSSIER DETAIL MODAL */}
            <Modal visible={!!detailDuty} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        {detailDuty && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={styles.dhLeft}>
                                        <Text style={styles.targetLabel}>VENDOR LOG DOSSIER</Text>
                                        <Text style={styles.detailTitle}>{detailDuty.carNumber?.split('#')[0]}</Text>
                                        <Text style={styles.detailSub}>{formatDateIST(detailDuty.carNumber?.split('#')[1] || detailDuty.date)}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailDuty(null)}>
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>FINANCIAL CORE</Text>
                                                <Text style={styles.sectionSub}>TRANSACTION PROTOCOL</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: detailDuty.transactionType === 'Sell' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
                                                <Text style={[styles.badgeT, { color: detailDuty.transactionType === 'Sell' ? '#f43f5e' : '#10b981' }]}>{detailDuty.transactionType?.toUpperCase() || 'BUY'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.boxGrid}>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>{detailDuty.transactionType === 'Sell' ? 'CLIENT PAYABLE' : 'VENDOR AMOUNT'}</Text>
                                                <Text style={[styles.boxTime, { color: detailDuty.transactionType === 'Sell' ? '#f43f5e' : '#10b981' }]}>₹{Number(detailDuty.dutyAmount).toLocaleString()}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Duty Operation Type</Text><Text style={[styles.mV, { color: '#fbbf24' }]}>{detailDuty.dutyType}</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>LOGISTICS ENTITY</Text>
                                                <Text style={styles.sectionSub}>ALLOCATION AND ROUTING</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Contract Vendor</Text><Text style={styles.mV}>{detailDuty.ownerName || 'Undefined Party'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Entity (Property)</Text><Text style={styles.mV}>{detailDuty.property || 'General'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Routing (Drop)</Text><Text style={styles.mV}>{detailDuty.dropLocation || 'City Deployment'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Contact Handshake</Text><Text style={styles.mV}>{detailDuty.contactNumber || 'No Contact Given'}</Text></View>
                                    </View>
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
    headerPanel: { padding: 25 },
    statCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 25, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    statValue: { color: 'white', fontSize: 26, fontWeight: '950', marginTop: 5 },
    statIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center' },
    filterSection: { paddingHorizontal: 25, gap: 12, marginBottom: 15 },
    toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 5, marginBottom: 5 },
    toggleBtn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    toggleActive: { backgroundColor: '#fbbf24' },
    toggleText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '900' },
    activeText: { color: '#000' },
    monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    monthDisplay: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
    mArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    mDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchSection: { paddingHorizontal: 25, marginBottom: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 52, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginHorizontal: 25 },
    si: { color: 'white', flex: 1, marginLeft: 10, fontWeight: '600' },
    listContent: { padding: 25, paddingTop: 0, paddingBottom: 100 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    cardPlate: { color: 'white', fontSize: 20, fontWeight: '1000' },
    cardDate: { color: '#fbbf24', fontSize: 11, fontWeight: '800', marginTop: 4 },
    amountArea: { alignItems: 'flex-end' },
    cardAmount: { fontSize: 22, fontWeight: '1000' },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    typeText: { fontSize: 8, fontWeight: '950' },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    infoBlock: { width: '47%' },
    infoLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '950', letterSpacing: 0.5 },
    infoValue: { color: 'white', fontSize: 13, fontWeight: '800', marginTop: 3 },
    delBtn: { position: 'absolute', bottom: 15, right: 15, padding: 8 },
    center: { flex: 1, justifyContent: 'center' },
    empty: { padding: 80, alignItems: 'center', gap: 15 },
    emptyT: { color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: 12, fontWeight: '700' },
    fab: { position: 'absolute', bottom: 40, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', elevation: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: '1000' },
    formToggle: { flexDirection: 'row', backgroundColor: '#0D111D', padding: 5, borderRadius: 16, marginBottom: 25 },
    ftBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    ftBtnA: { backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    ftT: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900' },
    ftTA: { color: '#fbbf24' },
    inputGroup: { marginBottom: 18 },
    label: { color: '#fbbf24', fontSize: 9, fontWeight: '950', marginBottom: 10, letterSpacing: 1.5 },
    mInput: { backgroundColor: '#0D111D', borderRadius: 16, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    mSelect: { backgroundColor: '#0D111D', borderRadius: 16, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row' },
    saveBtn: { backgroundColor: '#fbbf24', height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 10 },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '1000' },

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

export default OutsideCarsScreen;