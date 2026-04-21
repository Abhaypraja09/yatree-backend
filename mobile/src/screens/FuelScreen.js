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

        // Group entries by vehicle to calculate "consumed" liters (excluding latest fill)
        const vehicleGroups = {};
        filteredEntries.forEach(entry => {
            const vehicleId = entry.vehicle?._id || entry.vehicle;
            if (!vehicleId) return;
            if (!vehicleGroups[vehicleId]) vehicleGroups[vehicleId] = [];
            vehicleGroups[vehicleId].push(entry);
        });

        let totalConsumedLiters = 0;
        Object.values(vehicleGroups).forEach(group => {
            // Sort by date/odometer
            const sorted = [...group].sort((a, b) => new Date(b.date) - new Date(a.date));
            // Exclude the most recent fill quantity
            const quantityToExclude = Number(sorted[0]?.quantity) || 0;
            const groupTotalQuantity = group.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
            totalConsumedLiters += Math.max(0, groupTotalQuantity - quantityToExclude);
        });

        const efficiency = totalConsumedLiters > 0 ? (distance / totalConsumedLiters).toFixed(2) : 0;
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
                <View style={[styles.summaryCard, { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }]}>
                    <View style={styles.sumTop}>
                        <View>
                            <Text style={styles.sumL}>{months[selectedMonth]} FUEL EXPENDITURE</Text>
                            <Text style={styles.sumV}>₹{stats.total.toLocaleString()}</Text>
                        </View>
                        <View style={styles.sumIcon}>
                            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#fbbf24', opacity: 0.1, borderRadius: 16 }} />
                            <Droplets size={26} color="#fbbf24" style={{ zIndex: 1 }} />
                        </View>
                    </View>
                    <View style={styles.sumGrid}>
                        <View style={styles.sumItem}>
                            <Text style={styles.sumIL}>TOTAL VOLUME</Text>
                            <Text style={styles.sumIV}>{stats.liters.toFixed(1)} L</Text>
                        </View>
                        <View style={styles.sumItem}>
                            <Text style={styles.sumIL}>DIST. RUN</Text>
                            <Text style={styles.sumIV}>{stats.distance} KM</Text>
                        </View>
                        <View style={styles.sumItem}>
                            <Text style={styles.sumIL}>AVG EFFICIENCY</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <TrendingUp size={14} color="#10b981" />
                                <Text style={[styles.sumIV, { color: '#10b981' }]}>{stats.efficiency} KM/L</Text>
                            </View>
                        </View>
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
    container: { flex: 1, backgroundColor: '#070a14' },
    summary: { padding: 20 },
    summaryCard: { 
        backgroundColor: '#161B2A', 
        borderRadius: 32, 
        padding: 24, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#fbbf24',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10
    },
    sumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sumL: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    sumV: { color: 'white', fontSize: 36, fontWeight: '950', marginTop: 4, letterSpacing: -1 },
    sumIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    sumGrid: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    sumItem: { flex: 1 },
    sumIL: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 6, textTransform: 'uppercase' },
    sumIV: { color: 'white', fontSize: 15, fontWeight: '950' },
    tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
    tab: { flex: 1, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tabA: { backgroundColor: 'rgba(251, 191, 36, 0.12)', borderColor: 'rgba(251, 191, 36, 0.3)' },
    tabT: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    tabTA: { color: '#fbbf24' },
    controls: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
    monthBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', height: 56, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    monthT: { color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', height: 54, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    si: { flex: 1, color: 'white', fontWeight: '800', marginLeft: 12, fontSize: 14 },
    list: { paddingHorizontal: 20, paddingBottom: 150 },
    card: { backgroundColor: '#111827', borderRadius: 32, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
    glow: { position: 'absolute', left: 0, top: 24, width: 4, height: 44, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    vInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    vIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    vPlate: { color: 'white', fontSize: 19, fontWeight: '950', letterSpacing: -0.5 },
    vSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', marginTop: 2 },
    vAmt: { color: 'white', fontSize: 22, fontWeight: '950' },
    vQty: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginTop: 2 },
    statLine: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    sItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    sVal: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
    driverTag: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    fab: { 
        position: 'absolute', 
        bottom: 40, 
        right: 20, 
        width: 72, 
        height: 72, 
        borderRadius: 26, 
        backgroundColor: '#fbbf24', 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#fbbf24',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 15
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    mBox: { backgroundColor: '#111827', borderTopLeftRadius: 44, borderTopRightRadius: 44, padding: 32, maxHeight: '94%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    mT: { color: 'white', fontSize: 24, fontWeight: '950', letterSpacing: -0.5 },
    ig: { marginBottom: 24 },
    l: { color: '#fbbf24', fontSize: 10, fontWeight: '950', marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
    mi: { backgroundColor: '#070a14', borderRadius: 20, height: 62, paddingHorizontal: 20, color: 'white', fontWeight: '800', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', fontSize: 16 },
    sel: { backgroundColor: '#070a14', borderRadius: 20, height: 62, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    row: { flexDirection: 'row' },
    save: { backgroundColor: '#fbbf24', height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
    saveT: { color: '#000', fontSize: 17, fontWeight: '950', letterSpacing: 0.5 },

    // Detail Modal Styles
    detailOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.96)', justifyContent: 'flex-end' },
    detailContent: { backgroundColor: '#070a14', borderTopLeftRadius: 44, borderTopRightRadius: 44, height: '92%', padding: 28 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    dhLeft: { flex: 1 },
    targetLabel: { color: '#fbbf24', fontSize: 11, fontWeight: '950', letterSpacing: 2.5, textTransform: 'uppercase' },
    detailTitle: { color: 'white', fontSize: 28, fontWeight: '950', marginTop: 6, letterSpacing: -0.5 },
    detailSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700', marginTop: 6 },
    closeBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    detailSection: { backgroundColor: '#111827', borderRadius: 32, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '1000', letterSpacing: 2, textTransform: 'uppercase' },
    sectionSub: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 14, marginBottom: 24 },
    miniStat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    miniStatL: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginBottom: 6, textTransform: 'uppercase' },
    miniStatV: { color: 'white', fontSize: 17, fontWeight: '950' },
    boxGrid: { flexDirection: 'row', gap: 14, marginBottom: 24 },
    detailBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    boxTime: { color: 'white', fontSize: 18, fontWeight: '950', marginTop: 6 },
    mRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    mL: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700' },
    mV: { color: 'white', fontSize: 14, fontWeight: '900' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
    badgeT: { fontSize: 10, fontWeight: '1000', letterSpacing: 1.5 },
    modalScroll: { marginBottom: 12 },
    evidenceImg: { width: '100%', height: 220, borderRadius: 24, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
});

export default FuelScreen;
