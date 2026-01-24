import { Transaction, Account, Category } from '../types';
import { exportFullReportToExcel } from './exportToExcel';
import { generateMonthlyReport, sendEmail } from './emailService';

export interface MonthlyReportData {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  accountCount: number;
  topCategories: Array<{
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  insights: string[];
}

export const generateMonthlyReportData = (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  targetMonth?: Date
): MonthlyReportData => {
  const now = targetMonth || new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filtrar transacciones del mes
  const monthTransactions = transactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
  });
  
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netBalance = totalIncome - totalExpense;
  
  // Análisis de categorías
  const categoryStats = categories.map(cat => {
    const catTransactions = monthTransactions.filter(t => t.category === cat.name);
    const amount = catTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      name: cat.name,
      amount,
      count: catTransactions.length,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    };
  }).filter(stat => stat.count > 0).sort((a, b) => b.amount - a.amount);
  
  // Generar insights
  const insights: string[] = [];
  
  if (netBalance > 0) {
    insights.push(`¡Excelente! Tuviste un balance positivo de $${netBalance.toLocaleString()}`);
  } else {
    insights.push(`Tu balance fue negativo en $${Math.abs(netBalance).toLocaleString()}. Considera revisar tus gastos.`);
  }
  
  if (monthTransactions.length > 0) {
    const avgTransaction = (totalIncome + totalExpense) / monthTransactions.length;
    insights.push(`El promedio por transacción fue de $${avgTransaction.toLocaleString()}`);
  }
  
  const topCategory = categoryStats[0];
  if (topCategory) {
    insights.push(`Tu categoría con mayor gasto fue "${topCategory.name}" con $${topCategory.amount.toLocaleString()}`);
  }
  
  // Comparación con el mes anterior
  const prevMonth = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthTransactions = transactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === prevMonth.getMonth() && transDate.getFullYear() === prevMonth.getFullYear();
  });
  
  if (prevMonthTransactions.length > 0) {
    const prevMonthExpense = prevMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (totalExpense < prevMonthExpense) {
      const reduction = ((prevMonthExpense - totalExpense) / prevMonthExpense) * 100;
      insights.push(`¡Bien hecho! Redujiste tus gastos en un ${reduction.toFixed(1)}% comparado con el mes anterior`);
    } else if (totalExpense > prevMonthExpense) {
      const increase = ((totalExpense - prevMonthExpense) / prevMonthExpense) * 100;
      insights.push(`Tus gastos aumentaron un ${increase.toFixed(1)}% comparado con el mes anterior`);
    }
  }
  
  return {
    month: now.toLocaleDateString('es-ES', { month: 'long' }),
    year: currentYear,
    totalIncome,
    totalExpense,
    netBalance,
    transactionCount: monthTransactions.length,
    accountCount: accounts.length,
    topCategories: categoryStats.slice(0, 5),
    insights
  };
};

export const sendMonthlyReport = async (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  userEmail: string
): Promise<boolean> => {
  try {
    const emailData = generateMonthlyReport(transactions, accounts, categories, userEmail);
    const success = await sendEmail(emailData);
    return success;
  } catch (error) {
    console.error('Error enviando reporte mensual:', error);
    return false;
  }
};

export const generateAndDownloadMonthlyReport = (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  targetMonth?: Date
): void => {
  const now = targetMonth || new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filtrar transacciones del mes
  const monthTransactions = transactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
  });
  
  // Generar reporte Excel solo con datos del mes
  exportFullReportToExcel(monthTransactions, accounts, categories);
};

// Función para verificar si es momento de enviar reportes mensuales
export const checkMonthlyReportSchedule = (
  lastReportDate: string | null,
  userEmail: string,
  preferences: { monthlyReport: boolean }
): boolean => {
  if (!preferences.monthlyReport) return false;
  
  const now = new Date();
  const currentDay = now.getDate();
  
  // Enviar reporte el día 1 de cada mes
  if (currentDay !== 1) return false;
  
  // Verificar si ya se envió este mes
  if (lastReportDate) {
    const lastReport = new Date(lastReportDate);
    const lastReportMonth = lastReport.getMonth();
    const lastReportYear = lastReport.getFullYear();
    
    if (lastReportMonth === now.getMonth() && lastReportYear === now.getFullYear()) {
      return false; // Ya se envió este mes
    }
  }
  
  return true;
};

// Almacenar la fecha del último reporte enviado
export const markMonthlyReportAsSent = (userId: string): void => {
  const now = new Date().toISOString();
  localStorage.setItem(`lastMonthlyReport_${userId}`, now);
};

// Obtener la fecha del último reporte enviado
export const getLastMonthlyReportDate = (userId: string): string | null => {
  return localStorage.getItem(`lastMonthlyReport_${userId}`);
};
