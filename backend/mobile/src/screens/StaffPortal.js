import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Calendar, User, LogOut, ClipboardList, Clock } from 'lucide-react-native';

const StaffPortal = () => {
    const { user, logout } = useAuth();
    const themePrimary = '#fbbf24';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Staff Console</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <LogOut size={20} color="#f43f5e" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Duty Status</Text>
                    <View style={styles.statusRow}>
                        <View style={styles.statusPill}>
                            <Clock size={14} color="#10b981" />
                            <Text style={styles.statusText}>On Duty</Text>
                        </View>
                        <Text style={styles.timeText}>{new Date().toLocaleTimeString()}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.actionItem}>
                    <Calendar size={24} color={themePrimary} />
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Mark Attendance</Text>
                        <Text style={styles.actionDesc}>Punch in your daily presence</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <ClipboardList size={24} color={themePrimary} />
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Task List</Text>
                        <Text style={styles.actionDesc}>View your assigned operations</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D111D' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    greeting: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
    userName: { color: 'white', fontSize: 22, fontWeight: '900' },
    logoutBtn: { padding: 10, backgroundColor: 'rgba(244, 63, 94, 0.1)', borderRadius: 12 },
    content: { padding: 20 },
    infoCard: { backgroundColor: '#161B2A', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    infoTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
    statusText: { color: '#10b981', fontWeight: '800', fontSize: 12 },
    timeText: { color: 'white', fontWeight: '700' },
    actionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B2A', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    actionText: { marginLeft: 15 },
    actionTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
    actionDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', marginTop: 2 }
});

export default StaffPortal;
