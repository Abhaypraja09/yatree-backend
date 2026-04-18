import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, RefreshControl,
    ScrollView, Alert, Dimensions, TextInput, Platform
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    FileText, Calendar, Filter, ChevronRight,
    ArrowUpRight, ArrowDownLeft, Fuel, 
    CreditCard, User, MapPin, Search as SearchIcon,
    ChevronLeft, Download, Eye, Briefcase, Zap,
    BadgeIndianRupee, TrendingUp, Info, Clock, 
    X, Edit2, Trash2, Shield, Wrench
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, formatTimeIST, toISTDateString } from '../utils/istUtils';

const { width } = Dimensions.get('window');

const ReportsScreen = () => {
    const { selectedCompany } = useCompany();
    const [reportsData, setReportsData] = useState({ 
        attendance: [], outsideCars: [], fuel: [], 
        parking: [], advances: [], events: [], 
        maintenance: [] 
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('attendance'); 
    
    // Date Range (Matching Web Logic)
    const [fromDate, setFromDate] = useState(todayIST());
    const [toDate, setToDate] = useState(todayIST());
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReports = async (silent = false) => {
        if (!selectedCompany?._id) return;
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get(`/api/admin/reports/${selectedCompany._id}?from=${fromDate}&to=${toDate}&_t=${Date.now()}`);
            setReportsData(data);
        } catch (err) {
            console.error('Failed to fetch reports', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [selectedCompany, fromDate, toDate]);

    const tabs = [
        { id: 'attendance', label: 'Attendance', icon: User },
        { id: 'outsideCars', label: 'Partners', icon: Briefcase },
        { id: 'fuel', label: 'Fuel', icon: Fuel },
        { id: 'parking', label: 'Parking', icon: MapPin },
        { id: 'advances', label: 'Advances', icon: BadgeIndianRupee },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'maintenance', label: 'Service', icon: Wrench }
    ];

    const activeList = useMemo(() => {
        let list = reportsData[activeTab] || [];
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            list = list.filter(item => {
                const searchStr = (
                    (item.driver?.name || '') + 
                    (item.vehicle?.carNumber || '') + 
                    (item.ownerName || '') + 
                    (item.carNumber || '') + 
                    (item.remarks || '') + 
                    (item.eventName || '')
                ).toLowerCase();
                return searchStr.includes(query);
            });
        }
        return list;
    }, [reportsData, activeTab, searchTerm]);

    const renderItem = ({ item }) => {
        const isComp = item.status === 'completed' || !!item.punchOut;
        
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(item.driver?.name || item.ownerName || item.vehicle?.carNumber || 'R').charAt(0)}</Text>
                        </View>
                        <View>
                            <Text style={styles.mainLabel}>{item.driver?.name || item.ownerName || item.eventName || 'Report Entry'}</Text>
                            <Text style={styles.subLabel}>{item.vehicle?.carNumber || item.carNumber || formatDateIST(item.date)}</Text>
                        </View>
                    </View>
                    <Text style={styles.amount}>₹{(item.amount || item.dutyAmount || item.fuel?.amount || 0).toLocaleString()}</Text>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.meta}>
                        <Clock size={12} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.metaText}>{formatDateIST(item.date || item.billDate)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: isComp ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)' }]}>
                        <Text style={[styles.badgeText, { color: isComp ? '#10b981' : '#fbbf24' }]}>
                            {isComp ? 'DONE' : 'ACTIVE'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSmall}>STRATEGIC DATA</Text>
                    <Text style={styles.headerLarge}>Reports</Text>
                </View>
                <TouchableOpacity style={styles.downloadBtn} onPress={() => Alert.alert('Export', 'Report generation started...')}>
                    <Download size={20} color="#fbbf24" />
                </TouchableOpacity>
            </View>

            <View style={styles.datePickerRow}>
                <View style={styles.dateInputBox}>
                    <Text style={styles.dateLabel}>FROM</Text>
                    <TextInput 
                        style={styles.dateInput} 
                        value={fromDate} 
                        onChangeText={setFromDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                </View>
                <View style={styles.dateInputBox}>
                    <Text style={styles.dateLabel}>TO</Text>
                    <TextInput 
                        style={styles.dateInput} 
                        value={toDate} 
                        onChangeText={setToDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                </View>
                <TouchableOpacity style={styles.goBtn} onPress={() => fetchReports()}>
                    <Zap size={18} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {tabs.map(t => (
                        <TouchableOpacity 
                            key={t.id} 
                            style={[styles.tab, activeTab === t.id && styles.tabActive]} 
                            onPress={() => setActiveTab(t.id)}
                        >
                            <t.icon size={14} color={activeTab === t.id ? '#000' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <SearchIcon size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder="Search current list..." 
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View>
            ) : (
                <FlatList
                    data={activeList}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(true)} tintColor="#fbbf24" />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <FileText size={48} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyText}>No records found for this criteria</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070A11' },
    header: { padding: 25, paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerSmall: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerLarge: { color: 'white', fontSize: 28, fontWeight: '950', marginTop: 5 },
    downloadBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    datePickerRow: { flexDirection: 'row', paddingHorizontal: 25, gap: 10, marginBottom: 15, alignItems: 'center' },
    dateInputBox: { flex: 1, backgroundColor: '#161B2A', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    dateLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 2 },
    dateInput: { color: 'white', fontSize: 12, fontWeight: '800', padding: 0 },
    goBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
    tabContainer: { marginBottom: 15 },
    tabScroll: { paddingHorizontal: 25, gap: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tabActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    tabTextActive: { color: '#000' },
    searchWrap: { paddingHorizontal: 25, marginBottom: 15 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', borderRadius: 18, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { flex: 1, color: 'white', marginLeft: 10, fontWeight: '600' },
    list: { paddingHorizontal: 25, paddingBottom: 100 },
    card: { backgroundColor: '#161B2A', borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    avatarText: { color: 'white', fontSize: 16, fontWeight: '900' },
    mainLabel: { color: 'white', fontSize: 15, fontWeight: '900' },
    subLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 2 },
    amount: { color: '#fbbf24', fontSize: 18, fontWeight: '950' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 9, fontWeight: '900' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 80, gap: 15 },
    emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 14, fontWeight: '700' }
});

export default ReportsScreen;
