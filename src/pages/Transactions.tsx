import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSimpleMode } from '../context/SimpleModeContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, Search } from 'lucide-react';

const Transactions: React.FC = () => {
  const { accounts, transactions, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { isSimpleMode } = useSimpleMode();
  const { currency } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    description: '',
  });
  const [quickData, setQuickData] = useState({
    accountId: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    description: '',
  });

  // Defaults inteligentes para el formulario rápido
  React.useEffect(() => {
    if (!accounts.length) return;

    const latestTransaction = transactions.reduce((latest, trx) => {
      if (!latest) return trx;
      return new Date(trx.date) > new Date(latest.date) ? trx : latest;
    }, null as any);

    setQuickData((prev) => {
      const next = { ...prev };
      if (!next.accountId) {
        next.accountId = latestTransaction?.accountId || accounts[0].id;
      }
      if (!next.category) {
        const available = categories.filter((cat) =>
          prev.type === 'income' ? cat.type === 'income' : cat.type === 'expense'
        );
        next.category = latestTransaction?.category || available[0]?.name || '';
      }
      return next;
    });
  }, [accounts, categories, transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transactionData = {
      accountId: formData.accountId,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      description: formData.description,
      userId: user?.id || '',
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction, transactionData);
    } else {
      addTransaction(transactionData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      accountId: '',
      amount: '',
      type: 'expense',
      category: '',
      description: '',
    });
    setShowModal(false);
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: any) => {
    setFormData({
      accountId: transaction.accountId,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
    });
    setEditingTransaction(transaction.id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      deleteTransaction(id);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickData.amount || !quickData.accountId || !quickData.category) return;

    addTransaction({
      accountId: quickData.accountId,
      amount: parseFloat(quickData.amount),
      type: quickData.type,
      category: quickData.category,
      description: quickData.description || (quickData.type === 'income' ? 'Ingreso' : 'Gasto'),
      userId: user?.id || '',
    });

    setQuickData((prev) => ({
      ...prev,
      amount: '',
      description: '',
    }));
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const availableCategories = categories.filter(cat => 
    formData.type === 'income' ? cat.type === 'income' : cat.type === 'expense'
  );
  const quickCategories = categories.filter(cat =>
    quickData.type === 'income' ? cat.type === 'income' : cat.type === 'expense'
  );

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
            Registro rápido
          </h2>
          <form onSubmit={handleQuickAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-1">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Tipo
              </label>
              <select
                value={quickData.type}
                onChange={(e) => setQuickData({ ...quickData, type: e.target.value as any, category: '' })}
                className={`w-full px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500'
                }`}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Monto
              </label>
              <input
                type="number"
                value={quickData.amount}
                onChange={(e) => setQuickData({ ...quickData, amount: e.target.value })}
                className={`w-full px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500'
                }`}
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Categoría
              </label>
              <select
                value={quickData.category}
                onChange={(e) => setQuickData({ ...quickData, category: e.target.value })}
                className={`w-full px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500'
                }`}
                required
              >
                <option value="">Selecciona</option>
                {quickCategories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Cuenta
              </label>
              <select
                value={quickData.accountId}
                onChange={(e) => setQuickData({ ...quickData, accountId: e.target.value })}
                className={`w-full px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500'
                }`}
                required
              >
                <option value="">Selecciona</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={quickData.description}
                onChange={(e) => setQuickData({ ...quickData, description: e.target.value })}
                className={`w-full px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500'
                }`}
                placeholder="Ej: Comida"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl font-semibold transition-all duration-200 btn-accent ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                }`}
              >
                Guardar
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
            Transacciones
          </h1>
          <p className={`mt-1 transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Registra y gestiona tus ingresos y gastos
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
          <span>Nueva Transacción</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-fade-up">
        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 hover:scale-105 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-1 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Ingresos
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {formatCurrency(totalIncome, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <TrendingUp className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={24} />
            </div>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 hover:scale-105 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-1 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Gastos
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <TrendingDown className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={24} />
            </div>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 hover:scale-105 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-1 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Balance
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                totalIncome - totalExpenses >= 0
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {formatCurrency(totalIncome - totalExpenses, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              totalIncome - totalExpenses >= 0
                ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                : isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              {totalIncome - totalExpenses >= 0 ? (
                <TrendingUp className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={24} />
              ) : (
                <TrendingDown className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={24} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
              placeholder="Buscar transacciones..."
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className={`px-4 py-2.5 rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
          >
            <option value="all">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-4 py-2.5 rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
        </div>

        {filteredTransactions.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredTransactions.map((transaction) => {
                const account = accounts.find(acc => acc.id === transaction.accountId);
                return (
                  <div
                    key={transaction.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800/50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {transaction.description}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(transaction.date).toLocaleDateString('es')}
                        </p>
                      </div>
                      <div className={`text-right font-bold ${
                        transaction.type === 'income'
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.category}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {account?.name || 'Cuenta'}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className={`transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'
                        }`}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className={`transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-600'
                        }`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className={`border-b transition-colors ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <th className={`text-left py-3 px-4 font-semibold transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Fecha
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Descripción
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Categoría
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Cuenta
                  </th>
                  <th className={`text-right py-3 px-4 font-semibold transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Monto
                  </th>
                  <th className={`text-center py-3 px-4 font-semibold transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const account = accounts.find(acc => acc.id === transaction.accountId);
                  return (
                    <tr 
                      key={transaction.id} 
                      className={`border-b transition-all duration-200 ${
                        isDarkMode
                          ? 'border-gray-700 hover:bg-gray-700/50'
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`py-3 px-4 text-sm transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {new Date(transaction.date).toLocaleDateString('es')}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-semibold transition-colors ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          isDarkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.category}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-sm transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {account?.name}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold transition-colors ${
                        transaction.type === 'income'
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className={`transition-colors ${
                              isDarkMode
                                ? 'text-gray-400 hover:text-blue-400'
                                : 'text-gray-400 hover:text-blue-600'
                            }`}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className={`transition-colors ${
                              isDarkMode
                                ? 'text-gray-400 hover:text-red-400'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className={`mx-auto mb-4 transition-colors ${
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`} size={48} />
            <p className={`mb-4 transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No hay transacciones registradas
            </p>
            <button
              onClick={() => setShowModal(true)}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
              }`}
            >
              Crear primera transacción
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md transition-all duration-300 max-h-[90vh] overflow-y-auto ${
            isDarkMode
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 ${
                      formData.type === 'income'
                        ? isDarkMode
                          ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                          : 'bg-green-100 text-green-700 border-2 border-green-300'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 border-2 border-gray-600'
                          : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                    }`}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 ${
                      formData.type === 'expense'
                        ? isDarkMode
                          ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                          : 'bg-red-100 text-red-700 border-2 border-red-300'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 border-2 border-gray-600'
                          : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                    }`}
                  >
                    Gasto
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Descripción
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Ej: Pago de sueldo"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Monto
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {availableCategories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Cuenta
                </label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  required
                >
                  <option value="">Selecciona una cuenta</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance, currency)})
                    </option>
                  ))}
                </select>
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
                  {editingTransaction ? 'Actualizar' : 'Crear'}
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

export default Transactions;
