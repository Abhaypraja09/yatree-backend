import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions, Image, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Wrench, Calendar, 
    ChevronRight, Filter, AlertCircle, 
    CheckCircle2, Car, Settings, Zap,
    Trash2, X, MapPin, IndianRupee,
    Camera, Image as ImageIcon, Briefcase,
    FileText, CheckCircle, XCircle, Info,
    ArrowUpRight, Clock, User, Layers, History
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const { width } = Dimensions.get('window');

const MAINTENANCE_TYPES = [
    'Regular Service', 'Engine / Mechanical', 'Suspension', 'Steering',
    'Fuel', 'Exhaust', 'Clutch / Transmission', 'Brake', 'Tyres / Wheels',
    'Electrical / Battery', 'Sensors / Electronics', 'AC / Cooling',
    'Body / Interior', 'Emergency Repairs', 'Other'
];

const MaintenanceScreen = () => {
    const { selectedCompany } = useCompany();
    const [records, setRecords] = useState([]);
    const [aggData, setAggData] = useState([]);
    const [pendingExpenses, setPendingExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('history'); // 'history', 'master', 'pending'
    const [activeCategory, setActiveCategory] = useState('All');
    
    // Filters
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        vehicleId: '',
        maintenanceType: 'Regular Service',
        description: '',
        garageName: '',
        amount: '',
        billDate: todayIST(),
        currentKm: '',
        status: 'Completed'
    });
    const [billPhoto, setBillPhoto] = useState(null);

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [recordsRes, pendingRes, vehiclesRes, masterRes] = await Promise.all([
                api.get(`/api/admin/maintenance/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}`),
                api.get(`/api/admin/maintenance/pending/${selectedCompany._id}`),
                api.get(`/api/admin/vehicles/${selectedCompany._id}`),
                api.get(`/api/admin/vehicle-monthly-details/${selectedCompany._id}?month=All&year=${selectedYear}`)
            ]);
            setRecords(recordsRes.data || []);
            setPendingExpenses(pendingRes.data || []);
            setVehicles(vehiclesRes.data.vehicles || []);
            setAggData(masterRes.data.vehicles || []);
        } catch (err) {
            console.error('Failed to fetch maintenance data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const shiftMonth = (amount) => {
        let newMonth = selectedMonth + amount;
        let newYear = selectedYear;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompany, selectedMonth, selectedYear]);

    const handleSave = async () => {
        if (!formData.vehicleId || !formData.amount) return Alert.alert('Error', 'Please fill vehicle and amount.');
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            data.append('companyId', selectedCompany._id);

            if (billPhoto && billPhoto.startsWith('file')) {
                const filename = billPhoto.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                data.append('billPhoto', { uri: billPhoto, name: filename, type });
            }

            if (editingId) {
                await api.put(`/api/admin/maintenance/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/api/admin/maintenance', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            setShowModal(false);
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Failed to save record.');
        } finally { setSubmitting(false); }
    };

    const monthsArr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const filteredRecords = useMemo(() => {
        const serviceRegex = /wash|puncture|puncher|other service|wiring|radiator|checkup|top-up|kapda|coolant|tissue|water|cleaning|mask|sanitizer/i;
        return records.filter(r => {
            const searchStr = `${r.maintenanceType || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
            if (serviceRegex.test(searchStr)) return false;

            const matchesSearch = (r.vehicle?.carNumber?.toLowerCase()?.includes(searchTerm.toLowerCase())) ||
                                (r.maintenanceType?.toLowerCase()?.includes(searchTerm.toLowerCase())) ||
                                (r.garageName?.toLowerCase()?.includes(searchTerm.toLowerCase()));
            const matchesCat = activeCategory === 'All' || r.maintenanceType?.includes(activeCategory);
            return matchesSearch && matchesCat;
        }).sort((a,b) => new Date(b.billDate) - new Date(a.billDate));
    }, [records, searchTerm, activeCategory]);

    const [expandedMaster, setExpandedMaster] = useState(null);

    const filteredMaster = useMemo(() => {
        if (!aggData) return [];
        return aggData.filter(v => 
            (v.carNumber?.toLowerCase()?.includes(searchTerm.toLowerCase())) ||
            (v.model?.toLowerCase()?.includes(searchTerm.toLowerCase()))
        );
    }, [aggData, searchTerm]);

    const MasterRow = ({ item }) => {
        const isExp = expandedMaster === item.carNumber;
        const serviceRegex = /wash|puncture|puncher|other service|wiring|radiator|checkup|top-up|kapda|coolant|tissue|water|cleaning|mask|sanitizer/i;
        const vehicleRecords = (item.maintenance?.records || item.maintenance?.recs || []).filter(r => {
            const searchStrRec = `${r.maintenanceType || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
            return !serviceRegex.test(searchStrRec);
        });
        
        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setExpandedMaster(isExp ? null : item.carNumber)}
                style={styles.masterItem}
            >
                <View style={styles.masterCore}>
                    <View style={styles.mCarBox}><Car size={18} color="#fbbf24" /></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.mCarNum}>{item.carNumber}</Text>
                        <Text style={styles.mModel}>{item.model || 'Unknown Model'}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                        <Text style={styles.mTotalLbl}>ANNUAL SPEND</Text>
                        <Text style={styles.mTotalVal}>₹{(item.maintenance?.totalAmount || 0).toLocaleString()}</Text>
                    </View>
                </View>
                
                {isExp && (
                    <View style={styles.mExpanded}>
                        <View style={styles.mDivider} />
                        <View style={styles.mGrid}>
                            {MAINTENANCE_TYPES.map(type => {
                                const searchStr = type.toLowerCase().replace(' system', '').trim();
                                
                                if (serviceRegex.test(searchStr)) return null;

                                const amount = vehicleRecords
                                    .filter(r => (r.maintenanceType || '').toLowerCase().includes(searchStr))
                                    .reduce((sum, r) => sum + (r.amount || 0), 0);
                                
                                if (amount === 0) return null;
                                return (
                                    <View key={type} style={styles.mCatPill}>
                                        <Text style={styles.mCatT}>{type}</Text>
                                        <Text style={styles.mCatV}>₹{amount.toLocaleString()}</Text>
                                    </View>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.mFullBtn} onPress={() => { setActiveTab('history'); setSearchTerm(item.carNumber); }}>
                            <Text style={styles.mFullT}>VIEW ALL LOGS</Text>
                            <ArrowUpRight size={14} color="#fbbf24" />
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const MaintenanceCard = ({ item, isPending = false }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setDetailRecord(item)}>
            <View style={styles.cardGlow} />
            <View style={styles.cardHead}>
                <View style={styles.cTitleArea}>
                    <View style={styles.cIcon}><Wrench size={18} color="#fbbf24" /></View>
                    <View>
                        <Text style={styles.cPlate}>{item.vehicle?.carNumber || 'N/A'}</Text>
                        <Text style={styles.cType}>{item.maintenanceType || 'Other'}</Text>
                    </View>
                </View>
                <Text style={styles.cAmt}>₹{(Number(item.amount)||0).toLocaleString()}</Text>
            </View>
            <View style={styles.cPills}>
                <View style={styles.cPill}><Calendar size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.cPillT}>{formatDateIST(item.billDate)}</Text></View>
                <View style={styles.cPill}><Settings size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.cPillT}>{item.currentKm || 0} KM</Text></View>
                <View style={styles.cPill}><MapPin size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.cPillT}>{item.garageName || 'External'}</Text></View>
            </View>
            <View style={styles.cFoot}>
                <View style={{flexDirection:'row', gap: 15}}>
                    <TouchableOpacity onPress={() => { setEditingId(item._id); setFormData({...item, vehicleId: item.vehicle?._id || item.vehicle}); setBillPhoto(item.billPhoto ? `/${item.billPhoto}` : null); setShowModal(true); }}>
                        <Edit2 size={16} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { Alert.alert('Delete', 'Delete log?', [{text:'No'}, {text:'Yes', onPress: () => api.delete(`/api/admin/maintenance/${item._id}`).then(fetchData)}]) }}>
                        <Trash2 size={16} color="rgba(244, 63, 94, 0.4)" />
                    </TouchableOpacity>
                </View>
                <View><ImageIcon size={18} color={item.billPhoto ? '#fbbf24' : 'rgba(255,255,255,0.1)'}/></View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.hCard}>
                    <View style={styles.hTop}>
                        <View>
                            <Text style={styles.hLabel}>{monthsArr[selectedMonth-1]} TOTAL OVERHEAD</Text>
                            <Text style={styles.hValue}>₹{filteredRecords.reduce((s,r)=>s+(Number(r.amount)||0),0).toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity style={styles.hFab} onPress={() => { setEditingId(null); setBillPhoto(null); setFormData({ vehicleId:'', maintenanceType:'Regular Service', description:'', garageName:'', amount:'', billDate: todayIST(), currentKm:'', status:'Completed' }); setShowModal(true); }}>
                            <Plus size={24} color="#000" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.hTabs}>
                        <TouchableOpacity style={[styles.hTab, activeTab === 'history' && styles.hTabA]} onPress={() => setActiveTab('history')}>
                            <History size={14} color={activeTab==='history'?'#fbbf24':'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.hTabT, activeTab === 'history' && styles.hTabTA]}>History</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.hTab, activeTab === 'master' && styles.hTabA]} onPress={() => setActiveTab('master')}>
                            <Zap size={14} color={activeTab==='master'?'#fbbf24':'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.hTabT, activeTab === 'master' && styles.hTabTA]}>Master</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.hTab, activeTab === 'pending' && styles.hTabA]} onPress={() => setActiveTab('pending')}>
                            <Text style={[styles.hTabT, activeTab === 'pending' && styles.hTabTA]}>Pending ({pendingExpenses.length})</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.subControls}>
                <View style={styles.searchBar}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput style={styles.si} placeholder="Filter records..." placeholderTextColor="rgba(255,255,255,0.2)" value={searchTerm} onChangeText={setSearchTerm} />
                </View>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}><ChevronLeft size={18} color="#fbbf24" /></TouchableOpacity>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => Alert.alert('Period', 'Select Month', monthsArr.map((m,i)=>({text:m, onPress:()=>setSelectedMonth(i+1)})))}>
                        <Text style={styles.monthT}>{monthsArr[selectedMonth-1]} {selectedYear}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}><ChevronRight size={18} color="#fbbf24" /></TouchableOpacity>
                </View>
            </View>

            {activeTab === 'history' && (
                <View style={styles.catScroll}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 25, gap: 8}}>
                        <TouchableOpacity style={[styles.catBtn, activeCategory === 'All' && styles.catBtnA]} onPress={() => setActiveCategory('All')}><Text style={[styles.catT, activeCategory==='All'&&styles.catTA]}>All</Text></TouchableOpacity>
                        {MAINTENANCE_TYPES.map(cat => (
                           <TouchableOpacity key={cat} style={[styles.catBtn, activeCategory === cat && styles.catBtnA]} onPress={() => setActiveCategory(cat)}>
                               <Text style={[styles.catT, activeCategory===cat&&styles.catTA]}>{cat}</Text>
                           </TouchableOpacity> 
                        ))}
                    </ScrollView>
                </View>
            )}

            {loading ? <View style={styles.center}><ActivityIndicator color="#fbbf24" size="large"/></View> : (
                <FlatList
                    data={activeTab === 'history' ? filteredRecords : activeTab === 'master' ? filteredMaster : pendingExpenses}
                    renderItem={({ item }) => activeTab === 'master' ? <MasterRow item={item} /> : <MaintenanceCard item={item} isPending={activeTab==='pending'} />}
                    keyExtractor={item => item._id || item.carNumber}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} tintColor="#fbbf24" />}
                />
            )}

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.mOverlay}>
                    <View style={styles.mBox}>
                        <View style={styles.mHead}>
                            <Text style={styles.mT}>{editingId ? 'Edit Entry' : 'Log Maintenance'}</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            <View style={styles.ig}>
                                <Text style={styles.l}>SELECT VEHICLE</Text>
                                <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Plate', 'Select Car', vehicles.map(v => ({ text: v.carNumber, onPress: () => setFormData({...formData, vehicleId: v._id}) })))}>
                                    <Text style={{color:'white', fontWeight:'700'}}>{vehicles.find(v => v._id === formData.vehicleId)?.carNumber || 'Choose Vehicle Asset'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <View style={{flex:1, marginRight:10}}>
                                    <View style={styles.ig}><Text style={styles.l}>COST (₹)</Text><TextInput style={styles.mi} keyboardType="numeric" value={String(formData.amount)} onChangeText={t => setFormData({...formData, amount: t})} /></View>
                                </View>
                                <View style={{flex:1}}>
                                    <View style={styles.ig}><Text style={styles.l}>KM READING</Text><TextInput style={styles.mi} keyboardType="numeric" value={String(formData.currentKm)} onChangeText={t => setFormData({...formData, currentKm: t})} /></View>
                                </View>
                            </View>
                            <View style={styles.ig}>
                                <Text style={styles.l}>MAINTENANCE CATEGORY</Text>
                                <TouchableOpacity style={styles.sel} onPress={() => Alert.alert('Type', 'Select Task', MAINTENANCE_TYPES.map(t => ({ text: t, onPress: () => setFormData({...formData, maintenanceType: t}) })))}>
                                    <Text style={{color:'white', fontWeight:'700'}}>{formData.maintenanceType}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.ig}>
                                <Text style={styles.l}>GARAGE NAME</Text>
                                <TextInput style={styles.mi} placeholder="e.g. Maruti Authorized Service Center" placeholderTextColor="gray" value={formData.garageName} onChangeText={t => setFormData({...formData, garageName: t})} />
                            </View>
                            <View style={styles.ig}>
                                <Text style={styles.l}>BILL DATE</Text>
                                <TextInput style={styles.mi} value={formData.billDate} onChangeText={t => setFormData({...formData, billDate: t})} />
                            </View>
                            <View style={{height: 100}} />
                        </ScrollView>
                        <TouchableOpacity style={styles.save} onPress={handleSave} disabled={submitting}><Text style={styles.saveT}>COMMIT TO CLOUD</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!detailRecord} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        {detailRecord && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={styles.dhLeft}>
                                        <Text style={styles.targetLabel}>SERVICE RECORD DOSSIER</Text>
                                        <Text style={styles.detailTitle}>{detailRecord.vehicle?.carNumber || 'Fleet Unit'}</Text>
                                        <Text style={styles.detailSub}>{formatDateIST(detailRecord.billDate)} • {detailRecord.garageName || 'External Service'}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailRecord(null)}>
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>TRANSACTION CORE</Text>
                                                <Text style={styles.sectionSub}>FINANCIAL EXPENDITURE</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: detailRecord.status === 'Completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)' }]}>
                                                <Text style={[styles.badgeT, { color: detailRecord.status === 'Completed' ? '#10b981' : '#fbbf24' }]}>{detailRecord.status?.toUpperCase() || 'PENDING'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.boxGrid}>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>TOTAL COST</Text>
                                                <Text style={styles.boxTime}>₹{detailRecord.amount?.toLocaleString()}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Maintenance Category</Text><Text style={[styles.mV, { color: '#fbbf24' }]}>{detailRecord.maintenanceType}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Odometer Reading</Text><Text style={styles.mV}>{detailRecord.currentKm || 'N/A'} km</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>SERVICE DETAILS</Text>
                                                <Text style={styles.sectionSub}>NOTES & DESCRIPTION</Text>
                                            </View>
                                        </View>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 22 }}>
                                            {detailRecord.description || 'No additional description provided for this service record.'}
                                        </Text>
                                    </View>

                                    {detailRecord.billPhoto && (
                                        <View style={styles.detailSection}>
                                            <Text style={[styles.sectionTitle, { color: '#38bdf8', marginBottom: 15 }]}>EVIDENCE (BILL CAPTURE)</Text>
                                            <Image source={{ uri: detailRecord.billPhoto.startsWith('http') ? detailRecord.billPhoto : `https://driver.yatreedestination.com/${detailRecord.billPhoto}` }} style={styles.evidenceImg} resizeMode="cover" />
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
    header: { padding: 25 },
    hCard: { backgroundColor: '#161B2A', borderRadius: 32, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    hTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    hLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    hValue: { color: 'white', fontSize: 32, fontWeight: '950', marginTop: 4 },
    hFab: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
    hTabs: { flexDirection: 'row', gap: 8 },
    hTab: { flex: 1, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', flexDirection:'row', justifyContent:'center', alignItems:'center', gap: 8 },
    hTabA: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.15)', borderWidth: 1 },
    hTabT: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900' },
    hTabTA: { color: '#fbbf24' },
    subControls: { flexDirection: 'row', paddingHorizontal: 25, gap: 10, marginBottom: 15 },
    searchBar: { flex: 1, height: 52, backgroundColor: '#161B2A', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    si: { flex: 1, marginLeft: 10, color: 'white', fontWeight: '600' },
    monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', borderRadius: 18, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    navBtn: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, height: '100%', justifyContent: 'center' },
    monthT: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    catScroll: { marginBottom: 20 },
    catBtn: { paddingHorizontal: 20, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    catBtnA: { backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    catT: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900' },
    catTA: { color: '#fbbf24' },
    list: { paddingHorizontal: 25, paddingBottom: 100 },
    card: { backgroundColor: '#161B2A', borderRadius: 28, padding: 22, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow:'hidden' },
    cardGlow: { position: 'absolute', left: 0, top: 20, width: 4, height: 40, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: '#fbbf24' },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    cTitleArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    cPlate: { color: 'white', fontSize: 18, fontWeight: '950' },
    cType: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800' },
    cAmt: { color: '#fbbf24', fontSize: 20, fontWeight: '950' },
    cPills: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    cPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    cPillT: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
    cDesc: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '600', lineHeight: 18, marginBottom: 15 },
    cFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    masterItem: { backgroundColor: '#161B2A', borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    masterCore: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    mCarBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center' },
    mCarNum: { color: 'white', fontSize: 17, fontWeight: '900' },
    mModel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700' },
    mTotalLbl: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.2)', textAlign: 'right' },
    mTotalVal: { color: '#fbbf24', fontSize: 18, fontWeight: '950', marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    mBox: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '92%' },
    mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    mT: { color: 'white', fontSize: 22, fontWeight: '950' },
    ig: { marginBottom: 20 },
    l: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
    mi: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sel: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row' },
    save: { backgroundColor: '#fbbf24', height: 66, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveT: { color: '#000', fontSize: 16, fontWeight: '950' },
    mExpanded: { marginTop: 15 },
    mDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
    mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    mCatPill: { backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: '47%' },
    mCatT: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
    mCatV: { color: 'white', fontSize: 14, fontWeight: '900' },
    mFullBtn: { marginTop: 15, backgroundColor: 'rgba(251, 191, 36, 0.05)', height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.1)' },
    mFullT: { color: '#fbbf24', fontSize: 11, fontWeight: '900' },
    
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
    modalScroll: { marginBottom: 10 },
    evidenceImg: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#000' }
});

export default MaintenanceScreen;
