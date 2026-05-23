import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, ActivityIndicator, RefreshControl, Linking,
    Dimensions, Platform, StatusBar
} from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import {
    Activity, Users, Car, CreditCard, ShieldAlert,
    TrendingUp, Wallet, ArrowUpRight, Clock,
    ChevronRight, Wrench, Fuel, Calendar,
    Droplets, Shield, Bell, CheckCircle,
    AlertCircle, BadgeIndianRupee, Zap,
    LayoutDashboard, MapPin, Search, Star, Target, Layers,
    TriangleAlert
} from 'lucide-react-native';
import api from '../api/axios';
import { formatDateIST } from '../utils/istUtils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const DashboardScreen = ({ navigation }) => {
    const { selectedCompany } = useCompany();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchStats = async () => {
        if (!selectedCompany?._id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const { data } = await api.get(`/api/admin/dashboard/${selectedCompany._id}?month=${selectedMonth}&year=${selectedYear}`);
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch dashboard stats', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5 * 60 * 1000); // Poll every 5 mins like web
        return () => clearInterval(interval);
    }, [selectedCompany, selectedMonth, selectedYear]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const KPI_CARDS = [
        { label: "EXPIRED DOCUMENTS", value: stats?.expiringAlerts?.filter(a => a.daysLeft <= 0).length || 0, icon: ShieldAlert, color: "#f43f5e", route: "Vehicles", isCurrency: false },
        { label: "SPECIAL PAY", value: stats?.monthlySpecialPayTotal, icon: Users, color: "#10b981", route: "Salaries", isCurrency: true },
        { label: "FUEL (MONTHLY)", value: stats?.monthlyFuelAmount, icon: Fuel, color: "#fbbf24", route: "Fuel", isCurrency: true },
        { label: "MAINTENANCE (MONTHLY)", value: stats?.monthlyMaintenanceAmount, icon: Wrench, color: "#f43f5e", route: "Maintenance", isCurrency: true },
        { label: "FREELANCERS (MONTHLY)", value: stats?.monthlyFreelancerSalaryTotal, icon: Zap, color: "#8b5cf6", route: "Freelancers", isCurrency: true },
        { label: "PARKING (MONTHLY)", value: stats?.monthlyParkingAmount, icon: MapPin, color: "#6366f1", route: "Parking", isCurrency: true },
        { label: "OUTSIDE CARS (MONTHLY)", value: stats?.monthlyOutsideCarsTotal, icon: TrendingUp, color: "#8b5cf6", route: "OutsideCars", isCurrency: true },
        { label: "EVENT MANAGEMENT (M)", value: stats?.monthlyEventTotal, icon: Calendar, color: "#ec4899", route: "Events", isCurrency: true },
        { label: "FLEET SIZE", value: stats?.totalInternalVehicles, icon: Car, color: "#8b5cf6", route: "Vehicles", isCurrency: false },
        { label: "FASTAG RECHARGE (MONTHLY)", value: stats?.monthlyFastagTotal, icon: BadgeIndianRupee, color: "#0ea5e9", route: "Fastag", isCurrency: true },
        { label: "DRIVER SERVICES (MONTHLY)", value: stats?.monthlyDriverServicesAmount || 0, icon: Droplets, color: "#fbbf24", isCurrency: true },
    ];

    const AlertCard = ({ alert }) => {
        const isExpired = alert.status === 'Expired' || alert.daysLeft < 0;
        const color = isExpired ? '#f43f5e' : '#fbbf24';

        return (
            <View style={[styles.alertCard]}>
                <View style={[styles.alertStripe, { backgroundColor: color }]} />
                <View style={styles.alertMain}>
                    <View style={styles.alertHeader}>
                        <Text style={styles.alertIdent}>{alert.identifier}</Text>
                        <View style={[styles.daysTag, { backgroundColor: `${color}20` }]}>
                            <Text style={[styles.daysTxt, { color }]}>{alert.daysLeft < 0 ? 'Overdue' : (alert.daysLeft === 0 ? 'Today' : `${alert.daysLeft}d`)}</Text>
                        </View>
                    </View>
                    <Text style={styles.alertDocType}>{alert.documentType}</Text>
                    <Text style={styles.alertExpDate}>Exp: {formatDateIST(alert.expiryDate)}</Text>
                </View>
            </View>
        );
    };

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    if (loading && !stats) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#fbbf24" />
                <Text style={{ color: 'white', marginTop: 20, fontWeight: '800' }}>SYNCHRONIZING FLEET DATA...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Executive Header Segment */}
            <View style={styles.executiveHeader}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.controlCenterBadge}>
                        <Shield size={14} color="#fbbf24" fill="rgba(251, 191, 36, 0.2)" />
                        <Text style={styles.ccText}>FLEET CONTROL CENTER</Text>
                    </View>
                    <TouchableOpacity style={styles.actionCircle} onPress={onRefresh}>
                        <Activity size={18} color="#fbbf24" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.mainTitle}>Executive <Text style={{ color: '#fbbf24' }}>Dashboard</Text></Text>

                <View style={styles.dateControlRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthSelector}>
                        {months.map((m, idx) => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.monthItem, selectedMonth === idx + 1 && styles.monthItemActive]}
                                onPress={() => setSelectedMonth(idx + 1)}
                            >
                                <Text style={[styles.monthText, selectedMonth === idx + 1 && styles.monthTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.yearToggle}
                        onPress={() => setSelectedYear(selectedYear === 2026 ? 2025 : 2026)}
                    >
                        <Text style={styles.yearText}>{selectedYear}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollArea}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
            >
                {/* KPI Grid */}
                <View style={styles.grid}>
                    {KPI_CARDS.map((card, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.kpiCard}
                            onPress={() => card.route && navigation.navigate(card.route)}
                        >
                            <View style={[styles.iconBox, { borderColor: `${card.color}40`, backgroundColor: `${card.color}10` }]}>
                                <card.icon size={20} color={card.color} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.kpiLabel}>{card.label}</Text>
                            <Text style={styles.kpiValue}>
                                {card.isCurrency ? `₹${(card.value || 0).toLocaleString()}` : (card.value || 0)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bottom Alerts Section */}
                <View style={styles.alertsContainer}>
                    <View style={styles.alertsTitleRow}>
                        <View style={styles.warningIcon}>
                            <AlertCircle size={16} color="white" />
                        </View>
                        <Text style={styles.alertsHeading}>CRITICAL COMPLIANCE ALERTS</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsScroll}>
                        {stats?.expiringAlerts?.map((alert, idx) => (
                            <AlertCard key={idx} alert={alert} />
                        ))}
                        {(!stats?.expiringAlerts || stats.expiringAlerts.length === 0) && (
                            <View style={styles.noAlerts}>
                                <CheckCircle size={24} color="#10b981" />
                                <View>
                                    <Text style={styles.noAlertsTitle}>ALL SYSTEMS GREEN</Text>
                                    <Text style={styles.noAlertsText}>Compliance documents verified</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>

                <View style={styles.footerPad} />
            </ScrollView>
        </SafeAreaView>
        );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070A11' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#070A11' },
    executiveHeader: { 
        paddingHorizontal: 25, 
        paddingTop: 15, 
        paddingBottom: 25, 
        backgroundColor: '#0D111D', 
        borderBottomLeftRadius: 35, 
        borderBottomRightRadius: 35,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        zIndex: 10,
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(0,0,0,0.3)' },
            default: {
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            }
        })
    },
    headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    controlCenterBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    ccText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    actionCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    mainTitle: { color: 'white', fontSize: 26, fontWeight: '950', letterSpacing: -0.5 },
    dateControlRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
    monthSelector: { flex: 1 },
    monthItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    monthItemActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    monthText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900' },
    monthTextActive: { color: '#000' },
    yearToggle: { backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
    yearText: { color: '#fbbf24', fontSize: 10, fontWeight: '900' },
    scrollArea: { padding: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    kpiCard: { 
        width: CARD_WIDTH, 
        backgroundColor: '#161B2A', 
        borderRadius: 24, 
        padding: 18, 
        marginBottom: 20, 
        borderWidth: 1.5, 
        borderColor: 'rgba(255,255,255,0.03)',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
            default: {
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            }
        })
    },
    iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1 },
    kpiLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
    kpiValue: { color: 'white', fontSize: 17, fontWeight: '950', letterSpacing: -0.5 },
    alertsContainer: { marginTop: 10, paddingBottom: 20 },
    alertsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, marginLeft: 5 },
    warningIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#f43f5e', justifyContent: 'center', alignItems: 'center' },
    alertsHeading: { color: 'white', fontSize: 13, fontWeight: '950', letterSpacing: -0.2 },
    alertsScroll: { paddingRight: 20 },
    alertCard: { 
        width: 200, 
        height: 140, 
        backgroundColor: '#161B2A', 
        borderRadius: 24, 
        marginRight: 15, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.05)' 
    },
    alertStripe: { height: 4, width: '100%' },
    alertMain: { padding: 18, flex: 1 },
    alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    alertIdent: { color: 'white', fontSize: 15, fontWeight: '900' },
    daysTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    daysTxt: { fontSize: 8, fontWeight: '900' },
    alertDocType: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800' },
    alertExpDate: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 12 },
    noAlerts: { width: width - 40, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 24, padding: 25, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 15, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
    noAlertsTitle: { color: '#10b981', fontWeight: '950', fontSize: 14, letterSpacing: 0.5 },
    noAlertsText: { color: '#10b981', fontWeight: '700', fontSize: 11, opacity: 0.6 },
    footerPad: { height: 120 }
});

export default DashboardScreen;
