import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { CompanyProvider } from './src/context/CompanyContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
]);

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <CompanyProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </CompanyProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
