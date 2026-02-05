import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { SimpleModeProvider } from './context/SimpleModeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastContainer } from './components/Toast';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import AdvancedStats from './pages/AdvancedStats';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { toasts, removeToast } = useToast();
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        setCurrentPage(customEvent.detail);
      }
    };
    window.addEventListener('app:navigate', handler);
    return () => window.removeEventListener('app:navigate', handler);
  }, []);

  if (isLoading) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <Login />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions />;
      case 'stats':
        return <AdvancedStats />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <Help />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <FinanceProvider>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
    </FinanceProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SimpleModeProvider>
          <CurrencyProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </CurrencyProvider>
        </SimpleModeProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
