import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { auth, signIn, signUp, signOut, getUserData } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: User }
  | { type: 'REGISTER_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false, // Cambiado a false para evitar carga infinita
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_ERROR':
    case 'REGISTER_ERROR':
      return { ...state, isLoading: false };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let isMounted = true;
    
    // Timeout de seguridad para evitar carga infinita
    const safetyTimeout = setTimeout(() => {
      if (isMounted && state.isLoading) {
        console.log('Timeout de seguridad: deteniendo carga');
        dispatch({ type: 'LOGIN_ERROR' });
      }
    }, 5000); // 5 segundos máximo
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return; // Evitar actualizaciones si el componente se desmontó
      
      clearTimeout(safetyTimeout); // Limpiar timeout si responde a tiempo
      
      if (firebaseUser) {
        // Usuario autenticado - crear usuario básico inmediatamente
        const basicUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.email?.split('@')[0] || 'Usuario',
          createdAt: new Date()
        };
        
        dispatch({ type: 'LOGIN_SUCCESS', payload: basicUser });
        
        // Luego intentar obtener datos completos (en segundo plano)
        try {
          const userData = await getUserData(firebaseUser.uid);
          if (userData.success && userData.data && isMounted) {
            const completeUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.data.name || firebaseUser.email?.split('@')[0] || 'Usuario',
              createdAt: userData.data.createdAt?.toDate() || new Date()
            };
            dispatch({ type: 'LOGIN_SUCCESS', payload: completeUser });
          }
        } catch (error) {
          console.log('Error obteniendo datos completos, usando datos básicos:', error);
        }
      } else {
        // No hay usuario autenticado
        dispatch({ type: 'LOGIN_ERROR' });
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, [state.isLoading]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        // Crear usuario inmediatamente para respuesta rápida
        const user: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name: result.user.email?.split('@')[0] || 'Usuario',
          createdAt: new Date()
        };
        
        // Actualizar estado inmediatamente
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        
        // Luego obtener datos completos de Firestore (en segundo plano)
        try {
          const userData = await getUserData(result.user.uid);
          if (userData.success && userData.data) {
            const completeUser: User = {
              id: result.user.uid,
              email: result.user.email || '',
              name: userData.data.name || result.user.email?.split('@')[0] || 'Usuario',
              createdAt: userData.data.createdAt?.toDate() || new Date()
            };
            dispatch({ type: 'LOGIN_SUCCESS', payload: completeUser });
          }
        } catch (error) {
          console.log('Error obteniendo datos completos, usando datos básicos:', error);
        }
        
        return { success: true };
      } else {
        console.error('Error de login:', result.error);
        return { success: false, error: result.error, errorCode: result.errorCode };
      }
    } catch (error: any) {
      console.error('Error inesperado en login:', error);
      return { success: false, error: error.message, errorCode: error.code };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    dispatch({ type: 'REGISTER_START' });
    
    try {
      const result = await signUp(email, password, name);
      if (result.success && result.user) {
        // Crear usuario inmediatamente para respuesta rápida
        const user: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name: name,
          createdAt: new Date()
        };
        
        // Actualizar estado inmediatamente
        dispatch({ type: 'REGISTER_SUCCESS', payload: user });
        
        return { success: true };
      } else {
        console.error('Error de registro:', result.error);
        return { success: false, error: result.error, errorCode: result.errorCode };
      }
    } catch (error: any) {
      console.error('Error inesperado en registro:', error);
      return { success: false, error: error.message, errorCode: error.code };
    }
  };

  const logout = async () => {
    try {
      await signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
