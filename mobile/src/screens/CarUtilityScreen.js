import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Dimensions, ScrollView, Platform, Alert, Image
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import {
    Search, Plus, ChevronRight, ChevronLeft,
    X, CreditCard, Wrench, Zap, Layers, 
    Trash2, Edit3, Droplets, TrendingUp,
    Car, AlertCircle, Info, Calendar
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const { width } = Dimensions.get('window');

const CarUtilityScreen = () => {
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [allBorderEntries, setAllBorderEntries] = useState([]);
    const [allServiceRecords, setAllServiceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedVehicleId, setExpandedVehicleId] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Tabs inside expanded vehicle
    const [activeUtility, setActiveUtility] = useState('fastag'); 

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [vehRes, borderRes, serviceRes] = await Promise.all([
                api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`),
                api.get(`/api/admin/border-tax/${selectedCompany._id}`),
                api.get(`/api/admin/maintenance/${selectedCompany._id}?type=driver_services`)
            ]);

            const targetCompanyId = String(selectedCompany._id);
            const filteredVehs = (vehRes.data.vehicles || []).filter(v => {
                const vCompId = String(v.company?._id || v.company || '');
                return vCompId === targetCompanyId && v.isOutsideCar !== true;
            });

            setVehicles(filteredVehs);
            setAllBorderEntries(borderRes.data || []);
            setAllServiceRecords(serviceRes.data || []);
        } catch (err) {
            console.error('Fetch utility data failed', err);
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

    const getVehicleActivity = (vId) => {
        const v = vehicles.find(v => v._id === vId);
        const fastagHistory = v?.fastagHistory || [];
        
        const fFilt = fastagHistory.filter(h => {
            const d = new Date(h.date || new Date());
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
        const bFilt = allBorderEntries.filter(e => {
            const d = new Date(e.date || new Date());
            return (e.vehicle?._id === vId || e.vehicle === vId) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
        const sFilt = allServiceRecords.filter(r => {
            const d = new Date(r.billDate || r.date || new Date());
            return (r.vehicle?._id === vId || r.vehicle === vId) && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        return {
            fastag: fFilt.reduce((s, h) => s + (Number(h.amount) || 0), 0),
            border: bFilt.reduce((s, e) => s + (Number(e.amount) || 0), 0),
            service: sFilt.reduce((s, r) => s + (Number(r.amount) || 0), 0),
            items: { fastag: fFilt, border: bFilt, service: sFilt }
        };
    };

    const globalStats = useMemo(() => {
        let f = 0, b = 0, s = 0;
        vehicles.forEach(v => {
            const act = getVehicleActivity(v._id);
            f += act.fastag; b += act.border; s += act.service;
        });
        return { f, b, s, t: f + b + s };
    }, [vehicles, allBorderEntries, allServiceRecords, selectedMonth, selectedYear]);

    const filteredVehicles = vehicles.filter(v => 
        (v.carNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const UtilityCard = ({ item }) => {
        const act = getVehicleActivity(item._id);
        const isExpanded = expandedVehicleId === item._id;

        return (
            <View style={[styles.card, isExpanded && styles.cardExpanded]}>
                <TouchableOpacity 
                    style={styles.cardHeader} 
                    onPress={() => setExpandedVehicleId(isExpanded ? null : item._id)}
                >
                    <View style={styles.headerLeft}>
                        <View style={styles.carIconBox}><Car size={20} color="#fbbf24" /></View>
                        <View>
                            <Text style={styles.carPlate}>{item.carNumber}</Text>
                            <Text style={styles.carModel}>{item.model || 'Fleet Asset'}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.totalVal}>₹{act.fastag + act.border + act.service}</Text>
                        <ChevronRight size={18} color="rgba(255,255,255,0.2)" transform={isExpanded ? [{rotate: '90deg'}] : []} />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.tabRow}>
                            {[
                                { id: 'fastag', label: 'Fastag', val: act.fastag, color: '#fbbf24' },
                                { id: 'border', label: 'Border', val: act.border, color: '#0ea5e9' },
                                { id: 'service', label: 'Service', val: act.service, color: '#a855f7' }
                            ].map(t => (
                                <TouchableOpacity 
                                    key={t.id} 
                                    style={[styles.smallTab, activeUtility === t.id && { backgroundColor: `${t.color}20`, borderColor: t.color }]} 
                                    onPress={() => setActiveUtility(t.id)}
                                >
                                    <Text style={[styles.smallTabText, activeUtility === t.id && { color: t.color }]}>{t.label}</Text>
                                    <Text style={[styles.smallTabVal, activeUtility === t.id && { color: t.color }]}>₹{t.val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.historyList}>
                            {act.items[activeUtility].length === 0 ? (
                                <Text style={styles.emptyText}>No records for this month</Text>
                            ) : (
                                act.items[activeUtility].map((rec, idx) => (
                                    <View key={idx} style={styles.historyItem}>
                                        <View>
                                            <Text style={styles.histAmount}>₹{rec.amount}</Text>
                                            <Text style={styles.histDate}>{formatDateIST(rec.date || rec.billDate)}</Text>
                                        </View>
                                        <Text style={styles.histNote} numberOfLines={1}>{rec.remarks || rec.borderName || rec.category || 'Recharge'}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                        
                        <TouchableOpacity style={styles.addBtnSmall} onPress={() => Alert.alert('Add Entry', `Logging ${activeUtility} for ${item.carNumber}`)}>
                            <Plus size={14} color="#000" />
                            <Text style={styles.addBtnTextSmall}>ADD ENTRY</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSmall}>FLEET EXPENDITURE</Text>
                    <Text style={styles.headerLarge}>Car Utility</Text>
                </View>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)}><ChevronLeft size={20} color="#fbbf24" /></TouchableOpacity>
                    <Text style={styles.monthDisplay}>{months[selectedMonth]} {selectedYear}</Text>
                    <TouchableOpacity onPress={() => shiftMonth(1)}><ChevronRight size={20} color="#fbbf24" /></TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsBar}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>FASTAG</Text>
                    <Text style={styles.statVal}>₹{globalStats.f}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>BORDER</Text>
                    <Text style={styles.statVal}>₹{globalStats.b}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>SERVICES</Text>
                    <Text style={styles.statVal}>₹{globalStats.s}</Text>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder="Search vehicle..." 
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.loader}><ActivityIndicator size="large" color="#fbbf24" /></View>
            ) : (
                <FlatList
                    data={filteredVehicles}
                    renderItem={({ item }) => <UtilityCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070A11' },
    header: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerSmall: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerLarge: { color: 'white', fontSize: 26, fontWeight: '950', marginTop: 4 },
    monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    monthDisplay: { color: 'white', fontSize: 13, fontWeight: '900', marginHorizontal: 15, width: 80, textAlign: 'center' },
    statsBar: { flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginBottom: 20 },
    statBox: { flex: 1, backgroundColor: '#161B2A', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 5 },
    statVal: { color: 'white', fontSize: 15, fontWeight: '950' },
    searchWrap: { paddingHorizontal: 25, marginBottom: 15 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', borderRadius: 18, paddingHorizontal: 15, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { flex: 1, color: 'white', marginLeft: 10, fontWeight: '600' },
    list: { padding: 25, paddingTop: 0, paddingBottom: 100 },
    card: { backgroundColor: '#161B2A', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardExpanded: { borderColor: '#fbbf24' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    carIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center' },
    carPlate: { color: 'white', fontSize: 18, fontWeight: '950' },
    carModel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    totalVal: { color: '#10b981', fontSize: 18, fontWeight: '950' },
    expandedContent: { marginTop: 25, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    smallTab: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    smallTabText: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900' },
    smallTabVal: { color: 'white', fontSize: 13, fontWeight: '950', marginTop: 2 },
    historyList: { marginBottom: 20 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
    histAmount: { color: 'white', fontSize: 15, fontWeight: '800' },
    histDate: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' },
    histNote: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', maxWidth: '50%' },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: 20 },
    addBtnSmall: { backgroundColor: '#fbbf24', height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addBtnTextSmall: { color: '#000', fontSize: 11, fontWeight: '950' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CarUtilityScreen;
