import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Modal, Dimensions, Image, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCompany } from '../context/CompanyContext';
import {
    Search, Plus, Car, Shield,
    Trash2, Edit2, MapPin, Info,
    CheckCircle2, XCircle, Clock,
    ChevronRight, X, Save, Settings,
    FileText, Calendar, Camera,
    Image as ImageIcon, MoreVertical, AlertTriangle,
    Wrench, Zap, ShieldAlert, BadgeIndianRupee
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;

const CAR_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Bus', 'Mini Bus', 'Traveler', 'Electric Vehicle', 'Other'];
const DOCUMENT_TYPES = ['RC', 'INSURANCE', 'PUC', 'FITNESS', 'PERMIT'];

const VehiclesScreen = () => {
    const { selectedCompany } = useCompany();
    const [vehicles, setVehicles] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Modals
    const [showForm, setShowForm] = useState(false);
    const [showDocsModal, setShowDocsModal] = useState(null);
    const [detailVehicle, setDetailVehicle] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form States
    const [form, setForm] = useState({
        carNumber: '', model: '', carType: 'SUV', permitType: 'All India',
        dutyAmount: '', fastagNumber: '', fastagBalance: '',
        fastagBank: '', seatingCapacity: '4', remarks: ''
    });

    const [docToUpload, setDocToUpload] = useState({ type: 'RC', file: null, expiry: todayIST() });

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const [vehRes, dashRes] = await Promise.all([
                api.get(`/api/admin/vehicles/${selectedCompany._id}?usePagination=false`),
                api.get(`/api/admin/dashboard/${selectedCompany._id}`)
            ]);
            setVehicles(vehRes.data.vehicles || []);
            setAlerts(dashRes.data.expiringAlerts || []);
        } catch (err) {
            console.error('Failed to fetch vehicles', err);
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

    const handleSaveVehicle = async () => {
        if (!form.carNumber || !form.model) return Alert.alert('Missing Info', 'Plate Number and Model are mandatory.');
        setSubmitting(true);
        try {
            const payload = { ...form, companyId: selectedCompany._id, isOutsideCar: false };
            if (isEditing) {
                await api.put(`/api/admin/vehicles/${form._id}`, payload);
                Alert.alert('Asset Updated', `${form.carNumber} has been updated in the cloud.`);
            } else {
                await api.post('/api/admin/vehicles', payload);
                Alert.alert('Asset Created', `${form.carNumber} is now part of your active fleet.`);
            }
            setShowForm(false);
            fetchData();
        } catch (err) {
            Alert.alert('Sync Error', err.response?.data?.message || 'Failed to update vehicle data');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id, carNum) => {
        Alert.alert(
            'Confirm Deletion',
            `Are you sure you want to remove ${carNum}? This will wipe all associated data and document archives.`,
            [
                { text: 'Aborted', style: 'cancel' },
                {
                    text: 'Permanently Wipe', style: 'destructive', onPress: async () => {
                        await api.delete(`/api/admin/vehicles/${id}`);
                        fetchData();
                        Alert.alert('Wiped', 'Vehicle removed from fleet records.');
                    }
                }
            ]
        );
    };

    const toggleStatus = async (vehicle) => {
        const newStatus = vehicle.status === 'active' ? 'inactive' : 'active';
        try {
            await api.patch(`/api/admin/vehicles/${vehicle._id}/status`, { status: newStatus });
            fetchData();
        } catch (err) {
            Alert.alert('Status Error', 'Failed to toggle vehicle accessibility.');
        }
    };

    const handlePickDoc = async (useCamera = false) => {
        const { status } = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission Denied', 'Access to media is required to upload files.');

        const result = useCamera ? await ImagePicker.launchCameraAsync({ quality: 0.6 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
        if (!result.canceled) setDocToUpload({ ...docToUpload, file: result.assets[0].uri });
    };

    const handleUploadDoc = async () => {
        if (!docToUpload.file || !docToUpload.type) return Alert.alert('Invalid Entry', 'Please provide a file and select the document category.');
        setSubmitting(true);
        try {
            const data = new FormData();
            data.append('documentType', docToUpload.type);
            data.append('expiryDate', docToUpload.expiry);

            const filename = docToUpload.file.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;
            data.append('document', { uri: docToUpload.file, name: filename, type });

            await api.post(`/api/admin/vehicles/${showDocsModal._id}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setDocToUpload({ type: 'RC', file: null, expiry: todayIST() });
            fetchData();
            Alert.alert('Vault Updated', `${docToUpload.type} has been successfully archived.`);
        } catch (err) {
            Alert.alert('Upload Failed', 'There was an error communicating with the secure document vault.');
        } finally {
            setSubmitting(false);
        }
    };

    const deduplicatedVehicles = useMemo(() => {
        const map = new Map();
        vehicles.forEach(v => {
            const plate = (v.carNumber || '').split('#')[0].trim().toUpperCase();
            if (!plate) return;
            const existing = map.get(plate);
            if (!existing || new Date(v.createdAt) > new Date(existing.createdAt)) map.set(plate, v);
        });
        const list = Array.from(map.values());
        return list.filter(v =>
            v.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [vehicles, searchTerm]);

    const ComplianceCard = ({ alert }) => {
        const isOverdue = (alert.daysLeft || 0) <= 0;
        const color = isOverdue ? '#f43f5e' : '#fbbf24';
        return (
            <View style={[styles.complianceCard, { borderColor: `${color}40`, backgroundColor: `${color}05` }]}>
                <View style={styles.compHeader}>
                    <View style={styles.compRow}>
                        <View style={[styles.compIcon, { backgroundColor: `${color}20` }]}>
                            <Shield size={14} color={color} />
                        </View>
                        <Text style={styles.compPlate}>{alert.identifier}</Text>
                    </View>
                    <View style={[styles.compBadge, { backgroundColor: color }]}>
                        <Text style={styles.compBadgeText}>{isOverdue ? 'CRITICAL' : 'WARNING'}</Text>
                    </View>
                </View>
                <Text style={styles.compDoc}>{alert.documentType} EXPIRED</Text>
                <View style={styles.compFooter}>
                    <Text style={styles.compDate}>{formatDateIST(alert.expiryDate)}</Text>
                    <Text style={[styles.compLeft, { color }]}>{isOverdue ? `${Math.abs(alert.daysLeft)}d OVERDUE` : `${alert.daysLeft}d left`}</Text>
                </View>
            </View>
        );
    };

    const VehicleCard = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setDetailVehicle(item)}>
            <View style={styles.cardHeader}>
                <View style={styles.infoRow}>
                    <View style={styles.iconBox}>
                        <Car size={24} color="#fbbf24" strokeWidth={2.5} />
                    </View>
                    <View>
                        <Text style={styles.plate}>{item.carNumber}</Text>
                        <Text style={styles.model}>{item.model}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => toggleStatus(item)}>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'active' ? '#10b981' : '#f43f5e' }]}>{item.status?.toUpperCase()}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.docGrid}>
                {DOCUMENT_TYPES.map(type => {
                    const doc = item.documents?.find(d => d.documentType === type);
                    const isExpired = doc ? new Date(doc.expiryDate) < new Date() : true;
                    return (
                        <View key={type} style={[styles.docPill, !doc && styles.docMissing, doc && isExpired && styles.docExpired]}>
                            <Text style={styles.docType}>{type}</Text>
                            {doc ? (isExpired ? <XCircle size={10} color="#f43f5e" /> : <CheckCircle2 size={10} color="#10b981" />) : <Clock size={10} color="rgba(255,255,255,0.1)" />}
                        </View>
                    );
                })}
            </View>

            <View style={styles.footer}>
                <View style={styles.actionSet}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { setIsEditing(true); setForm(item); setShowForm(true); }}>
                        <Edit2 size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item._id, item.carNumber)}>
                        <Trash2 size={16} color="rgba(244, 63, 94, 0.3)" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.viewDocs} onPress={() => setShowDocsModal(item)}>
                    <Text style={styles.viewDocsText}>VIEW VAULT</Text>
                    <ChevronRight size={14} color="#fbbf24" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.titleSmall}>ASSET MANAGEMENT</Text>
                    <Text style={styles.titleLarge}>Vehicle <Text style={{ color: '#fbbf24' }}>Fleet</Text></Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setIsEditing(false); setForm({ carNumber: '', model: '', carType: 'SUV', permitType: 'All India', dutyAmount: '', fastagNumber: '', fastagBalance: '', fastagBank: '', seatingCapacity: '4', remarks: '' }); setShowForm(true); }}>
                    <Plus size={24} color="#000" strokeWidth={3} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Search size={18} color="rgba(255,255,255,0.2)" />
                    <TextInput
                        placeholder="Search fleet assets..."
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
                {/* COMPLIANCE WATCH - Matching Web UI */}
                {alerts.length > 0 && (
                    <View style={styles.compSection}>
                        <View style={styles.compTitleRow}>
                            <View style={styles.compBar} />
                            <Text style={styles.compSectionTitle}>COMPLIANCE & HEALTH WATCH</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compScroll}>
                            {alerts.map((a, i) => <ComplianceCard key={i} alert={a} />)}
                        </ScrollView>
                    </View>
                )}

                {loading ? (
                    <View style={[styles.center, { marginTop: 50 }]}><ActivityIndicator size="large" color="#fbbf24" /></View>
                ) : (
                    <View style={styles.listArea}>
                        {deduplicatedVehicles.map(v => <VehicleCard key={v._id} item={v} />)}
                        {deduplicatedVehicles.length === 0 && (
                            <View style={styles.emptyState}>
                                <Car size={48} color="rgba(255,255,255,0.05)" />
                                <Text style={styles.emptyText}>No matching vehicles found</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* FORM MODAL - Feature Parity with Web */}
            <Modal visible={showForm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{isEditing ? 'Modify Asset' : 'New Fleet Asset'}</Text>
                                <Text style={styles.modalSub}>VEHICLE INFORMATION MANAGEMENT</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowForm(false)}><X size={24} color="white" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.formSection}>
                                <View style={styles.secTitleRow}><View style={styles.secDot} /><Text style={styles.secLabel}>CORE SPECIFICATIONS</Text></View>
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}><Car size={12} color="#fbbf24" /><Text style={styles.label}> PLATE NUMBER</Text></View>
                                    <TextInput style={styles.mInput} value={form.carNumber} onChangeText={t => setForm({ ...form, carNumber: t.toUpperCase() })} placeholder="RJ-27-TA-1234" />
                                </View>
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}><Info size={12} color="#fbbf24" /><Text style={styles.label}> MODEL NAME</Text></View>
                                    <TextInput style={styles.mInput} value={form.model} onChangeText={t => setForm({ ...form, model: t })} placeholder="Toyota Innova" />
                                </View>
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                        <Text style={styles.label}>CAR SEGMENT</Text>
                                        <TouchableOpacity style={styles.mSelect} onPress={() => Alert.alert('Segment', 'Choose Type', CAR_TYPES.map(t => ({ text: t, onPress: () => setForm({ ...form, carType: t }) })))}>
                                            <Text style={{ color: 'white', fontWeight: '700' }}>{form.carType}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>SEATING</Text>
                                        <TextInput style={styles.mInput} value={form.seatingCapacity} onChangeText={t => setForm({ ...form, seatingCapacity: t })} keyboardType="numeric" />
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.formSection, { marginTop: 20 }]}>
                                <View style={styles.secTitleRow}><View style={[styles.secDot, { backgroundColor: '#10b981' }]} /><Text style={styles.secLabel}>TRACKING DETAILS</Text></View>
                                <View style={styles.inputGroup}>
                                    <View style={styles.labelRow}><BadgeIndianRupee size={12} color="#10b981" /><Text style={styles.label}> FASTAG NUMBER</Text></View>
                                    <TextInput style={styles.mInput} value={form.fastagNumber} onChangeText={t => setForm({ ...form, fastagNumber: t })} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>FASTAG BANK</Text>
                                    <TextInput style={styles.mInput} value={form.fastagBank} onChangeText={t => setForm({ ...form, fastagBank: t })} placeholder="e.g. HDFC" />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>PERMIT CATEGORY</Text>
                                    <TouchableOpacity style={styles.mSelect} onPress={() => Alert.alert('Permit', 'Select', [{ text: 'All India', onPress: () => setForm({ ...form, permitType: 'All India' }) }, { text: 'State Only', onPress: () => setForm({ ...form, permitType: 'State Only' }) }])}>
                                        <Text style={{ color: 'white', fontWeight: '700' }}>{form.permitType}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVehicle} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{isEditing ? 'UPDATE ASSET' : 'ADD TO FLEET'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* DOCUMENT VAULT MODAL */}
            <Modal visible={!!showDocsModal && !showForm} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.vaultBox}>
                        <View style={styles.modalHeader}>
                            <View style={styles.vaultHeadRow}>
                                <View style={styles.vaultIcon}><Shield size={24} color="#fbbf24" /></View>
                                <View>
                                    <Text style={styles.modalTitle}>Document Vault</Text>
                                    <Text style={styles.vaultTargetRow}>{showDocsModal?.carNumber} • {showDocsModal?.model}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDocsModal(null)}><X size={24} color="white" /></TouchableOpacity>
                        </View>

                        <View style={styles.uploadCard}>
                            <Text style={styles.uploadTitle}>SECURE UPLOAD</Text>
                            <View style={styles.uploadStrip}>
                                <TouchableOpacity style={styles.typePick} onPress={() => Alert.alert('Doc Category', 'Select', DOCUMENT_TYPES.map(t => ({ text: t, onPress: () => setDocToUpload({ ...docToUpload, type: t }) })))}>
                                    <Text style={{ color: '#fbbf24', fontWeight: '900', fontSize: 13 }}>{docToUpload.type}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.camCirc} onPress={() => handlePickDoc(true)}><Camera size={18} color="#000" /></TouchableOpacity>
                                <TouchableOpacity style={styles.camCirc} onPress={() => handlePickDoc(false)}><ImageIcon size={18} color="#000" /></TouchableOpacity>
                                <TextInput style={styles.expiryInput} value={docToUpload.expiry} onChangeText={t => setDocToUpload({ ...docToUpload, expiry: t })} placeholder="YYYY-MM-DD" placeholderTextColor="#444" />

                                <TouchableOpacity style={styles.upBtnMain} onPress={handleUploadDoc} disabled={submitting}>
                                    <Text style={styles.upBtnText}>ARCHIVE FILE</Text>
                                    <Plus size={16} color="black" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                                <View style={styles.docGridWrap}>
                                    {DOCUMENT_TYPES.map((type) => {
                                        const doc = showDocsModal?.documents?.find(d => d.documentType === type);
                                        const isExpired = doc ? new Date(doc.expiryDate) < new Date() : true;
                                        return (
                                            <View key={type} style={[styles.vaultDocCard, doc && isExpired && { borderColor: 'rgba(244,63,94,0.3)' }]}>
                                                <View style={styles.vdHeader}>
                                                    <Text style={styles.vdType}>{type}</Text>
                                                    {!doc ? <Clock size={12} color="rgba(255,255,255,0.1)" /> : (isExpired ? <AlertTriangle size={12} color="#f43f5e" /> : <CheckCircle2 size={12} color="#10b981" />)}
                                                </View>
                                                {doc ? (
                                                    <View>
                                                        <Text style={styles.vdDate}>EXP: {formatDateIST(doc.expiryDate)}</Text>
                                                        <View style={[styles.vdStatus, { backgroundColor: isExpired ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)' }]}>
                                                            <Text style={{ color: isExpired ? '#f43f5e' : '#10b981', fontSize: 8, fontWeight: '900' }}>{isExpired ? 'EXPIRED' : 'VALID'}</Text>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.vdMissing}>MISSING</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>


            {/* ASSET DOSSIER DETAIL MODAL */}
            <Modal visible={!!detailVehicle} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        {detailVehicle && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View style={styles.dhLeft}>
                                        <Text style={styles.targetLabel}>FLEET ASSET DOSSIER</Text>
                                        <Text style={styles.detailTitle}>{detailVehicle.carNumber}</Text>
                                        <Text style={styles.detailSub}>{detailVehicle.model} • {detailVehicle.carType}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailVehicle(null)}>
                                        <X size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>SYSTEM OPERATION</Text>
                                                <Text style={styles.sectionSub}>USAGE AND ALLOCATION</Text>
                                            </View>
                                            <View style={[styles.badge, { borderColor: detailVehicle.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' }]}>
                                                <Text style={[styles.badgeT, { color: detailVehicle.status === 'active' ? '#10b981' : '#f43f5e' }]}>{detailVehicle.status?.toUpperCase() || 'UNKNOWN'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Permit Access</Text><Text style={[styles.mV, { color: '#fbbf24' }]}>{detailVehicle.permitType || 'All India'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Daily Operation Target</Text><Text style={styles.mV}>₹{(detailVehicle.dutyAmount || 0).toLocaleString()} / Day</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Passenger Capacity</Text><Text style={styles.mV}>{detailVehicle.seatingCapacity || 4} Persons</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <View style={styles.sectionHead}>
                                            <View>
                                                <Text style={[styles.sectionTitle, { color: '#10b981' }]}>TOLL & LOGISTICS</Text>
                                                <Text style={styles.sectionSub}>FASTAG INTEGRATION</Text>
                                            </View>
                                        </View>
                                        <View style={styles.boxGrid}>
                                            <View style={styles.detailBox}>
                                                <Text style={styles.miniStatL}>FASTAG ID</Text>
                                                <Text style={styles.boxTime}>{detailVehicle.fastagNumber || 'Not Configured'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Issuer Bank</Text><Text style={styles.mV}>{detailVehicle.fastagBank || 'N/A'}</Text></View>
                                        <View style={styles.mRow}><Text style={styles.mL}>Wallet Balance</Text><Text style={[styles.mV, { color: detailVehicle.fastagBalance < 500 ? '#f43f5e' : '#10b981' }]}>₹{detailVehicle.fastagBalance || 0}</Text></View>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={[styles.sectionTitle, { color: '#38bdf8', marginBottom: 15 }]}>ADDITIONAL REMARKS</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 22 }}>
                                            {detailVehicle.remarks || 'No specific maintenance or operational remarks exist for this unit.'}
                                        </Text>
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
    titleSmall: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    titleLarge: { color: 'white', fontSize: 28, fontWeight: '950', marginTop: 2 },
    addBtn: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: '#fbbf24',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 5px 15px rgba(251, 191, 36, 0.4)' },
            default: {
                elevation: 5,
                shadowColor: '#fbbf24',
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 }
            }
        })
    },
    searchWrap: { paddingHorizontal: 25, marginBottom: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', height: 54, borderRadius: 18, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { flex: 1, marginLeft: 10, color: 'white', fontWeight: '600', fontSize: 13 },

    // Compliance Block
    compSection: { marginBottom: 25 },
    compTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, marginBottom: 15 },
    compBar: { width: 4, height: 18, backgroundColor: '#f43f5e', borderRadius: 2 },
    compSectionTitle: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    compScroll: { paddingLeft: 25, paddingRight: 25, gap: 15 },
    complianceCard: { width: CARD_WIDTH, padding: 20, borderRadius: 24, borderWidth: 1.5 },
    compHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    compRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    compIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    compPlate: { color: 'white', fontSize: 13, fontWeight: '900' },
    compBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    compBadgeText: { color: 'white', fontSize: 8, fontWeight: '900' },
    compDoc: { color: 'white', fontSize: 15, fontWeight: '800', marginBottom: 15 },
    compFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    compDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
    compLeft: { fontSize: 11, fontWeight: '900' },

    listArea: { paddingHorizontal: 25 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    plate: { color: 'white', fontSize: 20, fontWeight: '950', letterSpacing: -0.5 },
    model: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
    docPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
    docMissing: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' },
    docExpired: { backgroundColor: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.1)' },
    docType: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    actionSet: { flexDirection: 'row', gap: 10 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
    viewDocs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251, 191, 36, 0.05)', paddingHorizontal: 16, height: 40, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.1)' },
    viewDocsText: { color: '#fbbf24', fontSize: 10, fontWeight: '950', letterSpacing: 0.5 },

    emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700', marginTop: 15 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    modalSub: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    formSection: { gap: 15 },
    secTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
    secDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' },
    secLabel: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    inputGroup: { marginBottom: 5 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    label: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    mInput: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, color: 'white', fontWeight: '700', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    row: { flexDirection: 'row' },
    mSelect: { backgroundColor: '#0D111D', borderRadius: 18, height: 56, paddingHorizontal: 18, justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    saveBtn: {
        backgroundColor: '#fbbf24',
        height: 66,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 25,
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(251, 191, 36, 0.3)' },
            default: {
                elevation: 5,
                shadowColor: '#fbbf24',
                shadowOpacity: 0.2,
                shadowRadius: 15,
                shadowOffset: { width: 0, height: 5 }
            }
        })
    },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '950' },

    // Vault Details
    vaultBox: { backgroundColor: '#0f172a', borderTopLeftRadius: 45, borderTopRightRadius: 45, padding: 25, maxHeight: '90%' },
    vaultHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    vaultIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center' },
    vaultTargetRow: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
    uploadCard: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginVertical: 25 },
    uploadTitle: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    uploadStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    typePick: { backgroundColor: 'rgba(255,255,255,0.05)', height: 48, paddingHorizontal: 15, borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    camCirc: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
    expiryInput: { flex: 1, backgroundColor: '#0D111D', borderRadius: 14, height: 48, paddingHorizontal: 15, color: 'white', fontSize: 12, fontWeight: '800', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    upBtnMain: { backgroundColor: '#fbbf24', height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    upBtnText: { color: '#000', fontSize: 13, fontWeight: '950' },
    docGridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15, paddingBottom: 50 },
    vaultDocCard: { width: (width - 65) / 2, backgroundColor: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
    vdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    vdType: { color: 'white', fontSize: 11, fontWeight: '950' },
    vdDate: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', marginBottom: 8 },
    vdStatus: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' },
    vdMissing: { color: 'rgba(255,255,255,0.1)', fontSize: 9, fontWeight: '800', fontStyle: 'italic' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Detail Modal Styles
    detailOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    detailContent: { backgroundColor: '#0D111D', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '85%', padding: 25 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    dhLeft: { flex: 1 },
    targetLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '950', letterSpacing: 2 },
    detailTitle: { color: 'white', fontSize: 24, fontWeight: '950', marginTop: 4 },
    detailSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', marginTop: 4 },
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
    modalScroll: { marginBottom: 10 }
});

export default VehiclesScreen;
