import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions, Image, Switch
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, Users, ShieldAlert, 
    Trash2, Edit2, User, Phone, 
    Key, CreditCard, Clock, FileText, 
    CheckCircle, XCircle, ChevronRight, 
    X, Save, Briefcase, Minus, Camera, 
    Image as ImageIcon, MoreVertical, MapPin, 
    Truck, Zap, LogIn, LogOut, IndianRupee,
    ChevronDown, AlertTriangle, Calendar, Wallet
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString, nowISTDateTimeString, formatDateTimeIST } from '../utils/istUtils';

const { width } = Dimensions.get('window');

const DriversScreen = () => {
    const { selectedCompany } = useCompany();
    const navigation = useNavigation();
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Modals
    const [showForm, setShowForm] = useState(false);
    const [showPunchModal, setShowPunchModal] = useState(null); // 'in' or 'out'
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [detailDriver, setDetailDriver] = useState(null); // Deep Dive Drill-Down State
    const [isEditing, setIsEditing] = useState(false);
    const [filterTab, setFilterTab] = useState('All'); // 'All', 'OnDuty', 'Idle'

    // Form States (Feature Parity with Web)
    const [form, setForm] = useState({
        name: '', mobile: '', username: '', password: '', 
        licenseNumber: '', dailyWage: '', nightStayBonus: '',
        sameDayReturnBonus: '', sameDayReturnEnabled: false,
        overtimeEnabled: false, overtimeThreshold: '9', overtimeRate: '0',
        isFreelancer: false
    });

    const [punchForm, setPunchForm] = useState({
        vehicleId: '', km: '', pickUpLocation: 'Office', dropLocation: 'Office', 
        fuelAmount: '', parkingAmount: '', review: '', parkingPaidBy: 'Self'
    });

    const [manualForm, setManualForm] = useState({
        date: toISTDateString(new Date()),
        vehicleId: '',
        punchInKM: '',
        punchOutKM: '',
        parkingAmount: '',
        allowanceTA: false,
        nightStayAmount: false,
        otherBonus: '',
        review: ''
    });

    const fetchData = async () => {
        if (!selectedCompany?._id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const [driversRes, vehiclesRes] = await Promise.all([
                api.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false`),
                api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false&type=fleet`)
            ]);
            setDrivers(driversRes.data.drivers || []);
            setStats(driversRes.data.stats || { total: 0, active: 0, blocked: 0 });
            setVehicles(vehiclesRes.data.vehicles || []);
        } catch (err) {
            console.error('Failed to fetch drivers', err);
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

    const handleSaveDriver = async () => {
        if (!form.name || !form.mobile || !form.username) return Alert.alert('Error', 'Name, mobile and username are required.');
        setSubmitting(true);
        try {
            const payload = { 
                ...form, 
                companyId: selectedCompany._id,
                salary: form.dailyWage, // Web parity
                overtimeThresholdHours: form.overtimeThreshold,
                overtimeRatePerHour: form.overtimeRate
            };
            if (isEditing) {
                await api.put(`/api/admin/drivers/${selectedDriver._id}`, payload);
            } else {
                await api.post('/api/admin/drivers', payload);
            }
            setShowForm(false);
            fetchData();
            Alert.alert('Success', `Personnel ${isEditing ? 'updated' : 'registered'} in Cloud.`);
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to save driver');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id, driverName) => {
        Alert.alert('Wipe Record', `Delete ${driverName}? This action is irreversible.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                await api.delete(`/api/admin/drivers/${id}`);
                fetchData();
            }}
        ]);
    };

    const toggleStatus = async (driver) => {
        const newStatus = driver.status === 'active' ? 'blocked' : 'active';
        try {
            await api.patch(`/api/admin/drivers/${driver._id}/status`, { status: newStatus });
            fetchData();
        } catch (err) {
            Alert.alert('Status Error', 'Failed to toggle system access for this driver.');
        }
    };

    const handleVerifyDoc = async (docId, status) => {
        try {
            await api.patch(`/api/admin/drivers/${detailDriver._id}/documents/${docId}/verify`, { status });
            // Refresh detailDriver
            const { data } = await api.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false&isFreelancer=false`);
            const updated = data.drivers?.find(d => d._id === detailDriver._id);
            if (updated) setDetailDriver(updated);
            fetchData();
            Alert.alert('Status Sync', `Document ${status} updated in cloud.`);
        } catch (err) {
            Alert.alert('Sync Error', 'Failed to update document status.');
        }
    };

    const handlePunch = async () => {
        if (showPunchModal === 'in' && (!punchForm.vehicleId || !punchForm.km)) return Alert.alert('Error', 'Target vehicle and opening KM are required.');
        if (showPunchModal === 'out' && !punchForm.km) return Alert.alert('Error', 'Closing KM is mandatory.');
        
        setSubmitting(true);
        try {
            const endpoint = showPunchModal === 'in' ? '/api/admin/punch-in' : '/api/admin/punch-out';
            const payload = {
                ...punchForm,
                driverId: selectedDriver._id,
                companyId: selectedCompany._id,
                date: todayIST(),
                time: nowISTDateTimeString()
            };
            await api.post(endpoint, payload);
            setShowPunchModal(null);
            fetchData();
            Alert.alert('Duty Logged', `Driver successfully punched ${showPunchModal}.`);
        } catch (err) {
            Alert.alert('Duty Error', err.response?.data?.message || 'Transaction could not be completed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualDuty = async () => {
        if (!manualForm.vehicleId || !manualForm.punchInKM || !manualForm.punchOutKM) {
            return Alert.alert('Error', 'Vehicle and both KM readings are required.');
        }
        setSubmitting(true);
        try {
            await api.post('/api/admin/manual-duty', {
                ...manualForm,
                driverId: selectedDriver._id,
                companyId: selectedCompany._id
            });
            setShowManualModal(false);
            fetchData();
            Alert.alert('Success', 'Manual duty record inserted successfully.');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to insert record.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDrivers = useMemo(() => {
        let base = drivers.filter(d => 
            d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d.mobile?.includes(searchTerm)
        );

        if (filterTab === 'OnDuty') return base.filter(d => !!d.activeAttendance);
        if (filterTab === 'Idle') return base.filter(d => !d.activeAttendance);
        return base;
    }, [drivers, searchTerm, filterTab]);

    const StatCard = ({ label, value, color, icon: Icon }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
                <Icon size={18} color={color} />
            </View>
            <View>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{value}</Text>
            </View>
        </View>
    );

    const DriverCard = ({ item }) => {
        const isActive = item.status === 'active';
        const isOnDuty = !!item.activeAttendance;
        
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setDetailDriver(item)}>
                <View style={styles.cardHeader}>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                            <Text style={[styles.avatarText, { color: isActive ? '#10b981' : '#f43f5e' }]}>{item.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                            <Text style={styles.driverName}>{item.name}</Text>
                            <View style={styles.subRow}>
                                <Text style={styles.driverSub}>@{item.username || 'user'}</Text>
                                <View style={styles.dot} />
                                <Text style={[styles.driverSub, { color: '#fbbf24' }]}>ID: {item._id?.slice(-4)}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: isActive ? '#10b981' : '#f43f5e' }]}>{item.status?.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={[styles.infoGrid, { marginBottom: 12 }]}>
                    <View style={styles.gridItem}>
                        <Phone size={14} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.gridVal}>{item.mobile}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <IndianRupee size={14} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.gridVal}>{item.dailyWage || 0}/day</Text>
                    </View>
                </View>

                {/* Document Status Indicators (Web Parity) */}
                <View style={styles.docRow}>
                    {['aadharCard', 'drivingLicense', 'offerLetter'].map((docKey, idx) => {
                        const doc = item.documents?.find(d => d.documentType?.toLowerCase().includes(docKey.toLowerCase().replace('card', '')));
                        const isUploaded = !!doc;
                        const label = docKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return (
                            <View key={docKey} style={[styles.docPin, !isUploaded && styles.docPinMissing]}>
                                <FileText size={10} color={isUploaded ? '#10b981' : 'rgba(255,255,255,0.2)'} />
                                <Text style={[styles.docPinText, !isUploaded && {color:'rgba(255,255,255,0.2)'}]}>{label.split(' ')[0]}</Text>
                            </View>
                        );
                    })}
                    {item.isFreelancer && (
                        <View style={[styles.docPin, {backgroundColor:'rgba(139, 92, 246, 0.1)', borderColor:'rgba(139, 92, 246, 0.2)'}]}>
                            <Zap size={10} color="#8b5cf6" />
                            <Text style={[styles.docPinText, {color:'#8b5cf6'}]}>FREELANCER</Text>
                        </View>
                    )}
                </View>

                {isOnDuty ? (
                    <View style={styles.dutyStrip}>
                        <View style={styles.dutyPulse} />
                        <Text style={styles.dutyText}>ACTIVE DUTY: {item.activeAttendance?.vehicle?.carNumber?.split('#')[0]}</Text>
                        <Text style={styles.dutyTime}>{formatDateTimeIST(item.activeAttendance?.punchIn?.time).split(' ')[1]}</Text>
                    </View>
                ) : (
                    <View style={styles.idleStrip}>
                        <Clock size={12} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.idleText}>CURRENTLY STATIONARY / OFF-DUTY</Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.footerSet}>
                        <TouchableOpacity style={styles.fPill} onPress={() => { setSelectedDriver(item); setIsEditing(true); setForm({ ...item, overtimeEnabled: item.overtime?.enabled, overtimeThreshold: String(item.overtime?.thresholdHours || '9'), overtimeRate: String(item.overtime?.ratePerHour || '0'), isFreelancer: !!item.isFreelancer }); setShowForm(true); }}>
                            <Edit2 size={16} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fPill} onPress={() => { setSelectedDriver(item); setManualForm({ ...manualForm, vehicleId: item.assignedVehicle?._id || '', date: toISTDateString(new Date()) }); setShowManualModal(true); }}>
                            <Calendar size={16} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fPill} onPress={() => toggleStatus(item)}>
                            <ShieldAlert size={16} color={isActive ? '#fbbf24' : '#10b981'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fPill} onPress={() => handleDelete(item._id, item.name)}>
                            <Trash2 size={16} color="rgba(244, 63, 94, 0.4)" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fPill} onPress={() => navigation.navigate('DriverSalaries')}>
                            <Wallet size={16} color="#10b981" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }} />
                    {isOnDuty ? (
                        <TouchableOpacity style={[styles.punchBtn, { backgroundColor: '#f43f5e' }]} onPress={() => { setSelectedDriver(item); setShowPunchModal('out'); setPunchForm({ ...punchForm, km: '', fuelAmount: '', parkingAmount: '' }); }}>
                            <LogOut size={16} color="white" />
                            <Text style={styles.punchBtnText}>PUNCH OUT</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.punchBtn, { backgroundColor: '#10b981' }]} onPress={() => { setSelectedDriver(item); setShowPunchModal('in'); setPunchForm({ ...punchForm, vehicleId: item.assignedVehicle?._id || '', km: '' }); }}>
                            <LogIn size={16} color="white" />
                            <Text style={styles.punchBtnText}>PUNCH IN</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.tSmall}>OPERATIONAL FORCE</Text>
                    <Text style={styles.tLarge}>Personnel <Text style={{color:'#fbbf24'}}>Staff</Text></Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setIsEditing(false); setForm({ name:'', mobile:'', username:'', password:'', licenseNumber:'', dailyWage:'', nightStayBonus:'', sameDayReturnBonus:'', sameDayReturnEnabled: false, overtimeEnabled: false, overtimeThreshold: '9', overtimeRate: '0', isFreelancer: false }); setShowForm(true); }}>
                    <Plus size={26} color="#000" strokeWidth={3} />
                </TouchableOpacity>
            </View>

            <View style={styles.filterBar}>
                <View style={styles.filterPillContainer}>
                    {['All', 'OnDuty', 'Idle'].map(tab => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.filterPill, filterTab === tab && styles.filterPillActive]} 
                            onPress={() => setFilterTab(tab)}
                        >
                            <Text style={[styles.filterPillText, filterTab === tab && styles.filterPillTextActive]}>{tab.replace('OnDuty', 'On Duty')}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput 
                        placeholder="Search workforce..." 
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        style={styles.searchInput}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                contentContainerStyle={{ paddingBottom: 150 }}
            >
                <View style={styles.listArea}>
                    <View style={styles.statsStrip}>
                        <StatCard label="In System" value={stats.total} color="#3b82f6" icon={Users} />
                        <StatCard label="Active" value={stats.active} color="#10b981" icon={CheckCircle} />
                        <StatCard label="Blocked" value={stats.blocked} color="#f43f5e" icon={ShieldAlert} />
                    </View>

                    {loading ? (
                        <View style={styles.center}><ActivityIndicator size="large" color="#fbbf24"/></View>
                    ) : (
                        <View style={styles.listContainer}>
                            {filteredDrivers.map(d => <DriverCard key={d._id} item={d} />)}
                            {filteredDrivers.length === 0 && (
                                <View style={styles.emptyView}>
                                    <Users size={50} color="rgba(255,255,255,0.05)" />
                                    <Text style={styles.emptyText}>Personnel record match not found</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* REGISTER / EDIT MODAL (Parity with Web) */}
            <Modal visible={showForm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.mHeader}>
                            <View>
                                <Text style={styles.mTitle}>{isEditing ? 'Profile Updates' : 'Force Registration'}</Text>
                                <Text style={styles.mSubText}>WORKFORCE CONFIGURATION MANAGEMENT</Text>
                            </View>
                            <TouchableOpacity style={styles.mClose} onPress={() => setShowForm(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                            <View style={styles.fSec}>
                                <View style={styles.fSecHead}><View style={styles.fSecDot}/><Text style={styles.fSecTitle}>PROFILE CORE</Text></View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>FULL NAME *</Text>
                                    <TextInput style={styles.mInput} value={form.name} onChangeText={t => setForm({...form, name: t})} placeholder="e.g. Rahul Sharma" />
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>MOBILE (SYNCED)</Text>
                                    <TextInput style={styles.mInput} value={form.mobile} onChangeText={t => setForm({...form, mobile: t})} placeholder="10 Digit Number" keyboardType="phone-pad" />
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>DRIVING LICENSE NUMBER</Text>
                                    <TextInput style={styles.mInput} value={form.licenseNumber} onChangeText={t => setForm({...form, licenseNumber: t.toUpperCase()})} placeholder="DL-XXXX" />
                                </View>
                            </View>

                            <View style={[styles.fSec, { marginTop: 25 }]}>
                                <View style={styles.fSecHead}><View style={[styles.fSecDot, {backgroundColor:'#3b82f6'}]}/><Text style={styles.fSecTitle}>ACCESS CREDENTIALS</Text></View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>USERNAME (CLOUD LOGIN)</Text>
                                    <TextInput style={[styles.mInput, {color:'#3b82f6'}]} value={form.username} onChangeText={t => setForm({...form, username: t.toLowerCase()})} placeholder="rahul_dst" autoCapitalize="none" />
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>PASSPHRASE</Text>
                                    <TextInput style={styles.mInput} value={form.password} onChangeText={t => setForm({...form, password: t})} placeholder={isEditing ? "(Keep blank to retain)" : "••••••••"} secureTextEntry />
                                </View>
                            </View>

                            <View style={[styles.fSec, { marginTop: 25 }]}>
                                <View style={styles.fSecHead}><View style={[styles.fSecDot, {backgroundColor:'#10b981'}]}/><Text style={styles.fSecTitle}>FINANCIAL STRUCTURE</Text></View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>DAILY WAGE BASE (₹)</Text>
                                    <TextInput style={styles.mInput} value={String(form.dailyWage || '')} onChangeText={t => setForm({...form, dailyWage: t})} keyboardType="numeric" />
                                </View>
                                <View style={styles.row}>
                                    <View style={[styles.iGroup, {flex:1, marginRight:10}]}>
                                        <Text style={styles.iLabel}>NS BONUS (₹)</Text>
                                        <TextInput style={styles.mInput} value={String(form.nightStayBonus || '')} onChangeText={t => setForm({...form, nightStayBonus: t})} keyboardType="numeric" />
                                    </View>
                                    <View style={[styles.iGroup, {flex:1}]}>
                                        <Text style={styles.iLabel}>SDR BONUS (₹)</Text>
                                        <TextInput style={styles.mInput} value={String(form.sameDayReturnBonus || '')} onChangeText={t => setForm({...form, sameDayReturnBonus: t})} keyboardType="numeric" />
                                    </View>
                                </View>
                                <View style={styles.toggleRow}>
                                    <Text style={[styles.iLabel, {marginBottom:0}]}>ENABLE SAME DAY RETURN (SDR)</Text>
                                    <Switch value={form.sameDayReturnEnabled} onValueChange={v => setForm({...form, sameDayReturnEnabled: v})} trackColor={{false: '#334155', true: '#10b981'}} />
                                </View>
                            </View>

                             <View style={[styles.fSec, { marginTop: 25 }]}>
                                <View style={styles.fSecHead}><View style={[styles.fSecDot, {backgroundColor:'#8b5cf6'}]}/><Text style={styles.fSecTitle}>OVERTIME CONFIG</Text></View>
                                <View style={styles.toggleRow}>
                                    <Text style={[styles.iLabel, {marginBottom:0}]}>CALCULATE OVERTIME</Text>
                                    <Switch value={form.overtimeEnabled} onValueChange={v => setForm({...form, overtimeEnabled: v})} trackColor={{false: '#334155', true: '#8b5cf6'}} />
                                </View>
                                {form.overtimeEnabled && (
                                    <View style={styles.row}>
                                        <View style={[styles.iGroup, {flex:1, marginRight:10}]}>
                                            <Text style={styles.iLabel}>HOURS THRESHOLD</Text>
                                            <TextInput style={styles.mInput} value={form.overtimeThreshold} onChangeText={t => setForm({...form, overtimeThreshold: t})} keyboardType="numeric" />
                                        </View>
                                        <View style={[styles.iGroup, {flex:1}]}>
                                            <Text style={styles.iLabel}>RATE PER HOUR (₹)</Text>
                                            <TextInput style={styles.mInput} value={form.overtimeRate} onChangeText={t => setForm({...form, overtimeRate: t})} keyboardType="numeric" />
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.fSec, { marginTop: 25 }]}>
                                <View style={styles.fSecHead}><View style={[styles.fSecDot, {backgroundColor:'#f43f5e'}]}/><Text style={styles.fSecTitle}>CONTRACT TYPE</Text></View>
                                <View style={styles.toggleRow}>
                                    <Text style={[styles.iLabel, {marginBottom:0}]}>MARK AS FREELANCER</Text>
                                    <Switch value={form.isFreelancer} onValueChange={v => setForm({...form, isFreelancer: v})} trackColor={{false: '#334155', true: '#f43f5e'}} />
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.mSaveBtn} onPress={handleSaveDriver} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000"/> : <Text style={styles.mSaveBtnText}>{isEditing ? 'UPDATE PERSONNEL CLOUD' : 'COMPLETE REGISTRATION'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* PUNCH IN / OUT MODAL (Full parity with web admin punch) */}
            <Modal visible={!!showPunchModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.punchBox}>
                        <View style={styles.mHeader}>
                            <View>
                                <Text style={styles.mTitle}>Admin {showPunchModal === 'in' ? 'Punch In' : 'Punch Out'}</Text>
                                <Text style={styles.targetD}>TARGET: {selectedDriver?.name}</Text>
                            </View>
                            <TouchableOpacity style={styles.mClose} onPress={() => setShowPunchModal(null)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        
                        {showPunchModal === 'in' ? (
                            <View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>SELECT FLEET ASSET</Text>
                                    <TouchableOpacity style={styles.pSelect} onPress={() => Alert.alert('Vehicle Selection', 'Choose Active Asset', vehicles.map(v => ({ text: v.carNumber, onPress: () => setPunchForm({...punchForm, vehicleId: v._id, km: String(v.lastOdometer || '')}) })))}>
                                        <Text style={{color:'white', fontWeight:'700'}}>{vehicles.find(v => v._id === punchForm.vehicleId)?.carNumber || 'Select Car...'}</Text>
                                        <ChevronDown size={14} color="#fbbf24" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>OPENING ODOMETER (KM)</Text>
                                    <TextInput style={styles.mInput} value={punchForm.km} onChangeText={t => setPunchForm({...punchForm, km: t})} keyboardType="numeric" placeholder="Current KM" />
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>PICK-UP LOCATION</Text>
                                    <TextInput style={styles.mInput} value={punchForm.pickUpLocation} onChangeText={t => setPunchForm({...punchForm, pickUpLocation: t})} />
                                </View>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 400}}>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>CLOSING ODOMETER (KM)</Text>
                                    <TextInput style={styles.mInput} value={punchForm.km} onChangeText={t => setPunchForm({...punchForm, km: t})} keyboardType="numeric" placeholder="Ending KM" />
                                </View>
                                <View style={styles.row}>
                                    <View style={[styles.iGroup, {flex:1, marginRight:10}]}>
                                        <Text style={styles.iLabel}>FUEL PAID ₹</Text>
                                        <TextInput style={styles.mInput} value={punchForm.fuelAmount} onChangeText={t => setPunchForm({...punchForm, fuelAmount: t})} keyboardType="numeric" />
                                    </View>
                                    <View style={[styles.iGroup, {flex:1}]}>
                                        <Text style={styles.iLabel}>PARKING PAID ₹</Text>
                                        <TextInput style={styles.mInput} value={punchForm.parkingAmount} onChangeText={t => setPunchForm({...punchForm, parkingAmount: t})} keyboardType="numeric" />
                                    </View>
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>DROP LOCATION</Text>
                                    <TextInput style={styles.mInput} value={punchForm.dropLocation} onChangeText={t => setPunchForm({...punchForm, dropLocation: t})} />
                                </View>
                                <View style={styles.iGroup}>
                                    <Text style={styles.iLabel}>ADMIN REVIEW / NOTES</Text>
                                    <TextInput style={[styles.mInput, {height: 80, paddingTop: 15}]} multiline numberOfLines={3} value={punchForm.review} onChangeText={t => setPunchForm({...punchForm, review: t})} placeholder="Log details / notes..." />
                                </View>
                            </ScrollView>
                        )}

                        <TouchableOpacity style={[styles.mSaveBtn, { backgroundColor: showPunchModal === 'in' ? '#10b981' : '#f43f5e' }]} onPress={handlePunch} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff"/> : <Text style={[styles.mSaveBtnText, {color:'white'}]}>CONFIRM {showPunchModal?.toUpperCase()}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MANUAL DUTY INSERT MODAL (Cloud Insert Past Records) */}
            <Modal visible={showManualModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.punchBox}>
                        <View style={styles.mHeader}>
                            <View>
                                <Text style={styles.mTitle}>Insert Past Duty</Text>
                                <Text style={styles.targetD}>RECORD FOR: {selectedDriver?.name}</Text>
                            </View>
                            <TouchableOpacity style={styles.mClose} onPress={() => setShowManualModal(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 500}}>
                            <View style={styles.iGroup}>
                                <Text style={styles.iLabel}>DUTY DATE *</Text>
                                <TextInput style={styles.mInput} value={manualForm.date} onChangeText={t => setManualForm({...manualForm, date: t})} placeholder="YYYY-MM-DD" />
                            </View>
                            <View style={styles.iGroup}>
                                <Text style={styles.iLabel}>FLEET ASSET *</Text>
                                <TouchableOpacity style={styles.pSelect} onPress={() => Alert.alert('Pick Vehicle', 'For past record', vehicles.map(v => ({ text: v.carNumber, onPress: () => setManualForm({...manualForm, vehicleId: v._id}) })))}>
                                    <Text style={{color:'white', fontWeight:'700'}}>{vehicles.find(v => v._id === manualForm.vehicleId)?.carNumber || 'Select Car...'}</Text>
                                    <ChevronDown size={14} color="#fbbf24" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.iGroup, {flex:1, marginRight:10}]}>
                                    <Text style={styles.iLabel}>OPENING KM *</Text>
                                    <TextInput style={styles.mInput} value={manualForm.punchInKM} onChangeText={t => setManualForm({...manualForm, punchInKM: t})} keyboardType="numeric" />
                                </View>
                                <View style={[styles.iGroup, {flex:1}]}>
                                    <Text style={styles.iLabel}>CLOSING KM *</Text>
                                    <TextInput style={styles.mInput} value={manualForm.punchOutKM} onChangeText={t => setManualForm({...manualForm, punchOutKM: t})} keyboardType="numeric" />
                                </View>
                            </View>
                            <View style={styles.iGroup}>
                                <Text style={styles.iLabel}>ADDITIONAL EXPENSES (₹)</Text>
                                <TextInput style={styles.mInput} value={manualForm.parkingAmount} onChangeText={t => setManualForm({...manualForm, parkingAmount: t})} keyboardType="numeric" placeholder="Cabs/Parking/Toll" />
                            </View>
                            <View style={styles.toggleRow}>
                                <Text style={[styles.iLabel, {marginBottom:0}]}>DAY STAY BONUS (₹100)</Text>
                                <Switch value={manualForm.allowanceTA} onValueChange={v => setManualForm({...manualForm, allowanceTA: v})} trackColor={{false: '#334155', true: '#10b981'}} />
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={[styles.mSaveBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleManualDuty} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff"/> : <Text style={[styles.mSaveBtnText, {color:'white'}]}>SYNC PAST RECORD</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* HIGH-FIDELITY DETAIL DRILL-DOWN MODAL */}
            <Modal visible={!!detailDriver} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        {detailDriver && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={styles.dhLeft}>
                                        <Text style={styles.targetLabel}>PERSONNEL DOSSIER</Text>
                                        <Text style={styles.detailTitle}>{detailDriver.name}</Text>
                                        <Text style={styles.detailSub}>@{detailDriver.username || 'user'} • +91 {detailDriver.mobile}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailDriver(null)}>
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>SYSTEM ACCESS</Text>
                                                <Text style={styles.sectionSub}>AUTHENTICATION STATUS</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: detailDriver.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' }]}>
                                                <Text style={[styles.badgeT, { color: detailDriver.status === 'active' ? '#10b981' : '#f43f5e' }]}>{detailDriver.status === 'active' ? 'AUTHORISED' : 'BLOCKED'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>License ID</Text><Text style={styles.mV}>{detailDriver.licenseNumber || 'PENDING'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Freelancer Override</Text><Text style={[styles.mV, { color: detailDriver.isFreelancer ? '#8b5cf6' : 'white' }]}>{detailDriver.isFreelancer ? 'ENABLED' : 'DISABLED'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Onboarding Date</Text><Text style={styles.mV}>{formatDateIST(detailDriver.createdAt || new Date())}</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>FINANCIAL PROTOCOL</Text>
                                                <Text style={styles.sectionSub}>WAGES AND BONUSES</Text>
                                            </View>
                                        </View>
                                        <View style={styles.statsRow}>
                                            <View style={styles.miniStat}>
                                                <Text style={styles.miniStatL}>BASE WAGE</Text>
                                                <Text style={styles.miniStatV}>₹{detailDriver.dailyWage || 0}</Text>
                                            </View>
                                            <View style={styles.miniStat}>
                                                <Text style={styles.miniStatL}>NIGHT STAY</Text>
                                                <Text style={styles.miniStatV}>₹{detailDriver.nightStayBonus || 0}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>SDR Bonus Level</Text><Text style={[styles.mV, { color: '#38bdf8' }]}>₹{detailDriver.sameDayReturnBonus || 0}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>SDR Policy Enabled</Text><Text style={[styles.mV, { color: detailDriver.sameDayReturnEnabled ? '#10b981' : 'rgba(255,255,255,0.3)' }]}>{detailDriver.sameDayReturnEnabled ? 'YES' : 'NO'}</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#8b5cf6' }]}>OVERTIME LOGIC</Text>
                                                <Text style={styles.sectionSub}>THRESHOLD CONFIGURATION</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: detailDriver.overtime?.enabled ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)' }]}>
                                                <Text style={[styles.badgeT, { color: detailDriver.overtime?.enabled ? '#8b5cf6' : 'rgba(255,255,255,0.3)' }]}>{detailDriver.overtime?.enabled ? 'ACTIVE' : 'INACTIVE'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.boxGrid}>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>THRESHOLD</Text>
                                                <Text style={styles.boxTime}>{detailDriver.overtime?.thresholdHours || 0} HRS</Text>
                                            </View>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>RATE</Text>
                                                <Text style={styles.boxTime}>₹{detailDriver.overtime?.ratePerHour || 0} /hr</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#38bdf8' }]}>DOCUMENT VAULT</Text>
                                                <Text style={styles.sectionSub}>VERIFICATION STATUS</Text>
                                            </View>
                                        </View>
                                        {['Aadhar Card', 'Driving License', 'Offer Letter'].map((type) => {
                                            const doc = detailDriver.documents?.find(d => d.documentType === type);
                                            const status = doc?.verificationStatus || 'Missing';
                                            return (
                                                <View key={type} style={styles.vRow}>
                                                    <View style={styles.vLabelRow}>
                                                        <FileText size={16} color="rgba(255,255,255,0.3)" />
                                                        <Text style={styles.vType}>{type}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                                        {doc && status !== 'Verified' && (
                                                            <TouchableOpacity onPress={() => handleVerifyDoc(doc._id, 'Verified')} style={[styles.vBtn, {backgroundColor:'rgba(16,185,129,0.1)'}]}>
                                                                <CheckCircle size={14} color="#10b981" />
                                                            </TouchableOpacity>
                                                        )}
                                                        <View style={[styles.vBadge, { backgroundColor: status === 'Verified' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)' }]}>
                                                            <Text style={[styles.vStatus, { color: status === 'Verified' ? '#10b981' : 'rgba(255,255,255,0.4)' }]}>{status.toUpperCase()}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    
                                    <View style={{ marginTop: 20, paddingBottom: 20 }}>
                                        <View style={styles.actionGrid}>
                                            <TouchableOpacity style={[styles.mActionBtn, {backgroundColor:'#10b981', flex: 1}]} onPress={() => { setDetailDriver(null); setShowPunchModal('in'); setPunchForm({ ...punchForm, vehicleId: detailDriver.assignedVehicle?._id || '' }); }}>
                                                <LogIn size={20} color="white" />
                                                <Text style={styles.mActionT}>START SHIFT</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.mActionBtn, {backgroundColor:'#f43f5e', flex: 1}]} onPress={() => { setDetailDriver(null); setShowPunchModal('out'); }}>
                                                <LogOut size={20} color="white" />
                                                <Text style={styles.mActionT}>END SHIFT</Text>
                                            </TouchableOpacity>
                                        </View>
                                        
                                        <TouchableOpacity 
                                            style={[styles.mActionBtn, {backgroundColor: 'rgba(251, 191, 36, 0.1)', marginTop: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)'}]} 
                                            onPress={() => { setDetailDriver(null); navigation.navigate('DriverSalaries'); }}
                                        >
                                            <Wallet size={20} color="#fbbf24" />
                                            <Text style={[styles.mActionT, {color: '#fbbf24', marginLeft: 10}]}>VIEW FINANCE & SALARY LEDGER</Text>
                                        </TouchableOpacity>
                                    </View>
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
    header: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tSmall: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    tLarge: { color: 'white', fontSize: 28, fontWeight: '950', marginTop: 2 },
    addBtn: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
    searchRow: { paddingHorizontal: 25, marginBottom: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 54, borderRadius: 18, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { flex: 1, marginLeft: 10, color: 'white', fontWeight: '600' },
    statsStrip: { flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginBottom: 25 },
    statCard: { flex: 1, backgroundColor: '#161B2A', padding: 15, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    statIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900' },
    statValue: { color: 'white', fontSize: 18, fontWeight: '950', marginTop: 1 },
    listContainer: { paddingHorizontal: 25 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: '950' },
    driverName: { color: 'white', fontSize: 18, fontWeight: '900' },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    driverSub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '700' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statusText: { fontSize: 8, fontWeight: '900' },
    infoGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    gridItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    gridVal: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '800' },
    dutyStrip: { backgroundColor: 'rgba(25, 209, 126, 0.05)', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
    dutyPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    dutyText: { flex: 1, color: '#10b981', fontSize: 11, fontWeight: '950' },
    dutyTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800' },
    idleStrip: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, justifyContent:'center' },
    idleText: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '950' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    footerSet: { flexDirection: 'row', gap: 10 },
    fPill: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    punchBtn: { height: 44, paddingHorizontal: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
    punchBtnText: { color: 'white', fontSize: 11, fontWeight: '950' },
    emptyView: { padding: 80, alignItems: 'center' },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '700', marginTop: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.96)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 45, borderTopRightRadius: 45, padding: 30, maxHeight: '92%' },
    mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
    mTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    mSubText: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
    mClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    fSecHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    fSecDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' },
    fSecTitle: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    iGroup: { marginBottom: 15 },
    iLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
    mInput: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row' },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D111D', padding: 15, borderRadius: 18, marginBottom: 15 },
    mSaveBtn: { backgroundColor: '#fbbf24', height: 66, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    mSaveBtnText: { color: '#000', fontSize: 16, fontWeight: '950' },

    // Filters
    filterBar: { paddingHorizontal: 25, marginBottom: 20 },
    filterPillContainer: { flexDirection: 'row', gap: 10 },
    filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    filterPillActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    filterPillText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800' },
    filterPillTextActive: { color: '#000' },

    // Punch
    punchBox: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30 },
    targetD: { color: '#fbbf24', fontSize: 13, fontWeight: '700', marginTop: 4 },
    pSelect: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    
    // Web Parity Docs
    docRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
    docPin: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
    docPinMissing: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' },
    docPinText: { color: '#10b981', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

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
    vRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: 15, borderRadius: 16, marginBottom: 10 },
    vLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    vType: { color: 'white', fontSize: 13, fontWeight: '800' },
    vBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    vStatus: { fontSize: 9, fontWeight: '1000' },
    vBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    modalScroll: { flex: 1 },
    actionGrid: { flexDirection: 'row', gap: 12 }
});

export default DriversScreen;
