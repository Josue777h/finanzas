import { Transaction, Account, Category } from '../types';
import { auth } from '../firebase/config';

// Simulación de servicio de email - en producción esto se conectaría a un backend real
export interface EmailData {
  to: string;
  subject: string;
  body: string;
  type: 'alert' | 'monthly_report' | 'summary';
}

export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return false;
    const rawBase = process.env.REACT_APP_API_BASE || '';
    const apiBase = rawBase.replace(/\/+$/, '');
    const url = apiBase ? `${apiBase}/.netlify/functions/send-email` : `/.netlify/functions/send-email`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body
      })
    });
    if (!response.ok) {
      console.error('sendEmail failed:', response.status, await response.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};

export const generateMonthlyReport = (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  userEmail: string
): EmailData => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filtrar transacciones del mes actual
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
  
  // Top categorías del mes
  const categoryStats = categories.map(cat => {
    const catTransactions = monthTransactions.filter(t => t.category === cat.name);
    const amount = catTransactions.reduce((sum, t) => sum + t.amount, 0);
    return { category: cat.name, amount, count: catTransactions.length };
  }).filter(stat => stat.count > 0).sort((a, b) => b.amount - a.amount);
  
  const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  const body = `REPORTE MENSUAL FINANZAS APP
================================
Periodo: ${monthName}
Usuario: ${userEmail}

RESUMEN FINANCIERO
--------------------
Total Ingresos: $${totalIncome.toLocaleString()}
Total Gastos: $${totalExpense.toLocaleString()}
Balance Neto: $${netBalance.toLocaleString()} ${netBalance >= 0 ? '(Positivo)' : '(Negativo)'}
Total Transacciones: ${monthTransactions.length}

ESTADO DE CUENTAS
-------------------
${accounts.map(acc => {
  const accTransactions = monthTransactions.filter(t => t.accountId === acc.id);
  const accIncome = accTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const accExpense = accTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return `${acc.name}: $${accIncome.toLocaleString()} ingresos, $${accExpense.toLocaleString()} gastos`;
}).join('\n')}

TOP CATEGORIAS DEL MES
-------------------------
${categoryStats.slice(0, 5).map((stat, index) => 
  `${index + 1}. ${stat.category}: $${stat.amount.toLocaleString()} (${stat.count} transacciones)`
).join('\n')}

INSIGHTS
-----------
${netBalance >= 0 ? 
  '¡Excelente trabajo! Has mantenido un balance positivo este mes.' : 
  'Considera revisar tus gastos para mejorar tu balance el próximo mes.'
}

PROXIMOS PASOS
----------------
• Revisa tu presupuesto para el próximo mes
• Considera aumentar tus ahorros si es posible
• Revisa las categorías con mayor gasto

---
Este es un reporte automático generado por Finanzas App.
Para dejar de recibir estos emails, configura tus preferencias en la aplicación.`.trim();
  
  return {
    to: userEmail,
    subject: `Reporte Mensual - ${monthName}`,
    body,
    type: 'monthly_report' as const
  };
};

export const generateAlertEmail = (
  type: 'low_balance' | 'high_expense' | 'income_milestone',
  data: any,
  userEmail: string
): EmailData => {
  let subject = '';
  let body = '';
  
  switch (type) {
    case 'low_balance':
      subject = 'Alerta: Balance Bajo';
      body = `ALERTA DE BALANCE BAJO
========================
Hola ${userEmail},

Te notificamos que tu cuenta "${data.accountName}" tiene un balance bajo:

Balance actual: $${data.balance.toLocaleString()}
Umbral de alerta: $${data.threshold.toLocaleString()}

Te recomendamos:
• Revisar tus gastos recientes
• Considerar transferir fondos si es necesario
• Actualizar tu presupuesto si es necesario

---
Finanzas App - Tu asistente financiero personal`.trim();
      break;
      
    case 'high_expense':
      subject = 'Alerta: Gasto Elevado';
      body = `ALERTA DE GASTO ELEVADO
=========================
Hola ${userEmail},

Hemos detectado un gasto inusualmente alto:

Descripcion: ${data.description}
Monto: $${data.amount.toLocaleString()}
Cuenta: ${data.accountName}
Fecha: ${new Date(data.date).toLocaleDateString('es-ES')}

Este gasto representa el ${(data.percentage * 100).toFixed(1)}% de tu presupuesto mensual para esta categoria.

---
Finanzas App - Tu asistente financiero personal`.trim();
      break;
      
    case 'income_milestone':
      subject = 'Felicidades! Meta de Ingresos Alcanzada';
      body = `FELICIDADES! META ALCANZADA
=============================
Hola ${userEmail},

¡Excelente noticia! Has alcanzado tu meta de ingresos:

Meta: $${data.target.toLocaleString()}
Logrado: $${data.actual.toLocaleString()}
Progreso: ${((data.actual / data.target) * 100).toFixed(1)}%

Sigue así, vas por excelente camino hacia tus metas financieras.

---
Finanzas App - Tu asistente financiero personal`.trim();
      break;
  }
  
  return {
    to: userEmail,
    subject,
    body,
    type: 'alert' as const
  };
};

// Función para verificar y enviar alertas automáticas
export const checkAndSendAlerts = async (
  transactions: Transaction[],
  accounts: Account[],
  userEmail: string,
  preferences: any
): Promise<void> => {
  if (!preferences.emailAlerts) return;
  
  // Verificar balances bajos
  for (const account of accounts) {
    if (account.balance < 1000) { // Umbral de $1000
      const alertEmail = generateAlertEmail('low_balance', {
        accountName: account.name,
        balance: account.balance,
        threshold: 1000
      }, userEmail);
      
      await sendEmail(alertEmail);
    }
  }
  
  // Verificar gastos elevados (últimos 7 días)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentTransactions = transactions.filter(t => 
    new Date(t.date) >= sevenDaysAgo && t.type === 'expense'
  );
  
  if (recentTransactions.length > 0) {
    const avgExpense = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
    const maxExpense = Math.max(...recentTransactions.map(t => t.amount));
    
    // Alerta si algún gasto es 3x el promedio
    if (maxExpense > avgExpense * 3) {
      const highExpenseTransaction = recentTransactions.find(t => t.amount === maxExpense);
      if (highExpenseTransaction) {
        const alertEmail = generateAlertEmail('high_expense', {
          description: highExpenseTransaction.description,
          amount: highExpenseTransaction.amount,
          accountName: accounts.find(a => a.id === highExpenseTransaction.accountId)?.name || 'Desconocida',
          date: highExpenseTransaction.date,
          percentage: maxExpense / avgExpense
        }, userEmail);
        
        await sendEmail(alertEmail);
      }
    }
  }
};
