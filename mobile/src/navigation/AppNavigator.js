import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DrawerNavigator from './DrawerNavigator';
import StaffPortal from '../screens/StaffPortal';
import DriverPortal from '../screens/DriverPortal';
import { View, ActivityIndicator } from 'react-native';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0D111D', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#fbbf24" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                <>
                    {user.role === 'Staff' ? (
                        <Stack.Screen name="Home" component={StaffPortal} />
                    ) : user.role === 'Driver' ? (
                        <Stack.Screen name="Home" component={DriverPortal} />
                    ) : (
                        <Stack.Screen name="Home" component={DrawerNavigator} />
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
