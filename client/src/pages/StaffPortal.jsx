import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Clock,
    MapPin,
    LogOut,
    User,
    Calendar,
    CheckCircle2,
    Camera,
    RefreshCcw,
    X,
    Check,
    TrendingUp,
    AlertCircle,
    IndianRupee,
    Briefcase,
    Info,
    LayoutDashboard,
    History as HistoryIcon,
    Wallet,
    ShieldCheck,
    Cpu,
    ArrowUpRight,
    Lock,
    ChevronDown,
    ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import {
    formatDateIST,
    formatTimeIST
} from '../utils/istUtils';

const StaffPortal = () => {
    const { user, logout } = useAuth();
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [punching, setPunching] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [report, setReport] = useState(null);
    const [cycles, setCycles] = useState([]);
    const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);

    const [cameraActive, setCameraActive] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [punchType, setPunchType] = useState(null);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);

    const [leaveForm, setLeaveForm] = useState({
        startDate: '',
        endDate: '',
        type: 'Sick Leave',
        reason: ''
    });
    const [submittingLeave, setSubmittingLeave] = useState(false);
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchStatus(),
                fetchHistory(),
                fetchLeaves(),
                fetchCycles()
            ]);
            setLoading(false);
        };
        init();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchCycles = async () => {
        try {
            const { data } = await axios.get('/api/staff/salary-cycles');
            setCycles(data);
            if (data && data.length > 0) {
                setReport(data[selectedCycleIndex]);
            }
        } catch (error) {
            console.error('Error fetching cycles:', error);
        }
    };

    useEffect(() => {
        if (cycles && cycles.length > selectedCycleIndex) {
            setReport(cycles[selectedCycleIndex]);
        }
    }, [selectedCycleIndex, cycles]);

    const fetchLeaves = async () => {
        try {
            const { data } = await axios.get('/api/staff/leaves');
            setLeaves(data);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (!passwordData.oldPassword || !passwordData.newPassword) {
            alert('All password fields are required');
            return;
        }
        setUpdatingPassword(true);
        try {
            await axios.put('/api/staff/update-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            alert('Password updated successfully');
            setPasswordData({ oldPassword: '', newPassword: '' });
            setShowPasswordSection(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Error updating password');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleLeaveRequest = async (e) => {
        e.preventDefault();
        setSubmittingLeave(true);
        try {
            await axios.post('/api/staff/leave', leaveForm);
            alert('Leave request submitted successfully');
            setLeaveForm({ startDate: '', endDate: '', type: 'Sick Leave', reason: '' });
            fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Error submitting leave');
        } finally {
            setSubmittingLeave(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const { data } = await axios.get('/api/staff/status');
            setStatus(data.staff ? data : null);
        } catch (error) {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data } = await axios.get('/api/staff/history');
            setHistory(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const startCamera = async (type) => {
        setPunchType(type);
        setCameraActive(true);
        setCapturedPhoto(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            alert('Could not access camera. Please ensure permissions are granted.');
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleInstantPunch = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedPhoto(dataUrl);
            stopCamera();
            handlePunch(dataUrl);
        }
    };

    const handlePunch = async (photoUrl = capturedPhoto) => {
        if (!photoUrl) return;
        const type = punchType;
        setPunching(true);
        try {
            if (!navigator.geolocation) {
                alert('Geolocation not supported.');
                return;
            }

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000
                });
            });

            const { latitude, longitude } = position.coords;
            let address = `Coordinates: ${latitude}, ${longitude}`;

            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
                const geoData = await geoRes.json();
                if (geoData.display_name) address = geoData.display_name;
            } catch (e) { }

            const endpoint = type === 'in' ? '/api/staff/punch-in' : '/api/staff/punch-out';
            await axios.post(endpoint, {
                latitude,
                longitude,
                address,
                photo: photoUrl
            });

            setCameraActive(false);
            fetchStatus();
            fetchHistory();
        } catch (error) {
            alert(error.response?.data?.message || 'Error processing punch.');
        } finally {
            setPunching(false);
            setCapturedPhoto(null);
        }
    };

    const themeColors = {
        primary: 'var(--primary)',
        secondary: 'var(--primary)',
        success: '#10b981',
        danger: '#f43f5e',
        warning: 'var(--primary)',
        bg: '#050a18',
        surface: 'rgba(15, 23, 42, 0.4)',
        glass: 'rgba(15, 23, 42, 0.7)'
    };

    const attendanceScore = Math.round(((report?.earnedDays || 0) / (report?.totalDaysInCycle || 30)) * 100);

    if (loading) return (
        <div style={{ minHeight: '100vh', background: themeColors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: themeColors.bg,
            color: 'white',
            fontFamily: "'Outfit', sans-serif",
            paddingBottom: '100px',
            overflowX: 'hidden'
        }}>
            <SEO title="Staff Hub" description="Face-recognition attendance and payroll." />

            {/* Background Effects */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: `radial-gradient(circle, ${themeColors.primary}10 0%, transparent 70%)`, filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: `radial-gradient(circle, ${themeColors.secondary}10 0%, transparent 70%)`, filter: 'blur(80px)' }} />
            </div>

            <header style={{
                height: '75px',
                background: 'rgba(5, 10, 24, 0.8)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                position: 'sticky',
                top: 0,
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '18px' }}>
                        {user?.name?.charAt(0)}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>{user?.name}</h2>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{user?.designation || 'Staff'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowPasswordSection(true)}
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', color: themeColors.primary, width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Lock size={18} />
                    </button>
                    <button onClick={logout} style={{ background: 'rgba(244, 63, 94, 0.1)', border: 'none', color: themeColors.danger, width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', position: 'relative', zIndex: 1 }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                            {/* Secure Password Update Area - Priority Location */}

                            {/* Security Modal */}
                            {showPasswordSection && (
                                <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="modal-content glass-card" style={{ maxWidth: '400px', width: '90%', padding: '24px', position: 'relative', background: themeColors.glass }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ padding: '10px', background: `${themeColors.primary}10`, borderRadius: '12px' }}>
                                                    <Lock size={20} color={themeColors.primary} />
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'white' }}>Security Settings</h3>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowPasswordSection(false);
                                                }}
                                                className="modal-close-btn"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '9px', fontWeight: '800', opacity: 0.4, letterSpacing: '1px' }}>CURRENT PASSWORD</label>
                                                <input
                                                    type="password"
                                                    required
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '14px', color: 'white', fontSize: '13px' }}
                                                    value={passwordData.oldPassword}
                                                    onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '9px', fontWeight: '800', opacity: 0.4, letterSpacing: '1px' }}>NEW PASSWORD</label>
                                                <input
                                                    type="password"
                                                    required
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '14px', color: 'white', fontSize: '13px' }}
                                                    value={passwordData.newPassword}
                                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                />
                                            </div>

                                            <button
                                                disabled={updatingPassword}
                                                onClick={handlePasswordUpdate}
                                                style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`, border: 'none', padding: '16px', borderRadius: '16px', color: 'white', fontSize: '13px', fontWeight: '1000', letterSpacing: '1px', cursor: 'pointer', boxShadow: `0 8px 20px ${themeColors.primary}30`, marginTop: '10px' }}
                                            >
                                                {updatingPassword ? 'UPDATING...' : 'CONFIRM CHANGE'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <section style={{
                                background: 'rgba(15, 23, 42, 0.4)',
                                borderRadius: '40px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                padding: '60px 20px',
                                textAlign: 'center',
                                marginBottom: '24px',
                                backdropFilter: 'blur(30px)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Futuristic Decorative Rings */}
                                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '300px', height: '300px', border: `1px dashed ${themeColors.primary}20`, borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: -1 }}></div>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', top: '50%', left: '50%', width: '360px', height: '360px', border: `1px solid ${themeColors.primary}10`, borderRadius: '50%', transform: 'translate(-50%, -50%)', borderTopColor: themeColors.primary, borderBottomColor: themeColors.secondary, zIndex: -1 }}></motion.div>

                                <div style={{ fontSize: '11px', fontWeight: '1000', color: themeColors.primary, letterSpacing: '5px', textTransform: 'uppercase', marginBottom: '40px' }}>SECURE ACCESS TERMINAL</div>

                                <div style={{ marginBottom: '40px' }}>
                                    {status?.onLeave ? (
                                        <div style={{ padding: '24px', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '24px', border: '1px solid rgba(251, 191, 36, 0.2)', color: themeColors.warning, fontWeight: '1000', fontSize: '14px', letterSpacing: '2px' }}>AUTHORIZED ABSENCE</div>
                                    ) : !status?.attendance ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => startCamera('in')}
                                                style={{ width: '120px', height: '120px', borderRadius: '50%', background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`, border: 'none', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: `0 0 50px ${themeColors.primary}50`, cursor: 'pointer', position: 'relative' }}
                                            >
                                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} style={{ position: 'absolute', inset: -15, borderRadius: '50%', border: `1px solid ${themeColors.primary}40` }} />
                                                <ShieldCheck size={48} />
                                            </motion.button>
                                            <div style={{ fontSize: '14px', fontWeight: '1000', color: 'white', letterSpacing: '2px', opacity: 0.8 }}>INITIALIZE PUNCH IN</div>
                                        </div>
                                    ) : status.attendance?.punchOut?.time ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: `2px solid ${themeColors.success}`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: themeColors.success, boxShadow: `0 0 40px ${themeColors.success}30` }}>
                                                <Check size={50} strokeWidth={3} />
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '1000', color: themeColors.success, letterSpacing: '2px' }}>SESSION LOGGED</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => startCamera('out')}
                                                style={{ width: '120px', height: '120px', borderRadius: '50%', background: `linear-gradient(135deg, ${themeColors.danger}, #be123c)`, border: 'none', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: `0 0 50px ${themeColors.danger}50`, cursor: 'pointer', position: 'relative' }}
                                            >
                                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} style={{ position: 'absolute', inset: -15, borderRadius: '50%', border: `1px solid ${themeColors.danger}40` }} />
                                                <LogOut size={48} />
                                            </motion.button>
                                            <div style={{ fontSize: '14px', fontWeight: '1000', color: themeColors.danger, letterSpacing: '2px', opacity: 0.8 }}>TERMINATE SESSION</div>
                                        </div>
                                    )}
                                </div>

                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '1px' }}>{currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</p>
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ background: themeColors.glass, padding: '24px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '10px' }}><Wallet size={16} color={themeColors.primary} opacity={0.3} /></div>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '900', letterSpacing: '1px' }}>PAYOUT</span>
                                    <h3 style={{ fontSize: '26px', margin: '8px 0', fontWeight: '1000', color: 'white' }}>₹{(report?.finalSalary || 0).toLocaleString()}</h3>
                                    <div style={{ fontSize: '9px', color: themeColors.primary, fontWeight: '800' }}>CURRENT CYCLE</div>
                                </div>
                                <div style={{ background: themeColors.glass, padding: '24px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '10px' }}><TrendingUp size={16} color={themeColors.success} opacity={0.3} /></div>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '900', letterSpacing: '1px' }}>RATING</span>
                                    <h3 style={{ fontSize: '26px', margin: '8px 0', fontWeight: '1000', color: 'white' }}>{attendanceScore}%</h3>
                                    <div style={{ fontSize: '9px', color: themeColors.success, fontWeight: '800' }}>ATTENDANCE SCORE</div>
                                </div>
                            </div>

                            {status?.attendance && !status.attendance.punchOut?.time && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: `${themeColors.primary}10`, padding: '20px', borderRadius: '28px', border: `1px solid ${themeColors.primary}30`, display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {status.attendance.punchIn.photo && (
                                        <img src={status.attendance.punchIn.photo} style={{ width: '50px', height: '50px', borderRadius: '15px', objectFit: 'cover' }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '9px', fontWeight: '900', color: themeColors.primary, marginBottom: '2px' }}>ON DUTY SINCE</div>
                                        <div style={{ fontSize: '18px', fontWeight: '1000' }}>{formatTimeIST(status.attendance.punchIn.time)}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <MapPin size={18} color={themeColors.primary} />
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'attendance' && (
                        <motion.div key="attendance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '20px' }}>DUTY HISTORY</h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {history.map(record => (
                                    <div key={record._id} style={{ background: themeColors.glass, padding: '20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '900' }}>{formatDateIST(record.date)}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                    {formatTimeIST(record.punchIn.time)} — {record.punchOut?.time ? formatTimeIST(record.punchOut.time) : 'Active Session'}
                                                </div>
                                            </div>
                                            <div style={{ background: record.status === 'present' ? `${themeColors.success}15` : `${themeColors.danger}15`, color: record.status === 'present' ? themeColors.success : themeColors.danger, padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>
                                                {record.status}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                                            {/* Punch In Details */}
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <span style={{ fontSize: '8px', fontWeight: '900', color: themeColors.primary, display: 'block', marginBottom: '8px' }}>PUNCH IN</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {record.punchIn.photo && (
                                                        <img src={record.punchIn.photo} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                    )}
                                                    <div style={{ fontSize: '12px', fontWeight: '800' }}>{formatTimeIST(record.punchIn.time)}</div>
                                                </div>
                                            </div>

                                            {/* Punch Out Details */}
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <span style={{ fontSize: '8px', fontWeight: '900', color: themeColors.danger, display: 'block', marginBottom: '8px' }}>PUNCH OUT</span>
                                                {record.punchOut?.time ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {record.punchOut.photo && (
                                                            <img src={record.punchOut.photo} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                        )}
                                                        <div style={{ fontSize: '12px', fontWeight: '800' }}>{formatTimeIST(record.punchOut.time)}</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>Pending</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'leaves' && (
                        <motion.div key="leaves" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div style={{ background: themeColors.glass, padding: '24px', borderRadius: '35px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '25px', letterSpacing: '-0.5px' }}>REQUEST LEAVE</h3>
                                <form onSubmit={handleLeaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '800', opacity: 0.4, marginLeft: '5px' }}>FROM DATE</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    id="leave-start-picker"
                                                    type="date"
                                                    required
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', color: 'white', fontWeight: '600', width: '100%' }}
                                                    value={leaveForm.startDate || ''}
                                                    onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                                    onClick={(e) => e.target.showPicker()}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '800', opacity: 0.4, marginLeft: '5px' }}>TO DATE</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    id="leave-end-picker"
                                                    type="date"
                                                    required
                                                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', color: 'white', fontWeight: '600', width: '100%' }}
                                                    value={leaveForm.endDate || ''}
                                                    onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                                    onClick={(e) => e.target.showPicker()}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '800', opacity: 0.4, marginLeft: '5px' }}>CLASSIFICATION</label>
                                        <select style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', color: 'white', fontWeight: '600' }} value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                                            <option value="Sick Leave">Medical Leave</option>
                                            <option value="Casual Leave">Casual Leave</option>
                                            <option value="Emergency">Urgent Emergency</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '800', opacity: 0.4, marginLeft: '5px' }}>REASON / JUSTIFICATION</label>
                                        <textarea placeholder="Tell us more about your application..." style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', color: 'white', minHeight: '100px', fontWeight: '600' }} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                                    </div>
                                    <button type="submit" disabled={submittingLeave} style={{ padding: '20px', background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`, border: 'none', borderRadius: '20px', color: 'white', fontWeight: '1000', fontSize: '16px', cursor: 'pointer', boxShadow: `0 10px 30px ${themeColors.primary}30` }}>
                                        {submittingLeave ? 'TRANSMITTING...' : 'SUBMIT APPLICATION'}
                                    </button>
                                </form>
                            </div>

                            <div style={{ display: 'grid', gap: '15px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '900', opacity: 0.5, marginLeft: '5px' }}>LEAVE STATUS</h4>
                                {leaves.length === 0 ? (
                                    <div style={{ textAlign: 'center', opacity: 0.3, padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>No previous applications</div>
                                ) : leaves.map(l => (
                                    <div key={l._id} style={{ background: themeColors.glass, padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '900' }}>{l.type}</div>
                                            <div style={{ fontSize: '10px', opacity: 0.4 }}>{formatDateIST(l.startDate)} — {formatDateIST(l.endDate)}</div>
                                        </div>
                                        <div style={{
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            fontSize: '10px',
                                            fontWeight: '900',
                                            color: l.status === 'Approved' ? themeColors.success : l.status === 'Rejected' ? themeColors.danger : themeColors.warning,
                                            background: l.status === 'Approved' ? `${themeColors.success}10` : l.status === 'Rejected' ? `${themeColors.danger}10` : `${themeColors.warning}10`
                                        }}>
                                            {l.status.toUpperCase()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'salary' && (
                        <motion.div key="salary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '900' }}>PAYROLL</h3>
                                <select value={selectedCycleIndex} onChange={e => setSelectedCycleIndex(parseInt(e.target.value))} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '10px', color: 'white', fontSize: '12px' }}>
                                    {cycles.map((c, idx) => (
                                        <option key={idx} value={idx}>{c.cycleLabel}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ background: `linear-gradient(135deg, ${themeColors.primary}30, ${themeColors.secondary}30)`, padding: '40px 20px', borderRadius: '35px', textAlign: 'center', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: '800' }}>NET PAYABLE</span>
                                <h2 style={{ fontSize: '48px', fontWeight: '950', margin: '5px 0' }}>₹{(report?.finalSalary || 0).toLocaleString()}</h2>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: themeColors.primary }}>CYCLE: {report?.cycleLabel || 'CURRENT'}</div>
                            </div>
                            <div style={{ background: themeColors.glass, padding: '24px', borderRadius: '24px', display: 'grid', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ opacity: 0.5 }}>Monthly Base Salary</span>
                                    <span style={{ fontWeight: '800' }}>₹{(report?.baseSalary || report?.salary || 0).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ opacity: 0.5 }}>Total Days in Cycle</span>
                                    <span style={{ fontWeight: '800' }}>{report?.totalDaysInCycle || 30} Days</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ opacity: 0.5 }}>Present Days</span>
                                    <span style={{ fontWeight: '800', color: themeColors.success }}>{report?.presentDays || 0} Days</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ opacity: 0.5 }}>Approved Leaves (Paid)</span>
                                    <span style={{ fontWeight: '800', color: themeColors.primary }}>{report?.approvedLeaveDays || 0} Days</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ opacity: 0.5 }}>Earned Sundays (Paid)</span>
                                    <span style={{ fontWeight: '800', color: '#10b981' }}>{report?.paidSundays || 0} Days</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ opacity: 0.5, color: themeColors.danger }}>Unapproved Absences</span>
                                    <span style={{ fontWeight: '800', color: themeColors.danger }}>{report?.unapprovedAbsences || 0} Days</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', marginTop: '10px' }}>
                                    <span>Total Earned Days</span>
                                    <span style={{ color: themeColors.success }}>{report?.earnedDays || 0} / {report?.totalDaysInCycle || 30}</span>
                                </div>
                                <div style={{ marginTop: '10px', padding: '15px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', lineHeight: '1.5' }}>
                                    <ShieldAlert size={12} style={{ marginRight: '5px', verticalAlign: 'middle', color: themeColors.primary }} />
                                    POLICY: Salary is calculated based on Earned Days (Presents + Approved Leaves + Eligible Sundays). Sundays are paid only if no unapproved absences occurred during the preceding week.
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Smart Navigation */}
            <nav style={{
                position: 'fixed',
                bottom: '24px',
                left: '20px',
                right: '20px',
                height: '70px',
                background: 'rgba(5, 10, 24, 0.9)',
                backdropFilter: 'blur(30px)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                zIndex: 1000
            }}>
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'HUB' },
                    { id: 'attendance', icon: HistoryIcon, label: 'LOGS' },
                    { id: 'leaves', icon: Calendar, label: 'LEAVE' },
                    { id: 'salary', icon: Wallet, label: 'PAY' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeTab === tab.id ? themeColors.primary : 'rgba(255,255,255,0.3)',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        <span style={{ fontSize: '9px', fontWeight: '900' }}>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <AnimatePresence>
                {cameraActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>FACE BIOMETRIC</h3>
                                <span style={{ fontSize: '9px', color: themeColors.primary }}>POSITION FACE IN CIRCLE</span>
                            </div>
                            <button onClick={() => { stopCamera(); setCameraActive(false); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ width: '85%', maxWidth: '350px', aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${themeColors.primary}`, position: 'relative' }}>
                                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                                <canvas ref={canvasRef} style={{ display: 'none' }} />
                                {/* Face silhouette guide */}
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
                                    <User size={260} strokeWidth={0.5} />
                                </div>
                                <motion.div
                                    animate={{ y: [-150, 450, -150] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', background: `linear-gradient(to bottom, transparent, ${themeColors.primary}40, transparent)`, borderBottom: `2px solid ${themeColors.primary}`, zIndex: 10 }}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '40px 20px' }}>
                            <button onClick={handleInstantPunch} disabled={punching} style={{ width: '100%', padding: '20px', borderRadius: '20px', background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`, border: 'none', color: 'white', fontWeight: '900' }}>
                                {punching ? 'VERIFYING...' : 'SCAN FACE'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                .spinner {
                    border: 3px solid rgba(14, 165, 233, 0.1);
                    border-radius: 50%;
                    border-top: 3px solid var(--primary);
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
                select { appearance: none; }
                ::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default StaffPortal;
