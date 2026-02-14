import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signOut as firebaseSignOut,
  deleteUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Tu configuraciÃ³n de Firebase - Reemplaza con tus credenciales
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyA_MCovnY-NWCdfc23yLI8kr20HLrqqeEo",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "listadetareas-cb9a7.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "listadetareas-cb9a7",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "listadetareas-cb9a7.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "246655635442",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:246655635442:web:d6ae719d3727671370a56b"
};
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Persistencia local para carga mÃ¡s rÃ¡pida
enableIndexedDbPersistence(db).catch((err) => {
  // Si hay mÃºltiples pestaÃ±as abiertas o el navegador no soporta, seguimos sin bloquear
  console.warn('Persistencia Firestore no disponible:', err.code);
});

// Exportar servicios
export { app, auth, db, functions };

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: { code: string; message: string }
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// Funciones de autenticaciÃ³n
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential: any = await withTimeout(
      signInWithEmailAndPassword(auth, email, password),
      12000,
      { code: 'auth/timeout', message: 'Timeout en inicio de sesiÃ³n' }
    );
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message, errorCode: error.code };
  }
};

export const signUp = async (email: string, password: string, name: string) => {
  try {
    console.log('Iniciando registro de usuario:', email);
    
    // 1. Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Usuario creado en Auth:', userCredential.user.uid);
    
    // 2. Guardar informaciÃ³n adicional en Firestore
    const userData = {
      uid: userCredential.user.uid,
      email,
      name,
      createdAt: new Date()
    };
    
    console.log('Intentando guardar en Firestore:', userData);
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    console.log('Datos guardados exitosamente en Firestore');
    
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Error detallado en registro:', error);
    console.error('CÃ³digo de error:', error.code);
    console.error('Mensaje de error:', error.message);
    return { success: false, error: error.message, errorCode: error.code };
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const userCredential = await signInWithPopup(auth, provider);
    const additionalUserInfo = getAdditionalUserInfo(userCredential);
    const user = userCredential.user;

    // Si Firebase lo marca como usuario nuevo, no estÃƒÂ¡ registrado en la app.
    if (additionalUserInfo?.isNewUser) {
      void deleteUser(user).catch(() => undefined);
      await firebaseSignOut(auth);
      return {
        success: false,
        error: 'Cuenta no registrada',
        errorCode: 'auth/user-not-found',
      };
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      void deleteUser(user).catch(() => undefined);
      await firebaseSignOut(auth);
      return {
        success: false,
        error: 'Cuenta no registrada',
        errorCode: 'auth/user-not-found',
      };
    }

    const resolvedName = userDocSnap.data().name || user.displayName || user.email?.split('@')[0] || 'Usuario';
    await setDoc(
      userDocRef,
      {
        email: user.email || '',
        name: resolvedName,
      },
      { merge: true }
    );

    return {
      success: true,
      user,
      isNewUser: false,
    };
  } catch (error: any) {
    return { success: false, error: error.message, errorCode: error.code };
  }
};

export const signUpWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const userCredential = await signInWithPopup(auth, provider);
    const additionalUserInfo = getAdditionalUserInfo(userCredential);
    const user = userCredential.user;
    const resolvedName = user.displayName || user.email?.split('@')[0] || 'Usuario';
    const userDocRef = doc(db, 'users', user.uid);

    try {
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || '',
          name: resolvedName,
          createdAt: new Date(),
        },
        { merge: true }
      );
      localStorage.removeItem('spendo_pending_profile_uid');
    } catch (profileError: any) {
      // Si Firestore estÃ¡ temporalmente no disponible, permitimos continuar
      // y sincronizamos el perfil cuando vuelva la conexiÃ³n.
      if (profileError?.code === 'unavailable' || profileError?.code === 'deadline-exceeded') {
        localStorage.setItem('spendo_pending_profile_uid', user.uid);
      } else {
        throw profileError;
      }
    }

    return {
      success: true,
      user,
      isNewUser: additionalUserInfo?.isNewUser ?? false,
    };
  } catch (error: any) {
    return { success: false, error: error.message, errorCode: error.code };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteCurrentUser = async () => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'No hay usuario autenticado' };
    }
    await deleteUser(auth.currentUser);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message, errorCode: error.code };
  }
};

// Funciones de base de datos
export const getUserData = async (uid: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    return { success: false, error: 'Usuario no encontrado' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateUserData = async (uid: string, data: any) => {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Funciones para cuentas
export const saveAccount = async (account: any) => {
  try {
    console.log('ðŸ’¾ Guardando cuenta en Firebase...');
    const startTime = Date.now();
    
    // Remover el id del objeto antes de guardar (Firestore lo maneja)
    const { id, ...accountDataWithoutId } = account;
    const accountData = {
      ...accountDataWithoutId,
      createdAt: account.createdAt instanceof Date ? Timestamp.fromDate(account.createdAt) : account.createdAt,
    };
    
    let result;
    if (id && id.startsWith('firebase_')) {
      // Actualizar cuenta existente
      const firebaseId = id.replace('firebase_', '');
      const docRef = doc(db, 'accounts', firebaseId);
      await updateDoc(docRef, accountData);
      result = { success: true, id: id };
      console.log('âœ… Cuenta actualizada en Firebase');
    } else {
      // Crear nueva cuenta
      const docRef = await addDoc(collection(db, 'accounts'), accountData);
      result = { success: true, id: `firebase_${docRef.id}` };
      console.log('âœ… Nueva cuenta creada en Firebase');
    }
    
    const endTime = Date.now();
    console.log(`âš¡ Cuenta guardada en ${endTime - startTime}ms`);
    
    // No limpiar cachÃ© aquÃ­, se maneja en el contexto
    return result;
  } catch (error: any) {
    console.error('âŒ Error guardando cuenta:', error);
    return { success: false, error: error.message };
  }
};

export const loadAccounts = async (userId: string) => {
  try {
    console.log('ðŸ”¥ Cargando cuentas desde Firebase para:', userId);
    const startTime = Date.now();
    
    // Cargar directamente desde Firebase (el cachÃ© se maneja en el contexto)
    const q = query(collection(db, 'accounts'), where('userId', '==', userId));
    const querySnapshot: any = await withTimeout(
      getDocs(q),
      10000,
      { code: 'firestore/timeout', message: 'Timeout en carga de cuentas' }
    );
    
    const accounts = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: `firebase_${doc.id}`,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
    
    const endTime = Date.now();
    console.log(`âœ… Cuentas cargadas en ${endTime - startTime}ms:`, accounts.length);
    
    return { success: true, data: accounts };
  } catch (error: any) {
    console.error('âŒ Error cargando cuentas:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

export const deleteAccountFirebase = async (accountId: string, userId: string) => {
  try {
    const firebaseId = accountId.replace('firebase_', '');
    const docRef = doc(db, 'accounts', firebaseId);
    await deleteDoc(docRef);
    
    // Limpiar cachÃ© para forzar recarga
    clearCache(userId);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error eliminando cuenta:', error);
    return { success: false, error: error.message };
  }
};

export const deleteTransactionsByAccount = async (userId: string, accountId: string) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('accountId', '==', accountId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(doc(db, 'transactions', docSnap.id));
    });
    await batch.commit();
    clearCache(userId);
    return { success: true };
  } catch (error: any) {
    console.error('Error eliminando transacciones por cuenta:', error);
    return { success: false, error: error.message };
  }
};

export const savePushToken = async (userId: string, token: string) => {
  try {
    const tokenRef = doc(db, 'userTokens', userId, 'tokens', token);
    await setDoc(tokenRef, { createdAt: Timestamp.now() });
    return { success: true };
  } catch (error: any) {
    console.error('Error guardando token push:', error);
    return { success: false, error: error.message };
  }
};

// Funciones para transacciones
export const saveTransaction = async (transaction: any) => {
  try {
    console.log('ðŸ’¾ Guardando transacciÃ³n en Firebase...');
    const startTime = Date.now();
    
    // Remover el id del objeto antes de guardar (Firestore lo maneja)
    const { id, ...transactionDataWithoutId } = transaction;
    const transactionData = {
      ...transactionDataWithoutId,
      date: transaction.date instanceof Date ? Timestamp.fromDate(transaction.date) : transaction.date,
    };
    
    let result;
    if (id && id.startsWith('firebase_')) {
      // Actualizar transacciÃ³n existente
      const firebaseId = id.replace('firebase_', '');
      const docRef = doc(db, 'transactions', firebaseId);
      await updateDoc(docRef, transactionData);
      result = { success: true, id: id };
      console.log('âœ… TransacciÃ³n actualizada en Firebase');
    } else {
      // Crear nueva transacciÃ³n
      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      result = { success: true, id: `firebase_${docRef.id}` };
      console.log('âœ… Nueva transacciÃ³n creada en Firebase');
    }
    
    const endTime = Date.now();
    console.log(`âš¡ TransacciÃ³n guardada en ${endTime - startTime}ms`);
    
    // No limpiar cachÃ© aquÃ­, se maneja en el contexto
    return result;
  } catch (error: any) {
    console.error('âŒ Error guardando transacciÃ³n:', error);
    return { success: false, error: error.message };
  }
};

export const loadTransactions = async (userId: string) => {
  try {
    console.log('ðŸ’° Cargando transacciones desde Firebase para:', userId);
    const startTime = Date.now();
    
    // Cargar directamente desde Firebase (el cachÃ© se maneja en el contexto)
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const querySnapshot: any = await withTimeout(
      getDocs(q),
      10000,
      { code: 'firestore/timeout', message: 'Timeout en carga de transacciones' }
    );
    
    const transactions = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: `firebase_${doc.id}`,
        date: data.date?.toDate() || new Date(),
      };
    });
    
    const endTime = Date.now();
    console.log(`âœ… Transacciones cargadas en ${endTime - startTime}ms:`, transactions.length);
    
    return { success: true, data: transactions };
  } catch (error: any) {
    console.error('âŒ Error cargando transacciones:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

export const deleteTransactionFirebase = async (transactionId: string, userId: string) => {
  try {
    const firebaseId = transactionId.replace('firebase_', '');
    const docRef = doc(db, 'transactions', firebaseId);
    await deleteDoc(docRef);
    
    // Limpiar cachÃ© para forzar recarga
    clearCache(userId);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error eliminando transacciÃ³n:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAllUserData = async (userId: string) => {
  try {
    const batch = writeBatch(db);

    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', userId));
    const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId));

    const [accountsSnap, transactionsSnap] = await Promise.all([
      getDocs(accountsQuery),
      getDocs(transactionsQuery),
    ]);

    accountsSnap.forEach((docSnap) => {
      batch.delete(doc(db, 'accounts', docSnap.id));
    });
    transactionsSnap.forEach((docSnap) => {
      batch.delete(doc(db, 'transactions', docSnap.id));
    });

    // CategorÃ­as por usuario
    batch.delete(doc(db, 'userCategories', userId));
    // Perfil de usuario
    batch.delete(doc(db, 'users', userId));

    await batch.commit();
    clearCache(userId);

    return { success: true };
  } catch (error: any) {
    console.error('Error eliminando datos del usuario:', error);
    return { success: false, error: error.message };
  }
};

// FunciÃ³n para verificar conexiÃ³n a Firebase
export const checkFirebaseConnection = async () => {
  try {
    console.log('ðŸ” Verificando conexiÃ³n a Firebase...');
    const testDoc = doc(db, 'connectionTest', 'test');
    await getDoc(testDoc);
    console.log('âœ… ConexiÃ³n a Firebase establecida');
    return true;
  } catch (error) {
    console.error('âŒ Error de conexiÃ³n a Firebase:', error);
    return false;
  }
};

// FunciÃ³n para limpiar cachÃ© local
export const clearCache = (userId: string) => {
  localStorage.removeItem(`accounts_${userId}`);
  localStorage.removeItem(`transactions_${userId}`);
  localStorage.removeItem(`categories_${userId}`);
  console.log('CachÃ© local limpiado para usuario:', userId);
};

// Funciones para categorÃ­as
export const saveCategories = async (userId: string, categories: any[]) => {
  try {
    console.log('ðŸ“‚ Guardando categorÃ­as en Firebase...');
    const startTime = Date.now();
    
    const userDocRef = doc(db, 'userCategories', userId);
    await setDoc(userDocRef, { categories, updatedAt: Timestamp.now() });
    
    const endTime = Date.now();
    console.log(`âš¡ CategorÃ­as guardadas en ${endTime - startTime}ms:`, categories.length);
    
    // No limpiar cachÃ© aquÃ­, se maneja en el contexto
    return { success: true };
  } catch (error: any) {
    console.error('âŒ Error guardando categorÃ­as:', error);
    return { success: false, error: error.message };
  }
};

export const loadCategories = async (userId: string) => {
  try {
    console.log('ðŸ“‚ Cargando categorÃ­as desde Firebase para:', userId);
    const startTime = Date.now();
    
    // Cargar directamente desde Firebase (el cachÃ© se maneja en el contexto)
    const docRef = doc(db, 'userCategories', userId);
    const docSnap: any = await withTimeout(
      getDoc(docRef),
      10000,
      { code: 'firestore/timeout', message: 'Timeout en carga de categorÃ­as' }
    );
    
    let categories = [];
    if (docSnap.exists()) {
      categories = docSnap.data().categories || [];
    }
    
    const endTime = Date.now();
    console.log(`âœ… CategorÃ­as cargadas en ${endTime - startTime}ms:`, categories.length);
    
    return { success: true, data: categories };
  } catch (error: any) {
    console.error('âŒ Error cargando categorÃ­as:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

// Suscripciones en tiempo real
export const subscribeAccounts = (
  userId: string,
  onData: (accounts: any[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, 'accounts'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const accounts = snapshot.docs.map((docSnap: any) => {
        const data = docSnap.data();
        return {
          ...data,
          id: `firebase_${docSnap.id}`,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      onData(accounts);
    },
    (error) => {
      console.error('Error suscripciÃ³n cuentas:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeTransactions = (
  userId: string,
  onData: (transactions: any[]) => void,
  onError?: (error: any) => void
) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const transactions = snapshot.docs.map((docSnap: any) => {
        const data = docSnap.data();
        return {
          ...data,
          id: `firebase_${docSnap.id}`,
          date: data.date?.toDate() || new Date(),
        };
      });
      onData(transactions);
    },
    (error) => {
      console.error('Error suscripciÃ³n transacciones:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeCategories = (
  userId: string,
  onData: (categories: any[]) => void,
  onError?: (error: any) => void
) => {
  const docRef = doc(db, 'userCategories', userId);
  return onSnapshot(
    docRef,
    (docSnap: any) => {
      const categories = docSnap.exists() ? docSnap.data().categories || [] : [];
      onData(categories);
    },
    (error) => {
      console.error('Error suscripciÃ³n categorÃ­as:', error);
      if (onError) onError(error);
    }
  );
};

