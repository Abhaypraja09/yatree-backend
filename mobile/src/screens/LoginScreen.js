import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Lock, Phone, Activity } from 'lucide-react-native';

const LoginScreen = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const themePrimary = '#fbbf24'; // Amber

    const handleLogin = async () => {
        if (!userId || !password) {
            setError('Please enter both ID and password');
            return;
        }

        setError('');
        setIsLoading(true);
        try {
            await login(userId, password);
            // Redirection logic is handled by user state change in navigator
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Invalid credentials';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: themePrimary + '20', borderColor: themePrimary + '40' }]}>
                            <Activity size={40} color={themePrimary} />
                        </View>
                        <Text style={styles.title}>Fleet <Text style={{ color: themePrimary }}>Console</Text></Text>
                        <Text style={styles.subtitle}>Log in to access your secure dashboard</Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username or Mobile</Text>
                            <View style={styles.inputWrapper}>
                                <Phone size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mobile or User ID"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    value={userId}
                                    onChangeText={setUserId}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: themePrimary }]} 
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.buttonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D111D',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#161B2A',
        borderRadius: 24,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        boxShadow: '0px 10px 15px rgba(0,0,0,0.3)',
        elevation: 5,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -1,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 5,
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.2)',
    },
    errorText: {
        color: '#f43f5e',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 8,
        fontWeight: '600',
    },
    inputWrapper: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1c2235',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        height: 52,
    },
    inputIcon: {
        marginLeft: 15,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        color: 'white',
        fontSize: 15,
    },
    button: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        boxShadow: '0px 4px 8px rgba(251, 191, 36, 0.2)',
        elevation: 3,
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
    },
});

export default LoginScreen;
