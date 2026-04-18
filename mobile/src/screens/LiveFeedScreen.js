import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, RefreshControl,
    Dimensions, TextInput, ScrollView, Animated, Platform,
    Modal, Image
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import {
    Zap, ChevronLeft, ChevronRight, Calendar,
    Car, TrendingUp, Activity, Users, Clock,
    Search, Filter, MapPin, AlertCircle, Fuel,
    IndianRupee, Landmark, Shield, Phone, Info,
    X, LogIn
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, formatTimeIST } from '../utils/istUtils';

const { width } = Dimensions.get('window');

const LiveFeedScreen = () => {
    const { selectedCompany } = useCompany();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('drivers'); // 'drivers', 'fleet', 'fuel', 'absent', 'idle'
    const [selectedDate, setSelectedDate] = useState(todayIST());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const fetchData = async (silent = false) => {
        if (!selectedCompany?._id) return;
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get(`/api/admin/live-feed/${selectedCompany._id}?date=${selectedDate}`);
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch live feed', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [selectedCompany, selectedDate]);

    const shiftDate = (val) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + val);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const StatusBadge = ({ status }) => {
        const config = {
            'Present': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            'Completed': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
            'Absent': { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
            'Idle': { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' },
            'Used': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            'In Use': { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' }
        };
        const s = config[status] || config['Idle'];
        return (
            <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeT, { color: s.color }]}>{status?.toUpperCase() || 'OFFLINE'}</Text>
            </View>
        );
    };

    const formatDuration = (start, end) => {
        if (!start || !end) return '0h';
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffMs = Math.abs(d2 - d1);
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${h}h ${m}m`;
    };

    const DriverCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedItem(item); setShowModal(true); }}>
            <View style={[styles.glow, { backgroundColor: item.status === 'Present' ? '#10b981' : (item.status === 'Completed' ? '#8b5cf6' : 'rgba(255,255,255,0.05)') }]} />
            <View style={styles.cardTop}>
                <View style={styles.cLeft}>
                    <View style={[styles.avatar, {
                        backgroundColor: item.status === 'Present' ? '#10b981' : 'rgba(255,255,255,0.03)',
                        borderWidth: 1.5,
                        borderColor: item.status === 'Present' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'
                    }]}>
                        <Text style={[styles.avatarT, { color: item.status === 'Present' ? 'white' : 'rgba(255,255,255,0.3)' }]}>{(item.name || 'D').charAt(0)}</Text>
                        {item.status === 'Present' && <View style={styles.pulseDot} />}
                    </View>
                    <View>
                        <Text style={styles.cName}>{item.name}</Text>
                        <View style={styles.cSubRow}>
                            <Phone size={10} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.cSub}>{item.mobile}</Text>
                        </View>
                    </View>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <View style={styles.dutyItems}>
                {item.attendances?.length > 0 ? item.attendances.map((att, i) => {
                    const isActive = att.status !== 'completed';
                    return (
                        <View key={i} style={[styles.dutyRow, !isActive && { opacity: 0.6 }]}>
                            <View style={styles.drLeft}>
                                <View style={[styles.drIcon, { backgroundColor: isActive ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)' }]}>
                                    <Car size={14} color={isActive ? '#fbbf24' : 'rgba(255,255,255,0.2)'} />
                                </View>
                                <View>
                                    <Text style={[styles.drPlate, !isActive && { color: 'rgba(255,255,255,0.4)' }]}>{att.vehicle?.carNumber?.split('#')[0]}</Text>
                                    <Text style={styles.drStatus}>{isActive ? 'ON DUTY' : 'SHIFT ENDED'}</Text>
                                </View>
                            </View>
                            <Text style={styles.drTime}>{formatTimeIST(att.punchIn?.time)} — {att.punchOut?.time ? formatTimeIST(att.punchOut.time) : '--:--'}</Text>
                        </View>
                    );
                }) : (
                    <View style={styles.emptyDuty}>
                        <Info size={14} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptyT}>STATIONARY / NO ACTIVE DUTY</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const FleetCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedItem(item); setShowModal(true); }}>
            <View style={[styles.glow, { backgroundColor: item.status === 'In Use' ? '#0ea5e9' : '#10b981' }]} />
            <View style={styles.cardTop}>
                <View style={styles.cLeft}>
                    <View style={styles.vIcon}><Car size={20} color="#fbbf24" /></View>
                    <View>
                        <Text style={styles.cName}>{item.carNumber?.split('#')[0]}</Text>
                        <Text style={styles.cSub}>{item.model || 'Fleet Asset'}</Text>
                    </View>
                </View>
                <StatusBadge status={item.status} />
            </View>
            {item.currentDriver && (
                <View style={styles.vDriver}>
                    <Users size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.vDriverT}>Driver: {item.currentDriver}</Text>
                </View>
            )}
            {item.fuelAmount > 0 && (
                <View style={styles.fBadge}>
                    <Fuel size={12} color="#fbbf24" />
                    <Text style={styles.fBadgeT}>₹{item.fuelAmount.toLocaleString()}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const FuelEntryCard = ({ item }) => (
        <View style={styles.card}>
            <View style={[styles.glow, { backgroundColor: '#fbbf24' }]} />
            <View style={styles.cardTop}>
                <View style={styles.cLeft}>
                    <View style={[styles.vIcon, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}><Fuel size={20} color="#fbbf24" /></View>
                    <View>
                        <Text style={styles.cName}>₹{(item.amount || 0).toLocaleString()}</Text>
                        <Text style={styles.cSub}>{item.vehicle?.carNumber?.split('#')[0]} • {item.driver}</Text>
                    </View>
                </View>
                <Text style={styles.drTime}>{formatTimeIST(item.date)}</Text>
            </View>
            {item.stationName && (
                <View style={styles.vDriver}>
                    <MapPin size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.vDriverT} numberOfLines={1}>{item.stationName}</Text>
                </View>
            )}
        </View>
    );

    const filteredData = () => {
        if (!stats) return [];
        let list = [];
        if (activeTab === 'drivers') list = stats.liveDriversFeed || [];
        else if (activeTab === 'fleet') list = stats.liveVehiclesFeed?.filter(v => v.status === 'In Use' || v.status === 'Used') || [];
        else if (activeTab === 'fuel') list = stats.dailyFuelEntries || [];
        else if (activeTab === 'absent') list = stats.absentDriversFeed || [];
        else if (activeTab === 'idle') list = stats.unusedVehiclesFeed || [];

        if (searchTerm) {
            list = list.filter(item =>
                (item.name || item.carNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={filteredData()}
                keyExtractor={(item, index) => item._id || index.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#fbbf24" />}
                ListHeaderComponent={
                    <View>
                        <View style={styles.header}>
                            <View style={styles.hTop}>
                                <View>
                                    <Text style={styles.hL}>OPERATIONAL PULSE</Text>
                                    <Text style={styles.hTitle}>Live Feed</Text>
                                </View>
                                <View style={styles.dateBox}>
                                    <TouchableOpacity onPress={() => shiftDate(-1)}><ChevronLeft size={20} color="#fbbf24" /></TouchableOpacity>
                                    <Text style={styles.dateT}>{formatDateIST(selectedDate)}</Text>
                                    <TouchableOpacity onPress={() => shiftDate(1)}><ChevronRight size={20} color="#fbbf24" /></TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryBar} contentContainerStyle={{ gap: 12, paddingRight: 25 }}>
                                <View style={styles.sumCard}>
                                    <View style={styles.sumIconBox}><Users size={16} color="#10b981" /></View>
                                    <View>
                                        <Text style={styles.sumV}>{stats?.liveDriversFeed?.filter(d => d.status === 'Present').length || 0}</Text>
                                        <Text style={[styles.sumL, { color: '#10b981' }]}>ACTIVE DRIVERS</Text>
                                    </View>
                                </View>
                                <View style={[styles.sumCard, { borderLeftColor: '#0ea5e9' }]}>
                                    <View style={[styles.sumIconBox, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}><Car size={16} color="#0ea5e9" /></View>
                                    <View>
                                        <Text style={styles.sumV}>{stats?.liveVehiclesFeed?.filter(v => v.status === 'In Use').length || 0}</Text>
                                        <Text style={[styles.sumL, { color: '#0ea5e9' }]}>ACTIVE FLEETS</Text>
                                    </View>
                                </View>
                                <View style={[styles.sumCard, { borderLeftColor: '#10b981' }]}>
                                    <View style={[styles.sumIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><Landmark size={16} color="#10b981" /></View>
                                    <View>
                                        <Text style={styles.sumV}>₹{(stats?.dailyStats?.regularSalary || 0).toLocaleString()}</Text>
                                        <Text style={[styles.sumL, { color: '#10b981' }]}>DRIVER SALARY</Text>
                                    </View>
                                </View>
                                <View style={[styles.sumCard, { borderLeftColor: '#818cf8' }]}>
                                    <View style={[styles.sumIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.1)' }]}><Activity size={16} color="#818cf8" /></View>
                                    <View>
                                        <Text style={styles.sumV}>₹{(stats?.dailyStats?.freelancerSalary || 0).toLocaleString()}</Text>
                                        <Text style={[styles.sumL, { color: '#818cf8' }]}>FREELANCER</Text>
                                    </View>
                                </View>
                                <View style={[styles.sumCard, { borderLeftColor: '#fbbf24' }]}>
                                    <View style={[styles.sumIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}><Fuel size={16} color="#fbbf24" /></View>
                                    <View>
                                        <Text style={styles.sumV}>₹{(stats?.dailyFuelAmount?.total || 0).toLocaleString()}</Text>
                                        <Text style={[styles.sumL, { color: '#fbbf24' }]}>FUEL BURNT</Text>
                                    </View>
                                </View>
                                <View style={[styles.sumCard, { borderLeftColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.05)', borderColor: 'rgba(251, 191, 36, 0.1)' }]}>
                                    <View style={[styles.sumIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}><TrendingUp size={16} color="#fbbf24" /></View>
                                    <View>
                                        <Text style={styles.sumV}>₹{((stats?.dailyStats?.grandTotal || 0) + (stats?.dailyFuelAmount?.total || 0)).toLocaleString()}</Text>
                                        <Text style={[styles.sumL, { color: '#fbbf24' }]}>TOTAL COST</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        </View>

                        <View style={styles.controls}>
                            <View style={styles.searchBox}>
                                <Search size={18} color="#fbbf24" />
                                <TextInput 
                                    style={styles.searchInput} 
                                    placeholder="Search driver or car..." 
                                    placeholderTextColor="rgba(255,255,255,0.2)" 
                                    value={searchTerm} 
                                    onChangeText={setSearchTerm} 
                                />
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ gap: 8 }}>
                                {[
                                    { id: 'drivers', label: 'Drivers', count: stats?.liveDriversFeed?.length, icon: Users },
                                    { id: 'fleet', label: 'Fleet', count: stats?.liveVehiclesFeed?.filter(v => v.status === 'In Use' || v.status === 'Used').length, icon: Car },
                                    { id: 'fuel', label: 'Fuel', count: stats?.dailyFuelEntries?.length, icon: Fuel },
                                    { id: 'absent', label: 'Absent', count: stats?.absentDriversCount, icon: Users },
                                    { id: 'idle', label: 'Idle', count: stats?.unusedVehiclesCount, icon: Car }
                                ].map(t => (
                                    <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && styles.tabA]} onPress={() => setActiveTab(t.id)}>
                                        <t.icon size={14} color={activeTab === t.id ? '#fbbf24' : 'rgba(255,255,255,0.2)'} />
                                        <Text style={[styles.tabT, activeTab === t.id && styles.tabTA]}>{t.label}</Text>
                                        {t.count !== undefined && (
                                            <View style={[styles.tabCount, activeTab === t.id && styles.tabCountA]}>
                                                <Text style={[styles.tabCountT, activeTab === t.id && styles.tabCountTA]}>{t.count}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                }
                renderItem={({ item }) => {
                    if (loading && !refreshing) return null; // Don't render items skeleton while loading
                    if (activeTab === 'fuel') return <FuelEntryCard item={item} />;
                    if (activeTab === 'fleet' || activeTab === 'idle') return <FleetCard item={item} />;
                    return <DriverCard item={item} />;
                }}
                ListEmptyComponent={
                    loading && !refreshing ? (
                        <View style={{ marginTop: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#fbbf24" />
                        </View>
                    ) : (
                        <View style={styles.emptyList}>
                            <Activity size={50} color="rgba(255,255,255,0.03)" />
                            <Text style={styles.emptyListT}>No activity captured for this segment</Text>
                        </View>
                    )
                }
            />

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.mhLeft}>
                                <Text style={styles.modalTitle}>{selectedItem?.name || selectedItem?.carNumber?.split('#')[0]}</Text>
                                <Text style={styles.modalSub}>{selectedItem?.mobile || selectedItem?.model || 'Asset Detail'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}><X size={24} color="white" /></TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            {selectedItem?.attendances?.length > 0 ? selectedItem.attendances.map((att, idx) => {
                                const isComp = att.status === 'completed';
                                const statusColor = isComp ? '#8b5cf6' : '#10b981';
                                return (
                                    <View key={idx} style={styles.detailSection}>
                                        <View style={[styles.glow, { backgroundColor: statusColor, top: 25, height: 30 }]} />
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: statusColor }]}>SHIFT #{selectedItem?.attendances.length - idx}</Text>
                                                <Text style={styles.sectionSub}>{isComp ? 'HISTORICAL LOG' : 'LIVE MISSION'}</Text>
                                            </View>
                                            <StatusBadge status={isComp ? 'Completed' : 'Present'} />
                                        </View>

                                        <View style={styles.statsRow}>
                                            <View style={styles.miniStat}><Text style={styles.miniStatL}>KM RUN</Text><Text style={styles.miniStatV}>{att.totalKM || (att.punchOut?.km ? att.punchOut.km - (att.punchIn?.km || 0) : 0)} KM</Text></View>
                                            <View style={styles.miniStat}><Text style={styles.miniStatL}>DURATION</Text><Text style={styles.miniStatV}>{att.punchIn?.time && att.punchOut?.time ? formatDuration(att.punchIn.time, att.punchOut.time) : 'Active'}</Text></View>
                                        </View>

                                        <View style={styles.boxGrid}>
                                            <View style={styles.detailBox}>
                                                <View style={styles.boxHead}><LogIn size={14} color="#10b981" /><Text style={[styles.boxHeadT, { color: '#10b981' }]}>PUNCH IN</Text></View>
                                                <Text style={styles.boxTime} numberOfLines={1} adjustsFontSizeToFit>{formatTimeIST(att.punchIn?.time)}</Text>
                                                <Text style={styles.boxKm} numberOfLines={1}>{att.punchIn?.km || 0} KM</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                                                    {att.punchIn?.kmPhoto && <Image source={{ uri: att.punchIn.kmPhoto }} style={styles.thumb} />}
                                                    {(att.punchIn?.carPhoto || att.punchIn?.carSelfie) && <Image source={{ uri: att.punchIn.carPhoto || att.punchIn.carSelfie }} style={styles.thumb} />}
                                                    {att.punchIn?.selfie && <Image source={{ uri: att.punchIn.selfie }} style={styles.thumb} />}
                                                </ScrollView>
                                            </View>

                                            <View style={[styles.detailBox, { borderColor: att.status === 'completed' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.03)' }]}>
                                                <View style={styles.boxHead}><TrendingUp size={14} color="#f43f5e" /><Text style={[styles.boxHeadT, { color: '#f43f5e' }]}>PUNCH OUT</Text></View>
                                                {att.punchOut?.time ? (
                                                    <>
                                                        <Text style={styles.boxTime} numberOfLines={1} adjustsFontSizeToFit>{formatTimeIST(att.punchOut.time)}</Text>
                                                        <Text style={styles.boxKm} numberOfLines={1}>{att.punchOut.km || 0} KM</Text>
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                                                            {att.punchOut?.kmPhoto && <Image source={{ uri: att.punchOut.kmPhoto }} style={styles.thumb} />}
                                                            {(att.punchOut?.carPhoto || att.punchOut?.carSelfie) && <Image source={{ uri: att.punchOut.carPhoto || att.punchOut.carSelfie }} style={styles.thumb} />}
                                                            {att.punchOut?.selfie && <Image source={{ uri: att.punchOut.selfie }} style={styles.thumb} />}
                                                        </ScrollView>
                                                    </>
                                                ) : <View style={styles.ongoing}><Activity size={16} color="#fbbf24" /><Text style={styles.ongoingT}>Ongoing Shift</Text></View>}
                                            </View>
                                        </View>

                                        <View style={styles.moneyBox}>
                                            <View style={styles.mRow}><Text style={styles.mL}>Daily Wage</Text><Text style={styles.mV}>₹{att.dailyWage || 0}</Text></View>
                                            {att.punchOut?.allowanceTA > 0 && <View style={styles.mRow}><Text style={styles.mL}>Allowance/TA</Text><Text style={styles.mV}>₹{att.punchOut.allowanceTA}</Text></View>}
                                            {att.punchOut?.tollParkingAmount > 0 && <View style={styles.mRow}><Text style={styles.mL}>Parking ({att.punchOut.parkingPaidBy})</Text><Text style={[styles.mV, { color: '#818cf8' }]}>₹{att.punchOut.tollParkingAmount}</Text></View>}
                                            <View style={styles.mTotal}><Text style={styles.mTotalL}>SHIFT EARNING</Text><Text style={styles.mTotalV}>₹{(Number(att.dailyWage || 0) + Number(att.punchOut?.allowanceTA || 0) + (att.punchOut?.parkingPaidBy !== 'Office' ? Number(att.punchOut?.tollParkingAmount || 0) : 0)).toLocaleString()}</Text></View>
                                        </View>
                                    </View>
                                );
                            }) : <View style={styles.noHistory}><Activity size={40} color="rgba(255,255,255,0.05)" /><Text style={styles.noHistoryT}>No duty history captured for selected item.</Text></View>}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    header: { paddingTop: 25, paddingBottom: 15 },
    hTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingHorizontal: 25 },
    hL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    hTitle: { color: 'white', fontSize: 32, fontWeight: '950', marginTop: 4 },
    dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    dateT: { color: 'white', fontSize: 13, fontWeight: '800' },
    summaryBar: { marginBottom: 10 },
    sumCard: { backgroundColor: '#161B2A', padding: 18, borderRadius: 28, borderLeftWidth: 4, borderLeftColor: '#10b981', minWidth: 180, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', gap: 15, marginLeft: 25 },
    sumIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
    sumV: { color: 'white', fontSize: 24, fontWeight: '1000', letterSpacing: -0.5 },
    sumL: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    controls: { paddingHorizontal: 25, marginBottom: 15 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 48, borderRadius: 14, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { flex: 1, color: 'white', fontWeight: '800', marginLeft: 10, fontSize: 13 },
    tabScroll: { marginTop: 15 },
    tab: { height: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', gap: 8 },
    tabA: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.15)' },
    tabT: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    tabTA: { color: '#fbbf24' },
    tabCount: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, minWidth: 18, alignItems: 'center' },
    tabCountA: { backgroundColor: '#fbbf24' },
    tabCountT: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900' },
    tabCountTA: { color: '#000' },
    list: { paddingHorizontal: 25, paddingBottom: 120 },
    card: {
        backgroundColor: '#161B2A',
        borderRadius: 24,
        padding: 18,
        marginBottom: 15,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.03)',
        ...Platform.select({
            web: { boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
            default: {
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            }
        })
    },
    glow: { position: 'absolute', left: 0, top: 20, width: 4, height: 40, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    pulseDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#161B2A' },
    avatarT: { fontSize: 24, fontWeight: '1000' },
    cName: { color: 'white', fontSize: 18, fontWeight: '950', letterSpacing: -0.5 },
    cSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    cSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    badgeT: { fontSize: 9, fontWeight: '1000', letterSpacing: 1 },
    dutyItems: { marginTop: 15 },
    dutyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 18, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    drLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    drIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    drPlate: { color: 'white', fontSize: 14, fontWeight: '900' },
    drStatus: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', marginTop: 1 },
    drTime: { color: 'white', fontSize: 12, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    emptyDuty: { padding: 25, backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', gap: 10 },
    emptyT: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '1000', letterSpacing: 2 },
    vIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(14, 165, 233, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.1)' },
    vDriver: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15, padding: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    vDriverT: { color: 'white', fontSize: 12, fontWeight: '800' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyList: { alignItems: 'center', marginTop: 100, opacity: 0.2 },
    emptyListT: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 20, textAlign: 'center' },

    // NEW DetailModal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0D111D', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '90%', padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    mhLeft: { flex: 1 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    modalSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', marginTop: 4 },
    closeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#161B2A', justifyContent: 'center', alignItems: 'center' },
    detailSection: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '1000', letterSpacing: 2 },
    sectionSub: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    miniStat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 18 },
    miniStatL: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', marginBottom: 4 },
    miniStatV: { color: 'white', fontSize: 13, fontWeight: '950' },
    boxGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    detailBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    boxHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    boxHeadT: { fontSize: 10, fontWeight: '950' },
    boxTime: { color: 'white', fontSize: 17, fontWeight: '950', flexShrink: 1 },
    boxKm: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginTop: 1, flexShrink: 1 },
    imgRow: { marginTop: 15, gap: 10 },
    thumb: { width: 60, height: 60, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    ongoing: { alignItems: 'center', gap: 8, paddingTop: 10 },
    ongoingT: { color: '#fbbf24', fontSize: 12, fontWeight: '900' },
    moneyBox: { marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    mRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    mL: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    mV: { color: 'white', fontSize: 14, fontWeight: '800' },
    mTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, padding: 15, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 16 },
    mTotalL: { color: '#10b981', fontSize: 10, fontWeight: '950' },
    mTotalV: { color: '#10b981', fontSize: 18, fontWeight: '1000' },
    noHistory: { padding: 60, alignItems: 'center' },
    noHistoryT: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 20 },
    fBadge: { position: 'absolute', bottom: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    fBadgeT: { color: '#fbbf24', fontSize: 12, fontWeight: '900' }
});

export default LiveFeedScreen;
