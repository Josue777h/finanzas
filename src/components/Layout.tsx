import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSimpleMode } from '../context/SimpleModeContext';
import { Home, CreditCard, TrendingUp, Settings, User, LogOut, Moon, Sun, BarChart3, Menu, X, HelpCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { isSimpleMode } = useSimpleMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'accounts', label: 'Cuentas', icon: CreditCard },
    { id: 'transactions', label: 'Transacciones', icon: TrendingUp },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'help', label: 'Ayuda', icon: HelpCircle },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];
  const simpleMenuIds = new Set(['home', 'accounts', 'transactions', 'help', 'settings']);
  const visibleMenuItems = isSimpleMode
    ? menuItems.filter((item) => simpleMenuIds.has(item.id))
    : menuItems;

  return (
    <div className="min-h-screen transition-colors duration-300 app-bg">
      {/* Fondos decorativos */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl opacity-30 bg-teal-400/30 animate-float-slow"></div>
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full blur-3xl opacity-30 bg-amber-400/30 animate-float-slow"></div>
      </div>
      {/* Header móvil fijo - Siempre visible */}
      <div className={`lg:hidden transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/95 backdrop-blur-xl border-b border-gray-700' 
          : 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm'
      } p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-30`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            isDarkMode 
              ? 'bg-gradient-to-br from-teal-600 to-cyan-600' 
              : 'bg-gradient-to-br from-teal-500 to-cyan-500'
          }`}>
            <Home className="text-white" size={20} />
          </div>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            FinanzasApp
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2.5 rounded-xl transition-all duration-200 ${
            isDarkMode 
              ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú móvil - Versión mejorada */}
      {isMobileMenuOpen && (
        <div className={`lg:hidden fixed inset-0 z-[60] transition-all duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}>
          <div className={`p-4 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          } flex justify-between items-center`}>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Menú
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-2 rounded-xl transition-all ${
                isDarkMode 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 mb-2 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/30'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
            
            {/* Separador */}
            <div className={`border-t my-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
            
            {/* Opciones adicionales */}
            <button
              onClick={toggleDarkMode}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 mb-2 ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-semibold">{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                isDarkMode
                  ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <LogOut size={20} />
              <span className="font-semibold">Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex pt-16 lg:pt-0">
        {/* Sidebar Desktop - Solo visible en desktop */}
        <div className={`hidden lg:block w-64 transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800/95 backdrop-blur-xl border-r border-gray-700' 
            : 'bg-white/95 backdrop-blur-xl border-r border-gray-200 shadow-lg'
        }`}>
          <div className={`p-6 border-b transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${
                isDarkMode 
              ? 'bg-gradient-to-br from-teal-600 to-cyan-600' 
              : 'bg-gradient-to-br from-teal-500 to-cyan-500'
              }`}>
                <Home className="text-white" size={20} />
              </div>
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                FinanzasApp
              </h1>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Hola, {user?.name}
            </p>
          </div>
          
          <nav className="p-4">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 mb-2 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/30'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className={`p-4 border-t transition-colors ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={toggleDarkMode}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 mb-3 ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-semibold">{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            <button
              onClick={logout}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                isDarkMode
                  ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <LogOut size={20} />
              <span className="font-semibold">Cerrar sesión</span>
            </button>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="flex-1 overflow-auto">
          <main className="p-4 lg:p-6 xl:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
