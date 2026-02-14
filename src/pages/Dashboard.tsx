import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatCurrency';
import { useTheme } from '../context/ThemeContext';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { accounts, transactions, totalBalance, monthlyIncome, monthlyExpenses, isLoadingData } = useFinance();
  const { isDarkMode } = useTheme();
  const { currency } = useCurrency();

  // Mostrar indicador de carga mientras se cargan los datos
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Cargando datos...</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500">Esto solo tomará un momento</p>
        </div>
      </div>
    );
  }

  const recentTransactions = useMemo(() => {
    const top: typeof transactions = [];
    for (const trx of transactions) {
      const trxTime = new Date(trx.date).getTime();
      let inserted = false;
      for (let i = 0; i < top.length; i++) {
        if (trxTime > new Date(top[i].date).getTime()) {
          top.splice(i, 0, trx);
          inserted = true;
          break;
        }
      }
      if (!inserted && top.length < 5) {
        top.push(trx);
      }
      if (top.length > 5) {
        top.length = 5;
      }
    }
    return top;
  }, [transactions]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('es', { weekday: 'short' });
    });
  }, []);

  const chartData = useMemo(() => {
    const dayIndexByKey = new Map<string, number>();
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      dayIndexByKey.set(d.toDateString(), i);
    }

    const totals = Array.from({ length: 7 }, () => ({ income: 0, expenses: 0 }));
    for (const trx of transactions) {
      const idx = dayIndexByKey.get(new Date(trx.date).toDateString());
      if (idx === undefined) continue;
      if (trx.type === 'income') {
        totals[idx].income += trx.amount;
      } else {
        totals[idx].expenses += trx.amount;
      }
    }

    return last7Days.map((day, index) => ({
      day,
      income: totals[index].income,
      expenses: totals[index].expenses,
    }));
  }, [last7Days, transactions]);

  const categoryData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    for (const trx of transactions) {
      if (trx.type !== 'expense') continue;
      categoryTotals.set(trx.category, (categoryTotals.get(trx.category) || 0) + trx.amount);
    }
    return Array.from(categoryTotals.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl md:text-4xl font-bold mb-2 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Dashboard
        </h1>
        <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Resumen general de tus finanzas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-up">
        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 hover:scale-105 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Balance Total
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {formatCurrency(totalBalance, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <DollarSign className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
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
              <p className={`text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Ingresos del Mes
              </p>
              <p className="text-2xl font-bold text-green-500 dark:text-green-400">
                {formatCurrency(monthlyIncome, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <ArrowUpRight className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={24} />
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
              <p className={`text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Gastos del Mes
              </p>
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">
                {formatCurrency(monthlyExpenses, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <ArrowDownRight className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={24} />
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
              <p className={`text-sm font-semibold mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Cuentas
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {accounts.length}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <CreditCard className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-fade-up">
        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Actividad de los últimos 7 días
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
              />
              <XAxis 
                dataKey="day" 
                stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
              />
              <YAxis 
                stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
              />
              <Tooltip 
                formatter={(value) => `$${value}`}
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDarkMode ? '#f3f4f6' : '#111827'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={2} 
                name="Ingresos"
                dot={{ fill: '#10b981', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2} 
                name="Gastos"
                dot={{ fill: '#ef4444', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {categoryData.length > 0 && (
          <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
            isDarkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-bold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Gastos por Categoría
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `$${value}`}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDarkMode ? '#f3f4f6' : '#111827'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-bold mb-4 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Transacciones Recientes
        </h2>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => {
              const account = accounts.find(acc => acc.id === transaction.accountId);
              return (
                <div 
                  key={transaction.id} 
                  className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 ${
                    isDarkMode 
                      ? 'hover:bg-gray-700/50 border-b border-gray-700 last:border-0' 
                      : 'hover:bg-gray-50 border-b border-gray-100 last:border-0'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'income' 
                        ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                        : isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={20} />
                      ) : (
                        <TrendingDown className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={20} />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold transition-colors ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        {transaction.description}
                      </p>
                      <p className={`text-sm transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {account?.name} • {transaction.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'income' 
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                    </p>
                    <p className={`text-sm transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {new Date(transaction.date).toLocaleDateString('es')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={`text-center py-8 transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            No hay transacciones recientes
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
