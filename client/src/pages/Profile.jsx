import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useCompany } from '../context/CompanyContext';
import axios from '../api/axios';
import { 
    User, Lock, CreditCard, Shield, ChevronRight, CheckCircle2, 
    AlertCircle, CreditCard as CardIcon, Calendar, History, 
    ShieldCheck, Key, Save, Wallet, Receipt, Eye, EyeOff, Sparkles, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { selectedCompany } = useCompany();
    
    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Password State & Visibility
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Real Subscription Data from Backend
    const [subscriptions, setSubscriptions] = useState([]);

    // Brand Assets
    const [brandAssets, setBrandAssets] = useState({ logo: null, signature: null });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const { data } = await axios.get('/api/auth/subscription-history');
            setSubscriptions(data);
        } catch (error) {
            console.error('History fetch failed:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const trimOld = passwordData.oldPassword.trim();
        const trimNew = passwordData.newPassword.trim();
        const trimConfirm = passwordData.confirmPassword.trim();

        if (trimNew !== trimConfirm) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            return;
        }
        
        if (trimNew.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            await axios.post('/api/auth/change-password', {
                oldPassword: trimOld,
                newPassword: trimNew
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setShowOld(false); setShowNew(false); setShowConfirm(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating password' });
        } finally {
            setLoading(false);
        }
    };

    const handleRenewPayment = async () => {
        if (!window.confirm('Renew subscription for 2,500 INR?')) return;
        
        setLoading(true);
        try {
            const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            await axios.post('/api/auth/process-payment', {
                amount: 2500,
                month: monthName,
                paymentMethod: 'Online'
            });
            alert('Success: Payment processed and record updated in production database.');
            fetchHistory();
        } catch (error) {
            alert('Payment failed: ' + (error.response?.data?.message || 'Network error'));
        } finally {
            setLoading(false);
        }
    };

    const handleBrandUpload = async (e) => {
        e.preventDefault();
        if (!selectedCompany?._id) return alert('No company selected.');
        if (!brandAssets.logo && !brandAssets.signature) return alert('Please select a file to upload.');

        setLoading(true);
        try {
            const formData = new FormData();
            if (brandAssets.logo) formData.append('logo', brandAssets.logo);
            if (brandAssets.signature) formData.append('signature', brandAssets.signature);

            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.put(`/api/admin/company/${selectedCompany._id}/brand`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`
                }
            });
            alert('Brand assets updated successfully!');
            window.location.reload();
        } catch (error) {
            alert('Failed to upload brand assets: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <div style={{ padding: '0px', color: 'white', maxWidth: '100vw', overflowX: 'hidden' }}>
            <SEO title="User Profile & Billing" />
            
            {/* Header Section */}
            <header className="premium-header" style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
                padding: '100px 40px 60px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px',
                    background: `radial-gradient(circle, ${theme.primary}15 0%, transparent 70%)`,
                    filter: 'blur(40px)', zIndex: 0
                }} />
                
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '30px', 
                        background: selectedCompany?.logoUrl ? '#FFFFFF' : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        fontSize: '40px', fontWeight: '1000', color: '#000',
                        boxShadow: `0 20px 40px ${theme.primary}30`,
                        overflow: 'hidden',
                        border: selectedCompany?.logoUrl ? `3px solid ${theme.primary}` : 'none'
                    }}>
                        {selectedCompany?.logoUrl ? (
                            <img 
                                src={selectedCompany.logoUrl} 
                                alt="Logo" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} 
                            />
                        ) : (
                            user?.name?.charAt(0) || 'U'
                        )}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>{user.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '8px' }}>
                            <p style={{ color: theme.primary, fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', background: `${theme.primary}10`, padding: '5px 12px', borderRadius: '10px' }}>
                                <Shield size={16} />
                                {user.role} Account
                            </p>
                            <p style={{ color: '#64748b', fontWeight: '700', margin: 0, fontSize: '14px' }}>
                                {selectedCompany?.name}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div style={{ padding: '40px' }}>
                <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }} className="profile-layout">
                    {/* Tabs Navigation */}
                    <div style={{
                        width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px'
                    }} className="profile-tabs">
                        {[
                            { id: 'account', label: 'Account Profile', icon: User },
                            { id: 'security', label: 'Security & Privacy', icon: Lock },
                            { id: 'billing', label: 'Billing & Payments', icon: CreditCard },
                            ...(user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'admin' ? [{ id: 'brand', label: 'Brand Assets', icon: Sparkles }] : [])
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '15px', padding: '18px 25px',
                                    borderRadius: '20px', cursor: 'pointer',
                                    background: activeTab === tab.id ? `${theme.primary}10` : 'rgba(255,255,255,0.02)',
                                    color: activeTab === tab.id ? theme.primary : '#64748b',
                                    fontWeight: '800', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: `1px solid ${activeTab === tab.id ? `${theme.primary}30` : 'rgba(255,255,255,0.05)'}`,
                                    textAlign: 'left'
                                }}
                            >
                                <tab.icon size={22} />
                                <span>{tab.label}</span>
                                {activeTab === tab.id && <ChevronRight size={18} style={{ marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>

                    {/* Content Section */}
                    <div style={{ flex: 1 }}>
                        <AnimatePresence mode="wait">
                            {activeTab === 'account' && (
                                <motion.div
                                    key="account" variants={containerVariants} initial="hidden" animate="visible" exit="hidden"
                                    className="premium-glass" style={{ padding: '40px', borderRadius: '32px' }}
                                >
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <User size={24} style={{ color: theme.primary }} />
                                        Profile Information
                                    </h2>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '30px' }}>
                                        <div>
                                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Full Identity Name</label>
                                            <div className="input-field" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', color: 'white', fontWeight: '800', border: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                                                {user.name || 'Not Provided'}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Global Username</label>
                                            <div className="input-field" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', color: 'white', fontWeight: '700', border: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                                                {user.username || 'System Default'}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Personal Production Mobile</label>
                                            <div className="input-field" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', color: 'white', fontWeight: '700', border: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                                                {user.mobile || 'No Linked Mobile'}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ color: theme.primary, fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Company WhatsApp (Registry)</label>
                                            <div className="input-field" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: `${theme.primary}05`, borderRadius: '16px', color: theme.primary, fontWeight: '900', border: `1px solid ${theme.primary}20`, fontSize: '15px' }}>
                                                {selectedCompany?.whatsappNumber || 'Syncing from SuperAdmin...'}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Account Authority</label>
                                            <div className="input-field" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', color: theme.primary, fontWeight: '900', border: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                                                {user.role?.toUpperCase()}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Registration Status</label>
                                            <div className="input-field" style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', color: user.status === 'active' ? '#10b981' : '#f59e0b', fontWeight: '900', border: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                                                {user.status?.toUpperCase() || 'VERIFIED'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: '40px', padding: '25px', borderRadius: '24px', background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.1)', display: 'flex', gap: '20px' }}>
                                        <ShieldCheck size={40} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '900' }}>Secure Cryptographic Profile</h4>
                                            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: '1.6', fontWeight: '500' }}>
                                                Your administrator profile for <strong>{selectedCompany?.name || 'Your Hub'}</strong> is fully synchronized with the global database. 
                                                Session ID: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{user._id?.substring(0, 12)}...</span>. 
                                                Member since: <span style={{ color: theme.primary, fontWeight: '700' }}>{user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'Production Setup Phase'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'security' && (
                                <motion.div
                                    key="security" variants={containerVariants} initial="hidden" animate="visible" exit="hidden"
                                    className="premium-glass" style={{ padding: '40px', borderRadius: '32px' }}
                                >
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Lock size={24} style={{ color: theme.primary }} />
                                        Change Password
                                    </h2>
                                    
                                    <form onSubmit={handlePasswordChange}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '500px' }}>
                                            <div>
                                                <label style={{ color: '#64748b', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Old Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showOld ? "text" : "password"} required className="input-field"
                                                        value={passwordData.oldPassword}
                                                        onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})}
                                                        placeholder="Enter your current password"
                                                        style={{ paddingRight: '50px' }}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowOld(!showOld)}
                                                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px' }}
                                                    >
                                                        {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ color: '#64748b', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>New Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showNew ? "text" : "password"} required className="input-field"
                                                        value={passwordData.newPassword}
                                                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                                                        placeholder="Minimum 6 characters"
                                                        style={{ paddingRight: '50px' }}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowNew(!showNew)}
                                                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px' }}
                                                    >
                                                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ color: '#64748b', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Confirm New Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showConfirm ? "text" : "password"} required className="input-field"
                                                        value={passwordData.confirmPassword}
                                                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                                        placeholder="Repeat new password"
                                                        style={{ paddingRight: '50px' }}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowConfirm(!showConfirm)}
                                                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '5px' }}
                                                    >
                                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {message.text && (
                                                <div style={{ 
                                                    padding: '15px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px',
                                                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                    color: message.type === 'success' ? '#10b981' : '#f43f5e',
                                                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}`
                                                }}>
                                                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{message.text}</span>
                                                </div>
                                            )}

                                            <button
                                                type="submit" disabled={loading}
                                                className="btn-primary"
                                                style={{ height: '60px', borderRadius: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                            >
                                                {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'black' }}></div> : <><Save size={20} /> Update Password</>}
                                            </button>
                                        </div>
                                    </form>

                                    <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '15px' }}>Enhanced Privacy</h3>
                                        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>
                                            By rotating your password, you ensure all session data and cryptographic handshakes are refreshed. 
                                            Our "SuperAdmin Strict Privacy" protocol means your raw password data is never shared or visible to organizational hierarchy.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'billing' && (
                                <motion.div
                                    key="billing" variants={containerVariants} initial="hidden" animate="visible" exit="hidden"
                                    className="premium-glass" style={{ padding: '40px', borderRadius: '32px' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                                        <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <CreditCard size={24} style={{ color: theme.primary }} />
                                            Billing & Subscription
                                        </h2>
                                        <button 
                                            onClick={handleRenewPayment}
                                            disabled={loading}
                                            className="btn-primary" 
                                            style={{ padding: '12px 25px', borderRadius: '14px', height: 'auto', fontSize: '14px', fontWeight: '800' }}
                                        >
                                            {loading ? 'Processing...' : 'Renew Subscription'}
                                        </button>
                                    </div>

                                    {/* Monthly Payment Gateway UI */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                                        <div style={{ padding: '30px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${theme.primary}15`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Wallet size={24} />
                                                </div>
                                                <div>
                                                    <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '800', margin: 0 }}>CURRENT PLAN</p>
                                                    <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>Business Premium</h3>
                                                </div>
                                            </div>
                                            <h4 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 5px' }}>₹2,500 <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>/ month</span></h4>
                                            <p style={{ color: '#10b981', fontSize: '13px', fontWeight: '700', margin: 0 }}>Status: Active • Auto-renew enabled</p>
                                        </div>
                                        
                                        <div style={{ padding: '30px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', margin: '0 0 15px', textAlign: 'center' }}>Next Payment Due</p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                                                <Calendar size={24} style={{ color: theme.primary }} />
                                                <p style={{ fontSize: '22px', fontWeight: '900', margin: 0 }}>Next 1st of Month</p>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Receipt size={20} style={{ color: theme.primary }} />
                                        Payment History (Production)
                                    </h3>

                                    <div className="custom-table-container">
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                                                    <th style={{ padding: '15px 20px', fontSize: '13px', fontWeight: '800' }}>PERIOD</th>
                                                    <th style={{ padding: '15px 20px', fontSize: '13px', fontWeight: '800' }}>AMOUNT</th>
                                                    <th style={{ padding: '15px 20px', fontSize: '13px', fontWeight: '800' }}>TRANS. DATE</th>
                                                    <th style={{ padding: '15px 20px', fontSize: '13px', fontWeight: '800' }}>STATUS</th>
                                                    <th style={{ padding: '15px 20px', fontSize: '13px', fontWeight: '800' }}>REFERENCE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyLoading ? (
                                                    <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Fetching Billing Data...</td></tr>
                                                ) : subscriptions.length === 0 ? (
                                                    <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No transaction records found.</td></tr>
                                                ) : subscriptions.map(sub => (
                                                    <tr key={sub._id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                                        <td style={{ padding: '20px', borderRadius: '16px 0 0 16px', fontWeight: '700' }}>{sub.month}</td>
                                                        <td style={{ padding: '20px', fontWeight: '800', color: theme.primary }}>₹{sub.amount}</td>
                                                        <td style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>{new Date(sub.paymentDate).toLocaleDateString()}</td>
                                                        <td style={{ padding: '20px' }}>
                                                            <span style={{ 
                                                                padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                                                                background: sub.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                                color: sub.status === 'Paid' ? '#10b981' : '#f43f5e'
                                                            }}>
                                                                {sub.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '20px', borderRadius: '0 16px 16px 0', color: '#64748b', fontSize: '14px', fontFamily: 'monospace' }}>{sub.transactionRef}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'brand' && (
                                <motion.div
                                    key="brand" variants={containerVariants} initial="hidden" animate="visible" exit="hidden"
                                    className="premium-glass" style={{ padding: '40px', borderRadius: '32px' }}
                                >
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Sparkles size={24} style={{ color: theme.primary }} />
                                        Organization Brand Assets
                                    </h2>
                                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>
                                        Upload your official company logo and signature. These assets will automatically appear on all generated PDFs, invoices, and reports.
                                    </p>

                                    <form onSubmit={handleBrandUpload}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px' }}>
                                            
                                            {/* Logo Upload */}
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <label style={{ color: 'white', fontSize: '15px', fontWeight: '800', marginBottom: '15px', display: 'block' }}>Company Logo</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                        {brandAssets.logo ? (
                                                            <img src={URL.createObjectURL(brandAssets.logo)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        ) : (
                                                            <img src={selectedCompany?.logoUrl || '/logos/logo.png'} alt="Current Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label htmlFor="logo-upload" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
                                                            <Upload size={16} /> Choose New Logo
                                                        </label>
                                                        <input 
                                                            id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }}
                                                            onChange={e => setBrandAssets({...brandAssets, logo: e.target.files[0]})}
                                                        />
                                                        <p style={{ color: '#64748b', fontSize: '11px', marginTop: '10px' }}>Recommended: Square or horizontal PNG/JPG with transparent background.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Signature Upload */}
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <label style={{ color: 'white', fontSize: '15px', fontWeight: '800', marginBottom: '15px', display: 'block' }}>Official Signature</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <div style={{ width: '120px', height: '60px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '5px' }}>
                                                        {brandAssets.signature ? (
                                                            <img src={URL.createObjectURL(brandAssets.signature)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        ) : (
                                                            <img src={selectedCompany?.ownerSignatureUrl || '/logos/signature.png'} alt="Current Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label htmlFor="sig-upload" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
                                                            <Upload size={16} /> Choose New Signature
                                                        </label>
                                                        <input 
                                                            id="sig-upload" type="file" accept="image/*" style={{ display: 'none' }}
                                                            onChange={e => setBrandAssets({...brandAssets, signature: e.target.files[0]})}
                                                        />
                                                        <p style={{ color: '#64748b', fontSize: '11px', marginTop: '10px' }}>Recommended: Clear PNG with transparent background.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit" disabled={loading || (!brandAssets.logo && !brandAssets.signature)}
                                                className="btn-primary"
                                                style={{ height: '60px', borderRadius: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: (loading || (!brandAssets.logo && !brandAssets.signature)) ? 0.5 : 1 }}
                                            >
                                                {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'black' }}></div> : <><Save size={20} /> Save Brand Assets</>}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <style>{`
                .premium-glass {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .input-field {
                    width: 100%;
                    height: 56px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    padding: 0 20px;
                    color: white;
                    font-size: 15px;
                    transition: all 0.3s ease;
                }
                .input-field:focus {
                    outline: none;
                    border-color: ${theme.primary};
                    background: rgba(255,255,255,0.05);
                    box-shadow: 0 0 20px ${theme.primary}15;
                }
                @media (max-width: 1024px) {
                    .profile-layout { flex-direction: column; gap: 30px; }
                    .profile-tabs { width: 100%; flexDirection: row; overflow-x: auto; padding-bottom: 10px; flex-shrink: 0; }
                    .profile-tabs button { white-space: nowrap; flex: 1; }
                }
            `}</style>
        </div>
    );
};

export default Profile;
