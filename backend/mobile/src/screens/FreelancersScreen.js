import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Linking, Dimensions, Modal
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Users, User, 
    Phone, BadgeIndianRupee, ChevronRight, Filter,
    CreditCard, Wallet, TrendingUp, ArrowUpRight,
    ClipboardList, Zap, Award, Star, Clock,
    X, CheckCircle2, MoreHorizontal, Shield, Fuel
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, formatTimeIST } from '../utils/istUtils';
import OperationalBreakdown from '../components/OperationalBreakdown';

const { width } = Dimensions.get('window');

const FreelancersScreen = () => {
    const { selectedCompany } = useCompany();
    const [drivers, setDrivers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('personnel'); // 'personnel', 'duties', 'accounts'
    
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [selectedFreelancer, setSelectedFreelancer] = useState(null);

    const fetchFreelancers = async (silent = false) => {
        if (!selectedCompany?._id) return;
        if (!silent) setLoading(true);
        try {
            const [dRes, aRes] = await Promise.all([
                api.get(`/api/admin/drivers/${selectedCompany._id}?isFreelancer=true&usePagination=false`),
                api.get(`/api/admin/reports/${selectedCompany._id}?from=${todayIST()}&to=${todayIST()}`)
            ]);
            setDrivers(dRes.data.drivers || []);
            setAttendance(aRes.data.attendance?.filter(a => a.isFreelancer || a.driver?.isFreelancer) || []);
        } catch (err) {
            console.error('Failed to fetch freelancers', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFreelancers();
    }, [selectedCompany]);

    const activeList = useMemo(() => {
        let list = [];
        if (activeTab === 'personnel' || activeTab === 'accounts') list = drivers;
        else if (activeTab === 'duties') list = attendance;

        if (searchTerm) {
            list = list.filter(item => 
                (item.name || item.driver?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.mobile || item.vehicle?.carNumber || '').includes(searchTerm)
            );
        }
        return list;
    }, [drivers, attendance, activeTab, searchTerm]);

    const stats = useMemo(() => {
        const totalDue = drivers.reduce((s, d) => s + (d.balance || 0), 0);
        const activeCount = attendance.filter(a => a.status === 'present').length;
        return { totalDue, activeCount };
    }, [drivers, attendance]);

    const PersonnelCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedFreelancer(item); setShowBreakdown(true); }}>
            <View style={styles.cardHead}>
                <View style={styles.cLeft}>
                    <View style={styles.avatar}><Text style={styles.avatarT}>{(item.name || 'F').charAt(0)}</Text></View>
                    <View>
                        <Text style={styles.drName}>{item.name}</Text>
                        <Text style={styles.drSub}>{item.mobile}</Text>
                    </View>
                </View>
                <View style={styles.cRight}>
                    <Text style={styles.payLbl}>DAILY WAGE</Text>
                    <Text style={styles.payVal}>₹{item.dailyWage || 0}</Text>
                </View>
            </View>
            <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><Text style={[styles.badgeT, { color: '#10b981' }]}>ACTIVE VENDOR</Text></View>
                <View style={styles.badge}><Text style={styles.badgeT}>BALANCE: ₹{(item.balance || 0).toLocaleString()}</Text></View>
            </View>
        </TouchableOpacity>
    );

    const DutyCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedFreelancer(item.driver); setShowBreakdown(true); }}>
            <View style={styles.cardHead}>
                <View style={styles.cLeft}>
                    <View style={[styles.avatar, { backgroundColor:'rgba(139, 92, 246, 0.1)'}]}><Car size={18} color="#a78bfa" /></View>
                    <View>
                        <Text style={styles.drName}>{item.driver?.name || 'Unknown'}</Text>
                        <Text style={styles.drSub}>{item.vehicle?.carNumber || 'No Machine'}</Text>
                    </View>
                </View>
                <View style={[styles.statusP, { backgroundColor: item.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)'}]}>
                    <Text style={[styles.statusT, { color: item.status === 'completed' ? '#10b981' : '#fbbf24'}]}>{item.status?.toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.dutyMetrics}>
                <View style={styles.dM}><Clock size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.dMT}>{formatTimeIST(item.punchIn?.time)} - {item.status === 'completed' ? formatTimeIST(item.punchOut?.time) : 'Active'}</Text></View>
                <View style={styles.dM}><TrendingUp size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.dMT}>{item.totalKM || 0} KM Run</Text></View>
                <View style={styles.dM}><Fuel size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.dMT}>₹{item.fuel?.amount || 0}</Text></View>
            </View>
        </TouchableOpacity>
    );

    const AccountCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedFreelancer(item); setShowBreakdown(true); }}>
            <View style={styles.cardHead}>
                <View style={styles.cLeft}>
                    <View style={styles.avatar}><Text style={styles.avatarT}>{(item.name || 'F').charAt(0)}</Text></View>
                    <View>
                        <Text style={styles.drName}>{item.name}</Text>
                        <Text style={styles.drSub}>ID: {item._id?.slice(-6)}</Text>
                    </View>
                </View>
                <View style={styles.cRight}>
                    <Text style={styles.payLbl}>NET BALANCE</Text>
                    <Text style={[styles.payVal, { color: item.balance > 0 ? '#10b981' : 'white'}]}>₹{(item.balance || 0).toLocaleString()}</Text>
                </View>
            </View>
            <View style={styles.ledgerBar}>
                <View style={styles.lB}><Text style={styles.lBT}>Total Earned</Text><Text style={styles.lBV}>₹{(item.totalEarnings || 0).toLocaleString()}</Text></View>
                <View style={styles.lB}><Text style={styles.lBT}>Total Paid</Text><Text style={styles.lBV}>₹{(item.totalPaid || 0).toLocaleString()}</Text></View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.hero}>
                <View style={styles.heroCard}>
                    <View style={styles.hTop}>
                        <View>
                            <Text style={styles.hL}>VENDOR NETWORK</Text>
                            <Text style={styles.hV}>Freelance Hub</Text>
                        </View>
                        <View style={styles.hIcon}><Star size={24} color="#fbbf24" fill="#fbbf24" strokeWidth={1} /></View>
                    </View>
                    <View style={styles.hGrid}>
                        <View style={styles.hB}><Text style={styles.hBV}>₹{stats.totalDue.toLocaleString()}</Text><Text style={styles.hBL}>TOTAL PAYABLE</Text></View>
                        <View style={styles.hB}><Text style={styles.hBV}>{stats.activeCount}</Text><Text style={styles.hBL}>ON DUTY</Text></View>
                        <View style={styles.hB}><Text style={styles.hBV}>{drivers.length}</Text><Text style={styles.hBL}>PARTNERS</Text></View>
                    </View>
                </View>
            </View>

            <View style={styles.controls}>
                <View style={styles.searchRow}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput style={styles.si} placeholder="Locate partner..." placeholderTextColor="rgba(255,255,255,0.2)" value={searchTerm} onChangeText={setSearchTerm} />
                </View>
                <View style={styles.tabRow}>
                    {[{id:'personnel', label:'Directory'}, {id:'duties', label:'Live Duties'}, {id:'accounts', label:'Ledger'}].map(t => (
                        <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && styles.tabA]} onPress={() => setActiveTab(t.id)}>
                            <Text style={[styles.tabT, activeTab === t.id && styles.tabTA]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? <View style={styles.center}><ActivityIndicator color="#fbbf24" size="large"/></View> : (
                <FlatList
                    data={activeList}
                    renderItem={({ item }) => {
                        if (activeTab === 'personnel') return <PersonnelCard item={item} />;
                        if (activeTab === 'duties') return <DutyCard item={item} />;
                        return <AccountCard item={item} />;
                    }}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFreelancers(true)} tintColor="#fbbf24" />}
                    ListEmptyComponent={<View style={styles.empty}><Users size={50} color="rgba(255,255,255,0.05)" /><Text style={styles.emptyT}>No partners found to match query</Text></View>}
                />
            )}

            <OperationalBreakdown visible={showBreakdown} onClose={() => setShowBreakdown(false)} data={selectedFreelancer} type="freelancer" />

            <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Onboard', 'New Freelancer Onboarding')}>
                <Plus size={32} color="#000" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    hero: { padding: 25 },
    heroCard: { backgroundColor: '#161B2A', borderRadius: 32, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    hTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    hL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    hV: { color: 'white', fontSize: 26, fontWeight: '950', marginTop: 4 },
    hIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center' },
    hGrid: { flexDirection: 'row', gap: 12 },
    hB: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    hBV: { color: 'white', fontSize: 13, fontWeight: '950' },
    hBL: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginTop: 4 },
    controls: { paddingHorizontal: 25, gap: 15, marginBottom: 20 },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 52, borderRadius: 18, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    si: { flex: 1, color: 'white', fontWeight: '600', marginLeft: 12 },
    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', padding: 5, borderRadius: 15 },
    tab: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 11 },
    tabA: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.15)' },
    tabT: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800' },
    tabTA: { color: '#fbbf24' },
    list: { paddingHorizontal: 25, paddingBottom: 150 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    glow: { position: 'absolute', left: 0, top: 20, width: 4, height: 40, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    cLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    avatarT: { color: 'white', fontSize: 18, fontWeight: '950' },
    drName: { color: 'white', fontSize: 16, fontWeight: '900' },
    drSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700' },
    cRight: { alignItems: 'flex-end' },
    payLbl: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900' },
    payVal: { color: 'white', fontSize: 18, fontWeight: '950', marginTop: 3 },
    metaRow: { flexDirection: 'row', gap: 10 },
    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    badgeT: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    dutyMetrics: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 15 },
    dM: { flex: 1, alignItems: 'center', gap: 4 },
    dMT: { color: 'white', fontSize: 10, fontWeight: '800' },
    statusP: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusT: { fontSize: 8, fontWeight: '900' },
    ledgerBar: { flexDirection: 'row', gap: 10, marginTop: 5 },
    lB: { flex: 1, padding: 12, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    lBT: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900' },
    lBV: { color: 'white', fontSize: 14, fontWeight: '800', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center' },
    empty: { alignItems: 'center', marginTop: 100, opacity: 0.2 },
    emptyT: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 20 },
    fab: { position: 'absolute', bottom: 40, right: 30, width: 68, height: 68, borderRadius: 34, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', elevation: 12, boxShadow: '0 10px 20px rgba(251, 191, 36, 0.4)' },
});

export default FreelancersScreen;
