import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Phone, AlertCircle, ChevronRight, Globe, Shield, User, Landmark, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

const Login = () => {
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { theme } = useTheme();
    const { login } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(mobile, password);

            // 🛡️ MULTI-TENANCY SYNC: Clear old selected company on new login to prevent 403s
            localStorage.removeItem('selectedCompany');

            const role = user.role?.toLowerCase() || '';
            const isAdmin = role === 'admin' || role === 'executive' || role === 'superadmin' || role.includes('admin');

            if (isAdmin) navigate('/admin');
            else if (user.role === 'Staff') navigate('/staff');
            else navigate('/driver');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Invalid credentials';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0D111D',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            <SEO title="Secure Login | Enterprise Fleet Suite" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    maxWidth: '440px',
                    width: '100%',
                    background: '#161B2A',
                    borderRadius: '24px',
                    padding: '40px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    textAlign: 'center'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        style={{
                            width: '120px', height: '120px',
                            background: '#FFFFFF',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: `4px solid ${theme.primary}`,
                            marginBottom: '25px',
                            overflow: 'hidden',
                            boxShadow: `0 10px 40px -10px ${theme.primary}60`,
                            position: 'relative',
                            padding: '10px'
                        }}
                    >
                        <img
                            src="/logos.png"
                            alt="Logo"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />
                        {/* Subtle glow effect */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            boxShadow: `inset 0 0 20px rgba(0,0,0,0.05)`,
                            pointerEvents: 'none'
                        }} />
                    </motion.div>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: '950',
                        color: 'white',
                        margin: '0 0 5px 0',
                        letterSpacing: '-1.5px',
                        textShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        Log <span style={{ color: theme.primary, position: 'relative' }}>
                            Karo
                            <div style={{
                                position: 'absolute',
                                bottom: '5px',
                                left: 0,
                                width: '100%',
                                height: '4px',
                                background: theme.primary,
                                opacity: 0.3,
                                borderRadius: '2px'
                            }} />
                        </span>
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '15px' }}>Access your enterprise fleet console</p>
                </div>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: 'rgba(244, 63, 94, 0.1)',
                                color: '#f43f5e',
                                padding: '12px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: '1px solid rgba(244, 63, 94, 0.2)'
                            }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500' }}>Username or Mobile</label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <input
                                type="text"
                                name="username"
                                id="login-username"
                                autoComplete="username"
                                placeholder="Username or Mobile"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                required
                                style={{
                                    width: '100%', height: '52px', background: '#1c2235',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                                    padding: '0 15px 0 45px', color: 'white', fontSize: '15px', outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                            <input
                                type="password"
                                name="password"
                                id="login-password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', height: '52px', background: '#1c2235',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                                    padding: '0 15px 0 45px', color: 'white', fontSize: '15px', outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            height: '52px',
                            background: theme.primary,
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '1000',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: '0.3s',
                            boxShadow: `0 10px 20px -10px ${theme.primary}80`
                        }}
                    >
                        {isLoading ? <div className="spinner"></div> : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button onClick={() => setLanguage('en')} style={{ background: 'none', border: 'none', color: language === 'en' ? theme.primary : 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>English</button>
                    <button onClick={() => setLanguage('hi')} style={{ background: 'none', border: 'none', color: language === 'hi' ? theme.primary : 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>हिन्दी</button>
                </div>
            </motion.div>

            <style>{`
                .spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    border-top: 3px solid #000;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Login;
