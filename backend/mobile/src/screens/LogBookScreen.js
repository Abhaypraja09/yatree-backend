import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Dimensions, Modal, ScrollView, Alert, Platform, Image
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import {
    Search, Plus, Filter, Calendar,
    ChevronRight, Clock, MapPin, User,
    Car, Zap, ArrowUpRight, X, LogOut,
    Navigation, CreditCard, Droplets, ChevronLeft,
    LogIn, TrendingUp, Activity, CheckCircle
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, nowISTDateTimeString, toISTDateString, formatTimeIST } from '../utils/istUtils';


const { width } = Dimensions.get('window');

const LogBookScreen = () => {
    const { selectedCompany } = useCompany();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailItem, setDetailItem] = useState(null); // Detail Modal

    const formatDuration = (start, end) => {
        if (!start || !end) return '--';
        const d = (new Date(end) - new Date(start)) / 60000;
        return d > 60 ? `${Math.floor(d / 60)}h ${Math.round(d % 60)}m` : `${Math.round(d)}m`;
    };

    // Filtering
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Close Duty Form
    const [showCloseModal, setShowCloseModal] = useState(null); // Selected log
    const [submitting, setSubmitting] = useState(false);
    const [closeForm, setCloseForm] = useState({
        km: '', fuelAmount: '', parkingAmount: '', review: ''
    });

    const fetchLogs = async () => {
        if (!selectedCompany) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            // Get first and last day of selected month in IST
            const from = toISTDateString(new Date(selectedYear, selectedMonth - 1, 1));
            const to = toISTDateString(new Date(selectedYear, selectedMonth, 0));
            
            const { data } = await api.get(`/api/admin/reports/${selectedCompany._id}?from=${from}&to=${to}&_t=${Date.now()}`);
            
            // Web parity: The backend returns 'attendance' array in reports
            setLogs(data.attendance || []);
        } catch (err) {
            console.error('Failed to fetch Log Book', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5 * 60 * 1000); // 5 min poll
        return () => clearInterval(interval);
    }, [selectedCompany, selectedMonth, selectedYear]);

    const handleCloseDuty = async () => {
        if (!closeForm.km) return Alert.alert('Error', 'Closing KM reading is essential');
        setSubmitting(true);
        try {
            const payload = {
                ...closeForm,
                driverId: showCloseModal.driver?._id || showCloseModal.driver,
                companyId: selectedCompany._id,
                date: todayIST(),
                time: nowISTDateTimeString()
            };
            await api.post('/api/admin/punch-out', payload);
            setShowCloseModal(null);
            fetchLogs();
            Alert.alert('Success', 'Duty closed and km archived.');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Update failed');
        } finally {
            setSubmitting(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLogs();
    };

    const LogCard = ({ item }) => {
        const isCompleted = item.status === 'completed';
        const driverName = item.driver?.name || 'Unknown Driver';
        const vehiclePlate = item.vehicle?.carNumber?.split('#')[0] || 'N/A';

        return (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setDetailItem(item)} style={styles.logCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.indicator, { backgroundColor: !isCompleted ? '#10b981' : 'rgba(255,255,255,0.2)' }]} />
                        <Text style={styles.dateText}>{formatDateIST(item.date)}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: !isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)' }]}>
                        <Text style={[styles.statusText, { color: !isCompleted ? '#10b981' : 'rgba(255,255,255,0.4)' }]}>{!isCompleted ? 'ACTIVE' : 'COMPLETED'}</Text>
                    </View>
                </View>

                <View style={styles.mainInfo}>
                    <View style={styles.carIconBox}><Car size={24} color="#fbbf24" strokeWidth={2.5} /></View>
                    <View style={styles.vehicleDetails}>
                        <Text style={styles.vehicleNumber}>{vehiclePlate}</Text>
                        <Text style={styles.carType}>{item.vehicle?.model || 'Fleet'}</Text>
                    </View>
                    {!isCompleted && (
                        <TouchableOpacity 
                            style={styles.closeDutyBtn} 
                            onPress={() => { setShowCloseModal(item); setCloseForm({ km: '', fuelAmount: '', parkingAmount: '', review: '' }); }}
                        >
                            <LogOut size={16} color="white" />
                            <Text style={styles.closeText}>CLOSE</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.driverSection}>
                    <View style={styles.infoPill}><User size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.pillText}>{driverName}</Text></View>
                    <View style={styles.infoPill}><MapPin size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.pillText}>{item.pickUpLocation || 'Daily'}</Text></View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>START KM</Text>
                        <Text style={styles.statValue}>{item.punchIn?.km?.toLocaleString() || 0}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{!isCompleted ? 'CURRENT' : 'END KM'}</Text>
                        <Text style={styles.statValue}>{!isCompleted ? 'ON ROAD' : (item.punchOut?.km || '--')}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSmall}>OPERATIONAL ARCHIVE</Text>
                    <Text style={styles.headerLarge}>Log Book</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                    <Zap size={20} color="#fbbf24" fill="#fbbf24" />
                </TouchableOpacity>
            </View>

            <View style={styles.filters}>
                <View style={styles.monthScroller}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {months.map((m, idx) => (
                            <TouchableOpacity 
                                key={m} 
                                style={[styles.monthChip, selectedMonth === idx + 1 && styles.activeChip]} 
                                onPress={() => setSelectedMonth(idx + 1)}
                            >
                                <Text style={[styles.monthText, selectedMonth === idx + 1 && styles.activeMonthText]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.searchContainer}>
                    <Search size={18} color="rgba(255,255,255,0.3)" />
                    <TextInput 
                        placeholder="Search plate or driver..." 
                        placeholderTextColor="rgba(255,255,255,0.3)" 
                        style={styles.searchInput} 
                        value={searchQuery} 
                        onChangeText={setSearchQuery} 
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24" /></View>
            ) : (
                <FlatList
                    data={logs.filter(l => {
                        const plate = (l.vehicle?.carNumber || '').toLowerCase();
                        const name = (l.driver?.name || '').toLowerCase();
                        const query = searchQuery.toLowerCase();
                        return plate.includes(query) || name.includes(query);
                    })}
                    renderItem={({ item }) => <LogCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listPadding}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Car size={48} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyText}>No logs found for this period</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={!!showCloseModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Terminate Duty</Text>
                            <TouchableOpacity onPress={() => setShowCloseModal(null)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <Text style={styles.targetLabel}>VEHICLE: {showCloseModal?.vehicle?.carNumber?.split('#')[0]}</Text>
                        
                        <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>LAST KM READING</Text>
                                <TextInput 
                                    style={styles.mInput} 
                                    keyboardType="numeric" 
                                    value={closeForm.km} 
                                    onChangeText={t => setCloseForm({ ...closeForm, km: t })} 
                                    placeholder="Enter current odometer"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <View style={styles.labelRow}><Droplets size={12} color="#fbbf24" /><Text style={styles.label}> FUEL AMOUNT</Text></View>
                                    <TextInput 
                                        style={styles.mInput} 
                                        keyboardType="numeric" 
                                        value={closeForm.fuelAmount} 
                                        onChangeText={t => setCloseForm({ ...closeForm, fuelAmount: t })} 
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <View style={styles.labelRow}><CreditCard size={12} color="#fbbf24" /><Text style={styles.label}> PARKING</Text></View>
                                    <TextInput 
                                        style={styles.mInput} 
                                        keyboardType="numeric" 
                                        value={closeForm.parkingAmount} 
                                        onChangeText={t => setCloseForm({ ...closeForm, parkingAmount: t })} 
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>REMARKS / REVIEW</Text>
                                <TextInput 
                                    style={[styles.mInput, { height: 80, paddingTop: 15 }]} 
                                    multiline 
                                    value={closeForm.review} 
                                    onChangeText={t => setCloseForm({ ...closeForm, review: t })} 
                                    placeholder="Any issues or vehicle condition..."
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                />
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleCloseDuty} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#070A11" /> : <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* DETAIL VIEW MODAL */}
            <Modal visible={!!detailItem} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        <View style={styles.detailHeader}>
                            <View style={styles.dhLeft}>
                                <Text style={styles.detailTitle}>{detailItem?.driver?.name || 'Unknown Driver'}</Text>
                                <Text style={styles.detailSub}>{detailItem?.vehicle?.carNumber?.split('#')[0] || 'N/A'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDetailItem(null)} style={styles.closeBtn}><X size={24} color="white" /></TouchableOpacity>
                        </View>

                        {detailItem && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                <View style={styles.detailSection}>
                                    <View style={[styles.glow, { backgroundColor: detailItem.status === 'completed' ? '#8b5cf6' : '#10b981', top: 25, height: 30 }]} />
                                    <View style={styles.sectionHead}>
                                        <View>
                                            <Text style={[styles.sectionTitle, { color: detailItem.status === 'completed' ? '#8b5cf6' : '#10b981' }]}>SHIFT LOG</Text>
                                            <Text style={styles.sectionSub}>{detailItem.status === 'completed' ? 'HISTORICAL LOG' : 'LIVE MISSION'}</Text>
                                        </View>
                                        <View style={styles.badge}>
                                            <Text style={[styles.badgeT, { color: detailItem.status === 'completed' ? '#8b5cf6' : '#10b981' }]}>{detailItem.status === 'completed' ? 'COMPLETED' : 'ON DUTY'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.statsRow}>
                                        <View style={styles.miniStat}><Text style={styles.miniStatL}>KM RUN</Text><Text style={styles.miniStatV}>{detailItem.totalKM || (detailItem.punchOut?.km ? detailItem.punchOut.km - (detailItem.punchIn?.km || 0) : 0)} KM</Text></View>
                                        <View style={styles.miniStat}><Text style={styles.miniStatL}>DURATION</Text><Text style={styles.miniStatV}>{detailItem.punchIn?.time && detailItem.punchOut?.time ? formatDuration(detailItem.punchIn.time, detailItem.punchOut.time) : 'Active'}</Text></View>
                                    </View>

                                    <View style={styles.boxGrid}>
                                        <View style={styles.detailBox}>
                                            <View style={styles.boxHead}><LogIn size={14} color="#10b981" /><Text style={[styles.boxHeadT, { color: '#10b981' }]}>PUNCH IN</Text></View>
                                            <Text style={styles.boxTime} numberOfLines={1} adjustsFontSizeToFit>{formatTimeIST(detailItem.punchIn?.time)}</Text>
                                            <Text style={styles.boxKm} numberOfLines={1}>{detailItem.punchIn?.km || 0} KM</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                                                {detailItem.punchIn?.kmPhoto && <Image source={{ uri: detailItem.punchIn.kmPhoto.startsWith('http') ? detailItem.punchIn.kmPhoto : `https://driver.yatreedestination.com/${detailItem.punchIn.kmPhoto}` }} style={styles.thumb} />}
                                                {(detailItem.punchIn?.carPhoto || detailItem.punchIn?.carSelfie) && <Image source={{ uri: (detailItem.punchIn.carPhoto || detailItem.punchIn.carSelfie).startsWith('http') ? (detailItem.punchIn.carPhoto || detailItem.punchIn.carSelfie) : `https://driver.yatreedestination.com/${detailItem.punchIn.carPhoto || detailItem.punchIn.carSelfie}` }} style={styles.thumb} />}
                                                {detailItem.punchIn?.selfie && <Image source={{ uri: detailItem.punchIn.selfie.startsWith('http') ? detailItem.punchIn.selfie : `https://driver.yatreedestination.com/${detailItem.punchIn.selfie}` }} style={styles.thumb} />}
                                            </ScrollView>
                                        </View>

                                        <View style={[styles.detailBox, { borderColor: detailItem.status === 'completed' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.03)' }]}>
                                            <View style={styles.boxHead}><TrendingUp size={14} color="#f43f5e" /><Text style={[styles.boxHeadT, { color: '#f43f5e' }]}>PUNCH OUT</Text></View>
                                            {detailItem.punchOut?.time ? (
                                                <>
                                                    <Text style={styles.boxTime} numberOfLines={1} adjustsFontSizeToFit>{formatTimeIST(detailItem.punchOut.time)}</Text>
                                                    <Text style={styles.boxKm} numberOfLines={1}>{detailItem.punchOut.km || 0} KM</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imgRow}>
                                                        {detailItem.punchOut?.kmPhoto && <Image source={{ uri: detailItem.punchOut.kmPhoto.startsWith('http') ? detailItem.punchOut.kmPhoto : `https://driver.yatreedestination.com/${detailItem.punchOut.kmPhoto}` }} style={styles.thumb} />}
                                                        {(detailItem.punchOut?.carPhoto || detailItem.punchOut?.carSelfie) && <Image source={{ uri: (detailItem.punchOut.carPhoto || detailItem.punchOut.carSelfie).startsWith('http') ? (detailItem.punchOut.carPhoto || detailItem.punchOut.carSelfie) : `https://driver.yatreedestination.com/${detailItem.punchOut.carPhoto || detailItem.punchOut.carSelfie}` }} style={styles.thumb} />}
                                                        {detailItem.punchOut?.selfie && <Image source={{ uri: detailItem.punchOut.selfie.startsWith('http') ? detailItem.punchOut.selfie : `https://driver.yatreedestination.com/${detailItem.punchOut.selfie}` }} style={styles.thumb} />}
                                                    </ScrollView>
                                                </>
                                            ) : <View style={{ alignItems: 'center', gap: 8, paddingTop: 10 }}><Activity size={16} color="#fbbf24" /><Text style={{ color: 'rgba(251, 191, 36, 0.8)', fontSize: 10, fontWeight: '800' }}>Ongoing</Text></View>}
                                        </View>
                                    </View>

                                    <View style={styles.moneyBox}>
                                        <View style={styles.mRow}><Text style={styles.mL}>Daily Wage</Text><Text style={styles.mV}>₹{detailItem.dailyWage || 0}</Text></View>
                                        {(detailItem.fuel?.amount > 0 || detailItem.punchOut?.fuelLiters > 0) && <View style={styles.mRow}><Text style={styles.mL}>Fuel Cost</Text><Text style={styles.mV}>₹{detailItem.fuel?.amount || 0}</Text></View>}
                                        {detailItem.punchOut?.allowanceTA > 0 && <View style={styles.mRow}><Text style={styles.mL}>Allowance/TA</Text><Text style={styles.mV}>₹{detailItem.punchOut.allowanceTA}</Text></View>}
                                        {detailItem.punchOut?.tollParkingAmount > 0 && <View style={styles.mRow}><Text style={styles.mL}>Parking ({detailItem.punchOut.parkingPaidBy})</Text><Text style={[styles.mV, { color: '#818cf8' }]}>₹{detailItem.punchOut.tollParkingAmount}</Text></View>}
                                        <View style={styles.mTotal}><Text style={styles.mTotalL}>SHIFT EARNING</Text><Text style={styles.mTotalV}>₹{(Number(detailItem.dailyWage || 0) + Number(detailItem.punchOut?.allowanceTA || 0) + (detailItem.punchOut?.parkingPaidBy !== 'Office' ? Number(detailItem.punchOut?.tollParkingAmount || 0) : 0)).toLocaleString()}</Text></View>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070A11' },
    header: { padding: 25, paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerSmall: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerLarge: { color: 'white', fontSize: 28, fontWeight: '950', marginTop: 5 },
    refreshBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#161B2A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    filters: { paddingHorizontal: 25, marginBottom: 15 },
    monthScroller: { marginBottom: 15 },
    scrollContent: { paddingRight: 50 },
    monthChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    activeChip: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    monthText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    activeMonthText: { color: '#070A11' },
    searchContainer: { flexDirection: 'row', backgroundColor: '#161B2A', borderRadius: 18, paddingHorizontal: 15, height: 52, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { color: 'white', flex: 1, marginLeft: 10, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listPadding: { padding: 25, paddingTop: 0, paddingBottom: 100 },
    logCard: { 
        backgroundColor: '#161B2A', 
        borderRadius: 24, 
        padding: 20, 
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        elevation: 4,
        ...Platform.select({
            web: { boxShadow: '0 8px 20px rgba(0,0,0,0.4)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
            }
        })
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    indicator: { width: 8, height: 8, borderRadius: 4 },
    dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800' },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '900' },
    mainInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    carIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center' },
    vehicleDetails: { flex: 1, marginLeft: 15 },
    vehicleNumber: { color: 'white', fontSize: 19, fontWeight: '950' },
    carType: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800' },
    closeDutyBtn: { backgroundColor: '#f43f5e', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
    closeText: { color: 'white', fontSize: 11, fontWeight: '950' },
    driverSection: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    pillText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
    footer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900' },
    statValue: { color: 'white', fontSize: 16, fontWeight: '900', marginTop: 4 },
    divider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 20 },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 17, 0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    targetLabel: { color: '#fbbf24', fontSize: 12, fontWeight: '900', marginBottom: 20, letterSpacing: 1 },
    modalScroll: { marginBottom: 20 },
    inputGroup: { marginBottom: 20 },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    label: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    mInput: { backgroundColor: '#070A11', borderRadius: 16, height: 56, paddingHorizontal: 15, color: 'white', fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row', marginBottom: 0 },
    saveBtn: { backgroundColor: '#fbbf24', height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
    saveBtnText: { color: '#070A11', fontSize: 16, fontWeight: '950', letterSpacing: 0.5 },
    
    // DETAIL MODAL STYLES
    detailOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    detailContent: { backgroundColor: '#0D111D', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '90%', padding: 25 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    dhLeft: { flex: 1 },
    detailTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    detailSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', marginTop: 4 },
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
    boxTime: { color: 'white', fontSize: 16, fontWeight: '950', flexShrink: 1 },
    boxKm: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginTop: 1, flexShrink: 1 },
    imgRow: { marginTop: 15, gap: 10 },
    thumb: { width: 60, height: 60, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    moneyBox: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    mRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    mL: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
    mV: { color: 'white', fontSize: 13, fontWeight: '900' },
    mTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 15, marginTop: 5 },
    mTotalL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    mTotalV: { color: '#fbbf24', fontSize: 24, fontWeight: '1000' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    badgeT: { fontSize: 9, fontWeight: '1000', letterSpacing: 1 },
    glow: { position: 'absolute', left: 0, top: 20, width: 4, height: 40, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
});

export default LogBookScreen;
