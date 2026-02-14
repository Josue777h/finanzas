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

// Tu configuración de Firebase - Reemplaza con tus credenciales
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

// Persistencia local para carga más rápida
enableIndexedDbPersistence(db).catch((err) => {
  // Si hay múltiples pestañas abiertas o el navegador no soporta, seguimos sin bloquear
  console.warn('Persistencia Firestore no disponible:', err.code);
});

// Exportar servicios
export { app, auth, db, functions };

// Funciones de autenticación
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
    
    // 2. Guardar información adicional en Firestore
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
    console.error('Código de error:', error.code);
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

    // Si Firebase lo marca como usuario nuevo, no estÃ¡ registrado en la app.
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
      // Si Firestore está temporalmente no disponible, permitimos continuar
      // y sincronizamos el perfil cuando vuelva la conexión.
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
    console.log('💾 Guardando cuenta en Firebase...');
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
      console.log('✅ Cuenta actualizada en Firebase');
    } else {
      // Crear nueva cuenta
      const docRef = await addDoc(collection(db, 'accounts'), accountData);
      result = { success: true, id: `firebase_${docRef.id}` };
      console.log('✅ Nueva cuenta creada en Firebase');
    }
    
    const endTime = Date.now();
    console.log(`⚡ Cuenta guardada en ${endTime - startTime}ms`);
    
    // No limpiar caché aquí, se maneja en el contexto
    return result;
  } catch (error: any) {
    console.error('❌ Error guardando cuenta:', error);
    return { success: false, error: error.message };
  }
};

export const loadAccounts = async (userId: string) => {
  try {
    console.log('🔥 Cargando cuentas desde Firebase para:', userId);
    const startTime = Date.now();
    
    // Agregar timeout individual
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout en carga de cuentas')), 10000) // 10 segundos
    );
    
    // Cargar directamente desde Firebase (el caché se maneja en el contexto)
    const q = query(collection(db, 'accounts'), where('userId', '==', userId));
    const queryPromise = getDocs(q);
    
    const querySnapshot: any = await Promise.race([queryPromise, timeoutPromise]);
    
    const accounts = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: `firebase_${doc.id}`,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
    
    const endTime = Date.now();
    console.log(`✅ Cuentas cargadas en ${endTime - startTime}ms:`, accounts.length);
    
    return { success: true, data: accounts };
  } catch (error: any) {
    console.error('❌ Error cargando cuentas:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

export const deleteAccountFirebase = async (accountId: string, userId: string) => {
  try {
    const firebaseId = accountId.replace('firebase_', '');
    const docRef = doc(db, 'accounts', firebaseId);
    await deleteDoc(docRef);
    
    // Limpiar caché para forzar recarga
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
    console.log('💾 Guardando transacción en Firebase...');
    const startTime = Date.now();
    
    // Remover el id del objeto antes de guardar (Firestore lo maneja)
    const { id, ...transactionDataWithoutId } = transaction;
    const transactionData = {
      ...transactionDataWithoutId,
      date: transaction.date instanceof Date ? Timestamp.fromDate(transaction.date) : transaction.date,
    };
    
    let result;
    if (id && id.startsWith('firebase_')) {
      // Actualizar transacción existente
      const firebaseId = id.replace('firebase_', '');
      const docRef = doc(db, 'transactions', firebaseId);
      await updateDoc(docRef, transactionData);
      result = { success: true, id: id };
      console.log('✅ Transacción actualizada en Firebase');
    } else {
      // Crear nueva transacción
      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      result = { success: true, id: `firebase_${docRef.id}` };
      console.log('✅ Nueva transacción creada en Firebase');
    }
    
    const endTime = Date.now();
    console.log(`⚡ Transacción guardada en ${endTime - startTime}ms`);
    
    // No limpiar caché aquí, se maneja en el contexto
    return result;
  } catch (error: any) {
    console.error('❌ Error guardando transacción:', error);
    return { success: false, error: error.message };
  }
};

export const loadTransactions = async (userId: string) => {
  try {
    console.log('💰 Cargando transacciones desde Firebase para:', userId);
    const startTime = Date.now();
    
    // Agregar timeout individual
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout en carga de transacciones')), 10000) // 10 segundos
    );
    
    // Cargar directamente desde Firebase (el caché se maneja en el contexto)
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const queryPromise = getDocs(q);
    
    const querySnapshot: any = await Promise.race([queryPromise, timeoutPromise]);
    
    const transactions = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: `firebase_${doc.id}`,
        date: data.date?.toDate() || new Date(),
      };
    });
    
    const endTime = Date.now();
    console.log(`✅ Transacciones cargadas en ${endTime - startTime}ms:`, transactions.length);
    
    return { success: true, data: transactions };
  } catch (error: any) {
    console.error('❌ Error cargando transacciones:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

export const deleteTransactionFirebase = async (transactionId: string, userId: string) => {
  try {
    const firebaseId = transactionId.replace('firebase_', '');
    const docRef = doc(db, 'transactions', firebaseId);
    await deleteDoc(docRef);
    
    // Limpiar caché para forzar recarga
    clearCache(userId);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error eliminando transacción:', error);
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

    // Categorías por usuario
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

// Función para verificar conexión a Firebase
export const checkFirebaseConnection = async () => {
  try {
    console.log('🔍 Verificando conexión a Firebase...');
    const testDoc = doc(db, 'connectionTest', 'test');
    await getDoc(testDoc);
    console.log('✅ Conexión a Firebase establecida');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a Firebase:', error);
    return false;
  }
};

// Función para limpiar caché local
export const clearCache = (userId: string) => {
  localStorage.removeItem(`accounts_${userId}`);
  localStorage.removeItem(`transactions_${userId}`);
  localStorage.removeItem(`categories_${userId}`);
  console.log('Caché local limpiado para usuario:', userId);
};

// Funciones para categorías
export const saveCategories = async (userId: string, categories: any[]) => {
  try {
    console.log('📂 Guardando categorías en Firebase...');
    const startTime = Date.now();
    
    const userDocRef = doc(db, 'userCategories', userId);
    await setDoc(userDocRef, { categories, updatedAt: Timestamp.now() });
    
    const endTime = Date.now();
    console.log(`⚡ Categorías guardadas en ${endTime - startTime}ms:`, categories.length);
    
    // No limpiar caché aquí, se maneja en el contexto
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error guardando categorías:', error);
    return { success: false, error: error.message };
  }
};

export const loadCategories = async (userId: string) => {
  try {
    console.log('📂 Cargando categorías desde Firebase para:', userId);
    const startTime = Date.now();
    
    // Agregar timeout individual
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout en carga de categorías')), 10000) // 10 segundos
    );
    
    // Cargar directamente desde Firebase (el caché se maneja en el contexto)
    const docRef = doc(db, 'userCategories', userId);
    const docPromise = getDoc(docRef);
    
    const docSnap: any = await Promise.race([docPromise, timeoutPromise]);
    
    let categories = [];
    if (docSnap.exists()) {
      categories = docSnap.data().categories || [];
    }
    
    const endTime = Date.now();
    console.log(`✅ Categorías cargadas en ${endTime - startTime}ms:`, categories.length);
    
    return { success: true, data: categories };
  } catch (error: any) {
    console.error('❌ Error cargando categorías:', error.message);
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
      console.error('Error suscripción cuentas:', error);
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
      console.error('Error suscripción transacciones:', error);
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
      console.error('Error suscripción categorías:', error);
      if (onError) onError(error);
    }
  );
};
