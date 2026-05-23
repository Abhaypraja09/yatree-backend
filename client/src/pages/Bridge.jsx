import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Bridge = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        const performBridgeLogin = async () => {
            if (!token) {
                setError('No bridge token provided');
                return;
            }

            try {
                if (logout) logout();

                const { data } = await axios.post('/api/auth/bridge-login', { token });

                // Use the existing AuthContext login logic
                localStorage.setItem('userInfo', JSON.stringify(data));

                // Force a page reload or a clean navigate to ensure context refreshes
                window.location.href = '/admin';
            } catch (err) {
                console.error('Bridge Error:', err);
                setError(err.response?.data?.message || 'Bridge authentication failed');
            }
        };

        performBridgeLogin();
    }, [token, logout]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'radial-gradient(circle at top right, #1e293b, #0f172a)',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                padding: '40px',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                {error ? (
                    <>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Access Denied</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>{error}</p>
                        <button onClick={() => navigate('/login')} style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Back to Login</button>
                    </>
                ) : (
                    <>
                        <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 24px' }}></div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Authenticating Bridge...</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Connecting you to the target company dashboard...</p>
                    </>
                )}
            </div>
            <style>{`
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Bridge;
