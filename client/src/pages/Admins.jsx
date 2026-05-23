import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Plus, Trash2, Shield, User as UserIcon, Lock, Phone, UserCheck, CheckSquare, Square, Settings, Activity, X, Users, Edit3, Wrench, Briefcase, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

const Admins = () => {
    const { theme } = useTheme();
    const [executives, setExecutives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [editingAdmin, setEditingAdmin] = useState(null);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState({
        dashboard: true,
        liveFeed: false,
        logBook: false,
        driversService: { all: false, drivers: false, payroll: false, freelancers: false, parking: false },
        buySell: { all: false, outsideCars: false, eventManagement: false },
        vehiclesManagement: { all: false, maintenance: false, carLogs: false, vehiclesMgt: false, accidentLogs: false },
        fleetOperations: { all: false, fuel: false, carUtility: false },
        staffManagement: false,
        manageAdmins: false,
        reports: true
    });

    const [expandedModule, setExpandedModule] = useState(null);

    const moduleHierarchy = [
        { id: 'dashboard', label: 'Dashboard Access', icon: Activity, color: '#0ea5e9' },
        { id: 'liveFeed', label: 'Live Feed Access', icon: Activity, color: '#ef4444' },
        { id: 'logBook', label: 'Log Book Access', icon: CheckSquare, color: '#eab308' },
        {
            id: 'driversService',
            label: 'Drivers Services',
            icon: Users,
            color: '#38bdf8',
            subItems: [
                { id: 'drivers', label: 'Drivers Panel' },
                { id: 'freelancers', label: 'Freelancers' },
                { id: 'parking', label: 'Parking MGT' }
            ]
        },
        {
            id: 'buySell',
            label: 'Buy/Sell',
            icon: Briefcase,
            color: '#818cf8',
            subItems: [
                { id: 'outsideCars', label: 'Outside Cars' },
                { id: 'eventManagement', label: 'Event Management' }
            ]
        },
        {
            id: 'vehiclesManagement',
            label: 'Vehicles Life',
            icon: Wrench,
            color: 'var(--primary)',
            subItems: [
                { id: 'maintenance', label: 'Maintenance Logs' },
                { id: 'carLogs', label: 'Car Monthly Logs' },
                { id: 'vehiclesMgt', label: 'Vehicle Inventory' },
                { id: 'accidentLogs', label: 'Active Logs' }
            ]
        },
        {
            id: 'fleetOperations',
            label: 'Fleet Operations',
            icon: Activity,
            color: '#ec4899',
            subItems: [
                { id: 'fuel', label: 'Fuel Records' },
                { id: 'carUtility', label: 'Car Utility' }
            ]
        },
        { id: 'staffManagement', label: 'Staff Management', icon: Users, color: '#8b5cf6' },
        { id: 'manageAdmins', label: 'Admin Management', icon: Shield, color: '#10b981' }
    ];

    useEffect(() => {
        fetchExecutives();
    }, []);

    const fetchExecutives = async () => {
        setLoading(true);
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.get('/api/admin/executives', {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setExecutives(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (editingAdmin) {
                await axios.put(`/api/admin/executives/${editingAdmin._id}`, {
                    name, mobile, username, password: password || undefined, permissions
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                alert('Admin updated successfully');
            } else {
                await axios.post('/api/admin/executives', {
                    name, mobile, username, password, permissions
                }, {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                alert('Admin created successfully');
            }
            closeModal();
            fetchExecutives();
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing request');
        }
    };

    const handleEdit = (admin) => {
        setEditingAdmin(admin);
        setName(admin.name);
        setMobile(admin.mobile);
        setUsername(admin.username);
        setPassword('');

        // Normalize permissions from DB
        const dbPerms = admin.permissions || {};
        const normalized = {
            dashboard: dbPerms.dashboard ?? true,
            liveFeed: dbPerms.liveFeed ?? true,
            logBook: dbPerms.logBook ?? true,
            driversService: (dbPerms.driversService && typeof dbPerms.driversService === 'object')
                ? { ...dbPerms.driversService, payroll: !!dbPerms.driversService.payroll }
                : { all: !!dbPerms.driversService, drivers: !!dbPerms.driversService, payroll: !!dbPerms.driversService, freelancers: !!dbPerms.driversService, parking: !!dbPerms.driversService },
            buySell: (dbPerms.buySell && typeof dbPerms.buySell === 'object')
                ? dbPerms.buySell
                : { all: !!dbPerms.buySell, outsideCars: !!dbPerms.buySell, eventManagement: !!dbPerms.buySell },
            vehiclesManagement: (dbPerms.vehiclesManagement && typeof dbPerms.vehiclesManagement === 'object')
                ? dbPerms.vehiclesManagement
                : { all: !!dbPerms.vehiclesManagement, maintenance: !!dbPerms.vehiclesManagement, carLogs: !!dbPerms.vehiclesManagement, vehiclesMgt: !!dbPerms.vehiclesManagement, accidentLogs: !!dbPerms.vehiclesManagement },
            fleetOperations: (dbPerms.fleetOperations && typeof dbPerms.fleetOperations === 'object')
                ? dbPerms.fleetOperations
                : { all: !!dbPerms.fleetOperations, fuel: !!dbPerms.fleetOperations, carUtility: !!dbPerms.fleetOperations },
            staffManagement: !!dbPerms.staffManagement,
            manageAdmins: !!dbPerms.manageAdmins,
            reports: dbPerms.reports ?? true
        };
        setPermissions(normalized);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAdmin(null);
        setExpandedModule(null);
        setName(''); setMobile(''); setUsername(''); setPassword('');
        setPermissions({
            dashboard: true,
            liveFeed: false,
            logBook: false,
            driversService: { all: false, drivers: false, payroll: false, freelancers: false, parking: false },
            buySell: { all: false, outsideCars: false, eventManagement: false },
            vehiclesManagement: { all: false, maintenance: false, carLogs: false, vehiclesMgt: false, accidentLogs: false },
            fleetOperations: { all: false, fuel: false, carUtility: false },
            staffManagement: false,
            manageAdmins: false,
            reports: true
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this admin access?')) return;
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            await axios.delete(`/api/admin/executives/${id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            fetchExecutives();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting user');
        }
    };

    const toggleMainPermission = (key) => {
        setPermissions(prev => {
            const val = prev[key];
            if (typeof val === 'object') {
                const newState = !val.all;
                const updatedObj = {};
                Object.keys(val).forEach(k => {
                    updatedObj[k] = newState;
                });
                return { ...prev, [key]: updatedObj };
            }
            return { ...prev, [key]: !prev[key] };
        });
    };

    const toggleSubPermission = (moduleKey, subKey) => {
        setPermissions(prev => {
            const moduleObj = { ...prev[moduleKey] };
            moduleObj[subKey] = !moduleObj[subKey];

            // If all sub-items are checked, check 'all'
            const subItems = Object.keys(moduleObj).filter(k => k !== 'all');
            const allChecked = subItems.every(k => moduleObj[k]);
            moduleObj.all = allChecked;

            return { ...prev, [moduleKey]: moduleObj };
        });
    };

    const isFormModuleActive = (key) => {
        const val = permissions[key];
        if (!val) return false;
        if (typeof val === 'object') return val.all || Object.values(val).some(v => v);
        return !!val;
    };

    const checkAdminAccess = (adminPerms, key) => {
        const val = adminPerms?.[key];
        if (!val) return false;
        if (typeof val === 'object') return val.all || Object.values(val).some(v => v);
        return !!val;
    };

    return (
        <div className="container-fluid" style={{ paddingBottom: '40px' }}>
            <SEO title="Manage Admins" description="Manage limited admin (Executive) access." />

            <header className="flex-resp" style={{
                justifyContent: 'space-between',
                padding: '30px 0',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: 'clamp(40px,10vw,50px)',
                        height: 'clamp(40px,10vw,50px)',
                        background: 'linear-gradient(135deg, white, #f8fafc)',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        flexShrink: 0
                    }}>
                        <UserIcon size={28} color="var(--primary)" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}></div>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>System Access</span>
                        </div>
                        <h1 style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                            Admin <span className="theme-gradient-text">Console</span>
                        </h1>
                    </div>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        height: '52px',
                        padding: '0 25px',
                        borderRadius: '14px',
                        fontWeight: '1000',
                        cursor: 'pointer',
                        background: theme.primary,
                        border: 'none',
                        color: 'black',
                        boxShadow: `0 8px 15px ${theme.primary}40`
                    }}
                >
                    <Plus size={20} /> Create New Access
                </button>
            </header>

            <div className="table-responsive-wrapper">
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '20px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>User Details</th>
                            <th style={{ padding: '20px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Login Identity</th>
                            <th style={{ padding: '20px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Modules Access</th>
                            <th style={{ padding: '20px 25px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'right', letterSpacing: '1px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {executives.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', opacity: 0.3 }}>
                                    <Shield size={48} />
                                    <div style={{ fontSize: '16px', fontWeight: '700' }}>No admin accounts found</div>
                                </div>
                            </td></tr>
                        ) : (
                            executives.map((admin) => (
                                <tr key={admin._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s ease' }} className="hover-row">
                                    <td style={{ padding: '18px 25px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(14, 165, 233, 0.05))', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <div style={{ color: 'white', fontWeight: '900', fontSize: '15px' }}>{admin.name}</div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: '700' }}>📞 {admin.mobile}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 25px' }}>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-block' }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '13px' }}>@{admin.username}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 25px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {checkAdminAccess(admin.permissions, 'driversService') && <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '9px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)', textTransform: 'uppercase' }}>Drivers</span>}
                                            {checkAdminAccess(admin.permissions, 'buySell') && <span style={{ background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', fontSize: '9px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(129, 140, 248, 0.15)', textTransform: 'uppercase' }}>Buy/Sell</span>}
                                            {checkAdminAccess(admin.permissions, 'vehiclesManagement') && <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', fontSize: '9px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)', textTransform: 'uppercase' }}>Maintenance</span>}
                                            {checkAdminAccess(admin.permissions, 'fleetOperations') && <span style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontSize: '9px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(236, 72, 153, 0.15)', textTransform: 'uppercase' }}>Operations</span>}
                                            {checkAdminAccess(admin.permissions, 'staffManagement') && <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', fontSize: '9px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(139, 92, 246, 0.15)', textTransform: 'uppercase' }}>Staff MGT</span>}
                                            {checkAdminAccess(admin.permissions, 'manageAdmins') && <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '9px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)', textTransform: 'uppercase' }}>Admin MGT</span>}
                                            {!checkAdminAccess(admin.permissions, 'driversService') && !checkAdminAccess(admin.permissions, 'buySell') && !checkAdminAccess(admin.permissions, 'vehiclesManagement') && !checkAdminAccess(admin.permissions, 'fleetOperations') && !checkAdminAccess(admin.permissions, 'staffManagement') && !checkAdminAccess(admin.permissions, 'manageAdmins') && (
                                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontStyle: 'italic' }}>No modules assigned</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleEdit(admin)}
                                                style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '10px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.1)', cursor: 'pointer', transition: '0.2s' }}
                                                className="btn-hover-scale"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(admin._id)}
                                                style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '10px', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.1)', cursor: 'pointer', transition: '0.2s' }}
                                                className="btn-hover-scale"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="modal-content-wrapper"
                            style={{ maxWidth: '700px', padding: 0 }}
                        >
                            <div style={{ padding: '25px 35px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '22px', margin: 0, fontWeight: '900' }}>{editingAdmin ? 'Update Admin Access' : 'Create New Access'}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: '4px 0 0', letterSpacing: '1px' }}>Permissions & Credentials</p>
                                </div>
                                <button 
                                    onClick={closeModal} 
                                    style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        borderRadius: '50%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '35px' }}>
                                <div className="modal-form-grid" style={{ marginBottom: '20px' }}>
                                    <div className="input-field-group">
                                        <label className="input-label">Full Name</label>
                                        <input className="input-field" value={name} onChange={e => setName(e.target.value)} required placeholder="Admin Name" />
                                    </div>
                                    <div className="input-field-group">
                                        <label className="input-label">Mobile Number</label>
                                        <input className="input-field" value={mobile} onChange={e => setMobile(e.target.value)} required placeholder="10-digit #" />
                                    </div>
                                </div>
                                <div className="input-field-group">
                                    <label className="input-label">System Username</label>
                                    <input
                                        className="input-field"
                                        name="admin-username"
                                        autoComplete="off"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                        placeholder="Unique ID"
                                        style={{ color: 'var(--primary)', fontWeight: '800' }}
                                    />
                                </div>
                                <div className="input-field-group">
                                    <label className="input-label">{editingAdmin ? 'New Password (Optional)' : 'Access Password'}</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        name="admin-password"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required={!editingAdmin}
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                        <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <h3 style={{ color: 'white', fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Assign Modules Access</h3>
                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                                        {moduleHierarchy.map(mod => (
                                            <div key={mod.id} style={{
                                                borderRadius: '20px',
                                                background: 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${isFormModuleActive(mod.id) ? `${mod.color}40` : 'rgba(255,255,255,0.05)'}`,
                                                overflow: 'hidden',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                <div
                                                    onClick={() => mod.subItems ? setExpandedModule(expandedModule === mod.id ? null : mod.id) : toggleMainPermission(mod.id)}
                                                    style={{
                                                        padding: '16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                        background: isFormModuleActive(mod.id) ? `${mod.color}10` : 'transparent'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '10px',
                                                        background: isFormModuleActive(mod.id) ? mod.color : 'rgba(255,255,255,0.05)',
                                                        color: isFormModuleActive(mod.id) ? 'black' : 'rgba(255,255,255,0.3)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {typeof permissions[mod.id] === 'object' ? (
                                                            permissions[mod.id].all ? <CheckSquare size={18} /> : (Object.values(permissions[mod.id]).some(v => v) ? <div style={{ width: '10px', height: '10px', background: 'black', borderRadius: '2px' }} /> : <Square size={18} />)
                                                        ) : (
                                                            permissions[mod.id] ? <CheckSquare size={18} /> : <Square size={18} />
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color: isFormModuleActive(mod.id) ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: '14px' }}>{mod.label}</div>
                                                    </div>
                                                    {mod.subItems && (
                                                        <div style={{ color: 'rgba(255,255,255,0.3)', transition: '0.3s', transform: expandedModule === mod.id ? 'rotate(180deg)' : 'none' }}>
                                                            <ChevronDown size={18} />
                                                        </div>
                                                    )}
                                                </div>

                                                {mod.subItems && (
                                                    <motion.div
                                                        initial={false}
                                                        animate={{ height: expandedModule === mod.id ? 'auto' : 0, opacity: expandedModule === mod.id ? 1 : 0 }}
                                                        style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}
                                                    >
                                                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div
                                                                onClick={() => toggleMainPermission(mod.id)}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', borderRadius: '8px', background: permissions[mod.id].all ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                                                            >
                                                                <div style={{ color: permissions[mod.id].all ? mod.color : 'rgba(255,255,255,0.2)' }}>
                                                                    {permissions[mod.id].all ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                </div>
                                                                <span style={{ fontSize: '12px', color: permissions[mod.id].all ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: '700' }}>FULL ACCESS (ALL PAGES)</span>
                                                            </div>
                                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                                            {mod.subItems.map(sub => (
                                                                <div
                                                                    key={sub.id}
                                                                    onClick={() => toggleSubPermission(mod.id, sub.id)}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', borderRadius: '8px', marginLeft: '10px' }}
                                                                >
                                                                    <div style={{ color: permissions[mod.id][sub.id] ? mod.color : 'rgba(255,255,255,0.2)' }}>
                                                                        {permissions[mod.id][sub.id] ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                    </div>
                                                                    <span style={{ fontSize: '12px', color: permissions[mod.id][sub.id] ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{sub.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button type="button" onClick={closeModal} style={{ flex: 1, padding: '15px', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', fontWeight: '800', cursor: 'pointer', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> BACK
                                    </button>
                                    <button type="submit" className="btn-primary" style={{ flex: 1.5, padding: '15px', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer', height: '54px', fontSize: '15px', boxShadow: '0 8px 20px -6px rgba(14, 165, 233, 0.5)' }}>{editingAdmin ? 'Update Account' : 'Create Access'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Admins;
