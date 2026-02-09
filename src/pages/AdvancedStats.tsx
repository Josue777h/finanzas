import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatCurrency';
import { useTheme } from '../context/ThemeContext';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const AdvancedStats: React.FC = () => {
  const { accounts, transactions, categories } = useFinance();
  const { isDarkMode } = useTheme();
  const { currency } = useCurrency();

  // Calculate monthly data for the last 6 months
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = transactions.filter(trx => {
        const trxDate = new Date(trx.date);
        return trxDate >= monthStart && trxDate <= monthEnd;
      });

      return {
        month: date.toLocaleDateString('es', { month: 'short' }),
        income: monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expenses: monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        balance: 0,
      };
    }).map(item => ({
      ...item,
      balance: item.income - item.expenses,
    }));
  }, [transactions]);

  // Category spending data
  const categorySpending = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, trx) => {
        const existing = acc.find(item => item.category === trx.category);
        if (existing) {
          existing.amount += trx.amount;
          existing.count += 1;
        } else {
          acc.push({ category: trx.category, amount: trx.amount, count: 1 });
        }
        return acc;
      }, [] as { category: string; amount: number; count: number }[])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  // Account performance
  const accountPerformance = useMemo(() => {
    return accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const totalIncome = accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      return {
        name: account.name,
        balance: account.balance,
        income: totalIncome,
        expenses: totalExpenses,
        transactions: accountTransactions.length,
      };
    });
  }, [accounts, transactions]);

  // Financial health metrics
  const { totalIncome, totalExpenses, savingsRate, avgTransaction } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const rate = income > 0 ? ((income - expenses) / income * 100) : 0;
    const avg = transactions.length > 0 ? (income + expenses) / transactions.length : 0;
    return { totalIncome: income, totalExpenses: expenses, savingsRate: rate, avgTransaction: avg };
  }, [transactions]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Estadísticas Avanzadas
        </h1>
        <p className={`mt-1 transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Análisis detallado de tus finanzas
        </p>
      </div>

      {/* Financial Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-up">
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
                Tasa de Ahorro
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                savingsRate >= 20 
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : savingsRate >= 10 
                    ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                    : isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {savingsRate.toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Target className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
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
                Transacción Promedio
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {formatCurrency(avgTransaction, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <DollarSign className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={24} />
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
                Total Transacciones
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {transactions.length}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <Calendar className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} size={24} />
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
                Categorías Activas
              </p>
              <p className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {categories.length}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
            }`}>
              <Award className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-bold mb-4 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Tendencia Mensual (6 meses)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
            />
            <XAxis 
              dataKey="month" 
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
            <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Ingresos" />
            <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Gastos" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-fade-up">
        {/* Top Categories */}
        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Top 5 Categorías de Gasto
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categorySpending}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
              />
              <XAxis 
                dataKey="category" 
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
              <Bar dataKey="amount" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Account Performance */}
        <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Rendimiento por Cuenta
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={accountPerformance}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="balance"
              >
                {accountPerformance.map((entry, index) => (
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
      </div>

      {/* Detailed Account Table */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-bold mb-4 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Análisis Detallado por Cuenta
        </h2>
        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {accountPerformance.map((account, index) => {
            const health = account.balance > 0 ? 'Excelente' : account.balance === 0 ? 'Neutral' : 'Crítico';
            const healthColor = account.balance > 0 
              ? isDarkMode ? 'text-green-400 bg-green-500/20' : 'text-green-600 bg-green-100'
              : account.balance === 0 
                ? isDarkMode ? 'text-yellow-400 bg-yellow-500/20' : 'text-yellow-600 bg-yellow-100'
                : isDarkMode ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100';
            return (
              <div
                key={index}
                className={`rounded-xl border p-4 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {account.name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Transacciones: {account.transactions}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${healthColor}`}>
                    {health}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Balance
                    <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(account.balance, currency)}
                    </div>
                  </div>
                  <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ingresos
                    <div className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      +{formatCurrency(account.income, currency)}
                    </div>
                  </div>
                  <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gastos
                    <div className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      -{formatCurrency(account.expenses, currency)}
                    </div>
                  </div>
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
                  Cuenta
                </th>
                <th className={`text-right py-3 px-4 font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Balance
                </th>
                <th className={`text-right py-3 px-4 font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Ingresos
                </th>
                <th className={`text-right py-3 px-4 font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Gastos
                </th>
                <th className={`text-right py-3 px-4 font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Transacciones
                </th>
                <th className={`text-center py-3 px-4 font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Salud
                </th>
              </tr>
            </thead>
            <tbody>
              {accountPerformance.map((account, index) => {
                const health = account.balance > 0 ? 'Excelente' : account.balance === 0 ? 'Neutral' : 'Crítico';
                const healthColor = account.balance > 0 
                  ? isDarkMode ? 'text-green-400 bg-green-500/20' : 'text-green-600 bg-green-100'
                  : account.balance === 0 
                    ? isDarkMode ? 'text-yellow-400 bg-yellow-500/20' : 'text-yellow-600 bg-yellow-100'
                    : isDarkMode ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100';
                
                return (
                  <tr 
                    key={index} 
                    className={`border-b transition-all duration-200 ${
                      isDarkMode
                        ? 'border-gray-700 hover:bg-gray-700/50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`py-3 px-4 font-semibold transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      {account.name}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      {formatCurrency(account.balance, currency)}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold transition-colors ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      +{formatCurrency(account.income, currency)}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold transition-colors ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      -{formatCurrency(account.expenses, currency)}
                    </td>
                    <td className={`py-3 px-4 text-right transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {account.transactions}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${healthColor}`}>
                        {health}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-bold mb-4 transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Insights Financieros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl transition-colors ${
            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
          }`}>
            <div className="flex items-center space-x-3">
              <TrendingUp className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={20} />
              <div>
                <p className={`font-semibold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Mejor Mes
                </p>
                <p className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {monthlyData.reduce((best, current) => 
                    current.balance > best.balance ? current : best
                  ).month} con {formatCurrency((monthlyData.reduce((best, current) => 
                    current.balance > best.balance ? current : best
                  ).balance), currency)} de ahorro
                </p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl transition-colors ${
            isDarkMode ? 'bg-red-500/20' : 'bg-red-50'
          }`}>
            <div className="flex items-center space-x-3">
              <TrendingDown className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={20} />
              <div>
                <p className={`font-semibold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Mayor Gasto
                </p>
                <p className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {categorySpending[0]?.category || 'N/A'} con {formatCurrency((categorySpending[0]?.amount || 0), currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStats;
