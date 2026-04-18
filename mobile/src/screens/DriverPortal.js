import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Truck, LogOut, Wallet, MapPin, Navigation } from 'lucide-react-native';

const DriverPortal = () => {
    const { user, logout } = useAuth();
    const themePrimary = '#fbbf24';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Driver Portal</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <LogOut size={20} color="#f43f5e" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.tripCard}>
                    <Navigation size={32} color={themePrimary} />
                    <Text style={styles.tripTitle}>Active Trip</Text>
                    <Text style={styles.tripInfo}>No active trips at the moment</Text>
                </View>

                <View style={styles.grid}>
                    <TouchableOpacity style={styles.gridCard}>
                        <Wallet size={24} color="#10b981" />
                        <Text style={styles.gridLabel}>My Earnings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridCard}>
                        <Truck size={24} color="#38bdf8" />
                        <Text style={styles.gridLabel}>Car Details</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.locationBtn}>
                    <MapPin size={20} color="white" />
                    <Text style={styles.locationText}>Share Lives Location</Text>
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
    tripCard: { backgroundColor: '#161B2A', padding: 30, borderRadius: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tripTitle: { color: 'white', fontSize: 20, fontWeight: '900', marginTop: 15 },
    tripInfo: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600', marginTop: 5 },
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    gridCard: { width: '48%', backgroundColor: '#161B2A', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    gridLabel: { color: 'white', fontWeight: '800', marginTop: 10, fontSize: 13 },
    locationBtn: { backgroundColor: '#fbbf24', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    locationText: { color: '#000', fontWeight: '900', fontSize: 16 }
});

export default DriverPortal;
