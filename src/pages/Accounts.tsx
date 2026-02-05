import React, { useEffect, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSimpleMode } from '../context/SimpleModeContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Plus, CreditCard, Wallet, PiggyBank, TrendingUp, Edit2, Trash2 } from 'lucide-react';

const accountIcons = {
  checking: CreditCard,
  savings: PiggyBank,
  credit: Wallet,
  investment: TrendingUp,
};

const getAccountColors = (isDarkMode: boolean) => ({
  checking: isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
  savings: isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600',
  credit: isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
  investment: isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
});

const accountLabels = {
  checking: 'Cuenta Corriente',
  savings: 'Cuenta de Ahorros',
  credit: 'Tarjeta de Crédito',
  investment: 'Inversión',
};

const Accounts: React.FC = () => {
  console.log('Accounts.tsx: Componente Accounts renderizado.'); // Nueva línea
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { isSimpleMode } = useSimpleMode();
  const { currency } = useCurrency();
  const accountColors = getAccountColors(isDarkMode);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as const,
    balance: '',
    currency: currency,
  });
  const [quickAccount, setQuickAccount] = useState({
    name: '',
    balance: '',
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, currency }));
  }, [currency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const accountData = {
      name: formData.name,
      type: formData.type,
      balance: parseFloat(formData.balance),
      currency: formData.currency,
      userId: user?.id || '',
    };

    if (editingAccount) {
      updateAccount(editingAccount, accountData);
    } else {
      addAccount(accountData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: '',
      currency: currency,
    });
    setShowModal(false);
    setEditingAccount(null);
  };

  const handleEdit = (account: any) => {
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
    });
    setEditingAccount(account.id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta?')) {
      deleteAccount(id);
    }
  };

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAccount.name || !quickAccount.balance) return;
    addAccount({
      name: quickAccount.name,
      type: 'checking',
      balance: parseFloat(quickAccount.balance),
      currency: currency,
      userId: user?.id || '',
    });
    setQuickAccount({ name: '', balance: '' });
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-6">
      {isSimpleMode && (
        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Crear cuenta rápido
          </h2>
          <form onSubmit={handleQuickCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-3">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Nombre
              </label>
              <input
                type="text"
                value={quickAccount.name}
                onChange={(e) => setQuickAccount({ ...quickAccount, name: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500'
                }`}
                placeholder="Ej: Cuenta principal"
                required
              />
            </div>
            <div className="md:col-span-1">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Balance
              </label>
              <input
                type="number"
                value={quickAccount.balance}
                onChange={(e) => setQuickAccount({ ...quickAccount, balance: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500'
                }`}
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                }`}
              >
                Crear
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Cuentas
          </h1>
          <p className={`mt-1 transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Gestiona tus cuentas bancarias
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 btn-accent ${
            isDarkMode
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
          }`}
        >
          <Plus size={20} />
          <span>Nueva Cuenta</span>
        </button>
      </div>

      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Balance Total
          </h2>
          <p className={`text-2xl font-bold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            {formatCurrency(totalBalance, currency)}
          </p>
        </div>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const Icon = accountIcons[account.type];
              return (
                <div 
                  key={account.id} 
                  className={`border rounded-xl p-5 transition-all duration-200 hover:scale-105 ${
                    isDarkMode
                      ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:shadow-lg'
                      : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${accountColors[account.type]}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className={`transition-colors ${
                          isDarkMode
                            ? 'text-gray-400 hover:text-blue-400'
                            : 'text-gray-400 hover:text-blue-600'
                        }`}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className={`transition-colors ${
                          isDarkMode
                            ? 'text-gray-400 hover:text-red-400'
                            : 'text-gray-400 hover:text-red-600'
                        }`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className={`font-bold mb-1 transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {account.name}
                  </h3>
                  <p className={`text-sm mb-3 transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {accountLabels[account.type]}
                  </p>
                  
                  <div className={`text-xl font-bold transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {formatCurrency(account.balance, currency)}
                  </div>
                  <div className={`text-sm transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {currency}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className={`mx-auto mb-4 transition-colors ${
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`} size={48} />
            <p className={`mb-4 transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No tienes cuentas registradas
            </p>
            <button
              onClick={() => setShowModal(true)}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
              }`}
            >
              Crear primera cuenta
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md transition-all duration-300 ${
            isDarkMode
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Nombre de la cuenta
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Ej: Cuenta BBVA"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tipo de cuenta
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="checking">Cuenta Corriente</option>
                  <option value="savings">Cuenta de Ahorros</option>
                  <option value="credit">Tarjeta de Crédito</option>
                  <option value="investment">Inversión</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Balance inicial
                </label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Moneda
                </label>
                <div className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDarkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}>
                  {currency}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                  }`}
                >
                  {editingAccount ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
