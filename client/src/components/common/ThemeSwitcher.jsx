import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Settings, X, RotateCcw, Check } from 'lucide-react';

const ThemeSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, updateTheme, resetTheme, defaultThemes } = useTheme();
  const { user } = useAuth();
  
  // State for custom colors
  const [customPrimary, setCustomPrimary] = useState(theme.primary);
  const [customSecondary, setCustomSecondary] = useState(theme.secondary || theme.primary);

  // Only show for non-drivers (Admins/Staff)
  if (user?.role === 'Driver') return null;

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleCustomChange = (type, val) => {
    if (type === 'primary') {
      setCustomPrimary(val);
      updateTheme({ ...theme, primary: val, name: 'Custom' });
    } else {
      setCustomSecondary(val);
      updateTheme({ ...theme, secondary: val, name: 'Custom' });
    }
  };

  return (
    <div className={`theme-switcher-wrapper ${isOpen ? 'open' : ''}`} style={{
      position: 'fixed',
      right: isOpen ? '0' : '-300px',
      top: '20%',
      width: '300px',
      background: '#ffffff', // Background from user screenshot
      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
      borderTopLeftRadius: '12px',
      borderBottomLeftRadius: '12px',
      zIndex: 9999,
      transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* ⚙️ Floating Toggle Button */}
      <button 
        onClick={toggleOpen}
        style={{
          position: 'absolute',
          left: '-45px',
          top: '0',
          width: '45px',
          height: '45px',
          background: '#ffffff',
          border: 'none',
          boxShadow: '-4px 4px 10px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTopLeftRadius: '10px',
          borderBottomLeftRadius: '10px',
          cursor: 'pointer',
          color: '#333'
        }}
      >
        {isOpen ? <X size={20} /> : <Settings className="spin-icon" size={24} />}
      </button>

      {/* 🎨 Header */}
      <div style={{ padding: '15px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
        <h4 style={{ margin: 0, textTransform: 'uppercase', color: '#666', fontSize: '14px', letterSpacing: '1px' }}>
          Select Your Style
        </h4>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Reset Button */}
        <button 
          onClick={resetTheme}
          style={{
            width: '100%',
            padding: '10px',
            background: '#00d0cc', // Brand color from screenshot
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginBottom: '20px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <RotateCcw size={16} /> All Reset
        </button>

        {/* 🌈 Predefined Colors */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', margin: '15px 0' }}>
            ____ Pre Define Colors ____
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '12px',
            padding: '0 5px'
          }}>
            {defaultThemes.map((t) => (
              <div 
                key={t.name}
                onClick={() => {
                  updateTheme(t);
                  setCustomPrimary(t.primary);
                  setCustomSecondary(t.secondary);
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  background: t.primary,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: theme.primary === t.primary ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                {theme.primary === t.primary && <Check size={16} color="white" />}
              </div>
            ))}
          </div>
        </div>

        {/* 🎨 Custom Colors */}
        <div>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', margin: '15px 0' }}>
            ____ Custom Colors ____
          </p>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: 'bold' }}>Primary</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="color" 
                value={customPrimary} 
                onChange={(e) => handleCustomChange('primary', e.target.value)}
                style={{ width: '40px', height: '35px', padding: 0, border: '1px solid #ddd' }}
              />
              <input 
                type="text" 
                value={customPrimary.toUpperCase()} 
                readOnly
                style={{ flex: 1, height: '35px', border: '1px solid #ddd', padding: '0 10px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: 'bold' }}>Secondary</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="color" 
                value={customSecondary} 
                onChange={(e) => handleCustomChange('secondary', e.target.value)}
                style={{ width: '40px', height: '35px', padding: 0, border: '1px solid #ddd' }}
              />
              <input 
                type="text" 
                value={customSecondary?.toUpperCase()} 
                readOnly
                style={{ flex: 1, height: '35px', border: '1px solid #ddd', padding: '0 10px', fontSize: '13px' }}
              />
            </div>
          </div>

          <button 
            onClick={resetTheme}
            style={{
              width: '100%',
              padding: '12px',
              background: '#00d0cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <style>{`
        .spin-icon {
          animation: rotate-gear 4s linear infinite;
        }
        @keyframes rotate-gear {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ThemeSwitcher;
