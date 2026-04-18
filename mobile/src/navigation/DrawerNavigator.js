import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { 
    LayoutDashboard, Users, ClipboardList, Settings, Wrench, 
    LogOut, Activity, Fuel, ShieldAlert,
    ChevronDown, ChevronUp, Car, Zap, Radio, Briefcase
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

import DashboardScreen from '../screens/DashboardScreen';
import LogBookScreen from '../screens/LogBookScreen';
import DriversScreen from '../screens/DriversScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import FuelScreen from '../screens/FuelScreen';
import FreelancersScreen from '../screens/FreelancersScreen';
import ParkingScreen from '../screens/ParkingScreen';
import OutsideCarsScreen from '../screens/OutsideCarsScreen';
import EventManagementScreen from '../screens/EventManagementScreen';
import StaffScreen from '../screens/StaffScreen';
import ReportsScreen from '../screens/ReportsScreen';
import LiveFeedScreen from '../screens/LiveFeedScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import AdminsScreen from '../screens/AdminsScreen';
import CarUtilityScreen from '../screens/CarUtilityScreen';
import DriverSalariesScreen from '../screens/DriverSalariesScreen';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
    const { user, logout } = useAuth();
    const [expandedGroup, setExpandedGroup] = React.useState(null);

    const toggleGroup = (group) => {
        setExpandedGroup(expandedGroup === group ? null : group);
    };

    const isActive = (routeName) => {
        const state = props.state;
        return state.routes[state.index].name === routeName;
    };

    const renderGroupHeader = (label, Icon, groupName) => (
        <TouchableOpacity 
            style={[styles.groupHeader, expandedGroup === groupName && styles.groupHeaderActive]} 
            onPress={() => toggleGroup(groupName)}
        >
            <View style={styles.groupTitleRow}>
                <Icon size={20} color={expandedGroup === groupName ? '#fbbf24' : 'rgba(255,255,255,0.6)'} />
                <Text style={[styles.groupLabel, expandedGroup === groupName && styles.groupLabelActive]}>{label}</Text>
            </View>
            {expandedGroup === groupName ? (
                <ChevronUp size={16} color="#fbbf24" />
            ) : (
                <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
            )}
        </TouchableOpacity>
    );

    return (
        <DrawerContentScrollView {...props} style={styles.drawerContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.sidebarHeader}>
                <View style={styles.logoCircle}>
                    <Car size={20} color="#fbbf24" />
                </View>
                <Text style={styles.brandText}>Yatree <Text style={{color:'#fbbf24'}}>Destination</Text></Text>
            </View>

            <View style={styles.navSection}>
                <TouchableOpacity 
                    style={[styles.navItem, isActive('Dashboard') && styles.navItemActive]}
                    onPress={() => props.navigation.navigate('Dashboard')}
                >
                    <LayoutDashboard size={20} color={isActive('Dashboard') ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.navText, isActive('Dashboard') && styles.navTextActive]}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.navItem, isActive('LiveFeed') && styles.navItemActive]}
                    onPress={() => props.navigation.navigate('LiveFeed')}
                >
                    <Radio size={20} color={isActive('LiveFeed') ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.navText, isActive('LiveFeed') && styles.navTextActive]}>Live Feed</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.navItem, isActive('LogBook') && styles.navItemActive]}
                    onPress={() => props.navigation.navigate('LogBook')}
                >
                    <ClipboardList size={20} color={isActive('LogBook') ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.navText, isActive('LogBook') && styles.navTextActive]}>Log Book</Text>
                </TouchableOpacity>

                {/* DRIVERS SERVICES */}
                {renderGroupHeader('Drivers Services', Users, 'drivers')}
                {expandedGroup === 'drivers' && (
                    <View style={styles.subItemsBox}>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Drivers')}>
                            <Text style={styles.subItemText}>Drivers Management</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('DriverSalaries')}>
                            <Text style={styles.subItemText}>Driver Salaries</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Freelancers')}>
                            <Text style={styles.subItemText}>Freelancers</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Parking')}>
                            <Text style={styles.subItemText}>Parking Logs</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* FLEET OPERATIONS */}
                {renderGroupHeader('Fleet Operations', Settings, 'fleet')}
                {expandedGroup === 'fleet' && (
                    <View style={styles.subItemsBox}>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Fuel')}>
                            <Text style={styles.subItemText}>Fuel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('CarUtility')}>
                            <Text style={styles.subItemText}>Car Utility</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* VEHICLES MAINTENANCE */}
                {renderGroupHeader('Vehicles Maintenance', Wrench, 'maintenance')}
                {expandedGroup === 'maintenance' && (
                    <View style={styles.subItemsBox}>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Maintenance')}>
                            <Text style={styles.subItemText}>Maintenance</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('LogBook')}>
                            <Text style={styles.subItemText}>Car Logs</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Vehicles')}>
                            <Text style={styles.subItemText}>Vehicles MGT</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* BUY/SELL */}
                {renderGroupHeader('Buy/Sell', Briefcase, 'buysell')}
                {expandedGroup === 'buysell' && (
                    <View style={styles.subItemsBox}>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('OutsideCars')}>
                            <Text style={styles.subItemText}>Outside Cars</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.subItem} onPress={() => props.navigation.navigate('Events')}>
                            <Text style={styles.subItemText}>Event Management</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.navItem, isActive('Staff') && styles.navItemActive]}
                    onPress={() => props.navigation.navigate('Staff')}
                >
                    <Users size={20} color={isActive('Staff') ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.navText, isActive('Staff') && styles.navTextActive]}>Staff Management</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.navItem, isActive('Admins') && styles.navItemActive]}
                    onPress={() => props.navigation.navigate('Admins')}
                >
                    <ShieldAlert size={20} color={isActive('Admins') ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.navText, isActive('Admins') && styles.navTextActive]}>Manage Admins</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sidebarFooter}>
                <View style={styles.profileBox}>
                    <View style={styles.avatarMini}>
                        <Text style={styles.avatarChar}>{user?.name?.charAt(0)}</Text>
                    </View>
                    <View style={{flex:1}}>
                        <Text style={styles.profileName} numberOfLines={1}>{user?.name}</Text>
                        <Text style={styles.profileRole}>{user?.role || 'Admin'}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutAction} onPress={logout}>
                    <LogOut size={18} color="#f43f5e" />
                    <Text style={styles.logoutLabel}>Logout System</Text>
                </TouchableOpacity>
            </View>
        </DrawerContentScrollView>
    );
};

const DrawerNavigator = () => {
    return (
        <Drawer.Navigator 
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerStyle: { 
                    backgroundColor: '#0D111D', 
                    ...Platform.select({
                        web: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
                        default: { elevation: 0, shadowOpacity: 0 }
                    })
                },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: '900', fontSize: 16 },
                drawerStyle: { backgroundColor: '#0D111D', width: 280 }
            }}
        >
            <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ headerTitle: 'DASHBOARD' }} />
            <Drawer.Screen name="LiveFeed" component={LiveFeedScreen} options={{ headerTitle: 'LIVE FEED' }} />
            <Drawer.Screen name="LogBook" component={LogBookScreen} options={{ headerTitle: 'LOG BOOK' }} />
            <Drawer.Screen name="Drivers" component={DriversScreen} options={{ headerTitle: 'DRIVERS' }} />
            <Drawer.Screen name="Freelancers" component={FreelancersScreen} options={{ headerTitle: 'FREELANCERS' }} />
            <Drawer.Screen name="Parking" component={ParkingScreen} options={{ headerTitle: 'PARKING' }} />
            <Drawer.Screen name="Fuel" component={FuelScreen} options={{ headerTitle: 'FUEL' }} />
            <Drawer.Screen name="CarUtility" component={CarUtilityScreen} options={{ headerTitle: 'CAR UTILITY' }} />
            <Drawer.Screen name="Vehicles" component={VehiclesScreen} options={{ headerTitle: 'VEHICLES MGT' }} />
            <Drawer.Screen name="Maintenance" component={MaintenanceScreen} options={{ headerTitle: 'MAINTENANCE' }} />
            <Drawer.Screen name="OutsideCars" component={OutsideCarsScreen} options={{ headerTitle: 'OUTSIDE CARS' }} />
            <Drawer.Screen name="Events" component={EventManagementScreen} options={{ headerTitle: 'EVENT MANAGEMENT' }} />
            <Drawer.Screen name="Staff" component={StaffScreen} options={{ headerTitle: 'STAFF MANAGEMENT' }} />
            <Drawer.Screen name="Admins" component={AdminsScreen} options={{ headerTitle: 'MANAGE ADMINS' }} />
            <Drawer.Screen name="DriverSalaries" component={DriverSalariesScreen} options={{ headerTitle: 'DRIVER SALARIES' }} />
        </Drawer.Navigator>
    );
};

const styles = StyleSheet.create({
    drawerContainer: { backgroundColor: '#0D111D' },
    sidebarHeader: { padding: 25, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    logoCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
    brandText: { color: 'white', fontSize: 18, fontWeight: '950', letterSpacing: -0.5 },
    navSection: { paddingHorizontal: 15 },
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 15, borderRadius: 14, marginBottom: 5 },
    navItemActive: { backgroundColor: '#fbbf24' },
    navText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '800' },
    navTextActive: { color: '#000' },
    groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 15, borderRadius: 14, marginBottom: 5, marginTop: 5 },
    groupHeaderActive: { backgroundColor: 'rgba(251, 191, 36, 0.05)' },
    groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    groupLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '800' },
    groupLabelActive: { color: '#fbbf24' },
    subItemsBox: { backgroundColor: 'rgba(0,0,0,0.15)', marginLeft: 30, borderRadius: 12, marginBottom: 10, paddingVertical: 5 },
    subItem: { paddingVertical: 10, paddingHorizontal: 15 },
    subItemText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
    sidebarFooter: { marginTop: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20, paddingHorizontal: 15, paddingBottom: 40 },
    profileBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
    avatarMini: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fbbf24', justifyContent: 'center', alignItems: 'center' },
    avatarChar: { color: '#000', fontWeight: '900', fontSize: 16 },
    profileName: { color: 'white', fontWeight: '900', fontSize: 14 },
    profileRole: { color: '#fbbf24', fontSize: 10, fontWeight: '800', marginTop: 2 },
    logoutAction: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 15, backgroundColor: 'rgba(244, 63, 94, 0.05)' },
    logoutLabel: { color: '#f43f5e', fontWeight: '900', fontSize: 13 }
});

export default DrawerNavigator;
