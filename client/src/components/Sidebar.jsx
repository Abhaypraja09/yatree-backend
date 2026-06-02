import React, { useState } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Car,
    ClipboardList,
    Settings,
    LogOut,
    ChevronRight,
    Building2,
    ChevronDown,
    ShieldAlert,
    Wrench,
    Fuel,
    Droplets,
    IndianRupee,
    MapPin,
    AlertTriangle,
    ShieldCheck,
    Activity,
    Briefcase,
    FileText,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const NavItem = ({ item, onClick, isSubItem = false }) => {
    const { t } = useLanguage();
    return (
        <NavLink
            to={item.path}
            className="sidebar-nav-item"
            onClick={onClick}
            end={item.path === '/admin'}
            style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: isSubItem ? '10px 14px 10px 44px' : '12px 14px',
                borderRadius: '12px',
                marginBottom: '4px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#000' : '#64748b',
                border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                textDecoration: 'none',
                boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
            })}
        >
            {item.icon && <item.icon size={isSubItem ? 18 : 20} />}
            <span style={{ fontWeight: '600', fontSize: isSubItem ? '14px' : '15px' }}>{t(item.labelKey) || item.label}</span>
        </NavLink>
    );
};

const NavGroup = ({ title, labelKey, icon: Icon, children, isOpen, onToggle }) => {
    const { t } = useLanguage();
    return (
        <div style={{ marginBottom: '6px' }}>
            <button
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isOpen ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                    border: 'none',
                    color: isOpen ? 'white' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={20} />
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{t(labelKey) || title}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    <ChevronDown size={18} />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ paddingTop: '4px' }}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Sidebar = ({ isOpen, onClose }) => {
    const { logout, user } = useAuth();
    const { selectedCompany } = useCompany();
    const { language, setLanguage, t } = useLanguage();
    const { theme } = useTheme();
    const location = useLocation();

    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = userRole === 'admin' || userRole === 'superadmin' || (userRole.includes('admin') && userRole !== 'executive');
    const isPrimary = selectedCompany?.name?.toLowerCase().includes('primary') || selectedCompany?.isPrimary;

    // Group state
    const [openGroups, setOpenGroups] = useState({
        drivers: location.pathname.includes('/admin/drivers') || location.pathname.includes('/admin/freelancers') || location.pathname.includes('/admin/driver-salaries') || location.pathname.includes('/admin/driver-duty') || location.pathname.includes('/admin/freelancer-duty'),
        buysell: location.pathname.includes('/admin/outside-cars') || location.pathname.includes('/admin/event-management'),
        maintenance: location.pathname.includes('/admin/maintenance') || location.pathname.includes('/admin/vehicle-month-details') || location.pathname.includes('/admin/vehicles') || location.pathname.includes('/admin/accident-logs') || location.pathname.includes('/admin/warranties'),
        vehicles: location.pathname.includes('/admin/fuel') || location.pathname.includes('/admin/border-tax') || location.pathname.includes('/admin/fastag') || location.pathname.includes('/admin/parking') || location.pathname.includes('/admin/driver-services') || location.pathname.includes('/admin/border-tax') || location.pathname.includes('/admin/fastag') || location.pathname.includes('/admin/accident-logs') || location.pathname.includes('/admin/warranties'),
        logbook: location.pathname.includes('/admin/log-book')
    });

    const toggleGroup = (group) => {
        setOpenGroups(prev => {
            const isOpening = !prev[group];
            if (isOpening) {
                // If we are opening a group, close all others
                const newState = {};
                Object.keys(prev).forEach(key => {
                    newState[key] = false;
                });
                newState[group] = true;
                return newState;
            } else {
                // If we are closing the current one, just close it
                return { ...prev, [group]: false };
            }
        });
    };

    const logoMap = {
        'Primary': '/logos.png',
        'Fleet': '/logos.png',
        'GoGetGo': '/logos/gogetgo.webp'
    };

    const hasAccess = (moduleKey, subKey = null) => {
        if (isAdmin) return true;
        const perm = user.permissions?.[moduleKey];
        if (perm === undefined) return false;
        if (typeof perm === 'boolean') return perm;
        if (typeof perm === 'object') {
            if (perm.all) return true;
            if (subKey) return !!perm[subKey];
            // For group headers, show if any sub-item is active
            return Object.values(perm).some(v => v);
        }
        return false;
    };

    return (
        <div
            className="sidebar"
            style={{
                width: 'clamp(260px, 80vw, 280px)',
                height: '100vh',
                position: 'fixed',
                left: isOpen ? '0' : '-100%',
                top: 0,
                padding: 'clamp(15px, 5vw, 30px) clamp(10px, 4vw, 20px)',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid rgba(148, 163, 184, 0.1)',
                background: 'linear-gradient(180deg, #0d1526 0%, #0f172a 100%)',
                backdropFilter: 'blur(20px)',
                zIndex: 100000,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isOpen ? '10px 0 50px rgba(0,0,0,0.6)' : 'none'
            }}
        >
            <style>
                {`
                    @media (min-width: 1025px) {
                        .sidebar {
                            left: 0 !important;
                            box-shadow: none !important;
                        }
                    }
                    @media (max-width: 380px) {
                        .sidebar h1 { font-size: 20px !important; }
                        .sidebar p { font-size: 9px !important; }
                        .sidebar-nav-item span { font-size: 13px !important; }
                    }
                    .sidebar-nav-scroll::-webkit-scrollbar { width: 4px; }
                    .sidebar-nav-scroll::-webkit-scrollbar-track { background: transparent; }
                    .sidebar-nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
                `}
            </style>

            <div style={{ marginBottom: '35px', padding: '0 10px' }}>
                <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                            opacity: 1,
                            x: 0,
                            borderColor: [theme.primary, `${theme.primary}40`, theme.primary],
                            boxShadow: [
                                `0 0 0px ${theme.primary}00`,
                                `0 0 15px ${theme.primary}60`,
                                `0 0 0px ${theme.primary}00`
                            ]
                        }}
                        transition={{
                            opacity: { duration: 0.5 },
                            x: { duration: 0.5 },
                            borderColor: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                            boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                        whileHover={{ scale: 1.05 }}
                        style={{
                            width: '48px',
                            height: '48px',
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '6px',
                            flexShrink: 0,
                            border: `2px solid ${theme.primary}`,
                            position: 'relative'
                        }}
                    >
                        <img
                            src="/logos.png"
                            alt="LK"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </motion.div>
                    <div style={{ overflow: 'hidden' }}>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: '950',
                            color: 'white',
                            margin: 0,
                            letterSpacing: '-1.5px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            Log<span style={{ color: theme.primary }}>Karo</span>
                        </h1>
                        <p style={{
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.4)',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            margin: 0
                        }}>
                            Enterprise Fleet
                        </p>
                    </div>
                </Link>
            </div>


            <nav style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="sidebar-nav-scroll">
                {hasAccess('dashboard') && (
                    <>
                        <NavItem item={{ path: '/admin', icon: LayoutDashboard, label: 'Dashboard', labelKey: 'dashboard' }} onClick={onClose} />
                    </>
                )}

                {(hasAccess('liveFeed') || hasAccess('vehiclesManagement')) && (
                    <NavItem item={{ path: '/admin/live-feed', icon: Activity, label: 'Live Feed', labelKey: 'live_feed' }} onClick={onClose} />
                )}

                {(hasAccess('logBook') || hasAccess('vehiclesManagement')) && (
                    <NavItem item={{ path: '/admin/log-book', icon: ClipboardList, label: 'Log Book', labelKey: 'log_book' }} onClick={onClose} />
                )}

                {hasAccess('driversService') && (
                    <NavGroup title="Drivers Services" labelKey="drivers_services" icon={Users} isOpen={openGroups.drivers} onToggle={() => toggleGroup('drivers')}>
                        {hasAccess('driversService', 'drivers') && <NavItem item={{ path: '/admin/drivers-panel', label: 'Drivers', labelKey: 'drivers' }} onClick={onClose} isSubItem />}

                        {hasAccess('driversService', 'freelancers') && <NavItem item={{ path: '/admin/freelancers', label: 'Freelancers', labelKey: 'freelancers' }} onClick={onClose} isSubItem />}
                        {hasAccess('driversService', 'parking') && <NavItem item={{ path: '/admin/parking', label: 'Parking', labelKey: 'parking' }} onClick={onClose} isSubItem />}
                    </NavGroup>
                )}

                {hasAccess('fleetOperations') && (
                    <NavGroup title="Fleet Operations" labelKey="fleet_operations" icon={Settings} isOpen={openGroups.vehicles} onToggle={() => toggleGroup('vehicles')}>
                        {hasAccess('fleetOperations', 'fuel') && <NavItem item={{ path: '/admin/fuel', label: 'Fuel', labelKey: 'fuel' }} onClick={onClose} isSubItem />}
                        {hasAccess('fleetOperations', 'carUtility') && <NavItem item={{ path: '/admin/car-utility', label: 'Car Utility', labelKey: 'car_utility' }} onClick={onClose} isSubItem />}
                    </NavGroup>
                )}
                {hasAccess('vehiclesManagement') && (
                    <NavGroup title="Vehicles Life" labelKey="vehicles_life" icon={Wrench} isOpen={openGroups.maintenance} onToggle={() => toggleGroup('maintenance')}>
                        {hasAccess('vehiclesManagement', 'maintenance') && <NavItem item={{ path: '/admin/maintenance', label: 'Maintenance', labelKey: 'maintenance' }} onClick={onClose} isSubItem />}
                        {hasAccess('vehiclesManagement', 'carLogs') && <NavItem item={{ path: '/admin/vehicle-month-details', label: 'Car Logs', labelKey: 'car_logs' }} onClick={onClose} isSubItem />}
                        {hasAccess('vehiclesManagement', 'vehiclesMgt') && <NavItem item={{ path: '/admin/vehicles', label: 'Vehicles MGT', labelKey: 'vehicles_mgt' }} onClick={onClose} isSubItem />}
                        {hasAccess('vehiclesManagement', 'accidentLogs') && <NavItem item={{ path: '/admin/accident-logs', label: 'Active Logs', labelKey: 'active_logs' }} onClick={onClose} isSubItem />}
                    </NavGroup>
                )}
                {hasAccess('buySell') && (
                    <NavGroup title="Buy/Sell" labelKey="buy_sell" icon={Briefcase} isOpen={openGroups.buysell} onToggle={() => toggleGroup('buysell')}>
                        {hasAccess('buySell', 'outsideCars') && <NavItem item={{ path: '/admin/outside-cars', label: 'Outside Cars', labelKey: 'outside_cars' }} onClick={onClose} isSubItem />}
                        {hasAccess('buySell', 'eventManagement') && <NavItem item={{ path: '/admin/event-management', label: 'Event Management', labelKey: 'event_management' }} onClick={onClose} isSubItem />}
                    </NavGroup>
                )}

                <div style={{ height: '10px' }} />

                {hasAccess('staffManagement') && <NavItem item={{ path: '/admin/staff', icon: Users, label: 'Staff Management', labelKey: 'staff_management' }} onClick={onClose} />}
                {hasAccess('manageAdmins') && <NavItem item={{ path: '/admin/admins', icon: ShieldAlert, label: 'Manage Admins', labelKey: 'manage_admins' }} onClick={onClose} />}
            </nav>

            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                    <>
                        <div style={{ marginBottom: '10px', padding: '0 10px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px' }}>{t('current_profile')}</span>
                        </div>

                        <Link to="/admin/profile" style={{ textDecoration: 'none', display: 'block' }}>
                            <motion.div
                                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.06)' }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '20px',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'background 0.3s ease'
                                }}
                            >
                                {/* Add a subtle highlight */}
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: theme.primary }}></div>

                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '14px',
                                    background: selectedCompany?.logoUrl ? '#FFFFFF' : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#000',
                                    fontWeight: '1000',
                                    fontSize: '20px',
                                    boxShadow: `0 8px 16px ${theme.primary}20`,
                                    overflow: 'hidden',
                                    border: selectedCompany?.logoUrl ? `2px solid ${theme.primary}` : 'none'
                                }}>
                                    {selectedCompany?.logoUrl ? (
                                        <img
                                            src={selectedCompany.logoUrl}
                                            alt="Logo"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerText = user?.name?.charAt(0) || 'A';
                                                e.target.parentElement.style.background = `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`;
                                            }}
                                        />
                                    ) : (
                                        user?.name?.charAt(0) || 'A'
                                    )}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <p style={{ fontSize: '16px', fontWeight: '900', color: 'white', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', letterSpacing: '-0.5px' }}>{user.name}</p>
                                    <p style={{ fontSize: '12px', color: theme.primary, fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.primary }}></span>
                                        {user.role}
                                    </p>
                                </div>
                            </motion.div>
                        </Link>
                    </>
                )}

                <button
                    onClick={logout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        width: '100%',
                        borderRadius: '12px',
                        color: '#f43f5e',
                        background: 'rgba(244, 63, 94, 0.08)',
                        border: '1px solid rgba(244, 63, 94, 0.15)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                    }}
                >
                    <LogOut size={20} />
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{t('logout')}</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
