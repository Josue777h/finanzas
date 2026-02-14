import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { Account, Transaction, Category, FinanceState } from '../types';
import { useAuth } from './AuthContext';
import { 
  saveAccount, 
  deleteAccountFirebase,
  deleteTransactionsByAccount,
  saveTransaction,
  deleteTransactionFirebase,
  saveCategories,
  subscribeAccounts,
  subscribeTransactions,
  subscribeCategories
} from '../firebase/config';
import { trackEvent } from '../utils/analytics';

interface FinanceContextType extends FinanceState {
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  isLoadingData: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

type CachedFinanceData = {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
};

const memoryFinanceCache = new Map<string, CachedFinanceData>();
const EMPTY_CACHE: CachedFinanceData = {
  accounts: [],
  transactions: [],
  categories: [],
};

const mergeMemoryCache = (userId: string, patch: Partial<CachedFinanceData>) => {
  const current = memoryFinanceCache.get(userId) || EMPTY_CACHE;
  memoryFinanceCache.set(userId, {
    accounts: patch.accounts ?? current.accounts,
    transactions: patch.transactions ?? current.transactions,
    categories: patch.categories ?? current.categories,
  });
};

type FinanceAction =
  | { type: 'SET_LOADING_DATA'; payload: boolean }
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: { id: string; account: Partial<Account> } }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; transaction: Partial<Transaction> } }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: { id: string; category: Partial<Category> } }
  | { type: 'DELETE_CATEGORY'; payload: string };

const initialState: FinanceState = {
  accounts: [],
  transactions: [],
  categories: [
    { id: '1', name: 'Salario', color: '#10b981', icon: 'ðŸ’°', type: 'income' },
    { id: '2', name: 'Comida', color: '#ef4444', icon: 'ðŸ”', type: 'expense' },
    { id: '3', name: 'Transporte', color: '#f59e0b', icon: 'ðŸš—', type: 'expense' },
    { id: '4', name: 'Entretenimiento', color: '#8b5cf6', icon: 'ðŸŽ®', type: 'expense' },
    { id: '5', name: 'Facturas', color: '#3b82f6', icon: 'ðŸ“„', type: 'expense' },
  ],
  totalBalance: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  isLoadingData: false,
};

const financeReducer = (state: FinanceState, action: FinanceAction): FinanceState => {
  switch (action.type) {
    case 'SET_LOADING_DATA':
      return { ...state, isLoadingData: action.payload };
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(acc =>
          acc.id === action.payload.id ? { ...acc, ...action.payload.account } : acc
        ),
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(acc => acc.id !== action.payload),
      };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(trx =>
          trx.id === action.payload.id ? { ...trx, ...action.payload.transaction } : trx
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(trx => trx.id !== action.payload),
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === action.payload.id ? { ...cat, ...action.payload.category } : cat
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== action.payload),
      };
    default:
      return state;
  }
};

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Cargar datos desde Firebase cuando el usuario cambia o se autentica
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      console.log('Suscribiendo datos en tiempo real para usuario:', user.id);

      const hydrateCachedData = () => {
        const memoized = memoryFinanceCache.get(user.id);
        if (memoized) {
          if (memoized.accounts.length > 0 || memoized.transactions.length > 0 || memoized.categories.length > 0) {
            dispatch({ type: 'SET_ACCOUNTS', payload: memoized.accounts });
            dispatch({ type: 'SET_TRANSACTIONS', payload: memoized.transactions });
            dispatch({
              type: 'SET_CATEGORIES',
              payload: memoized.categories.length > 0 ? memoized.categories : initialState.categories
            });
          }
          return;
        }
      };
      const cacheHydrationTimer = window.setTimeout(hydrateCachedData, 0);
      let hasLoadedAccounts = false;
      let hasLoadedTransactions = false;
      let hasLoadedCategories = false;

      const maybeStopLoading = () => {
        if (hasLoadedAccounts && hasLoadedTransactions && hasLoadedCategories) {
          dispatch({ type: 'SET_LOADING_DATA', payload: false });
        }
      };

      const unsubscribeAccounts = subscribeAccounts(
        user.id,
        (accounts) => {
          hasLoadedAccounts = true;
          dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
          mergeMemoryCache(user.id, { accounts });
          maybeStopLoading();
        },
        () => {
          hasLoadedAccounts = true;
          maybeStopLoading();
        }
      );

      const unsubscribeTransactions = subscribeTransactions(
        user.id,
        (transactions) => {
          hasLoadedTransactions = true;
          dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
          mergeMemoryCache(user.id, { transactions });
          maybeStopLoading();
        },
        () => {
          hasLoadedTransactions = true;
          maybeStopLoading();
        }
      );

      const unsubscribeCategories = subscribeCategories(
        user.id,
        (categories) => {
          hasLoadedCategories = true;
          const finalCategories = categories.length > 0 ? categories : initialState.categories;
          dispatch({ type: 'SET_CATEGORIES', payload: finalCategories });
          mergeMemoryCache(user.id, { categories: finalCategories });
          maybeStopLoading();
        },
        () => {
          hasLoadedCategories = true;
          maybeStopLoading();
        }
      );

      // No bloquear la UI: apagamos el loader de inmediato
      dispatch({ type: 'SET_LOADING_DATA', payload: false });

      return () => {
        window.clearTimeout(cacheHydrationTimer);
        unsubscribeAccounts();
        unsubscribeTransactions();
        unsubscribeCategories();
      };
    }

    if (!isAuthenticated) {
      console.log('Limpiando datos - usuario no autenticado');
      dispatch({ type: 'SET_LOADING_DATA', payload: false });
      dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      dispatch({ type: 'SET_CATEGORIES', payload: initialState.categories });
    }
  }, [user?.id, isAuthenticated]);

  // Evitar efecto global de guardado de categorÃ­as para no crear bucles
  // con suscripciones onSnapshot. El guardado ocurre en add/update/deleteCategory.

  const addAccount = (account: Omit<Account, 'id' | 'createdAt'>) => {
    if (!user?.id) {
      console.error('No se puede agregar cuenta: usuario no autenticado');
      return;
    }
    
    const newAccount: Account = {
      ...account,
      userId: user.id,
      id: Date.now().toString(), // ID temporal
      createdAt: new Date(),
    };
    
    // Agregar al estado inmediatamente para respuesta rÃ¡pida
    dispatch({ type: 'ADD_ACCOUNT', payload: newAccount });
    trackEvent('account_created', { userId: user.id, accountType: account.type });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedAccounts = [...state.accounts, newAccount];
    mergeMemoryCache(user.id, { accounts: updatedAccounts });
    
    // Guardar en Firebase en segundo plano
    saveAccount(newAccount).then((result) => {
      if (result.success && result.id) {
        // Actualizar con el ID de Firebase
        const finalAccount = { ...newAccount, id: result.id };
        dispatch({ 
          type: 'UPDATE_ACCOUNT', 
          payload: { id: newAccount.id, account: { id: result.id } } 
        });
        
        // Actualizar cachÃ© con el ID real
        const finalAccounts = updatedAccounts.map(acc => 
          acc.id === newAccount.id ? finalAccount : acc
        );
        mergeMemoryCache(user.id, { accounts: finalAccounts });
        
        console.log('Cuenta guardada en Firebase:', result.id);
      }
    }).catch((error) => {
      console.error('Error guardando cuenta en Firebase:', error);
    });
  };

  const updateAccount = (id: string, account: Partial<Account>) => {
    // Actualizar en el estado inmediatamente
    dispatch({ type: 'UPDATE_ACCOUNT', payload: { id, account } });
    trackEvent('account_updated', { accountId: id });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedAccounts = state.accounts.map(acc => 
      acc.id === id ? { ...acc, ...account } : acc
    );
    if (user?.id) {
      mergeMemoryCache(user.id, { accounts: updatedAccounts });
    }
    
    // Guardar en Firebase en segundo plano
    if (user?.id) {
      const accountToUpdate = state.accounts.find(acc => acc.id === id);
      if (accountToUpdate) {
        const updatedAccount = { ...accountToUpdate, ...account };
        saveAccount(updatedAccount).then(() => {
          console.log('Cuenta actualizada en Firebase');
        }).catch((error) => {
          console.error('Error actualizando cuenta en Firebase:', error);
        });
      }
    }
  };

  const deleteAccount = (id: string) => {
    const account = state.accounts.find(acc => acc.id === id);

    // Eliminar del estado inmediatamente
    dispatch({ type: 'DELETE_ACCOUNT', payload: id });
    trackEvent('account_deleted', { accountId: id, accountType: account?.type });

    // Eliminar transacciones asociadas del estado inmediatamente
    const remainingTransactions = state.transactions.filter(trx => trx.accountId !== id);
    dispatch({ type: 'SET_TRANSACTIONS', payload: remainingTransactions });
    
    // Eliminar de Firebase en segundo plano
    if (user?.id) {
      if (id.startsWith('firebase_')) {
        deleteAccountFirebase(id, user.id).then(() => {
          console.log('Cuenta eliminada de Firebase');
        }).catch((error) => {
          console.error('Error eliminando cuenta de Firebase:', error);
        });
      }

      // Eliminar transacciones de la cuenta en Firebase
      deleteTransactionsByAccount(user.id, id).then(() => {
        console.log('Transacciones de cuenta eliminadas de Firebase');
      }).catch((error) => {
        console.error('Error eliminando transacciones de cuenta:', error);
      });
    }

    // Actualizar cachÃ© local
    if (user?.id) {
      const updatedAccounts = state.accounts.filter(acc => acc.id !== id);
      mergeMemoryCache(user.id, { accounts: updatedAccounts, transactions: remainingTransactions });
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    if (!user?.id) {
      console.error('No se puede agregar transacciÃ³n: usuario no autenticado');
      return;
    }
    
    const newTransaction: Transaction = {
      ...transaction,
      userId: user.id,
      id: Date.now().toString(), // ID temporal
      date: new Date(),
    };
    
    // Update account balance
    const account = state.accounts.find(acc => acc.id === transaction.accountId);
    if (account) {
      const updatedBalance = transaction.type === 'income' 
        ? account.balance + transaction.amount
        : account.balance - transaction.amount;
      
      // Actualizar en el estado
      dispatch({ 
        type: 'UPDATE_ACCOUNT', 
        payload: { id: transaction.accountId, account: { balance: updatedBalance } }
      });
      
      // Actualizar cachÃ© local inmediatamente
      const updatedAccounts = state.accounts.map(acc => 
        acc.id === transaction.accountId ? { ...acc, balance: updatedBalance } : acc
      );
      mergeMemoryCache(user.id, { accounts: updatedAccounts });
      
      // Guardar cuenta actualizada en Firebase
      const updatedAccount = { ...account, balance: updatedBalance };
      saveAccount(updatedAccount).catch((error) => {
        console.error('Error guardando balance actualizado en Firebase:', error);
      });
    }
    
    // Agregar al estado inmediatamente
    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    trackEvent('transaction_created', { userId: user.id, type: transaction.type, category: transaction.category });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedTransactions = [...state.transactions, newTransaction];
    mergeMemoryCache(user.id, { transactions: updatedTransactions });
    
    // Guardar en Firebase en segundo plano
    saveTransaction(newTransaction).then((result) => {
      if (result.success && result.id) {
        // Actualizar con el ID de Firebase
        const finalTransaction = { ...newTransaction, id: result.id };
        dispatch({ 
          type: 'UPDATE_TRANSACTION', 
          payload: { id: newTransaction.id, transaction: { id: result.id } } 
        });
        
        // Actualizar cachÃ© con el ID real
        const finalTransactions = updatedTransactions.map(trx => 
          trx.id === newTransaction.id ? finalTransaction : trx
        );
        mergeMemoryCache(user.id, { transactions: finalTransactions });
        
        console.log('TransacciÃ³n guardada en Firebase:', result.id);
      }
    }).catch((error) => {
      console.error('Error guardando transacciÃ³n en Firebase:', error);
    });
  };

  const updateTransaction = (id: string, transaction: Partial<Transaction>) => {
    // Actualizar en el estado inmediatamente
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, transaction } });
    trackEvent('transaction_updated', { transactionId: id });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedTransactions = state.transactions.map(trx => 
      trx.id === id ? { ...trx, ...transaction } : trx
    );
    if (user?.id) {
      mergeMemoryCache(user.id, { transactions: updatedTransactions });
    }
    
    // Guardar en Firebase en segundo plano
    if (user?.id) {
      const transactionToUpdate = state.transactions.find(trx => trx.id === id);
      if (transactionToUpdate) {
        const updatedTransaction = { ...transactionToUpdate, ...transaction };
        saveTransaction(updatedTransaction).then(() => {
          console.log('TransacciÃ³n actualizada en Firebase');
        }).catch((error) => {
          console.error('Error actualizando transacciÃ³n en Firebase:', error);
        });
      }
    }
  };

  const deleteTransaction = (id: string) => {
    const transaction = state.transactions.find(trx => trx.id === id);
    if (transaction) {
      // Restore account balance
      const account = state.accounts.find(acc => acc.id === transaction.accountId);
      if (account) {
        const restoredBalance = transaction.type === 'income' 
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;
        
        // Actualizar en el estado
        dispatch({ 
          type: 'UPDATE_ACCOUNT', 
          payload: { id: transaction.accountId, account: { balance: restoredBalance } }
        });
        
        // Actualizar cachÃ© local inmediatamente
        const updatedAccounts = state.accounts.map(acc => 
          acc.id === transaction.accountId ? { ...acc, balance: restoredBalance } : acc
        );
        if (user?.id) {
          mergeMemoryCache(user.id, { accounts: updatedAccounts });
        }
        
        // Guardar cuenta actualizada en Firebase
        const updatedAccount = { ...account, balance: restoredBalance };
        saveAccount(updatedAccount).catch((error) => {
          console.error('Error guardando balance restaurado en Firebase:', error);
        });
      }
    }
    
    // Eliminar del estado inmediatamente
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    trackEvent('transaction_deleted', { transactionId: id, type: transaction?.type });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedTransactions = state.transactions.filter(trx => trx.id !== id);
    if (user?.id) {
      mergeMemoryCache(user.id, { transactions: updatedTransactions });
    }
    
    // Eliminar de Firebase en segundo plano
    if (id.startsWith('firebase_') && user?.id) {
      deleteTransactionFirebase(id, user.id).then(() => {
        console.log('TransacciÃ³n eliminada de Firebase');
      }).catch((error) => {
        console.error('Error eliminando transacciÃ³n de Firebase:', error);
      });
    }
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
    };
    
    // Agregar al estado inmediatamente
    dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedCategories = [...state.categories, newCategory];
    if (user?.id) {
      mergeMemoryCache(user.id, { categories: updatedCategories });
      
      // Guardar en Firebase en segundo plano
      saveCategories(user.id, updatedCategories).then(() => {
        console.log('CategorÃ­as guardadas en Firebase');
      }).catch((error) => {
        console.error('Error guardando categorÃ­as en Firebase:', error);
      });
    }
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    // Actualizar en el estado inmediatamente
    dispatch({ type: 'UPDATE_CATEGORY', payload: { id, category } });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedCategories = state.categories.map(cat => 
      cat.id === id ? { ...cat, ...category } : cat
    );
    if (user?.id) {
      mergeMemoryCache(user.id, { categories: updatedCategories });
      
      // Guardar en Firebase en segundo plano
      saveCategories(user.id, updatedCategories).then(() => {
        console.log('CategorÃ­as actualizadas en Firebase');
      }).catch((error) => {
        console.error('Error actualizando categorÃ­as en Firebase:', error);
      });
    }
  };

  const deleteCategory = (id: string) => {
    // Eliminar del estado inmediatamente
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
    
    // Actualizar cachÃ© local inmediatamente
    const updatedCategories = state.categories.filter(cat => cat.id !== id);
    if (user?.id) {
      mergeMemoryCache(user.id, { categories: updatedCategories });
      
      // Guardar en Firebase en segundo plano
      saveCategories(user.id, updatedCategories).then(() => {
        console.log('CategorÃ­a eliminada de Firebase');
      }).catch((error) => {
        console.error('Error eliminando categorÃ­a de Firebase:', error);
      });
    }
  };

  const { totalBalance, monthlyIncome, monthlyExpenses } = useMemo(() => {
    let nextTotalBalance = 0;
    for (const account of state.accounts) {
      nextTotalBalance += account.balance;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let nextMonthlyIncome = 0;
    let nextMonthlyExpenses = 0;

    for (const trx of state.transactions) {
      const trxDate = new Date(trx.date);
      if (trxDate.getMonth() !== currentMonth || trxDate.getFullYear() !== currentYear) {
        continue;
      }
      if (trx.type === 'income') {
        nextMonthlyIncome += trx.amount;
      } else {
        nextMonthlyExpenses += trx.amount;
      }
    }

    return {
      totalBalance: nextTotalBalance,
      monthlyIncome: nextMonthlyIncome,
      monthlyExpenses: nextMonthlyExpenses,
    };
  }, [state.accounts, state.transactions]);

  return (
    <FinanceContext.Provider
      value={{
        ...state,
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        isLoadingData: state.isLoadingData,
        addAccount,
        updateAccount,
        deleteAccount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};


