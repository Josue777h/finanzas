import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
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
    { id: '1', name: 'Salario', color: '#10b981', icon: '💰', type: 'income' },
    { id: '2', name: 'Comida', color: '#ef4444', icon: '🍔', type: 'expense' },
    { id: '3', name: 'Transporte', color: '#f59e0b', icon: '🚗', type: 'expense' },
    { id: '4', name: 'Entretenimiento', color: '#8b5cf6', icon: '🎮', type: 'expense' },
    { id: '5', name: 'Facturas', color: '#3b82f6', icon: '📄', type: 'expense' },
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

      // Mostrar caché local inmediatamente
      const cachedAccounts = JSON.parse(localStorage.getItem(`accounts_${user.id}`) || '[]');
      const cachedTransactions = JSON.parse(localStorage.getItem(`transactions_${user.id}`) || '[]');
      const cachedCategories = JSON.parse(localStorage.getItem(`categories_${user.id}`) || '[]');

      if (cachedAccounts.length > 0 || cachedTransactions.length > 0) {
        dispatch({ type: 'SET_ACCOUNTS', payload: cachedAccounts as Account[] });
        dispatch({ type: 'SET_TRANSACTIONS', payload: cachedTransactions as Transaction[] });
        dispatch({ type: 'SET_CATEGORIES', payload: cachedCategories.length > 0 ? cachedCategories as Category[] : initialState.categories });
      }

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
          localStorage.setItem(`accounts_${user.id}`, JSON.stringify(accounts));
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
          localStorage.setItem(`transactions_${user.id}`, JSON.stringify(transactions));
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
          localStorage.setItem(`categories_${user.id}`, JSON.stringify(finalCategories));
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

  // Guardar categorías cuando cambian (las cuentas y transacciones se guardan individualmente)
  useEffect(() => {
    const saveCategoriesData = async () => {
      if (user?.id && isAuthenticated && state.categories.length > 0) {
        try {
          await saveCategories(user.id, state.categories);
          console.log('Categorías guardadas en Firebase');
        } catch (error) {
          console.error('Error guardando categorías:', error);
        }
      }
    };
    
    saveCategoriesData();
  }, [state.categories, user?.id, isAuthenticated]);

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
    
    // Agregar al estado inmediatamente para respuesta rápida
    dispatch({ type: 'ADD_ACCOUNT', payload: newAccount });
    trackEvent('account_created', { userId: user.id, accountType: account.type });
    
    // Actualizar caché local inmediatamente
    const updatedAccounts = [...state.accounts, newAccount];
    localStorage.setItem(`accounts_${user.id}`, JSON.stringify(updatedAccounts));
    
    // Guardar en Firebase en segundo plano
    saveAccount(newAccount).then((result) => {
      if (result.success && result.id) {
        // Actualizar con el ID de Firebase
        const finalAccount = { ...newAccount, id: result.id };
        dispatch({ 
          type: 'UPDATE_ACCOUNT', 
          payload: { id: newAccount.id, account: { id: result.id } } 
        });
        
        // Actualizar caché con el ID real
        const finalAccounts = state.accounts.map(acc => 
          acc.id === newAccount.id ? finalAccount : acc
        );
        localStorage.setItem(`accounts_${user.id}`, JSON.stringify(finalAccounts));
        
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
    
    // Actualizar caché local inmediatamente
    const updatedAccounts = state.accounts.map(acc => 
      acc.id === id ? { ...acc, ...account } : acc
    );
    if (user?.id) {
      localStorage.setItem(`accounts_${user.id}`, JSON.stringify(updatedAccounts));
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

    // Actualizar caché local
    if (user?.id) {
      const updatedAccounts = state.accounts.filter(acc => acc.id !== id);
      localStorage.setItem(`accounts_${user.id}`, JSON.stringify(updatedAccounts));
      localStorage.setItem(`transactions_${user.id}`, JSON.stringify(remainingTransactions));
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    if (!user?.id) {
      console.error('No se puede agregar transacción: usuario no autenticado');
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
      
      // Actualizar caché local inmediatamente
      const updatedAccounts = state.accounts.map(acc => 
        acc.id === transaction.accountId ? { ...acc, balance: updatedBalance } : acc
      );
      localStorage.setItem(`accounts_${user.id}`, JSON.stringify(updatedAccounts));
      
      // Guardar cuenta actualizada en Firebase
      const updatedAccount = { ...account, balance: updatedBalance };
      saveAccount(updatedAccount).catch((error) => {
        console.error('Error guardando balance actualizado en Firebase:', error);
      });
    }
    
    // Agregar al estado inmediatamente
    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    trackEvent('transaction_created', { userId: user.id, type: transaction.type, category: transaction.category });
    
    // Actualizar caché local inmediatamente
    const updatedTransactions = [...state.transactions, newTransaction];
    localStorage.setItem(`transactions_${user.id}`, JSON.stringify(updatedTransactions));
    
    // Guardar en Firebase en segundo plano
    saveTransaction(newTransaction).then((result) => {
      if (result.success && result.id) {
        // Actualizar con el ID de Firebase
        const finalTransaction = { ...newTransaction, id: result.id };
        dispatch({ 
          type: 'UPDATE_TRANSACTION', 
          payload: { id: newTransaction.id, transaction: { id: result.id } } 
        });
        
        // Actualizar caché con el ID real
        const finalTransactions = state.transactions.map(trx => 
          trx.id === newTransaction.id ? finalTransaction : trx
        );
        localStorage.setItem(`transactions_${user.id}`, JSON.stringify(finalTransactions));
        
        console.log('Transacción guardada en Firebase:', result.id);
      }
    }).catch((error) => {
      console.error('Error guardando transacción en Firebase:', error);
    });
  };

  const updateTransaction = (id: string, transaction: Partial<Transaction>) => {
    // Actualizar en el estado inmediatamente
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, transaction } });
    trackEvent('transaction_updated', { transactionId: id });
    
    // Actualizar caché local inmediatamente
    const updatedTransactions = state.transactions.map(trx => 
      trx.id === id ? { ...trx, ...transaction } : trx
    );
    if (user?.id) {
      localStorage.setItem(`transactions_${user.id}`, JSON.stringify(updatedTransactions));
    }
    
    // Guardar en Firebase en segundo plano
    if (user?.id) {
      const transactionToUpdate = state.transactions.find(trx => trx.id === id);
      if (transactionToUpdate) {
        const updatedTransaction = { ...transactionToUpdate, ...transaction };
        saveTransaction(updatedTransaction).then(() => {
          console.log('Transacción actualizada en Firebase');
        }).catch((error) => {
          console.error('Error actualizando transacción en Firebase:', error);
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
        
        // Actualizar caché local inmediatamente
        const updatedAccounts = state.accounts.map(acc => 
          acc.id === transaction.accountId ? { ...acc, balance: restoredBalance } : acc
        );
        if (user?.id) {
          localStorage.setItem(`accounts_${user.id}`, JSON.stringify(updatedAccounts));
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
    
    // Actualizar caché local inmediatamente
    const updatedTransactions = state.transactions.filter(trx => trx.id !== id);
    if (user?.id) {
      localStorage.setItem(`transactions_${user.id}`, JSON.stringify(updatedTransactions));
    }
    
    // Eliminar de Firebase en segundo plano
    if (id.startsWith('firebase_') && user?.id) {
      deleteTransactionFirebase(id, user.id).then(() => {
        console.log('Transacción eliminada de Firebase');
      }).catch((error) => {
        console.error('Error eliminando transacción de Firebase:', error);
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
    
    // Actualizar caché local inmediatamente
    const updatedCategories = [...state.categories, newCategory];
    if (user?.id) {
      localStorage.setItem(`categories_${user.id}`, JSON.stringify(updatedCategories));
      
      // Guardar en Firebase en segundo plano
      saveCategories(user.id, updatedCategories).then(() => {
        console.log('Categorías guardadas en Firebase');
      }).catch((error) => {
        console.error('Error guardando categorías en Firebase:', error);
      });
    }
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    // Actualizar en el estado inmediatamente
    dispatch({ type: 'UPDATE_CATEGORY', payload: { id, category } });
    
    // Actualizar caché local inmediatamente
    const updatedCategories = state.categories.map(cat => 
      cat.id === id ? { ...cat, ...category } : cat
    );
    if (user?.id) {
      localStorage.setItem(`categories_${user.id}`, JSON.stringify(updatedCategories));
      
      // Guardar en Firebase en segundo plano
      saveCategories(user.id, updatedCategories).then(() => {
        console.log('Categorías actualizadas en Firebase');
      }).catch((error) => {
        console.error('Error actualizando categorías en Firebase:', error);
      });
    }
  };

  const deleteCategory = (id: string) => {
    // Eliminar del estado inmediatamente
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
    
    // Actualizar caché local inmediatamente
    const updatedCategories = state.categories.filter(cat => cat.id !== id);
    if (user?.id) {
      localStorage.setItem(`categories_${user.id}`, JSON.stringify(updatedCategories));
      
      // Guardar en Firebase en segundo plano
      saveCategories(user.id, updatedCategories).then(() => {
        console.log('Categoría eliminada de Firebase');
      }).catch((error) => {
        console.error('Error eliminando categoría de Firebase:', error);
      });
    }
  };

  const totalBalance = state.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = state.transactions.filter(trx => {
    const trxDate = new Date(trx.date);
    return trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter(trx => trx.type === 'income')
    .reduce((sum, trx) => sum + trx.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(trx => trx.type === 'expense')
    .reduce((sum, trx) => sum + trx.amount, 0);

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
