import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { User, AuthState } from '../types';
import { auth, signIn, signUp, signOut, signInWithGoogle, signUpWithGoogle, getUserData, updateUserData } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { identifyUser } from '../utils/analytics';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; errorCode?: string; isNewUser?: boolean }>;
  registerWithGoogle: () => Promise<{ success: boolean; error?: string; errorCode?: string; isNewUser?: boolean }>;
  logout: () => Promise<void>;
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
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
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
  const signOutPromiseRef = useRef<Promise<void> | null>(null);

  const cacheKeyForUser = (uid: string) => `user_profile_${uid}`;

  const getCachedUser = (uid: string): User | null => {
    try {
      const raw = localStorage.getItem(cacheKeyForUser(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
      } as User;
    } catch {
      return null;
    }
  };

  const setCachedUser = (user: User) => {
    localStorage.setItem(
      cacheKeyForUser(user.id),
      JSON.stringify({ ...user, createdAt: user.createdAt.toISOString() })
    );
  };

  const getUserProfileFast = async (uid: string, timeoutMs = 2000) => {
    try {
      const timeoutPromise = new Promise<{ success: false; errorCode: string }>((resolve) =>
        setTimeout(() => resolve({ success: false, errorCode: 'timeout' }), timeoutMs)
      );
      const result = await Promise.race([getUserData(uid), timeoutPromise]);
      return result as any;
    } catch {
      return { success: false, errorCode: 'unknown' as const };
    }
  };

  const waitPendingSignOut = async () => {
    const pending = signOutPromiseRef.current;
    if (!pending) return;
    try {
      await pending;
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authResolved = false;

    const safetyTimeout = setTimeout(() => {
      if (isMounted && !authResolved) {
        dispatch({ type: 'LOGOUT' });
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;
      authResolved = true;
      clearTimeout(safetyTimeout);

      if (firebaseUser) {
        // Entrada instantanea: cache o perfil basico
        const cachedUser = getCachedUser(firebaseUser.uid);
        const fastUser: User = cachedUser || {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          createdAt: new Date(),
          avatar: firebaseUser.photoURL || undefined,
        };

        dispatch({ type: 'LOGIN_SUCCESS', payload: fastUser });
        setCachedUser(fastUser);
        identifyUser(fastUser.id, { email: fastUser.email, name: fastUser.name });

        // Enriquecer perfil sin bloquear el ciclo de autenticacion.
        void (async () => {
          const userData = await getUserProfileFast(firebaseUser.uid);
          if (!isMounted) return;

          if (userData.success && userData.data) {
            const completeUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.data.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
              createdAt: userData.data.createdAt?.toDate() || new Date(),
              avatar: userData.data.avatar || firebaseUser.photoURL || undefined,
            };
            dispatch({ type: 'LOGIN_SUCCESS', payload: completeUser });
            setCachedUser(completeUser);
            identifyUser(completeUser.id, { email: completeUser.email, name: completeUser.name });
          } else {
            // Auto-healing del doc de usuario sin sacar sesion
            void updateUserData(firebaseUser.uid, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
              createdAt: new Date(),
            }).then((res) => {
              if (res.success) {
                localStorage.removeItem('spendo_pending_profile_uid');
              }
            });
          }
        })();

        void (async () => {
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
            }
          } catch {
            // no-op
          }
        })();
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    await waitPendingSignOut();
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        const basicUser: User = {
          id: result.user.uid,
          email: result.user.email || '',
          name: result.user.email?.split('@')[0] || 'Usuario',
          createdAt: new Date(),
          avatar: result.user.photoURL || undefined,
        };
        dispatch({ type: 'LOGIN_SUCCESS', payload: basicUser });
        setCachedUser(basicUser);
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
    await waitPendingSignOut();
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
        setCachedUser(user);
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
    await waitPendingSignOut();
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
        setCachedUser(user);
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
    await waitPendingSignOut();
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
        setCachedUser(user);
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
    localStorage.removeItem('spendo_pending_profile_uid');
    dispatch({ type: 'LOGOUT' });
    if (!signOutPromiseRef.current) {
      const pending = signOut()
        .then(() => undefined)
        .catch((error) => {
          console.error('Error al cerrar sesion:', error);
        });
      signOutPromiseRef.current = pending.finally(() => {
        if (signOutPromiseRef.current === pending) {
          signOutPromiseRef.current = null;
        }
      });
    }
    await signOutPromiseRef.current;
  };

  const updateProfileName = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    try {
      const result = await updateUserData(state.user.id, { name });
      if (result.success) {
        const updatedUser = { ...state.user, name };
        dispatch({ type: 'LOGIN_SUCCESS', payload: updatedUser });
        setCachedUser(updatedUser);
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
        setCachedUser(updatedUser);
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
