import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Calendar, Camera, Save } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { transactions, accounts } = useFinance();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [userStats, setUserStats] = useState({
    totalTransactions: 0,
    activeMonths: 0,
    connectedAccounts: 0,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: false,
    monthlyReport: false,
    darkMode: isDarkMode
  });

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Calcular estadísticas del usuario
  useEffect(() => {
    if (transactions.length > 0) {
      const uniqueMonths = new Set(transactions.map(t => {
        const date = new Date(t.date);
        return `${date.getFullYear()}-${date.getMonth()}`;
      })).size;
      
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setUserStats({
        totalTransactions: transactions.length,
        activeMonths: uniqueMonths,
        connectedAccounts: accounts.length,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense
      });
    } else {
      setUserStats({
        totalTransactions: 0,
        activeMonths: 0,
        connectedAccounts: accounts.length,
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0
      });
    }
  }, [transactions, accounts]);

  // Cargar preferencias guardadas
  useEffect(() => {
    if (user?.id) {
      const savedPrefs = localStorage.getItem(`preferences_${user.id}`);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    }
  }, [user?.id]);

  // Guardar preferencias
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`preferences_${user.id}`, JSON.stringify(preferences));
    }
  }, [preferences, user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update user data in localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email === user?.email);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], name: formData.name };
      localStorage.setItem('users', JSON.stringify(users));
      
      // Update current user session
      const updatedUser = { ...user, name: formData.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Force re-render by updating auth state
      window.location.reload();
    }
    
    setIsEditing(false);
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'darkMode') {
      toggleDarkMode();
      setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Perfil
        </h1>
        <p className={`mt-1 transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Gestiona tu información personal
        </p>
      </div>

      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center space-x-6 mb-6">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${
              isDarkMode
                ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button className={`absolute bottom-0 right-0 p-2 rounded-full transition-all duration-200 ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
            }`}>
              <Camera size={16} />
            </button>
          </div>
          
          <div>
            <h2 className={`text-2xl font-bold transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {user?.name}
            </h2>
            <p className={`transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {user?.email}
            </p>
            <div className={`flex items-center space-x-2 mt-2 text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Calendar size={16} />
              <span>Miembro desde {new Date(user?.createdAt || '').toLocaleDateString('es')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Nombre completo
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} size={20} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? isDarkMode
                        ? 'border border-gray-600 bg-gray-700/50 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        : 'border border-gray-300 bg-white text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : isDarkMode
                        ? 'border border-gray-700 bg-gray-800/50 text-gray-400'
                        : 'border border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? isDarkMode
                        ? 'border border-gray-600 bg-gray-700/50 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        : 'border border-gray-300 bg-white text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : isDarkMode
                        ? 'border border-gray-700 bg-gray-800/50 text-gray-400'
                        : 'border border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                  }`}
                >
                  <Save size={20} />
                  <span>Guardar cambios</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                Editar perfil
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-bold mb-4 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Estadísticas de uso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 transition-colors ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {userStats.totalTransactions}
            </div>
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Transacciones totales
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 transition-colors ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              {userStats.activeMonths}
            </div>
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Meses activo
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 transition-colors ${
              isDarkMode ? 'text-purple-400' : 'text-purple-600'
            }`}>
              {userStats.connectedAccounts}
            </div>
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Cuentas conectadas
            </div>
          </div>
        </div>
        
        {/* Estadísticas financieras adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 transition-colors ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              ${userStats.totalIncome.toLocaleString()}
            </div>
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Total ingresos
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 transition-colors ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`}>
              ${userStats.totalExpense.toLocaleString()}
            </div>
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Total gastos
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 transition-colors ${
              userStats.netBalance >= 0 
                ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                : (isDarkMode ? 'text-red-400' : 'text-red-600')
            }`}>
              ${Math.abs(userStats.netBalance).toLocaleString()}
            </div>
            <div className={`text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {userStats.netBalance >= 0 ? 'Balance positivo' : 'Balance negativo'}
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-bold mb-4 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Preferencias
        </h3>
        <div className="space-y-4">
          <div className={`flex items-center justify-between py-3 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Notificaciones por email
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Recibe alertas sobre tus finanzas
              </p>
            </div>
            <button 
              onClick={() => togglePreference('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.emailNotifications 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
          
          <div className={`flex items-center justify-between py-3 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Reporte mensual
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Resumen automático cada mes
              </p>
            </div>
            <button 
              onClick={() => togglePreference('monthlyReport')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.monthlyReport 
                  ? 'bg-blue-600' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                preferences.monthlyReport ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className={`font-semibold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Modo oscuro
              </p>
              <p className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Interfaz nocturna
              </p>
            </div>
            <button 
              onClick={() => togglePreference('darkMode')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
