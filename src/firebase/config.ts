import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut
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
  Timestamp
} from 'firebase/firestore';

// Tu configuración de Firebase - Reemplaza con tus credenciales
const firebaseConfig = {
  apiKey: "AIzaSyA_MCovnY-NWCdfc23yLI8kr20HLrqqeEo",
  authDomain: "listadetareas-cb9a7.firebaseapp.com",
  projectId: "listadetareas-cb9a7",
  storageBucket: "listadetareas-cb9a7.firebasestorage.app",
  messagingSenderId: "246655635442",
  appId: "1:246655635442:web:d6ae719d3727671370a56b"
};
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exportar servicios
export { auth, db };

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

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
