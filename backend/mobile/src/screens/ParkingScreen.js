import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, TextInput, RefreshControl,
    Alert, ScrollView, Image, Dimensions, Modal, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCompany } from '../context/CompanyContext';
import { 
    Search, Plus, MapPin, Calendar as CalendarIcon, 
    ChevronRight, Filter, CheckCircle, XCircle, 
    Eye, Trash2, Car, User, Shield, Info, 
    ChevronLeft, Zap, Camera, X, Image as ImageIcon,
    ChevronDown, IndianRupee, FileSpreadsheet, ShieldCheck,
    Edit3
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST, todayIST, toISTDateString } from '../utils/istUtils';

const { width, height } = Dimensions.get('window');

const ParkingScreen = () => {
    const { selectedCompany } = useCompany();
    const [entries, setEntries] = useState([]);
    const [pendingEntries, setPendingEntries] = useState([]);
    const [rejectedEntries, setRejectedEntries] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('fleet'); // 'fleet', 'pending', 'rejected'
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState('All');
    const [filterDriver, setFilterDriver] = useState('All');

    // Form State
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        vehicleId: '',
        driverId: '',
        driver: '',
        amount: '',
        date: todayIST(),
        receiptPhoto: ''
    });

    // Image Modal
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const fetchData = async () => {
        if (!selectedCompany?._id) return;
        try {
            const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
            const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
            
            const [historyRes, pendingRes, driversRes, vehiclesRes] = await Promise.all([
                api.get(`/api/admin/parking/${selectedCompany._id}?from=${start}&to=${end}`),
                api.get(`/api/admin/parking/pending/${selectedCompany._id}`),
                api.get(`/api/admin/drivers/${selectedCompany._id}?usePagination=false`),
                api.get(`/api/admin/vehicles/${selectedCompany._id}`)
            ]);

            setEntries(historyRes.data || []);
            
            const pending = (pendingRes.data || []).filter(e => e.type === 'parking' && e.status !== 'rejected');
            const rejected = (pendingRes.data || []).filter(e => e.type === 'parking' && e.status === 'rejected');
            
            setPendingEntries(pending);
            setRejectedEntries(rejected);
            setDrivers(driversRes.data.drivers || []);
            setVehicles(vehiclesRes.data.vehicles || []);
        } catch (err) {
            console.error('Failed to fetch parking data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
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
        setSelectedDay('All');
    };

    const handleFileUpload = async (useCamera = false) => {
        try {
            let result;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera access is required.');
                result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return Alert.alert('Permission Denied', 'Gallery access is required.');
                result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                setSubmitting(true);
                
                const filename = localUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                const uploadData = new FormData();
                uploadData.append('file', { uri: localUri, name: filename, type });
                uploadData.append('upload_preset', 'yatreedestination');

                const res = await api.post('/api/admin/upload', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                setFormData({ ...formData, receiptPhoto: res.data.url });
                Alert.alert('Success', 'Image uploaded successfully');
            }
        } catch (err) {
            console.error('Upload failed:', err);
            Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.vehicleId || !formData.amount || (!formData.driverId && !formData.driver)) {
            return Alert.alert('Missing Info', 'Please fill vehicle, driver and amount.');
        }
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                companyId: selectedCompany._id
            };

            if (editingId) {
                await api.put(`/api/admin/parking/${editingId}`, payload);
                Alert.alert('Updated', 'Parking entry updated successfully');
            } else {
                await api.post('/api/admin/parking', payload);
                Alert.alert('Created', 'Parking entry added successfully');
            }

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to save entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Confirm Deletion', 'Are you sure you want to remove this entry?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                await api.delete(`/api/admin/parking/${id}`);
                fetchData();
            }}
        ]);
    };

    const handleApproveReject = async (attendanceId, expenseId, status) => {
        try {
            await api.patch(`/api/admin/attendance/${attendanceId}/expense/${expenseId}`, { status });
            Alert.alert('Success', `Entry ${status === 'approved' ? 'Approved' : 'Rejected'}`);
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Failed to process request');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            vehicleId: '',
            driverId: '',
            driver: '',
            amount: '',
            date: todayIST(),
            receiptPhoto: ''
        });
    };

    const openEdit = (entry) => {
        setEditingId(entry._id);
        setFormData({
            vehicleId: entry.vehicle?._id || '',
            driverId: entry.driverId?._id || '',
            driver: entry.driver || '',
            amount: entry.amount.toString(),
            date: toISTDateString(entry.date),
            receiptPhoto: entry.receiptPhoto || ''
        });
        setShowModal(true);
    };

    const filteredEntries = entries.filter(e => {
        const matchesSearch = (e.vehicle?.carNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (e.driver?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesDriver = filterDriver === 'All' || (e.driverId?._id === filterDriver) || (e.driver === filterDriver);
        
        let matchesDay = true;
        if (selectedDay !== 'All') {
            const entryDate = toISTDateString(e.date);
            const targetDate = toISTDateString(new Date(selectedYear, selectedMonth, parseInt(selectedDay)));
            matchesDay = (entryDate === targetDate);
        }

        return matchesSearch && matchesDriver && matchesDay;
    });

    const totalCost = filteredEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const driverCost = filteredEntries.filter(e => e.source === 'Driver').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const officeCost = filteredEntries.filter(e => e.source === 'Admin').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const ParkingCard = ({ item, isReview = false }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View style={styles.carCircle}>
                        <Car size={18} color="#fbbf24" strokeWidth={2.5} />
                    </View>
                    <View>
                        <Text style={styles.vehicleNum}>{item.vehicle?.carNumber || 'FLEET CAR'}</Text>
                        <Text style={styles.dateLabel}>{formatDateIST(item.date)}</Text>
                    </View>
                </View>
                <View style={styles.amountWrap}>
                    <Text style={styles.amountText}>₹{item.amount}</Text>
                    <View style={[styles.sourcePill, { backgroundColor: item.source === 'Driver' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[styles.sourceText, { color: item.source === 'Driver' ? '#38bdf8' : '#10b981' }]}>
                            {item.source?.toUpperCase() || 'OFFICE'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <User size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.metaText} numberOfLines={1}>{item.driver || 'Staff'}</Text>
                </View>
                <View style={styles.metaItem}>
                    <MapPin size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.metaText} numberOfLines={1}>{item.location || 'Parking Spot'}</Text>
                </View>
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity 
                    style={styles.viewBtn} 
                    onPress={() => {
                        if (item.receiptPhoto) {
                            setSelectedImage(item.receiptPhoto);
                            setShowImageModal(true);
                        } else {
                            Alert.alert('No Receipt', 'No photo attached to this entry.');
                        }
                    }}
                >
                    <Eye size={16} color={item.receiptPhoto ? "#fbbf24" : "rgba(255,255,255,0.2)"} />
                    <Text style={[styles.viewText, item.receiptPhoto && { color: 'rgba(255,255,255,0.7)' }]}>VIEW RECEIPT</Text>
                </TouchableOpacity>
                
                <View style={styles.actionSet}>
                    {isReview ? (
                        <>
                            <TouchableOpacity 
                                style={[styles.circleAction, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]} 
                                onPress={() => handleApproveReject(item.attendanceId, item._id, 'rejected')}
                            >
                                <XCircle size={18} color="#f43f5e" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.circleAction, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                                onPress={() => handleApproveReject(item.attendanceId, item._id, 'approved')}
                            >
                                <CheckCircle size={18} color="#10b981" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.circleAction} onPress={() => openEdit(item)}>
                                <Edit3 size={16} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.circleAction} onPress={() => handleDelete(item._id)}>
                                <Trash2 size={16} color="rgba(244, 63, 94, 0.4)" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.heroWrapper}>
                <View style={styles.heroCard}>
                    <View style={styles.heroHeader}>
                        <View>
                            <Text style={styles.heroLabel}>FLEET SPEND (INR)</Text>
                            <Text style={styles.heroValue}>₹{totalCost.toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity style={styles.heroIconBox} onPress={fetchData}>
                            <Zap size={24} color="#fbbf24" fill="rgba(251, 191, 36, 0.2)" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.heroDivider} />
                    
                    <View style={styles.heroStatsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>DRIVER PAID</Text>
                            <Text style={[styles.statValue, { color: '#38bdf8' }]}>₹{driverCost.toLocaleString()}</Text>
                        </View>
                        <View style={styles.statSep} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>OFFICE PAID</Text>
                            <Text style={[styles.statValue, { color: '#10b981' }]}>₹{officeCost.toLocaleString()}</Text>
                        </View>
                        <View style={styles.statSep} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>PENDING</Text>
                            <Text style={[styles.statValue, { color: '#fbbf24' }]}>{pendingEntries.length}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.tabBar}>
                {[
                    { id: 'fleet', label: 'Operations', icon: Car },
                    { id: 'pending', label: 'Review', icon: Shield, count: pendingEntries.length },
                    { id: 'rejected', label: 'Rejected', icon: XCircle, count: rejectedEntries.length }
                ].map(tab => (
                    <TouchableOpacity 
                        key={tab.id}
                        style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={16} color={activeTab === tab.id ? "#fbbf24" : "rgba(255,255,255,0.4)"} />
                        <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
                        {tab.count > 0 && (
                            <View style={[styles.countBadge, { backgroundColor: tab.id === 'pending' ? '#fbbf24' : '#f43f5e' }]}>
                                <Text style={styles.countText}>{tab.count}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.controlPanel}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Search size={18} color="rgba(255,255,255,0.3)" />
                        <TextInput 
                            placeholder="Search vehicle or driver..." 
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={styles.searchInput}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => Alert.alert('Filter', 'Adv. filtering options')}>
                        <Filter size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {activeTab === 'fleet' && (
                    <View style={styles.pickerRow}>
                        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftMonth(-1)}>
                            <ChevronLeft size={20} color="white" />
                        </TouchableOpacity>
                        <View style={styles.dateCenter}>
                            <Text style={styles.dateMainText}>{months[selectedMonth]} {selectedYear}</Text>
                            <Text style={styles.dateSubText}>{selectedDay === 'All' ? 'FULL MONTH' : `DAY ${selectedDay}`}</Text>
                        </View>
                        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftMonth(1)}>
                            <ChevronRight size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.loaderArea}>
                    <ActivityIndicator size="large" color="#fbbf24" />
                    <Text style={styles.loaderText}>Syncing Fleet Data...</Text>
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'fleet' ? filteredEntries : (activeTab === 'pending' ? pendingEntries : rejectedEntries)}
                    renderItem={({ item }) => <ParkingCard item={item} isReview={activeTab === 'pending'} />}
                    keyExtractor={item => item._id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Info size={40} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyText}>No entries found for this period</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => { resetForm(); setShowModal(true); }}
            >
                <Plus size={32} color="#000" strokeWidth={3} />
            </TouchableOpacity>


            {/* ADD/EDIT MODAL */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{editingId ? 'Modify Entry' : 'Manual Entry'}</Text>
                                <Text style={styles.modalSub}>Parking Logistics Log</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeCircle}>
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.fieldLabel}>VEHICLE SELECTION</Text>
                                <View style={styles.inputWrap}>
                                    <Car size={18} color="rgba(255,255,255,0.3)" />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        {/* Simplified selection for this demo, usually would be a searchable Picker */}
                                        <TextInput 
                                            placeholder="Select Vehicle ID..." 
                                            placeholderTextColor="rgba(255,255,255,0.1)"
                                            style={styles.formInput}
                                            value={formData.vehicleId}
                                            onChangeText={(t) => setFormData({...formData, vehicleId: t})}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.fieldLabel}>ASSIGN DRIVER</Text>
                                <View style={styles.inputWrap}>
                                    <User size={18} color="rgba(255,255,255,0.3)" />
                                    <TextInput 
                                        placeholder="Driver Name or ID..." 
                                        placeholderTextColor="rgba(255,255,255,0.1)"
                                        style={[styles.formInput, { marginLeft: 10, flex: 1 }]}
                                        value={formData.driverId || formData.driver}
                                        onChangeText={(t) => setFormData({...formData, driverId: t, driver: t})}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.fieldLabel}>AMOUNT (₹)</Text>
                                    <View style={styles.inputWrap}>
                                        <IndianRupee size={16} color="#fbbf24" />
                                        <TextInput 
                                            placeholder="0.00" 
                                            placeholderTextColor="rgba(255,255,255,0.1)"
                                            style={[styles.formInput, { marginLeft: 10, flex: 1 }]}
                                            keyboardType="numeric"
                                            value={formData.amount}
                                            onChangeText={(t) => setFormData({...formData, amount: t})}
                                        />
                                    </View>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.fieldLabel}>DATE</Text>
                                    <View style={styles.inputWrap}>
                                        <CalendarIcon size={16} color="rgba(255,255,255,0.3)" />
                                        <TextInput 
                                            placeholder="YYYY-MM-DD" 
                                            placeholderTextColor="rgba(255,255,255,0.1)"
                                            style={[styles.formInput, { marginLeft: 10, flex: 1 }]}
                                            value={formData.date}
                                            onChangeText={(t) => setFormData({...formData, date: t})}
                                        />
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.fieldLabel}>ATTACH RECEIPT</Text>
                            <View style={styles.photoGrid}>
                                <TouchableOpacity style={styles.photoAction} onPress={() => handleFileUpload(true)}>
                                    <Camera size={24} color="#fbbf24" />
                                    <Text style={styles.photoActionText}>SCAN</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.photoAction} onPress={() => handleFileUpload(false)}>
                                    <ImageIcon size={24} color="#fbbf24" />
                                    <Text style={styles.photoActionText}>GALLERY</Text>
                                </TouchableOpacity>
                                
                                {formData.receiptPhoto ? (
                                    <View style={styles.previewBox}>
                                        <Image source={{ uri: formData.receiptPhoto }} style={styles.previewImg} />
                                        <TouchableOpacity 
                                            style={styles.removePhoto}
                                            onPress={() => setFormData({...formData, receiptPhoto: ''})}
                                        >
                                            <X size={12} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Text style={styles.photoPlaceholderText}>NO PHOTO</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <TouchableOpacity 
                            style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.submitBtnText}>{editingId ? 'COMMIT CHANGES' : 'GENERATE ENTRY'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* FULL IMAGE MODAL */}
            <Modal visible={showImageModal} transparent animationType="fade">
                <TouchableOpacity 
                    style={styles.imgModalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowImageModal(false)}
                >
                    <TouchableOpacity style={styles.imgClose} onPress={() => setShowImageModal(false)}>
                        <X size={30} color="white" />
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: selectedImage }} 
                        style={styles.fullImage} 
                        resizeMode="contain" 
                    />
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    heroWrapper: { padding: 20 },
    heroCard: { backgroundColor: '#161B2A', padding: 25, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    heroValue: { color: 'white', fontSize: 32, fontWeight: '950', marginTop: 5 },
    heroIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center' },
    heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statBox: { flex: 1, alignItems: 'center' },
    statSep: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.05)' },
    statLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: '900', marginBottom: 5 },
    statValue: { fontSize: 15, fontWeight: '900' },
    tabBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tabItemActive: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.2)' },
    tabLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    tabLabelActive: { color: '#fbbf24' },
    countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, minWidth: 20, alignItems: 'center' },
    countText: { color: '#000', fontSize: 10, fontWeight: '900' },
    controlPanel: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
    searchRow: { flexDirection: 'row', gap: 10 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', borderRadius: 18, paddingHorizontal: 15, height: 54, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    searchInput: { color: 'white', flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600' },
    filterBtn: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#161B2A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B2A', padding: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    dateArrow: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
    dateCenter: { alignItems: 'center' },
    dateMainText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    dateSubText: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginTop: 2 },
    loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', marginTop: 15 },
    listContent: { padding: 20, paddingTop: 0, paddingBottom: 120 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    carCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(251, 191, 36, 0.05)', justifyContent: 'center', alignItems: 'center' },
    vehicleNum: { color: 'white', fontSize: 18, fontWeight: '950' },
    dateLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 2 },
    amountWrap: { alignItems: 'flex-end' },
    amountText: { color: 'white', fontSize: 22, fontWeight: '950', letterSpacing: -0.5 },
    sourcePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 6 },
    sourceText: { fontSize: 9, fontWeight: '950' },
    metaRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
    metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 20 },
    viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    viewText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    actionSet: { flexDirection: 'row', gap: 10 },
    circleAction: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    fab: { position: 'absolute', bottom: 40, right: 30, width: 72, height: 72, borderRadius: 36, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', elevation: 15, boxShadow: '0 10px 20px rgba(251, 191, 36, 0.4)' },
    emptyWrap: { alignItems: 'center', padding: 100, opacity: 0.5 },
    emptyText: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 15, textAlign: 'center' },
    
    // MODAL STYLES
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.95)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '92%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 35 },
    modalTitle: { color: 'white', fontSize: 28, fontWeight: '950', letterSpacing: -1 },
    modalSub: { color: '#fbbf24', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 5, textTransform: 'uppercase' },
    closeCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    modalForm: { marginBottom: 30 },
    formGroup: { marginBottom: 25 },
    fieldLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D111D', borderRadius: 20, paddingHorizontal: 20, height: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    formInput: { color: 'white', fontSize: 16, fontWeight: '700' },
    row: { flexDirection: 'row' },
    photoGrid: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    photoAction: { width: 70, height: 70, borderRadius: 20, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.15)' },
    photoActionText: { color: '#fbbf24', fontSize: 8, fontWeight: '950' },
    previewBox: { width: 70, height: 70, borderRadius: 20, overflow: 'hidden', position: 'relative' },
    previewImg: { width: '100%', height: '100%' },
    removePhoto: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    photoPlaceholder: { flex: 1, height: 70, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    photoPlaceholderText: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '800' },
    submitBtn: { backgroundColor: '#fbbf24', height: 70, borderRadius: 22, justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 15px rgba(251, 191, 36, 0.3)' },
    submitBtnText: { color: '#000', fontSize: 18, fontWeight: '950', letterSpacing: 0.5 },
    
    // IMG MODAL
    imgModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    imgClose: { position: 'absolute', top: 60, right: 30, zIndex: 10 },
    fullImage: { width: width, height: height * 0.8 },
});

export default ParkingScreen;
