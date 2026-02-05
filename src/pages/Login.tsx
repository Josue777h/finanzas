import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Mail, Lock, User, Moon, Sun, Wallet } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Función para obtener mensaje de error amigable
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Correo electrónico no encontrado';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Contraseña incorrecta';
      case 'auth/invalid-email':
        return 'Correo electrónico inválido';
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado';
      case 'auth/weak-password':
        return 'La contraseña es muy débil. Debe tener al menos 6 caracteres';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu internet';
      default:
        return 'Error al procesar la solicitud. Intenta de nuevo';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await login(email, password);
        
        if (result.success) {
          showToast('Inicio exitoso', 'success');
        } else {
          // Obtener código de error y mostrar mensaje amigable
          const errorCode = result.errorCode || '';
          const errorMessage = getErrorMessage(errorCode);
          showToast(errorMessage, 'error');
        }
      } else {
        result = await register(email, password, name);
        
        if (result.success) {
          showToast('Registro exitoso', 'success');
          // Cambiar a modo login después de registro exitoso
          setTimeout(() => {
            setIsLogin(true);
          }, 2000);
        } else {
          // Obtener código de error y mostrar mensaje amigable
          const errorCode = result.errorCode || '';
          const errorMessage = getErrorMessage(errorCode);
          showToast(errorMessage, 'error');
        }
      }
    } catch (err: any) {
      console.error('Error en autenticación:', err);
      showToast('Ocurrió un error inesperado. Por favor, intenta de nuevo más tarde.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300 app-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-float-slow ${
          isDarkMode ? 'bg-teal-500' : 'bg-teal-400'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-float-slow ${
          isDarkMode ? 'bg-amber-500' : 'bg-amber-400'
        }`}></div>
      </div>

      {/* Botón de tema */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 p-3 rounded-full transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' 
            : 'bg-white hover:bg-gray-100 text-gray-700 shadow-lg'
        }`}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className={`relative z-10 w-full max-w-md card-surface ${
        isDarkMode 
          ? 'backdrop-blur-xl border' 
          : 'backdrop-blur-xl border'
      } rounded-3xl shadow-2xl p-8 md:p-10 transition-all duration-300 animate-fade-up`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-2xl ${
              isDarkMode 
                ? 'bg-gradient-to-br from-teal-600 to-cyan-600' 
                : 'bg-gradient-to-br from-teal-500 to-cyan-500'
            }`}>
              <Wallet className="text-white" size={32} />
            </div>
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
          </h1>
          <p className={`text-sm md:text-base ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLogin ? 'Inicia sesión para gestionar tus finanzas' : 'Regístrate para comenzar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Nombre completo
              </label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Tu nombre"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-12 pr-12 py-3.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                  isDarkMode 
                    ? 'text-gray-500 hover:text-gray-300' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
              isDarkMode
                ? 'bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/30'
                : 'bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              isLogin ? 'Iniciar sesión' : 'Registrarse'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
            }}
            className={`text-sm font-medium transition-colors ${
              isDarkMode
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <span className="underline font-semibold">
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
