import { Transaction, Account } from '../types';

export const exportToCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle dates and special formatting
        if (header === 'date' && value instanceof Date) {
          return value.toLocaleDateString('es');
        }
        // Escape commas and quotes in strings
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTransactions = (transactions: Transaction[]) => {
  const exportData = transactions.map(trx => ({
    fecha: new Date(trx.date).toLocaleDateString('es'),
    descripcion: trx.description,
    categoria: trx.category,
    tipo: trx.type === 'income' ? 'Ingreso' : 'Gasto',
    monto: trx.amount,
    cuentaId: trx.accountId
  }));
  
  exportToCSV(exportData, `transacciones_${new Date().toISOString().split('T')[0]}`);
};

export const exportAccounts = (accounts: Account[]) => {
  const exportData = accounts.map(acc => ({
    nombre: acc.name,
    tipo: acc.type,
    balance: acc.balance,
    moneda: acc.currency,
    fechaCreacion: new Date(acc.createdAt).toLocaleDateString('es')
  }));
  
  exportToCSV(exportData, `cuentas_${new Date().toISOString().split('T')[0]}`);
};

export const exportFullData = (transactions: Transaction[], accounts: Account[]) => {
  exportTransactions(transactions);
  setTimeout(() => exportAccounts(accounts), 500);
};
