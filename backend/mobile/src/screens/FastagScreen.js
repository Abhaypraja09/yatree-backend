import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, CreditCard, Calendar, 
    ChevronRight, Wallet, Car, Zap,
    X, CheckCircle, Edit2, Trash2, IndianRupee,
    ChevronDown, Filter, AlertCircle
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, nowIST } from '../utils/istUtils';

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const FastagScreen = () => {
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedVehicle, setExpandedVehicle] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [rechargeForm, setRechargeForm] = useState({
        amount: '',
        method: 'UPI',
        remarks: '',
        date: todayIST()
    });

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    }, []);

    const fetchVehicles = async () => {
        if (!selectedCompany?._id) return;
        try {
            const { data } = await api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=all`);
            const fetchedVehicles = data.vehicles || [];
            
            const cleanedVehicles = fetchedVehicles
                .filter(v => v.isOutsideCar !== true)
                .map(v => ({
                    ...v,
                    displayCarNumber: v.carNumber ? v.carNumber.split('#')[0] : 'Unknown',
                    fastagHistory: (v.fastagHistory || []).sort((a, b) => new Date(b.date) - new Date(a.date))
                }));

            setVehicles(cleanedVehicles);
        } catch (err) {
            console.error('Failed to fetch fastag data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, [selectedCompany]);

    const handleRecharge = async () => {
        if (!rechargeForm.amount || !selectedVehicle) return Alert.alert('Error', 'Please select a vehicle and enter amount.');
        setSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/api/admin/vehicles/${selectedVehicle._id}/fastag-recharge/${editingEntryId}`, rechargeForm);
                Alert.alert('Success', 'Transaction updated.');
            } else {
                await api.post(`/api/admin/vehicles/${selectedVehicle._id}/fastag-recharge`, rechargeForm);
                Alert.alert('Success', 'Wallet recharged successfully.');
            }
            setShowModal(false);
            fetchVehicles();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Transaction failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (vId, hId) => {
        Alert.alert('Delete Entry', 'This will also revert the vehicle balance. Proceed?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/api/admin/vehicles/${vId}/fastag-recharge/${hId}`);
                    fetchVehicles();
                } catch (err) {
                    Alert.alert('Error', 'Failed to delete record.');
                }
            }}
        ]);
    };

    const totalSpentThisMonth = useMemo(() => {
        return vehicles.reduce((sum, v) => {
            const mTotal = (v.fastagHistory || []).filter(h => {
                const d = new Date(h.date);
                return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
            }).reduce((s, h) => s + (Number(h.amount) || 0), 0);
            return sum + mTotal;
        }, 0);
    }, [vehicles, selectedMonth, selectedYear]);

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => 
            v.displayCarNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [vehicles, searchTerm]);

    const VehicleCard = ({ item }) => {
        const isExpanded = expandedVehicle === item._id;
        const monthUsage = (item.fastagHistory || []).filter(h => {
            const d = new Date(h.date);
            return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
        }).reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

        const history = (item.fastagHistory || []).filter(h => {
            const d = new Date(h.date);
            return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
        });

        return (
            <View style={styles.vWrapper}>
                <TouchableOpacity 
                    style={[styles.vCard, isExpanded && styles.vCardExpanded]}
                    onPress={() => setExpandedVehicle(isExpanded ? null : item._id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.vMain}>
                        <View style={styles.iconBox}>
                            <Car size={22} color={monthUsage > 0 ? '#fbbf24' : 'rgba(255,255,255,0.4)'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.vNumber}>{item.displayCarNumber}</Text>
                            <Text style={styles.vModel}>{item.model || 'Unknown'}</Text>
                        </View>
                        <View style={styles.usageInfo}>
                            <Text style={styles.uLabel}>{months[selectedMonth].slice(0, 3)} Added</Text>
                            <Text style={[styles.uVal, { color: monthUsage > 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)' }]}>₹{monthUsage.toLocaleString()}</Text>
                        </View>
                        <ChevronRight size={18} color="rgba(255,255,255,0.2)" style={{ transform: [{ rotate: isExpanded ? '90deg' : '0' }] }} />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expanded}>
                        <View style={styles.eStats}>
                            <View>
                                <Text style={styles.hLabel}>Current Wallet Balance</Text>
                                <Text style={styles.hVal}>₹{(item.fastagBalance || 0).toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity style={styles.rBtn} onPress={() => { setSelectedVehicle(item); setIsEditing(false); setRechargeForm({ amount:'', method:'UPI', remarks:'', date: todayIST() }); setShowModal(true); }}>
                                <Plus size={14} color="#000" strokeWidth={3} />
                                <Text style={styles.rBtnText}>TOP UP</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.hTitle}>TRANSACTION LOG ({months[selectedMonth]})</Text>
                        {history.length === 0 ? (
                            <View style={styles.emptyH}><Text style={styles.emptyHText}>No recharges logged for this period.</Text></View>
                        ) : (
                            history.map((h, idx) => (
                                <View key={idx} style={styles.hRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.hDate}>{formatDateIST(h.date)}</Text>
                                        <Text style={styles.hNote}>{h.remarks || 'Standard Wallet Recharge'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.hAmt}>+₹{h.amount}</Text>
                                        <View style={{flexDirection:'row', gap: 8, marginTop: 5}}>
                                            <TouchableOpacity onPress={() => { setSelectedVehicle(item); setEditingEntryId(h._id); setIsEditing(true); setRechargeForm({ amount: String(h.amount), method: h.method || 'Manual', remarks: h.remarks || '', date: h.date?.split('T')[0] || todayIST() }); setShowModal(true); }}>
                                                <Edit2 size={14} color="rgba(255,255,255,0.3)" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(item._id, h._id)}>
                                                <Trash2 size={14} color="rgba(244, 63, 94, 0.4)" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.summaryCard}>
                    <View style={styles.sumIcon}>
                        <Wallet size={20} color="#fbbf24" />
                    </View>
                    <View>
                        <Text style={styles.sumLabel}>{months[selectedMonth]} Fleet Cumulative</Text>
                        <Text style={styles.sumValue}>₹{totalSpentThisMonth.toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.controlsRow}>
                <View style={styles.searchBox}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput 
                        placeholder="Search vehicle..." 
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        style={styles.si}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}><ChevronLeft size={18} color="#fbbf24" /></TouchableOpacity>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => Alert.alert('History Range', 'Select Period', months.map((m, i) => ({ text: m, onPress: () => setSelectedMonth(i) })))}>
                        <Text style={styles.monthT}>{months[selectedMonth].substring(0,3)} {selectedYear}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}><ChevronRight size={18} color="#fbbf24" /></TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24"/></View>
            ) : (
                <FlatList 
                    data={filteredVehicles}
                    renderItem={({ item }) => <VehicleCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVehicles(); }} tintColor="#fbbf24" />}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => { setSelectedVehicle(null); setIsEditing(false); setRechargeForm({ amount:'', method:'UPI', remarks:'', date: todayIST() }); setShowModal(true); }}>
                <Plus size={32} color="#000" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* RECHARGE MODAL */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.mOverlay}>
                    <View style={styles.mBox}>
                        <View style={styles.mHead}>
                            <View>
                                <Text style={styles.mTitle}>{isEditing ? 'Edit Log' : 'Wallet Top-Up'}</Text>
                                <Text style={styles.mTarget}>{selectedVehicle?.displayCarNumber || 'Global Asset Selection'}</Text>
                            </View>
                            <TouchableOpacity style={styles.mClose} onPress={() => setShowModal(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {!selectedVehicle && (
                                <View style={styles.ig}>
                                    <Text style={styles.l}>SELECT ASSET</Text>
                                    <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Choice', 'Target Vehicle', vehicles.map(v => ({ text: v.displayCarNumber, onPress: () => setSelectedVehicle(v) })))}>
                                        <Text style={{color:'white', fontWeight:'700'}}>{selectedVehicle ? selectedVehicle.displayCarNumber : 'Pick a vehicle asset...'}</Text>
                                        <ChevronDown size={14} color="#fbbf24" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.ig}>
                                <Text style={styles.l}>RECHARGE AMOUNT (₹)</Text>
                                <TextInput style={[styles.mi, {fontSize: 24, height: 70, color: '#fbbf24'}]} value={rechargeForm.amount} onChangeText={t => setRechargeForm({...rechargeForm, amount: t})} placeholder="0.00" keyboardType="numeric" />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.ig, {flex:1, marginRight: 10}]}>
                                    <Text style={styles.l}>PAYMENT MODE</Text>
                                    <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Mode', 'Payment Way', ['UPI','Cash','Bank','Card'].map(m => ({ text: m, onPress: () => setRechargeForm({...rechargeForm, method: m}) })))}>
                                        <Text style={{color:'white', fontWeight:'700'}}>{rechargeForm.method}</Text>
                                        <ChevronDown size={14} color="#fbbf24" />
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.ig, {flex: 1}]}>
                                    <Text style={styles.l}>ENTRY DATE</Text>
                                    <TextInput style={styles.mi} value={rechargeForm.date} onChangeText={t => setRechargeForm({...rechargeForm, date: t})} placeholder="YYYY-MM-DD" />
                                </View>
                            </View>

                            <View style={styles.ig}>
                                <Text style={styles.l}>INTERNAL REMARKS (OPTIONAL)</Text>
                                <TextInput style={styles.mi} value={rechargeForm.remarks} onChangeText={t => setRechargeForm({...rechargeForm, remarks: t})} placeholder="Transaction reference..." />
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleRecharge} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000"/> : <Text style={styles.saveBtnText}>{isEditing ? 'COMMIT UPDATED DATA' : 'CONFIRM CLOUD RECHARGE'}</Text>}
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
    summaryCard: { backgroundColor: 'rgba(251, 191, 36, 0.04)', borderRadius: 28, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.15)' },
    sumIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center' },
    sumLabel: { color: 'rgba(251, 191, 36, 0.5)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
    sumValue: { color: 'white', fontSize: 26, fontWeight: '950', marginTop: 2 },
    controlsRow: { flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginBottom: 20 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 54, borderRadius: 18, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    si: { flex: 1, marginLeft: 10, color: 'white', fontWeight: '600' },
    monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', borderRadius: 18, height: 54, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    navBtn: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, height: '100%', justifyContent: 'center' },
    monthT: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    list: { paddingHorizontal: 25, paddingBottom: 120 },
    vWrapper: { marginBottom: 15 },
    vCard: { backgroundColor: '#161B2A', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    vCardExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
    vMain: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    vNumber: { color: 'white', fontSize: 18, fontWeight: '900' },
    vModel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 1 },
    usageInfo: { alignItems: 'flex-end', marginRight: 10 },
    uLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    uVal: { fontSize: 18, fontWeight: '900', marginTop: 2 },
    expanded: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    eStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    hLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    hVal: { color: 'white', fontSize: 20, fontWeight: '900', marginTop: 4 },
    rBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fbbf24', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    rBtnText: { color: '#000', fontWeight: '950', fontSize: 11 },
    hTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 15 },
    hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, marginBottom: 8 },
    hDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
    hNote: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', marginTop: 2 },
    hAmt: { color: '#10b981', fontSize: 14, fontWeight: '900' },
    emptyH: { padding: 30, alignItems: 'center' },
    emptyHText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '600' },
    fab: { position: 'absolute', bottom: 35, right: 25, width: 68, height: 68, borderRadius: 24, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', elevation: 12, boxShadow: '0px 10px 25px rgba(251, 191, 36, 0.4)' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Modal
    mOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    mBox: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    mTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    mTarget: { color: '#fbbf24', fontSize: 13, fontWeight: '700', marginTop: 4 },
    mClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    ig: { marginBottom: 20 },
    l: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', marginBottom: 10, letterSpacing: 1.5 },
    mi: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    sel: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row' },
    saveBtn: { backgroundColor: '#fbbf24', height: 66, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '950' }
});

export default FastagScreen;
