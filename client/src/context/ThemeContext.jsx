import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const defaultThemes = [
  { name: 'Amber', primary: '#fbbf24', secondary: '#f59e0b' },
  { name: 'Indigo', primary: '#6366f1', secondary: '#4f46e5' },
  { name: 'Emerald', primary: '#10b981', secondary: '#059669' },
  { name: 'Sky', primary: '#0ea5e9', secondary: '#0284c7' },
  { name: 'Rose', primary: '#f43f5e', secondary: '#e11d48' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#7c3aed' },
  { name: 'Orange', primary: '#f97316', secondary: '#ea580c' },
  { name: 'Cyan', primary: '#06b6d4', secondary: '#0891b2' },
];

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('fleet-theme');
    return savedTheme ? JSON.parse(savedTheme) : defaultThemes[0];
  });

  useEffect(() => {
    // Update CSS Variables at runtime
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-dark', theme.secondary);
    root.style.setProperty('--secondary', theme.primary);
    root.style.setProperty('--accent', theme.primary + 'cc');
    
    // 🥷 NINJA OVERRIDE: Update global styles for hardcoded elements
    const styleId = 'global-theme-overrides';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
      :root {
        --primary: ${theme.primary} !important;
        --primary-dark: ${theme.secondary || theme.primary} !important;
      }
      /* Target specific color applications to avoid matching box-shadow/border in style strings */
      [style*="color: #fbbf24"], [style*="color:#fbbf24"], [style*="color: #f59e0b"] {
        color: ${theme.primary} !important;
      }
      [style*="background: #fbbf24"], [style*="background:#fbbf24"], [style*="background-color: #fbbf24"],
      [style*="background: #f59e0b"], [style*="background: linear-gradient(135deg, #f59e0b"] {
        background: ${theme.primary} !important;
        background-color: ${theme.primary} !important;
      }
      [style*="border: 1px solid #fbbf24"], [style*="border-color: #fbbf24"] {
        border-color: ${theme.primary} !important;
      }
      
      /* Target Lucide Icons & SVG */
      svg[color="#fbbf24"], svg[stroke="#fbbf24"], .lucide-fuel[color="#fbbf24"], .lucide-car[color="#fbbf24"] {
        stroke: ${theme.primary} !important;
        color: ${theme.primary} !important;
      }

      .text-gradient-yellow, .text-gradient-amber, .text-gradient-gold, .theme-gradient-text {
        background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary || theme.primary} 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        display: inline-block !important;
      }
      
      .btn-primary, button[class*="btn-primary"], .primary-btn, .btn-submit {
        background: ${theme.primary} !important;
        color: #000 !important;
        box-shadow: 0 4px 15px ${theme.primary}40 !important;
        border: none !important;
      }
      
      .btn-primary:hover {
        background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary}) !important;
        box-shadow: 0 6px 20px ${theme.primary}60 !important;
      }

      .stat-card:hover, .glass-card-hover-effect:hover {
        border-color: ${theme.primary}50 !important;
        box-shadow: 0 0 25px ${theme.primary}25 !important;
      }

      /* Navigation active states */
      .nav-link.active, .active-nav-item {
        background: ${theme.primary} !important;
        color: #000 !important;
      }
    `;
    
    // Save to local storage
    localStorage.setItem('fleet-theme', JSON.stringify(theme));
  }, [theme]);

  const updateTheme = (newTheme) => setTheme(newTheme);

  const resetTheme = () => setTheme(defaultThemes[0]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, defaultThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};
