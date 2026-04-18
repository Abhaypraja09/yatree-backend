import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, RefreshControl,
    ScrollView, Alert, TextInput, Modal, Dimensions
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { 
    Shield, User, Phone, Lock, 
    CheckSquare, Square, Plus, Trash2, 
    Edit3, X, ChevronRight, Key,
    Users, Activity, Wrench, ShieldCheck,
    ArrowUpRight, Mail
} from 'lucide-react-native';
import api from '../api/axios';

const { width } = Dimensions.get('window');

const AdminsScreen = () => {
    const { selectedCompany } = useCompany();
    const [executives, setExecutives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    
    // Form State
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState({
        driversService: false,
        buySell: false,
        vehiclesManagement: false,
        fleetOperations: false,
        staffManagement: false,
        manageAdmins: false,
        reports: true
    });

    const fetchAdmins = async () => {
        try {
            const { data } = await api.get('/api/admin/executives');
            setExecutives(data || []);
        } catch (err) {
            console.error('Failed to fetch admins', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAdmins();
    };

    const togglePermission = (key) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async () => {
        if (!name || !mobile || !username || (!editingId && !password)) {
            return Alert.alert('Error', 'Please fill all required fields');
        }
        try {
            const payload = { name, mobile, username, password: password || undefined, permissions };
            if (editingId) {
                await api.put(`/api/admin/executives/${editingId}`, payload);
                Alert.alert('Success', 'Admin updated');
            } else {
                await api.post('/api/admin/executives', payload);
                Alert.alert('Success', 'Admin created');
            }
            setShowModal(false);
            fetchAdmins();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Process failed');
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Confirm Access Revocation', 'This will immediately terminate their dashboard access. Proceeed?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'REVOKE ACCESS', style: 'destructive', onPress: async () => {
                await api.delete(`/api/admin/executives/${id}`);
                fetchAdmins();
            }}
        ]);
    };

    const AdminCard = ({ item }) => {
        const isSuper = item.permissions?.manageAdmins;
        return (
            <TouchableOpacity style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.userMain}>
                        <View style={styles.avatarGlow}>
                            <View style={[styles.avatarInner, { borderColor: isSuper ? '#fbbf24' : 'rgba(255,255,255,0.1)' }]}>
                                <User size={22} color={isSuper ? '#fbbf24' : 'white'} strokeWidth={2.5} />
                            </View>
                            {isSuper && <View style={styles.crown}><ShieldCheck size={10} color="#000" fill="#fbbf24" /></View>}
                        </View>
                        <View>
                            <Text style={styles.userName}>{item.name}</Text>
                            <View style={styles.badgeRow}>
                                <Text style={styles.userMobile}>{item.mobile}</Text>
                                <View style={styles.dot} />
                                <Text style={styles.handle}>@{item.username}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={() => {
                        setEditingId(item._id);
                        setName(item.name);
                        setMobile(item.mobile);
                        setUsername(item.username);
                        setPermissions(item.permissions || permissions);
                        setShowModal(true);
                    }}>
                        <Edit3 size={18} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.permSection}>
                    <Text style={styles.permLabel}>ACCESS MODULES</Text>
                    <View style={styles.permGrid}>
                        {item.permissions?.fleetOperations && <View style={styles.permPill}><Text style={styles.pillText}>OPERATIONS</Text></View>}
                        {item.permissions?.staffManagement && <View style={styles.permPill}><Text style={styles.pillText}>STAFF</Text></View>}
                        {item.permissions?.vehiclesManagement && <View style={styles.permPill}><Text style={styles.pillText}>FLEET</Text></View>}
                        {item.permissions?.manageAdmins && <View style={[styles.permPill, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}><Text style={[styles.pillText, { color: '#fbbf24' }]}>ROOT</Text></View>}
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.secureRow}>
                        <Key size={12} color="rgba(16, 185, 129, 0.6)" />
                        <Text style={styles.secureText}>ENCRYPTED SESSION ACTIVE</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item._id)}>
                        <Trash2 size={16} color="rgba(244, 63, 94, 0.4)" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSmall}>SECURITY HUB</Text>
                    <Text style={styles.headerLarge}>Manage Admins</Text>
                </View>
                <TouchableOpacity style={styles.shieldBox}>
                    <Shield size={24} color="#fbbf24" fill="rgba(251, 191, 36, 0.1)" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#fbbf24" />
                </View>
            ) : (
                <FlatList
                    data={executives}
                    renderItem={({ item }) => <AdminCard item={item} />}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => {
                setEditingId(null);
                setName(''); setMobile(''); setUsername(''); setPassword('');
                setPermissions({
                    driversService: false, buySell: false,
                    vehiclesManagement: false, fleetOperations: false,
                    staffManagement: false, manageAdmins: false,
                    reports: true
                });
                setShowModal(true);
            }}>
                <Plus size={32} color="#000" />
            </TouchableOpacity>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{editingId ? 'Modify Credentials' : 'Provision Access'}</Text>
                                <Text style={styles.modalSub}>Define operational boundaries</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>FULL LEGAL NAME</Text>
                                <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor="rgba(255,255,255,0.1)" />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>CONTACT MOBILE</Text>
                                <TextInput style={styles.formInput} value={mobile} onChangeText={setMobile} placeholder="+91 00000 00000" keyboardType="numeric" placeholderTextColor="rgba(255,255,255,0.1)" />
                            </View>
                            <View style={styles.rowInputs}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>USERNAME</Text>
                                    <TextInput style={styles.formInput} value={username} onChangeText={setUsername} placeholder="@handle" placeholderTextColor="rgba(255,255,255,0.1)" />
                                </View>
                                {!editingId && (
                                    <View style={[styles.formGroup, { flex: 1, marginLeft: 15 }]}>
                                        <Text style={styles.inputLabel}>SECURITY KEY</Text>
                                        <TextInput style={styles.formInput} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" placeholderTextColor="rgba(255,255,255,0.1)" />
                                    </View>
                                )}
                            </View>

                            <Text style={styles.sectionHeading}>MODULE PERMISSIONS</Text>
                            <View style={styles.permList}>
                                {[
                                    { id: 'fleetOperations', label: 'Operations & Live Feed', icon: Activity },
                                    { id: 'staffManagement', label: 'Payroll & Attendance', icon: Users },
                                    { id: 'vehiclesManagement', label: 'Maintenance & Assets', icon: Wrench },
                                    { id: 'manageAdmins', label: 'Full Root Access', icon: Shield }
                                ].map(mod => (
                                    <TouchableOpacity key={mod.id} style={[styles.permCheck, permissions[mod.id] && styles.permCheckActive]} onPress={() => togglePermission(mod.id)}>
                                        <View style={styles.permIconBox}>
                                            <mod.icon size={18} color={permissions[mod.id] ? '#fbbf24' : 'rgba(255,255,255,0.3)'} />
                                        </View>
                                        <Text style={[styles.permLabelText, permissions[mod.id] && styles.permLabelActive]}>{mod.label}</Text>
                                        <View style={[styles.radio, permissions[mod.id] && styles.radioActive]}>
                                            {permissions[mod.id] && <View style={styles.radioDot} />}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
                            <Text style={styles.saveBtnText}>{editingId ? 'COMMIT CHANGES' : 'ACTIVATE ACCESS'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 25, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerSmall: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerLarge: { color: 'white', fontSize: 32, fontWeight: '950', marginTop: 5, letterSpacing: -1 },
    shieldBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    list: { padding: 25, paddingTop: 0, paddingBottom: 120 },
    card: { backgroundColor: '#161B2A', borderRadius: 32, padding: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    userMain: { flexDirection: 'row', gap: 15, alignItems: 'center', flex: 1 },
    avatarGlow: { position: 'relative' },
    avatarInner: { width: 54, height: 54, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    crown: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#161B2A' },
    userName: { color: 'white', fontSize: 18, fontWeight: '950' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    userMobile: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    handle: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
    editBtn: { padding: 10 },
    permSection: { backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    permLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
    permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    permPill: { backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    pillText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    secureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    secureText: { color: 'rgba(16, 185, 129, 0.6)', fontSize: 10, fontWeight: '900' },
    fab: { position: 'absolute', bottom: 40, right: 30, width: 68, height: 68, borderRadius: 34, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center', elevation: 12, boxShadow: '0 10px 20px rgba(251, 191, 36, 0.4)' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 10, 20, 0.98)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#161B2A', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, height: '90%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 35 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: '950' },
    modalSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', marginTop: 4 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    modalBody: { flex: 1 },
    formGroup: { marginBottom: 25 },
    inputLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
    formInput: { backgroundColor: '#0D111D', borderRadius: 16, padding: 18, color: 'white', fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    rowInputs: { flexDirection: 'row' },
    sectionHeading: { color: 'white', fontSize: 15, fontWeight: '900', marginTop: 10, marginBottom: 20, letterSpacing: 0.5 },
    permList: { gap: 12, marginBottom: 30 },
    permCheck: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, backgroundColor: '#0D111D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    permCheckActive: { borderColor: 'rgba(251, 191, 36, 0.2)', backgroundColor: 'rgba(251, 191, 36, 0.05)' },
    permIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    permLabelText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', flex: 1 },
    permLabelActive: { color: 'white' },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    radioActive: { borderColor: '#fbbf24' },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fbbf24' },
    saveBtn: { backgroundColor: '#fbbf24', padding: 22, borderRadius: 20, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: 'black', fontSize: 16, fontWeight: '950', letterSpacing: 1 },
});

export default AdminsScreen;
