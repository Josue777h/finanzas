import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { auth, signIn, signUp, signOut, signInWithGoogle, signUpWithGoogle, getUserData, updateUserData } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { identifyUser } from '../utils/analytics';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; errorCode?: string; isNewUser?: boolean }>;
  registerWithGoogle: () => Promise<{ success: boolean; error?: string; errorCode?: string; isNewUser?: boolean }>;
  logout: () => void;
  updateProfileName: (name: string) => Promise<{ success: boolean; error?: string }>;
  updateProfileAvatar: (avatar: string) => Promise<{ success: boolean; error?: string }>;
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
  isLoading: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return { ...state, isLoading: false };
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

  const getUserProfileWithRetry = async (uid: string, maxAttempts = 8, delayMs = 150) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const userData = await getUserData(uid);
      if (userData.success && userData.data) {
        return userData;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return { success: false as const };
  };

  useEffect(() => {
    let isMounted = true;
    let authResolved = false;

    const safetyTimeout = setTimeout(() => {
      if (isMounted && !authResolved) {
        dispatch({ type: 'LOGIN_ERROR' });
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      authResolved = true;
      clearTimeout(safetyTimeout);

      if (firebaseUser) {
        // Evita carrera entre Auth y Firestore (sobre todo en registro con Google)
        const userData = await getUserProfileWithRetry(firebaseUser.uid);
        if (!isMounted) return;

        if (!(userData.success && userData.data)) {
          const pendingProfileUid = localStorage.getItem('spendo_pending_profile_uid');
          if (pendingProfileUid === firebaseUser.uid) {
            const fallbackUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
              createdAt: new Date(),
              avatar: firebaseUser.photoURL || undefined,
            };
            dispatch({ type: 'LOGIN_SUCCESS', payload: fallbackUser });

            // Reintento silencioso de sincronización del perfil
            void updateUserData(firebaseUser.uid, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: fallbackUser.name,
              createdAt: new Date(),
            }).then((res) => {
              if (res.success) {
                localStorage.removeItem('spendo_pending_profile_uid');
              }
            });
            return;
          }

          await signOut();
          dispatch({ type: 'LOGIN_ERROR' });
          return;
        }

        const completeUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.data.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          createdAt: userData.data.createdAt?.toDate() || new Date(),
          avatar: userData.data.avatar || firebaseUser.photoURL || undefined,
        };

        dispatch({ type: 'LOGIN_SUCCESS', payload: completeUser });
        identifyUser(completeUser.id, { email: completeUser.email, name: completeUser.name });

        try {
          if (!localStorage.getItem('preferredCurrency')) {
            const rawBase = process.env.REACT_APP_API_BASE || '';
            const apiBase = rawBase.replace(/\/+$/, '');
            const url = apiBase ? `${apiBase}/.netlify/functions/geo-currency` : `/.netlify/functions/geo-currency`;
            const response = await fetch(url);
            const result: any = await response.json();
            const currency = result?.currency || 'USD';
            const country = result?.country || '';
            localStorage.setItem('preferredCurrency', currency);
            if (country) localStorage.setItem('preferredCountry', country);
            if (firebaseUser.uid) {
              await updateUserData(firebaseUser.uid, {
                preferredCurrency: currency,
                preferredCountry: country,
              });
            }
          } else {
            try {
              const existing = await getUserData(firebaseUser.uid);
              if (existing.success && existing.data) {
                if (existing.data.preferredCurrency) {
                  localStorage.setItem('preferredCurrency', existing.data.preferredCurrency);
                }
                if (existing.data.preferredCountry) {
                  localStorage.setItem('preferredCountry', existing.data.preferredCountry);
                }
              }
            } catch (e) {
              // no-op
            }
          }
        } catch (error) {
          // no-op
        }
      } else {
        dispatch({ type: 'LOGIN_ERROR' });
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        const userData = await getUserData(result.user.uid);
        if (!(userData.success && userData.data)) {
          await signOut();
          dispatch({ type: 'LOGIN_ERROR' });
          return {
            success: false,
            error: 'Cuenta no registrada',
            errorCode: 'auth/user-not-found',
          };
        }

        const completeUser: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name: userData.data.name || result.user.email?.split('@')[0] || 'Usuario',
          createdAt: userData.data.createdAt?.toDate() || new Date(),
          avatar: userData.data.avatar || undefined,
        };

        dispatch({ type: 'LOGIN_SUCCESS', payload: completeUser });
        return { success: true };
      }

      dispatch({ type: 'LOGIN_ERROR' });
      return { success: false, error: result.error, errorCode: result.errorCode };
    } catch (error: any) {
      dispatch({ type: 'LOGIN_ERROR' });
      return { success: false, error: error.message, errorCode: error.code };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    dispatch({ type: 'REGISTER_START' });

    try {
      const result = await signUp(email, password, name);
      if (result.success && result.user) {
        const user: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name,
          createdAt: new Date(),
          avatar: undefined,
        };

        dispatch({ type: 'REGISTER_SUCCESS', payload: user });
        return { success: true };
      }

      dispatch({ type: 'REGISTER_ERROR' });
      return { success: false, error: result.error, errorCode: result.errorCode };
    } catch (error: any) {
      dispatch({ type: 'REGISTER_ERROR' });
      return { success: false, error: error.message, errorCode: error.code };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; errorCode?: string; isNewUser?: boolean }> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await signInWithGoogle();
      if (result.success && result.user) {
        const user: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
          createdAt: new Date(),
          avatar: result.user.photoURL || undefined,
        };

        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        return { success: true, isNewUser: false };
      }

      dispatch({ type: 'LOGIN_ERROR' });
      return { success: false, error: result.error, errorCode: result.errorCode };
    } catch (error: any) {
      dispatch({ type: 'LOGIN_ERROR' });
      return { success: false, error: error.message, errorCode: error.code };
    }
  };

  const registerWithGoogle = async (): Promise<{ success: boolean; error?: string; errorCode?: string; isNewUser?: boolean }> => {
    dispatch({ type: 'REGISTER_START' });

    try {
      const result = await signUpWithGoogle();
      if (result.success && result.user) {
        const user: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
          createdAt: new Date(),
          avatar: result.user.photoURL || undefined,
        };
        dispatch({ type: 'REGISTER_SUCCESS', payload: user });
        return { success: true, isNewUser: result.isNewUser };
      }

      dispatch({ type: 'REGISTER_ERROR' });
      return { success: false, error: result.error, errorCode: result.errorCode };
    } catch (error: any) {
      dispatch({ type: 'REGISTER_ERROR' });
      return { success: false, error: error.message, errorCode: error.code };
    }
  };

  const logout = async () => {
    try {
      await signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
    }
  };

  const updateProfileName = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    try {
      const result = await updateUserData(state.user.id, { name });
      if (result.success) {
        const updatedUser = { ...state.user, name };
        dispatch({ type: 'LOGIN_SUCCESS', payload: updatedUser });
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateProfileAvatar = async (avatar: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    try {
      const result = await updateUserData(state.user.id, { avatar });
      if (result.success) {
        const updatedUser = { ...state.user, avatar };
        dispatch({ type: 'LOGIN_SUCCESS', payload: updatedUser });
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        loginWithGoogle,
        registerWithGoogle,
        logout,
        updateProfileName,
        updateProfileAvatar,
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
