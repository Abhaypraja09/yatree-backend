import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions, Image, Platform
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Fuel, Droplets, 
    BadgeIndianRupee, ChevronRight, Filter,
    Navigation, TrendingUp, Car, Calendar,
    ChevronLeft, X, Save, ArrowUpRight,
    MapPin, Clock, Edit2, Trash2, Shield, User,
    Image as ImageIcon, CheckCircle, XCircle
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const FuelScreen = () => {
    const { selectedCompany } = useCompany();
    const [entries, setEntries] = useState([]);
    const [pendingEntries, setPendingEntries] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('history'); // 'history', 'pending'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Form Modal
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detailFuel, setDetailFuel] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        vehicleId: '', date: todayIST(), amount: '', quantity: '', 
        rate: '', stationName: '', odometer: '', fuelType: 'Diesel',
        paymentMode: 'Cash', paymentSource: 'Office'
    });

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const fromDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
            const toDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
            const [fuelRes, pendingRes, vehicleRes] = await Promise.all([
                api.get(`/api/admin/fuel/${selectedCompany._id}?from=${fromDate}&to=${toDate}`),
                api.get(`/api/admin/fuel/pending/${selectedCompany._id}`),
                api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`)
            ]);
            setEntries(fuelRes.data || []);
            setPendingEntries(pendingRes.data || []);
            setVehicles(vehicleRes.data.vehicles || []);
        } catch (err) {
            console.error('Failed to fetch fuel data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompany, selectedMonth, selectedYear]);

    const handleSave = async () => {
        if (!form.vehicleId || !form.amount || !form.quantity) return Alert.alert('Error', 'Vehicle, Amount and Quantity required');
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/api/admin/fuel/${editingId}`, { ...form, companyId: selectedCompany._id });
                Alert.alert('Success', 'Fuel entry updated');
            } else {
                await api.post('/api/admin/fuel', { ...form, companyId: selectedCompany._id });
                Alert.alert('Success', 'Fuel entry archived');
            }
            setShowForm(false);
            fetchData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Submission failed');
        } finally { setSubmitting(false); }
    };

    const handleApproveReject = async (attendanceId, expenseId, status) => {
        try {
            await api.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`, { status });
            fetchData();
        } catch (err) { Alert.alert('Error', 'Status update failed'); }
    };

    const shiftMonth = (val) => {
        let nMonth = selectedMonth + val;
        let nYear = selectedYear;
        if (nMonth < 0) { nMonth = 11; nYear--; }
        if (nMonth > 11) { nMonth = 0; nYear++; }
        setSelectedMonth(nMonth);
        setSelectedYear(nYear);
    };

    const stats = useMemo(() => {
        const filteredEntries = entries.filter(e => e.vehicle?.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
        const total = filteredEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const liters = filteredEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
        const distance = filteredEntries.reduce((sum, e) => sum + (e.distance || 0), 0);
        const efficiency = liters > 0 ? (distance / liters).toFixed(1) : 0;
        return { total, liters, distance, efficiency };
    }, [entries, searchTerm]);

    const FuelCard = ({ item, isPending = false }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => setDetailFuel(item)}>
            <View style={[styles.glow, { backgroundColor: item.fuelType === 'Petrol' ? '#3b82f6' : '#fbbf24' }]} />
            <View style={styles.cardHead}>
                <View style={styles.vInfo}>
                    <View style={styles.vIconBox}><Fuel size={18} color={item.fuelType === 'Petrol' ? '#3b82f6' : '#fbbf24'} /></View>
                    <View>
                        <Text style={styles.vPlate}>{item.vehicle?.carNumber || 'Fleet Unit'}</Text>
                        <Text style={styles.vSub}>{formatDateIST(item.date)} • {item.stationName || 'Fleet Tank'}</Text>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.vAmt}>₹{item.amount?.toLocaleString()}</Text>
                    <Text style={styles.vQty}>{item.quantity}L • ₹{item.rate}/L</Text>
                </View>
            </View>
            <View style={styles.statLine}>
                <View style={styles.sItem}><Navigation size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.sVal}>{item.distance || 0} KM TRIP</Text></View>
                <View style={styles.sItem}><TrendingUp size={12} color={item.mileage > 12 ? '#10b981' : '#fbbf24'} /><Text style={[styles.sVal, {color: item.mileage > 12 ? '#10b981' : '#fbbf24'}]}>{item.mileage || 0} KM/L</Text></View>
                <View style={styles.sItem}><Shield size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.sVal}>{item.paymentSource || 'Office'}</Text></View>
            </View>
            <View style={styles.cardFoot}>
                <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                    {isPending ? (
                        <>
                            <TouchableOpacity onPress={() => handleApproveReject(item.attendanceId, item._id, 'rejected')}><XCircle size={22} color="#f43f5e" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleApproveReject(item.attendanceId, item._id, 'approved')}><CheckCircle size={22} color="#10b981" /></TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => { setEditingId(item._id); setForm({ ...item, vehicleId: item.vehicle?._id || item.vehicle, date: toISTDateString(item.date) }); setShowForm(true); }}><Edit2 size={16} color="rgba(255,255,255,0.3)" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => Alert.alert('Delete', 'Delete fuel log?', [{ text: 'No' }, { text: 'Yes', onPress: () => api.delete(`/api/admin/fuel/${item._id}`).then(fetchData) }])}><Trash2 size={16} color="rgba(244, 63, 94, 0.4)" /></TouchableOpacity>
                        </>
                    )}
                </View>
                <Text style={styles.driverTag}>{item.driver || 'Administrator'}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.summary}>
                <View style={styles.summaryCard}>
                    <View style={styles.sumTop}>
                        <View>
                            <Text style={styles.sumL}>{months[selectedMonth]} FUEL EXPENDITURE</Text>
                            <Text style={styles.sumV}>₹{stats.total.toLocaleString()}</Text>
                        </View>
                        <View style={styles.sumIcon}><Droplets size={26} color="#fbbf24" /></View>
                    </View>
                    <View style={styles.sumGrid}>
                        <View style={styles.sumItem}><Text style={styles.sumIL}>TOTAL VOLUME</Text><Text style={styles.sumIV}>{stats.liters.toFixed(1)} L</Text></View>
                        <View style={styles.sumItem}><Text style={styles.sumIL}>DIST. RUN</Text><Text style={styles.sumIV}>{stats.distance} KM</Text></View>
                        <View style={styles.sumItem}><Text style={styles.sumIL}>AVG EFFICIENCY</Text><Text style={[styles.sumIV, {color:'#10b981'}]}>{stats.efficiency} KM/L</Text></View>
                    </View>
                </View>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabA]} onPress={() => setActiveTab('history')}><Text style={[styles.tabT, activeTab === 'history' && styles.tabTA]}>History Log</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.tabA]} onPress={() => setActiveTab('pending')}><Text style={[styles.tabT, activeTab === 'pending' && styles.tabTA]}>Pending ({pendingEntries.length})</Text></TouchableOpacity>
            </View>

            <View style={styles.controls}>
                <View style={styles.monthBox}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)}><ChevronLeft size={22} color="white" /></TouchableOpacity>
                    <Text style={styles.monthT}>{months[selectedMonth]} {selectedYear}</Text>
                    <TouchableOpacity onPress={() => shiftMonth(1)}><ChevronRight size={22} color="white" /></TouchableOpacity>
                </View>
                <View style={styles.searchRow}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput style={styles.si} placeholder="Filter car number..." placeholderTextColor="rgba(255,255,255,0.2)" value={searchTerm} onChangeText={setSearchTerm} />
                </View>
            </View>

            {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24"/></View> : (
                <FlatList
                    data={(activeTab === 'history' ? entries.filter(e => e.vehicle?.carNumber?.toLowerCase().includes(searchTerm.toLowerCase())) : pendingEntries).sort((a, b) => {
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        if (dateB !== dateA) return dateB - dateA;
                        return (b.odometer || 0) - (a.odometer || 0);
                    })}
                    renderItem={({ item }) => <FuelCard item={item} isPending={activeTab === 'pending'} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fbbf24" />}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => { setEditingId(null); setForm({ vehicleId: '', date: todayIST(), amount: '', quantity: '', rate: '', stationName: '', odometer: '', fuelType: 'Diesel', paymentMode: 'Cash', paymentSource: 'Office' }); setShowForm(true); }}>
                <Plus size={32} color="#000" strokeWidth={2.5} />
            </TouchableOpacity>

            <Modal visible={showForm} animationType="slide" transparent>
                <View style={styles.mOverlay}>
                    <View style={styles.mBox}>
                        <View style={styles.mHead}>
                            <Text style={styles.mT}>{editingId ? 'Edit Entry' : 'New Refuel Log'}</Text>
                            <TouchableOpacity onPress={() => setShowForm(false)}><X size={26} color="white" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.ig}><Text style={styles.l}>VEHICLE PLATE</Text>
                                <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Choice', 'Select Car', vehicles.map(v => ({ text: v.carNumber, onPress: () => setForm({...form, vehicleId: v._id}) })))}>
                                    <Text style={{color:'white', fontWeight:'700'}}>{vehicles.find(v => v._id === form.vehicleId)?.carNumber || 'Select Fleet Unit'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.ig, {flex:1, marginRight:10}]}><Text style={styles.l}>COST (₹)</Text><TextInput style={styles.mi} keyboardType="numeric" value={String(form.amount)} onChangeText={t => setForm({...form, amount: t})} /></View>
                                <View style={[styles.ig, {flex:1}]}><Text style={styles.l}>LITERS (L)</Text><TextInput style={styles.mi} keyboardType="numeric" value={String(form.quantity)} onChangeText={t => setForm({...form, quantity: t})} /></View>
                            </View>
                            <View style={styles.ig}><Text style={styles.l}>ODOMETER READING (KM)</Text><TextInput style={styles.mi} keyboardType="numeric" value={String(form.odometer)} onChangeText={t => setForm({...form, odometer: t})} /></View>
                            <View style={styles.ig}><Text style={styles.l}>PUMP / STATION</Text><TextInput style={styles.mi} value={form.stationName} onChangeText={t => setForm({...form, stationName: t})} /></View>
                            <View style={styles.row}>
                                <View style={[styles.ig, {flex:1, marginRight:10}]}><Text style={styles.l}>FUEL TYPE</Text>
                                    <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Type', 'Fuel Used', ['Diesel','Petrol','CNG'].map(t=>({text:t, onPress:()=>setForm({...form, fuelType: t})})))}>
                                        <Text style={{color:'white', fontWeight:'700'}}>{form.fuelType}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.ig, {flex: 1}]}>
                                    <Text style={styles.l}>PAYMENT SOURCE</Text>
                                    <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Source', 'Payment From', ['Office','PetroCard','Driver Personal'].map(s=>({text:s, onPress:()=>setForm({...form, paymentSource: s})})))}>
                                        <Text style={{color:'white', fontWeight:'700'}}>{form.paymentSource}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.ig}><Text style={styles.l}>BILL DATE</Text><TextInput style={styles.mi} value={form.date} onChangeText={t => setForm({...form, date: t})} /></View>
                            <View style={{height: 100}} />
                        </ScrollView>
                        <TouchableOpacity style={styles.save} onPress={handleSave} disabled={submitting}>{submitting ? <ActivityIndicator color="#000"/> : <Text style={styles.saveT}>SAVE LOG</Text>}</TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* FUEL DOSSIER DETAIL MODAL */}
            <Modal visible={!!detailFuel} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        {detailFuel && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={styles.dhLeft}>
                                        <Text style={styles.targetLabel}>FUEL CONSUMPTION DOSSIER</Text>
                                        <Text style={styles.detailTitle}>{detailFuel.vehicle?.carNumber || 'Fleet Unit'}</Text>
                                        <Text style={styles.detailSub}>{formatDateIST(detailFuel.date)} • {detailFuel.stationName || 'N/A'}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailFuel(null)}>
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>TRANSACTION CORE</Text>
                                                <Text style={styles.sectionSub}>VOLUME AND EXPENDITURE</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: 'rgba(251, 191, 36, 0.2)' }]}>
                                                <Text style={[styles.badgeT, { color: '#fbbf24' }]}>{detailFuel.paymentMode?.toUpperCase() || 'CASH'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.boxGrid}>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>TOTAL COST</Text>
                                                <Text style={styles.boxTime}>₹{detailFuel.amount?.toLocaleString()}</Text>
                                            </View>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>VOLUME FILLED</Text>
                                                <Text style={styles.boxTime}>{detailFuel.quantity} L</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Fuel Type</Text><Text style={styles.mV}>{detailFuel.fuelType?.toUpperCase()}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Rate per Liter</Text><Text style={[styles.mV, { color: '#fbbf24' }]}>₹{detailFuel.rate}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Source Bank</Text><Text style={styles.mV}>{detailFuel.paymentSource || 'Office Fleet Account'}</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>PERFORMANCE LOGS</Text>
                                                <Text style={styles.sectionSub}>ODOMETER & EFFICIENCY</Text>
                                            </View>
                                        </View>
                                        <View style={styles.statsRow}>
                                            <View style={styles.miniStat}>
                                                <Text style={styles.miniStatL}>EST. MILEAGE</Text>
                                                <Text style={[styles.miniStatV, { color: detailFuel.mileage > 12 ? '#10b981' : '#fbbf24' }]}>{detailFuel.mileage || 0} km/l</Text>
                                            </View>
                                            <View style={styles.miniStat}>
                                                <Text style={styles.miniStatL}>TRIP SPAN</Text>
                                                <Text style={styles.miniStatV}>{detailFuel.distance || 0} km</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Meter Reading (Odo)</Text><Text style={styles.mV}>{detailFuel.odometer || 'N/A'}</Text></View>
                                    </View>

                                    {detailFuel.slipPhoto && (
                                        <View style={styles.detailSection}>
                                            <Text style={[styles.sectionTitle, { color: '#38bdf8', marginBottom: 15 }]}>EVIDENCE (SLIP CAPTURE)</Text>
                                            <Image source={{ uri: detailFuel.slipPhoto.startsWith('http') ? detailFuel.slipPhoto : `https://api.yatreedestination.com/${detailFuel.slipPhoto}` }} style={styles.evidenceImg} resizeMode="cover" />
                                        </View>
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
    summary: { padding: 25 },
    summaryCard: { backgroundColor: '#161B2A', borderRadius: 32, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    sumL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    sumV: { color: 'white', fontSize: 32, fontWeight: '950', marginTop: 4 },
    sumIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.08)', justifyContent: 'center', alignItems: 'center' },
    sumGrid: { flexDirection: 'row', gap: 15 },
    sumItem: { flex: 1 },
    sumIL: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', marginBottom: 4 },
    sumIV: { color: 'white', fontSize: 15, fontWeight: '900' },
    tabs: { flexDirection: 'row', paddingHorizontal: 25, gap: 10, marginBottom: 20 },
    tab: { flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    tabA: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.15)' },
    tabT: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900' },
    tabTA: { color: '#fbbf24' },
    controls: { paddingHorizontal: 25, gap: 15, marginBottom: 20 },
    monthBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', height: 54, borderRadius: 18, paddingHorizontal: 15 },
    monthT: { color: 'white', fontSize: 14, fontWeight: '950' },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 52, borderRadius: 18, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    si: { flex: 1, color: 'white', fontWeight: '600', marginLeft: 10 },
    list: { paddingHorizontal: 25, paddingBottom: 150 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    glow: { position: 'absolute', left: 0, top: 20, width: 4, height: 40, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    vInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    vIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    vPlate: { color: 'white', fontSize: 18, fontWeight: '950' },
    vSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700' },
    vAmt: { color: 'white', fontSize: 20, fontWeight: '950' },
    vQty: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800' },
    statLine: { flexDirection: 'row', gap: 15, marginBottom: 18 },
    sItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    sVal: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    driverTag: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '800' },
    fab: { 
        position: 'absolute', 
        bottom: 35, 
        right: 25, 
        width: 68, 
        height: 68, 
        borderRadius: 24, 
        backgroundColor: '#fbbf24', 
        justifyContent: 'center', 
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(0,0,0,0.5)' },
            default: { elevation: 12 }
        })
    },
    center: { flex: 1, justifyContent: 'center' },
    mOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    mBox: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '92%' },
    mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    mT: { color: 'white', fontSize: 22, fontWeight: '950' },
    ig: { marginBottom: 20 },
    l: { color: '#fbbf24', fontSize: 9, fontWeight: '950', marginBottom: 10, letterSpacing: 1.5 },
    mi: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sel: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row' },
    save: { backgroundColor: '#fbbf24', height: 66, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveT: { color: '#000', fontSize: 16, fontWeight: '950' },

    // Detail Modal Styles
    detailOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    detailContent: { backgroundColor: '#0D111D', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '90%', padding: 25 },
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
    statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    miniStat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 16 },
    miniStatL: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 4 },
    miniStatV: { color: 'white', fontSize: 15, fontWeight: '950' },
    boxGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    detailBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    boxTime: { color: 'white', fontSize: 16, fontWeight: '950', marginTop: 4 },
    mRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    mL: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
    mV: { color: 'white', fontSize: 13, fontWeight: '900' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    badgeT: { fontSize: 9, fontWeight: '1000', letterSpacing: 1 },
    modalScroll: { marginBottom: 10 },
    evidenceImg: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#000' }
});

export default FuelScreen;
