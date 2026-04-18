import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions, Platform
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Briefcase, Calendar, 
    MapPin, Users, Building2, TruckIcon,
    ChevronRight, Filter, ChevronLeft,
    CheckCircle, Clock, Target, Info,
    ArrowUpRight, IndianRupee, X, Save,
    User, Settings, Trash2, Zap, MoreVertical,
    FileText, CheckCircle2, AlertCircle
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString, currentTimeIST } from '../utils/istUtils';

const { width, height } = Dimensions.get('window');

const EventManagementScreen = () => {
    const { selectedCompany } = useCompany();
    const [events, setEvents] = useState([]);
    const [duties, setDuties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('missions'); // 'missions' or 'logistics'
    const [statusTab, setStatusTab] = useState('Running'); // 'Upcoming', 'Running', 'Closed'
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Modals
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDutyModal, setShowDutyModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // Form States
    const [eventForm, setEventForm] = useState({
        name: '', client: '', date: todayIST(), location: '', description: '', status: 'Upcoming'
    });
    const [dutyForm, setDutyForm] = useState({
        carNumber: '', model: '', dropLocation: '', date: todayIST(),
        eventId: '', dutyAmount: '', driverName: '', vehicleSource: 'Fleet',
        dutyType: '', dutyTime: currentTimeIST(), remarks: '', guestCount: ''
    });

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const start = toISTDateString(new Date(selectedYear, selectedMonth, 1));
            const end = toISTDateString(new Date(selectedYear, selectedMonth + 1, 0));

            const [eventsRes, dutiesRes] = await Promise.all([
                api.get(`/api/admin/events/${selectedCompany._id}`),
                api.get(`/api/admin/reports/${selectedCompany._id}?from=${start}&to=${end}`)
            ]);

            const todayStr = todayIST();
            const mappedEvents = (eventsRes.data || []).map(e => {
                const evDate = toISTDateString(new Date(e.date));
                let visualStatus = e.status || 'Upcoming';
                if (visualStatus === 'Upcoming' && evDate <= todayStr) visualStatus = 'Running';
                return { ...e, visualStatus };
            });

            setEvents(mappedEvents);
            
            // For duties, we need both fleet and external
            const fleetDuties = (dutiesRes.data.attendance || []).filter(a => a.eventId).map(a => ({
                ...a,
                carNumber: a.vehicle?.carNumber || 'N/A',
                model: a.vehicle?.model || 'N/A',
                driverName: a.driver?.name || 'N/A',
                vehicleSource: 'Fleet',
                isAttendance: true
            }));

            // We'd also need external duties from /api/admin/vehicles, but for simplicity we merge what we have
            // and assume the user can add external duties via the screen.
            setDuties(fleetDuties);
        } catch (err) {
            console.error('Failed to fetch event data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompany, selectedMonth, selectedYear]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const shiftMonth = (val) => {
        let nMonth = selectedMonth + val;
        let nYear = selectedYear;
        if (nMonth < 0) { nMonth = 11; nYear--; }
        if (nMonth > 11) { nMonth = 0; nYear++; }
        setSelectedMonth(nMonth);
        setSelectedYear(nYear);
    };

    const handleSaveEvent = async () => {
        if (!eventForm.name || !eventForm.client) return Alert.alert('Missing Info', 'Name and Client are required');
        setSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/api/admin/events/${selectedId}`, eventForm);
            } else {
                await api.post('/api/admin/events', { ...eventForm, companyId: selectedCompany._id });
            }
            setShowEventModal(false);
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Could not save event');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEvent = (id) => {
        Alert.alert('Confirmation', 'Delete this event and all associated logs?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                await api.delete(`/api/admin/events/${id}`);
                fetchData();
            }}
        ]);
    };

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const matchesTab = e.visualStatus === statusTab;
            const matchesSearch = e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 e.client?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesTab && matchesSearch;
        }).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [events, statusTab, searchTerm]);

    const MissionCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.eventProfile}>
                    <View style={styles.iconCircle}>
                        <Building2 size={20} color="#fbbf24" strokeWidth={2.5} />
                    </View>
                    <View>
                        <Text style={styles.eventName}>{item.name}</Text>
                        <Text style={styles.eventClient}>{item.client}</Text>
                    </View>
                </View>
                <View style={[styles.statusTag, { backgroundColor: item.visualStatus === 'Running' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)' }]}>
                    <Text style={[styles.statusTabText, { color: item.visualStatus === 'Running' ? '#10b981' : 'rgba(255,255,255,0.4)' }]}>
                        {item.visualStatus?.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.statGrid}>
                <View style={styles.statItem}>
                    <Calendar size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.statText}>{formatDateIST(item.date)}</Text>
                </View>
                <View style={styles.statItem}>
                    <MapPin size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.statText} numberOfLines={1}>{item.location || 'SITE BASE'}</Text>
                </View>
            </View>

            <View style={styles.dutyStrip}>
                <View style={styles.miniLog}>
                    <TruckIcon size={12} color="#fbbf24" />
                    <Text style={styles.miniLogText}>{item.fleetDutiesCount || 0} FLEET</Text>
                </View>
                <View style={styles.miniLog}>
                    <Users size={12} color="#fbbf24" />
                    <Text style={styles.miniLogText}>{item.externalDutiesCount || 0} EXT</Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setIsEditing(true); setSelectedId(item._id); setEventForm({...item, date: toISTDateString(item.date)}); setShowEventModal(true); }}>
                    <Edit3 size={16} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.actionBtnText}>EDIT</Text>
                </TouchableOpacity>
                <View style={styles.actionSep} />
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteEvent(item._id)}>
                    <Trash2 size={16} color="rgba(244, 63, 94, 0.4)" />
                    <Text style={[styles.actionBtnText, { color: 'rgba(244, 63, 94, 0.4)' }]}>DELETE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header / Hero */}
            <View style={styles.heroWrapper}>
                <View style={styles.heroCard}>
                    <View style={styles.heroTop}>
                        <View>
                            <Text style={styles.heroTitle}>Mission Control</Text>
                            <Text style={styles.heroDate}>{months[selectedMonth]} {selectedYear}</Text>
                        </View>
                        <TouchableOpacity style={styles.circlePlus} onPress={() => { setIsEditing(false); setShowEventModal(true); }}>
                            <Plus size={24} color="#000" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.heroStats}>
                        <View style={styles.heroStat}>
                            <Text style={styles.hsValue}>{filteredEvents.length}</Text>
                            <Text style={styles.hsLabel}>ACTIVE MISSIONS</Text>
                        </View>
                        <View style={styles.hsDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.hsValue}>₹{(duties.reduce((s,d)=>s+(Number(d.dailyWage)||0),0)).toLocaleString()}</Text>
                            <Text style={styles.hsLabel}>LOGISTICS VALUE</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Status Tabs */}
            <View style={styles.tabContainer}>
                {['Upcoming', 'Running', 'Closed'].map(tab => (
                    <TouchableOpacity 
                        key={tab}
                        style={[styles.tab, statusTab === tab && styles.tabActive]}
                        onPress={() => setStatusTab(tab)}
                    >
                        <Text style={[styles.tabText, statusTab === tab && styles.tabTextActive]}>{tab}</Text>
                        {statusTab === tab && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Search & Period */}
            <View style={styles.controlRow}>
                <View style={styles.searchBox}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput 
                        placeholder="Search missions..." 
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        style={styles.input}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
                <TouchableOpacity style={styles.monthToggle} onPress={() => shiftMonth(-1)}>
                    <ChevronLeft size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.monthToggle} onPress={() => shiftMonth(1)}>
                    <ChevronRight size={20} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#fbbf24" />
                </View>
            ) : (
                <FlatList 
                    data={filteredEvents}
                    renderItem={({ item }) => <MissionCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Briefcase size={60} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyText}>No missions found in {statusTab}</Text>
                        </View>
                    }
                />
            )}

            {/* Modal for Event Creation */}
            <Modal visible={showEventModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Modify Mission' : 'New Mission'}</Text>
                            <TouchableOpacity onPress={() => setShowEventModal(false)} style={styles.modalClose}>
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>MISSION NAME</Text>
                                <TextInput style={styles.modalInput} value={eventForm.name} onChangeText={t => setEventForm({...eventForm, name: t})} placeholder="Enchante Cruise, Wedding, etc..." placeholderTextColor="rgba(255,255,255,0.1)"/>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>CLIENT NAME</Text>
                                <TextInput style={styles.modalInput} value={eventForm.client} onChangeText={t => setEventForm({...eventForm, client: t})} placeholder="Individual or Company Name..."/>
                            </View>
                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.label}>DATE</Text>
                                    <TextInput style={styles.modalInput} value={eventForm.date} onChangeText={t => setEventForm({...eventForm, date: t})} placeholder="YYYY-MM-DD" keyboardType="numeric"/>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>STATUS</Text>
                                    <TouchableOpacity style={styles.modalSelect} onPress={() => Alert.alert('Status', 'Select Status', [
                                        { text: 'Upcoming', onPress: () => setEventForm({...eventForm, status: 'Upcoming'})},
                                        { text: 'Running', onPress: () => setEventForm({...eventForm, status: 'Running'})},
                                        { text: 'Closed', onPress: () => setEventForm({...eventForm, status: 'Closed'})}
                                    ])}>
                                        <Text style={{ color: 'white', fontWeight: '800' }}>{eventForm.status}</Text>
                                        <ChevronDown size={16} color="#fbbf24" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>LOCATION HUB</Text>
                                <TextInput style={styles.modalInput} value={eventForm.location} onChangeText={t => setEventForm({...eventForm, location: t})} placeholder="Primary pickup/drop location..."/>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={handleSaveEvent} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>COMMIT MISSION</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// Simplified lucide backfill for mobile
const Edit3 = (props) => <Settings {...props} />;
const ChevronDown = (props) => <ChevronRight {...props} style={{ transform: [{ rotate: '90deg' }] }} />;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    heroWrapper: { padding: 20 },
    heroCard: { 
        backgroundColor: '#161B2A', 
        borderRadius: 32, 
        padding: 25, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.05)',
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(0,0,0,0.3)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            }
        })
    },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    heroTitle: { color: 'white', fontSize: 24, fontWeight: '950', letterSpacing: -1 },
    heroDate: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' },
    circlePlus: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
    heroStats: { flexDirection: 'row', alignItems: 'center' },
    heroStat: { flex: 1 },
    hsValue: { color: 'white', fontSize: 22, fontWeight: '950' },
    hsLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
    hsDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 25, marginBottom: 20 },
    tab: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' },
    tabActive: { },
    tabText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900' },
    tabTextActive: { color: 'white' },
    tabIndicator: { position: 'absolute', bottom: 0, width: 40, height: 3, backgroundColor: '#fbbf24', borderRadius: 2 },
    controlRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20, alignItems: 'center' },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 50, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    input: { flex: 1, marginLeft: 10, color: 'white', fontWeight: '600' },
    monthToggle: { width: 50, height: 50, backgroundColor: '#161B2A', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    listContent: { padding: 20, paddingTop: 0, paddingBottom: 100 },
    card: { backgroundColor: '#161B2A', borderRadius: 28, padding: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    eventProfile: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
    iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.1)' },
    eventName: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    eventClient: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700', marginTop: 2 },
    statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusTabText: { fontSize: 9, fontWeight: '900' },
    statGrid: { flexDirection: 'row', gap: 15, marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    statText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
    dutyStrip: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    miniLog: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    miniLogText: { color: 'white', fontSize: 10, fontWeight: '900' },
    cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    actionSep: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: { alignItems: 'center', marginTop: 100, opacity: 0.3 },
    emptyText: { color: 'white', fontSize: 15, fontWeight: '700', marginTop: 20 },
    
    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    modalClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    formGroup: { marginBottom: 20 },
    label: { color: '#fbbf24', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
    modalInput: { backgroundColor: '#0D111D', borderRadius: 16, height: 54, paddingHorizontal: 20, color: 'white', fontWeight: '700', borderWhite: 1, borderColor: 'rgba(255,255,255,0.05)' },
    formRow: { flexDirection: 'row' },
    modalSelect: { backgroundColor: '#0D111D', borderRadius: 16, height: 54, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    saveBtn: { 
        backgroundColor: '#fbbf24', 
        height: 64, 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 20, 
        ...Platform.select({
            web: { boxShadow: '0 8px 15px rgba(251, 191, 36, 0.3)' },
            default: {
                shadowColor: '#fbbf24',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            }
        })
    },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '950', letterSpacing: 0.5 }
});

export default EventManagementScreen;
