import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { LanguageProvider } from './context/LanguageContext';
// Last Updated: 2026-04-25 12:39 PM - Frontend Sync
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import AIChatAgent from './components/AIChatAgent';
import ThemeSwitcher from './components/common/ThemeSwitcher';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Bridge = lazy(() => import('./pages/Bridge'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DriverPortal = lazy(() => import('./pages/DriverPortal'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Freelancers = lazy(() => import('./pages/Freelancers'));
const FreelancerSalaryDetail = lazy(() => import('./pages/FreelancerSalaryDetail'));
const OutsideCars = lazy(() => import('./pages/OutsideCars'));
const Fastag = lazy(() => import('./pages/Fastag'));
const BorderTax = lazy(() => import('./pages/BorderTax'));
const CarUtility = lazy(() => import('./pages/CarUtility'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Fuel = lazy(() => import('./pages/Fuel'));
const Parking = lazy(() => import('./pages/Parking'));
const Advances = lazy(() => import('./pages/Advances'));
const Admins = lazy(() => import('./pages/Admins'));
const Staff = lazy(() => import('./pages/Staff'));
const StaffPortal = lazy(() => import('./pages/StaffPortal'));
const ActiveLogs = lazy(() => import('./pages/ActiveLogs'));
const DriverSalaries = lazy(() => import('./pages/DriverSalaries'));
const VehicleMonthlyDetails = lazy(() => import('./pages/VehicleMonthlyDetails'));
const LiveFeed = lazy(() => import('./pages/LiveFeed'));
const EventManagement = lazy(() => import('./pages/EventManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const DriverServices = lazy(() => import('./pages/DriverServices'));
const DriversPanel = lazy(() => import('./pages/DriversPanel'));

const LoadingFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at top right, #1e293b, #0f172a)', color: 'white' }}>
    <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#0ea5e9', borderRadius: '50%' }}></div>
    <p style={{ marginTop: '16px', fontWeight: '600', opacity: 0.6 }}>Loading System...</p>
    <style>{`.spinner { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  const userRole = (user.role || '').toString().toLowerCase();
  const isAdminOrExecutive = userRole === 'admin' || userRole === 'executive' || userRole === 'superadmin' || userRole.includes('admin');

  if (role === 'Admin') {
    if (!isAdminOrExecutive) return <Navigate to="/driver" replace />;
  } else if (role === 'Driver') {
    if (user.role !== 'Driver') return <Navigate to="/admin" replace />;
  } else if (role === 'Staff') {
    if (user.role !== 'Staff') return <Navigate to="/admin" replace />;
  }

  return children;
};

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="with-sidebar" style={{ display: 'flex', minHeight: '100vh', position: 'relative', maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className="show-mobile-flex" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: '64px', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 99998, padding: '0 20px', alignItems: 'center', justifyContent: 'space-between', width: '100vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logos/logo.png" alt="Logo" style={{ width: '30px', height: 'auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>
            Log<span style={{ color: 'var(--primary, #0ea5e9)' }}>Karo</span>
          </h2>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="show-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999 }} />
      )}

      <main className="main-content" style={{ flex: '1', width: '100%', maxWidth: '100vw', overflowX: 'hidden', transition: 'padding 0.3s ease', padding: '0' }}>
        <div className="responsive-main-padding" style={{ width: '100%', maxWidth: '100%' }}>
          {children}
        </div>
      </main>
      <AIChatAgent />

      <style>{`
        @media (max-width: 1024px) {
          .responsive-main-padding { padding-top: 84px !important; padding-left: 0 !important; padding-right: 0 !important; }
          .show-mobile-flex { display: flex !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
};

const AdminRoutes = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || (userRole.includes('admin') && userRole !== 'executive');
  const p = user?.permissions || {};

  const canAccess = (key) => {
    if (isAdmin) return true;
    const perm = p[key];
    if (!perm) return false;
    if (typeof perm === 'boolean') return perm;
    if (typeof perm === 'object') {
      return perm.all || Object.values(perm).some(v => v === true);
    }
    return false;
  };

  return (
    <Routes>
      <Route index element={canAccess('dashboard') ? <AdminDashboard /> : <Navigate to="/login" />} />
      <Route path="live-feed" element={canAccess('liveFeed') || canAccess('vehiclesManagement') ? <LiveFeed /> : <Navigate to="/admin" />} />
      <Route path="log-book" element={canAccess('logBook') || canAccess('vehiclesManagement') ? <Reports /> : <Navigate to="/admin" />} />
      {canAccess('driversService') && (
        <>
          <Route path="drivers-panel" element={<DriversPanel />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="advances" element={<Advances />} />
          <Route path="driver-salaries" element={<DriverSalaries />} />
          <Route path="freelancers" element={<Freelancers />} />
          <Route path="freelancers/:driverId" element={<FreelancerSalaryDetail />} />
          <Route path="driver-duty" element={<Reports />} />
          <Route path="freelancer-duty" element={<Reports />} />
          <Route path="parking" element={<Parking />} />
        </>
      )}
      {canAccess('buySell') && (
        <>
          <Route path="outside-cars" element={<OutsideCars />} />
          <Route path="event-management" element={<EventManagement />} />
        </>
      )}
      {canAccess('vehiclesManagement') && (
        <>
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="vehicle-month-details" element={<VehicleMonthlyDetails />} />
          <Route path="accident-logs" element={<ActiveLogs />} />
        </>
      )}
      {canAccess('fleetOperations') && (
        <>
          <Route path="car-utility" element={<CarUtility />} />
          <Route path="driver-services" element={<DriverServices />} />
          <Route path="border-tax" element={<BorderTax />} />
          <Route path="fastag" element={<Fastag />} />
          <Route path="fuel" element={<Fuel />} />
        </>
      )}
      <Route path="admins" element={canAccess('manageAdmins') ? <Admins /> : <Navigate to="/admin" />} />
      <Route path="staff" element={canAccess('staffManagement') ? <Staff /> : <Navigate to="/admin" />} />
      <Route path="/vehicles/*" element={<Vehicles />} />
      <Route path="profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <ThemeSwitcher />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/bridge" element={<Bridge />} />
              <Route path="/admin/*" element={<ProtectedRoute role="Admin"><CompanyProvider><AdminLayout><AdminRoutes /></AdminLayout></CompanyProvider></ProtectedRoute>} />
              <Route path="/driver/*" element={<ProtectedRoute role="Driver"><DriverPortal /></ProtectedRoute>} />
              <Route path="/staff/*" element={<ProtectedRoute role="Staff"><StaffPortal /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
