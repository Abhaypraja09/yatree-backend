import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
)

// ⚡ Register Service Worker for PWA (Installability)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => { /* Service Worker registered silently */ })
            .catch(err => console.log('LogKaro PWA: Service Worker Failed', err));
    });
}
