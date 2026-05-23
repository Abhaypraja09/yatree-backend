import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Bot,
    X,
    Send,
    Mic,
    MicOff,
    Sparkles,
    MessageSquare,
    ChevronDown,
    Maximize2,
    RotateCcw,
    AlertTriangle,
    VolumeX
} from 'lucide-react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AIChatAgent = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [shouldBlink, setShouldBlink] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [hasAlertsDetected, setHasAlertsDetected] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const messagesEndRef = useRef(null);
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const playAlertSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.volume = 0.4;
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
    };

    useEffect(() => {
        const checkAlerts = async () => {
            if (!user) return;
            try {
                const userInfoRaw = localStorage.getItem('userInfo');
                if (!userInfoRaw) return;
                const userInfo = JSON.parse(userInfoRaw);
                const { data } = await axios.get('/api/ai/alerts-check', {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                });
                if (data.alertsDetected) {
                    setAlerts(data.alerts || []);
                    setHasAlertsDetected(true);
                } else {
                    setHasAlertsDetected(false);
                }
            } catch (err) {
                console.error("Alerts check error:", err);
            }
        };
        checkAlerts();
    }, [user]);

    useEffect(() => {
        const isDashboard = location.pathname === '/admin' || location.pathname === '/admin/';
        if (isDashboard && hasAlertsDetected) {
            setShouldBlink(true);
            const timer = setTimeout(() => setShouldBlink(false), 25000);
            return () => clearTimeout(timer);
        } else {
            setShouldBlink(false);
        }
    }, [location.pathname, hasAlertsDetected]);

    useEffect(() => {
        const fetchBriefing = async () => {
            if (isOpen && !hasGreeted) {
                setIsTyping(true);
                try {
                    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                    const { data } = await axios.get('/api/ai/briefing', {
                        headers: { Authorization: `Bearer ${userInfo.token}` }
                    });
                    if (data.briefing) {
                        setMessages([{ role: 'ai', content: data.briefing }]);
                        setHasGreeted(true);
                        if (data.alertsDetected) playAlertSound();
                    }
                } catch (err) {
                    console.error("Briefing failed", err);
                    setMessages([{ role: 'ai', content: "Hello! I am your Autonomous Fleet Assistant. How can I assist you today?" }]);
                } finally {
                    setIsTyping(false);
                }
            }
        };
        fetchBriefing();
    }, [isOpen, hasGreeted]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const userMessage = input.trim();
        if (!userMessage) return;

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsTyping(true);

        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.post('/api/ai/analyze', {
                question: userMessage
            }, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
                timeout: 30000
            });

            setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: "I am having trouble analyzing that right now. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole.includes('admin') || userRole === 'executive';

    if (!user || !isAdmin) return null;

    return (
        <div style={{ position: 'fixed', bottom: 'clamp(20px, 5vh, 40px)', right: 'clamp(15px, 4vw, 30px)', zIndex: 9999 }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 100, x: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 100, x: 0 }}
                        style={{
                            width: '420px',
                            maxWidth: '90vw',
                            height: '650px',
                            maxHeight: '80vh',
                            background: '#111',
                            borderRadius: '30px',
                            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '20px',
                            background: 'rgba(17, 17, 17, 0.8)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Bot size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '15px', color: 'white', fontWeight: '800', margin: 0 }}>Autonomous <span style={{ color: '#6366f1' }}>AI</span></h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>Online & Ready</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            background: '#0a0a0a'
                        }} className="custom-scrollbar">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%'
                                    }}
                                >
                                    <div style={{
                                        padding: '14px 18px',
                                        borderRadius: '20px',
                                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                                        borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '20px',
                                        background: msg.role === 'user' ? '#6366f1' : '#1e1e1e',
                                        color: msg.role === 'user' ? 'white' : '#e5e5e5',
                                        fontSize: '14px',
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div style={{ alignSelf: 'flex-start', background: '#1e1e1e', padding: '12px 18px', borderRadius: '20px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '5px', height: '5px', background: '#6366f1', borderRadius: '50%' }} />
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '5px', height: '5px', background: '#6366f1', borderRadius: '50%' }} />
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '5px', height: '5px', background: '#6366f1', borderRadius: '50%' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '20px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <form onSubmit={handleSend} style={{ position: 'relative' }}>
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    style={{
                                        width: '100%',
                                        height: '50px',
                                        background: '#1e1e1e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '15px',
                                        padding: '0 60px 0 20px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isTyping || !input.trim()}
                                    style={{
                                        position: 'absolute',
                                        right: '7px',
                                        top: '7px',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: '#6366f1',
                                        border: 'none',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        opacity: input.trim() ? 1 : 0.5
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            <p style={{ textAlign: 'center', fontSize: '9px', color: '#444', marginTop: '10px', letterSpacing: '1px' }}>AUTONOMOUS FLEET INTELLIGENCE</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Launch Button */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                animate={shouldBlink ? {
                    scale: [1, 1.1, 1],
                    boxShadow: [
                        '0 10px 40px -10px rgba(99, 102, 241, 0.6)',
                        '0 10px 50px -5px rgba(244, 63, 94, 0.9)',
                        '0 10px 40px -10px rgba(99, 102, 241, 0.6)'
                    ]
                } : {}}
                transition={shouldBlink ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setShouldBlink(false);
                }}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '22px',
                    background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                    boxShadow: '0 10px 40px -10px rgba(99, 102, 241, 0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative'
                }}
            >
                <Bot size={32} />
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    padding: '4px 8px',
                    background: shouldBlink ? '#f43f5e' : '#6366f1',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '900',
                    border: '2px solid #0f172a'
                }}>AI</div>
            </motion.button>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default AIChatAgent;
