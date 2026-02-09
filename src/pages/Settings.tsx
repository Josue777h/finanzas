import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { useSimpleMode } from '../context/SimpleModeContext';
import { Bell, Shield, Database, HelpCircle, Download, Trash2, Mail, AlertTriangle, FileText, Send } from 'lucide-react';
import { exportTransactionsToExcel, exportAccountsToExcel, exportFullReportToExcel } from '../utils/exportToExcel';
import { clearCache, deleteAllUserData, deleteCurrentUser, updateUserData } from '../firebase/config';
import { sendMonthlyReport, generateAndDownloadMonthlyReport } from '../utils/monthlyReportService';
import { checkAndSendAlerts } from '../utils/emailService';
import { requestPushPermission } from '../utils/pushService';
import { auth } from '../firebase/config';
import { useCurrency } from '../context/CurrencyContext';

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { transactions, accounts, categories } = useFinance();
  const { isDarkMode } = useTheme();
  const { isSimpleMode, toggleSimpleMode } = useSimpleMode();
  
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    monthlyReport: true,
    pushNotifications: false
  });

  const { currency, setCurrency } = useCurrency();
  
  const [privacy, setPrivacy] = useState({
    dataSharing: false,
    analytics: true
  });
  
  const [storage, setStorage] = useState({
    cloudBackup: true,
    autoSync: true,
    offlineMode: false,
    compressionEnabled: true
  });
  
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [lastReportStatus, setLastReportStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Cargar configuraciones guardadas
  useEffect(() => {
    const savedNotifications = localStorage.getItem(`notifications_${user?.id}`);
    const savedPrivacy = localStorage.getItem(`privacy_${user?.id}`);
    const savedStorage = localStorage.getItem(`storage_${user?.id}`);
    
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));
    if (savedStorage) setStorage(JSON.parse(savedStorage));
  }, [user?.id]);

  // Guardar configuraciones
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
      localStorage.setItem(`privacy_${user.id}`, JSON.stringify(privacy));
      localStorage.setItem(`storage_${user.id}`, JSON.stringify(storage));
    }
  }, [notifications, privacy, storage, user?.id]);

  useEffect(() => {
    if (user?.id) {
      updateUserData(user.id, { preferredCurrency: currency });
    }
  }, [currency, user?.id]);

  const handleExportTransactions = () => {
    exportTransactionsToExcel(transactions, accounts);
  };

  const handleExportAccounts = () => {
    exportAccountsToExcel(accounts, transactions);
  };

  const handleExportFull = () => {
    exportFullReportToExcel(transactions, accounts, categories);
  };

  const handleSendMonthlyReport = async () => {
    if (!user?.email) {
      alert('No se puede enviar el reporte. Email no disponible.');
      return;
    }
    
    setIsSendingReport(true);
    setLastReportStatus('sending');
    
    try {
      const success = await sendMonthlyReport(transactions, accounts, categories, user.email);
      if (success) {
        setLastReportStatus('success');
        setTimeout(() => setLastReportStatus('idle'), 3000);
      } else {
        setLastReportStatus('error');
        alert('No se pudo enviar el reporte. Verifica configuración de SendGrid y Functions.');
        setTimeout(() => setLastReportStatus('idle'), 3000);
      }
    } catch (error) {
      setLastReportStatus('error');
      alert('No se pudo enviar el reporte. Verifica configuración de SendGrid y Functions.');
      setTimeout(() => setLastReportStatus('idle'), 3000);
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleDownloadMonthlyReport = () => {
    generateAndDownloadMonthlyReport(transactions, accounts, categories);
  };

  const handleTestEmailAlerts = async () => {
    if (!user?.email) {
      alert('No se puede enviar alertas. Email no disponible.');
      return;
    }
    
    try {
      await checkAndSendAlerts(transactions, accounts, user.email, notifications);
      alert('✅ Sistema de alertas verificado. Revisa tu email para ver las alertas generadas.');
    } catch (error) {
      alert('❌ Error al verificar alertas. Verifica configuración de SendGrid y Functions.');
    }
  };

  const handleClearCache = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar la caché local? Esto eliminará los datos temporales.')) {
      if (user?.id) {
        clearCache(user.id);
      }
      alert('Caché limpiada exitosamente. Los datos se recargarán desde la nube.');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmStep1 = window.confirm('⚠️ ADVERTENCIA: Esta acción eliminará permanentemente tu cuenta y todos tus datos.');
    if (!confirmStep1) return;
    
    const confirmStep2 = window.confirm('¿Estás ABSOLUTAMENTE seguro? Esta acción no se puede deshacer.');
    if (!confirmStep2) return;
    
    const emailConfirm = prompt('Para confirmar, escribe tu email:');
    if (emailConfirm !== user?.email) {
      alert('El email no coincide. Operación cancelada.');
      return;
    }
    
    try {
      if (!user?.id) {
        alert('No se pudo identificar tu usuario.');
        return;
      }

      // Eliminar datos del usuario en Firestore
      const deleteDataResult = await deleteAllUserData(user.id);
      if (!deleteDataResult.success) {
        alert('No se pudieron eliminar todos los datos. Intenta de nuevo.');
        return;
      }

      // Eliminar usuario de Auth (requiere sesión reciente)
      const deleteUserResult = await deleteCurrentUser();
      if (!deleteUserResult.success) {
        alert('Tus datos se eliminaron, pero no se pudo eliminar el usuario. Vuelve a iniciar sesión e intenta de nuevo.');
      }

      // Limpiar localStorage
      localStorage.removeItem(`accounts_${user.id}`);
      localStorage.removeItem(`transactions_${user.id}`);
      localStorage.removeItem(`categories_${user.id}`);
      localStorage.removeItem(`notifications_${user.id}`);
      localStorage.removeItem(`privacy_${user.id}`);
      localStorage.removeItem(`storage_${user.id}`);

      await logout();
      alert('Tu cuenta y todos tus datos han sido eliminados.');
      window.location.reload();
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      alert('Hubo un error al eliminar tu cuenta. Por favor intenta nuevamente.');
    }
  };

  const handleTestPush = async () => {
    if (!user?.id) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert('No autenticado');
        return;
      }
      const apiBase = process.env.REACT_APP_API_BASE || '';
      const response = await fetch(`${apiBase}/.netlify/functions/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          title: 'FinanzasApp',
          body: 'Notificación de prueba'
        })
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }
      alert('✅ Notificación enviada. Revisa tu navegador.');
    } catch (error) {
      alert('❌ Error enviando push. Verifica VAPID y Functions.');
    }
  };

  const handleDownloadData = () => {
    handleExportFull();
  };

  const handlePrivacyRequest = (type: 'export' | 'delete') => {
    if (type === 'export') {
      handleDownloadData();
    } else {
      handleDeleteAccount();
    }
  };

  const toggleNotification = async (key: keyof typeof notifications) => {
    if (key === 'pushNotifications') {
      if (!user?.id) return;
      const nextValue = !notifications.pushNotifications;
      if (nextValue) {
        const result = await requestPushPermission(user.id);
        if (!result.success) {
          alert(result.error || 'No se pudo activar notificaciones push');
          return;
        }
      }
    }
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrivacy = (key: keyof typeof privacy) => {
    setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStorage = (key: keyof typeof storage) => {
    setStorage(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Ajustes
        </h1>
        <p className={`mt-1 transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Configura tu aplicación y privacidad
        </p>
      </div>

      {/* Experiencia de Uso */}
      <div className={`rounded-2xl shadow-lg border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <HelpCircle className="mr-2" size={20} />
            Experiencia de uso
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Modo simple
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Oculta opciones avanzadas y deja lo esencial
              </p>
            </div>
            <button 
              onClick={toggleSimpleMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isSimpleMode 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isSimpleMode ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className={`rounded-2xl shadow-lg border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Bell className="mr-2" size={20} />
            Notificaciones
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start">
              <Mail className="mr-3 mt-0.5" size={18} />
              <div className="min-w-0">
                <p className={`font-semibold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Alertas por email
                </p>
                <p className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Recibe notificaciones importantes por email
                </p>
              </div>
            </div>
            <button 
              onClick={() => toggleNotification('emailAlerts')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.emailAlerts 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                notifications.emailAlerts ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Notificaciones push
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Alertas instantáneas en el navegador
              </p>
            </div>
            <button 
              onClick={() => toggleNotification('pushNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.pushNotifications 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                notifications.pushNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Reporte mensual
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Resumen financiero mensual automático
              </p>
            </div>
            <button 
              onClick={() => toggleNotification('monthlyReport')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.monthlyReport 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                notifications.monthlyReport ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>

          {/* Acciones de email */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className={`text-sm font-semibold mb-3 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Acciones de Email
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSendMonthlyReport}
                disabled={isSendingReport}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 btn-accent ${
                  isSendingReport
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Send size={16} />
                <span>{isSendingReport ? 'Enviando...' : 'Enviar Reporte Mensual'}</span>
              </button>
              
              <button
                onClick={handleDownloadMonthlyReport}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <FileText size={16} />
                <span>Descargar Reporte Mensual</span>
              </button>
              
              <button
                onClick={handleTestEmailAlerts}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 btn-accent ${
                  isDarkMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <AlertTriangle size={16} />
                <span>Probar Alertas por Email</span>
              </button>

              <button
                onClick={handleTestPush}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <Bell size={16} />
                <span>Probar Notificación Push</span>
              </button>
            </div>
            
            {/* Estado del envío */}
            {lastReportStatus !== 'idle' && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                lastReportStatus === 'success' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : lastReportStatus === 'error'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {lastReportStatus === 'success' && '✅ Reporte enviado exitosamente'}
                {lastReportStatus === 'error' && '❌ Error al enviar el reporte'}
                {lastReportStatus === 'sending' && '📧 Enviando reporte...'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacidad y Seguridad */}
      <div className={`rounded-2xl shadow-lg border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Shield className="mr-2" size={20} />
            Privacidad y Seguridad
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Compartir datos anónimos
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Ayuda a mejorar el servicio con estadísticas anónimas
              </p>
            </div>
            <button 
              onClick={() => togglePrivacy('dataSharing')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.dataSharing 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                privacy.dataSharing ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Analíticas de uso
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Permite mejorar la experiencia del usuario
              </p>
            </div>
            <button 
              onClick={() => togglePrivacy('analytics')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.analytics 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                privacy.analytics ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className={`font-semibold mb-3 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Derechos de Privacidad
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => handlePrivacyRequest('export')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-center">
                <Download className="mr-2" size={16} />
                <span>Descargar todos mis datos</span>
              </div>
            </button>
            
            <button
              onClick={() => handlePrivacyRequest('delete')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-red-900 hover:bg-red-800 text-red-200' 
                  : 'bg-red-50 hover:bg-red-100 text-red-800'
              }`}
            >
              <div className="flex items-center">
                <Trash2 className="mr-2" size={16} />
                <span>Solicitar eliminación de datos</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Moneda y Región */}
      <div className={`rounded-2xl shadow-lg border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Moneda y Región
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className={`text-sm font-semibold mb-2 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Moneda principal
            </p>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            >
              <option value="USD">USD - Dólar estadounidense</option>
              <option value="MXN">MXN - Peso mexicano</option>
              <option value="COP">COP - Peso colombiano</option>
              <option value="ARS">ARS - Peso argentino</option>
              <option value="CLP">CLP - Peso chileno</option>
              <option value="PEN">PEN - Sol peruano</option>
              <option value="EUR">EUR - Euro</option>
              <option value="BRL">BRL - Real brasileño</option>
            </select>
            <p className={`text-xs mt-2 transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Esta moneda se usará por defecto al crear nuevas cuentas.
            </p>
          </div>
        </div>
      </div>

      {/* Almacenamiento */}
      <div className={`rounded-2xl shadow-lg border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Database className="mr-2" size={20} />
            Almacenamiento y Datos
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Respaldo en la nube
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Sincronización automática segura
              </p>
            </div>
            <button 
              onClick={() => toggleStorage('cloudBackup')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                storage.cloudBackup 
                  ? 'bg-green-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                storage.cloudBackup ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Sincronización automática
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Actualización en tiempo real
              </p>
            </div>
            <button 
              onClick={() => toggleStorage('autoSync')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                storage.autoSync 
                  ? 'bg-green-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                storage.autoSync ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className={`font-semibold mb-3 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Exportar Datos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleExportTransactions}
                className={`p-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Download className="inline mr-2" size={16} />
                Transacciones
              </button>
              
              <button
                onClick={handleExportAccounts}
                className={`p-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <Download className="inline mr-2" size={16} />
                Cuentas
              </button>
              
              <button
                onClick={handleExportFull}
                className={`p-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                <Download className="inline mr-2" size={16} />
                Reporte Completo
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className={`font-semibold mb-3 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Gestión de Almacenamiento
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleClearCache}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-yellow-900 hover:bg-yellow-800 text-yellow-200' 
                    : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="mr-2" size={16} />
                    <span>Limpiar caché local</span>
                  </div>
                  <span className="text-xs opacity-75">Liberar espacio</span>
                </div>
              </button>
              
              <button
                onClick={handleDeleteAccount}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-red-900 hover:bg-red-800 text-red-200' 
                    : 'bg-red-50 hover:bg-red-100 text-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2" size={16} />
                    <span>Eliminar cuenta permanentemente</span>
                  </div>
                  <span className="text-xs opacity-75">Irreversible</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ayuda */}
      <div className={`rounded-2xl shadow-lg border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <HelpCircle className="mr-2" size={20} />
            Ayuda y Soporte
          </h2>
        </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('app:navigate', { detail: 'help' }))}
              className={`text-left p-4 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
            }`}>
              <h4 className="font-semibold">Centro de Ayuda</h4>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Preguntas frecuentes y tutoriales
              </p>
            </button>
            
            <button
              onClick={() => {
                window.location.href = 'mailto:soporte@finanzasapp.com?subject=Soporte%20FinanzasApp';
              }}
              className={`text-left p-4 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
            }`}>
              <h4 className="font-semibold">Contactar Soporte</h4>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Habla con nuestro equipo
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
