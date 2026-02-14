import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Transaction, Account, Category } from '../types';

// Estilos para las celdas en Excel
const createStyles = () => ({
  header: {
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: 'FF4F81BD' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FF000000' } },
      bottom: { style: 'thin', color: { rgb: 'FF000000' } },
      left: { style: 'thin', color: { rgb: 'FF000000' } },
      right: { style: 'thin', color: { rgb: 'FF000000' } }
    }
  },
  currency: {
    font: { color: { rgb: 'FF000000' } },
    alignment: { horizontal: 'right' },
    numFmt: '"$"#,##0.00'
  },
  number: {
    font: { color: { rgb: 'FF000000' } },
    alignment: { horizontal: 'right' },
    numFmt: '#,##0.00'
  },
  date: {
    font: { color: { rgb: 'FF000000' } },
    alignment: { horizontal: 'center' },
    numFmt: 'dd/mm/yyyy'
  },
  bold: {
    font: { bold: true, color: { rgb: 'FF000000' } }
  },
  center: {
    font: { color: { rgb: 'FF000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  left: {
    font: { color: { rgb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  formula: {
    font: { sz: 9, color: { rgb: 'FF666666' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  }
});

export const exportTransactionsToExcel = (transactions: Transaction[], accounts: Account[]) => {
  const wb = XLSX.utils.book_new();
  const styles = createStyles();

  // Preparar datos de transacciones con información completa
  const transactionsData = transactions.map(trx => {
    const account = accounts.find(acc => acc.id === trx.accountId);
    const accountType = account ? (account.type === 'savings' ? 'Ahorro' : account.type === 'checking' ? 'Corriente' : 'Efectivo') : 'Desconocida';
    const accountBalance = account?.balance || 0;
    const accountCreatedAt = account?.createdAt ? new Date(account.createdAt) : new Date();
    
    return {
      'ID Transacción': trx.id,
      'Fecha': new Date(trx.date),
      'Hora': new Date(trx.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      'Descripción': trx.description,
      'Categoría': trx.category,
      'Tipo': trx.type === 'income' ? 'INGRESO' : 'GASTO',
      'Monto': trx.amount,
      'Saldo Después Movimiento': trx.type === 'income' ? accountBalance + trx.amount : accountBalance - trx.amount,
      'ID Cuenta': trx.accountId,
      'Nombre Cuenta': account?.name || 'Desconocida',
      'Tipo Cuenta': accountType,
      'Saldo Actual Cuenta': accountBalance,
      'Fecha Creación Cuenta': accountCreatedAt,
      'Número de Movimientos': transactions.filter(t => t.accountId === trx.accountId).length,
      'Mes': new Date(trx.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      'Día Semana': new Date(trx.date).toLocaleDateString('es-ES', { weekday: 'long' })
    };
  });

  // Crear worksheet para transacciones
  const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);

  // Aplicar anchos de columna para los nuevos campos
  const colWidths = [
    { wch: 15 }, // ID Transacción
    { wch: 12 }, // Fecha
    { wch: 8 },  // Hora
    { wch: 30 }, // Descripción
    { wch: 20 }, // Categoría
    { wch: 12 }, // Tipo
    { wch: 15 }, // Monto
    { wch: 20 }, // Saldo Después Movimiento
    { wch: 15 }, // ID Cuenta
    { wch: 20 }, // Nombre Cuenta
    { wch: 15 }, // Tipo Cuenta
    { wch: 18 }, // Saldo Actual Cuenta
    { wch: 15 }, // Fecha Creación Cuenta
    { wch: 18 }, // Número de Movimientos
    { wch: 15 }, // Mes
    { wch: 12 }  // Día Semana
  ];
  wsTransactions['!cols'] = colWidths;

  // Aplicar estilos a las celdas
  const range = XLSX.utils.decode_range(wsTransactions['!ref'] || 'A1');
  
  // Estilo para encabezados
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsTransactions[cellAddress]) continue;
    wsTransactions[cellAddress].s = styles.header;
  }

  // Estilos para filas de datos
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    // Fecha
    const dateCell = XLSX.utils.encode_cell({ r: R, c: 0 });
    if (wsTransactions[dateCell]) {
      wsTransactions[dateCell].s = { ...styles.date, ...styles.center };
    }

    // Monto (formato moneda)
    const amountCell = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (wsTransactions[amountCell]) {
      wsTransactions[amountCell].s = styles.currency;
      wsTransactions[amountCell].z = '"$"#,##0.00';
    }

    // Tipo (colorear según ingreso/gasto)
    const typeCell = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (wsTransactions[typeCell]) {
      const cellValue = wsTransactions[typeCell].v;
      wsTransactions[typeCell].s = cellValue === 'INGRESO' ? 
        { font: { bold: true, color: { rgb: 'FF008000' } } } : 
        { font: { bold: true, color: { rgb: 'FFFF0000' } } };
    }
  }

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transacciones');

  // Crear resumen
  const summaryData = [
    { 'Métrica': 'Total Transacciones', 'Valor': transactions.length },
    { 'Métrica': 'Total Ingresos', 'Valor': transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) },
    { 'Métrica': 'Total Gastos', 'Valor': transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) },
    { 'Métrica': 'Balance Neto', 'Valor': transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0) },
    { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleDateString('es') }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];

  // Estilos para resumen
  const summaryRange = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1');
  for (let C = summaryRange.s.c; C <= summaryRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsSummary[cellAddress]) continue;
    wsSummary[cellAddress].s = styles.header;
  }

  // Formato moneda para valores
  for (let R = summaryRange.s.r + 1; R <= summaryRange.e.r - 1; R++) {
    const valueCell = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (wsSummary[valueCell] && typeof wsSummary[valueCell].v === 'number') {
      wsSummary[valueCell].s = styles.currency;
      wsSummary[valueCell].z = '"$"#,##0.00';
    }
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // Generar y descargar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Reporte_Financiero_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  saveAs(blob, fileName);
};

export const exportAccountsToExcel = (accounts: Account[], transactions: Transaction[] = []) => {
  const wb = XLSX.utils.book_new();
  const styles = createStyles();

  // Preparar datos de cuentas con información completa
  const accountsData = accounts.map(acc => {
    // Calcular estadísticas de la cuenta
    const accountTransactions = transactions.filter(t => t.accountId === acc.id);
    const totalIncome = accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncome - totalExpense;
    const lastTransaction = accountTransactions.length > 0 ? 
      new Date(Math.max(...accountTransactions.map(t => new Date(t.date).getTime()))) : 
      new Date(acc.createdAt);
    
    return {
      'ID Cuenta': acc.id,
      'Nombre de Cuenta': acc.name,
      'Tipo Cuenta': acc.type === 'checking' ? 'Cuenta Corriente' : 
                     acc.type === 'savings' ? 'Cuenta de Ahorros' : 
                     acc.type === 'credit' ? 'Tarjeta de Crédito' : 
                     acc.type === 'investment' ? 'Cuenta de Inversión' : 'Otro',
      'Balance Actual': acc.balance,
      'Moneda': acc.currency || 'USD',
      'Fecha Creación': new Date(acc.createdAt),
      'Hora Creación': new Date(acc.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      'Días Activa': Math.floor((new Date().getTime() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      'Total Movimientos': accountTransactions.length,
      'Total Ingresos': totalIncome,
      'Total Gastos': totalExpense,
      'Flujo Neto': netFlow,
      'Promedio Diario': accountTransactions.length > 0 ? netFlow / Math.max(1, Math.floor((new Date().getTime() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0,
      'Último Movimiento': lastTransaction,
      'Fecha Último Movimiento': lastTransaction.toLocaleDateString('es-ES'),
      'Movimientos Mes Actual': accountTransactions.filter(t => {
        const transDate = new Date(t.date);
        const now = new Date();
        return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
      }).length,
      'Ingresos Mes Actual': accountTransactions.filter(t => {
        const transDate = new Date(t.date);
        const now = new Date();
        return t.type === 'income' && transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
      }).reduce((sum, t) => sum + t.amount, 0),
      'Gastos Mes Actual': accountTransactions.filter(t => {
        const transDate = new Date(t.date);
        const now = new Date();
        return t.type === 'expense' && transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
      }).reduce((sum, t) => sum + t.amount, 0),
      'Categorías Usadas': Array.from(new Set(accountTransactions.map(t => t.category))).join(', ') || 'Ninguna',
      'Estado': acc.balance >= 0 ? 'Positivo' : 'Negativo',
      'Banco': 'No especificado',
      'Número Cuenta': 'N/A'
    };
  });

  const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
  wsAccounts['!cols'] = [
    { wch: 15 }, // ID Cuenta
    { wch: 25 }, // Nombre de Cuenta
    { wch: 20 }, // Tipo Cuenta
    { wch: 18 }, // Balance Actual
    { wch: 10 }, // Moneda
    { wch: 15 }, // Fecha Creación
    { wch: 10 }, // Hora Creación
    { wch: 12 }, // Días Activa
    { wch: 18 }, // Total Movimientos
    { wch: 15 }, // Total Ingresos
    { wch: 15 }, // Total Gastos
    { wch: 15 }, // Flujo Neto
    { wch: 15 }, // Promedio Diario
    { wch: 20 }, // Último Movimiento
    { wch: 20 }, // Fecha Último Movimiento
    { wch: 20 }, // Movimientos Mes Actual
    { wch: 18 }, // Ingresos Mes Actual
    { wch: 18 }, // Gastos Mes Actual
    { wch: 30 }, // Categorías Usadas
    { wch: 12 }, // Estado
    { wch: 20 }, // Banco
    { wch: 18 }, // Número Cuenta
    { wch: 25 }  // Notas
  ];

  // Aplicar estilos
  const range = XLSX.utils.decode_range(wsAccounts['!ref'] || 'A1');
  
  // Encabezados
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsAccounts[cellAddress]) continue;
    wsAccounts[cellAddress].s = styles.header;
  }

  // Formato para filas de datos
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    // Balance (formato moneda)
    const balanceCell = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (wsAccounts[balanceCell]) {
      wsAccounts[balanceCell].s = styles.currency;
      wsAccounts[balanceCell].z = '"$"#,##0.00';
    }

    // Fecha
    const dateCell = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (wsAccounts[dateCell]) {
      wsAccounts[dateCell].s = { ...styles.date, ...styles.center };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Cuentas');

  // Resumen de cuentas
  const summaryData = [
    { 'Métrica': 'Total de Cuentas', 'Valor': accounts.length },
    { 'Métrica': 'Balance Total', 'Valor': accounts.reduce((sum, acc) => sum + acc.balance, 0) },
    { 'Métrica': 'Promedio por Cuenta', 'Valor': accounts.length > 0 ? accounts.reduce((sum, acc) => sum + acc.balance, 0) / accounts.length : 0 },
    { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleDateString('es') }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];

  const summaryRange = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1');
  for (let C = summaryRange.s.c; C <= summaryRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsSummary[cellAddress]) continue;
    wsSummary[cellAddress].s = styles.header;
  }

  for (let R = summaryRange.s.r + 1; R <= summaryRange.e.r - 1; R++) {
    const valueCell = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (wsSummary[valueCell] && typeof wsSummary[valueCell].v === 'number') {
      wsSummary[valueCell].s = styles.currency;
      wsSummary[valueCell].z = '"$"#,##0.00';
    }
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Cuentas_Financieras_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  saveAs(blob, fileName);
};

export const exportFullReportToExcel = (transactions: Transaction[], accounts: Account[], categories: Category[]) => {
  const wb = XLSX.utils.book_new();
  const styles = createStyles();

  // Ordenar transacciones por fecha
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 📊 HOJA 1: MOVIMIENTOS (Datos Crudos Mejorados)
  const movementsData = sortedTransactions.map(trx => {
    const account = accounts.find(acc => acc.id === trx.accountId);
    const accountName = account?.name || 'Desconocida';
    
    return {
      'Fecha': new Date(trx.date),
      'Categoría': trx.category,
      'Tipo': trx.type === 'income' ? 'Ingreso' : 'Gasto',
      'Descripción': trx.description,
      'Monto': trx.type === 'income' ? trx.amount : -trx.amount,
      'Cuenta': accountName,
      'ID Cuenta': trx.accountId,
      'Mes': new Date(trx.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      'Día': new Date(trx.date).toLocaleDateString('es-ES', { weekday: 'long' })
    };
  });

  const wsMovements = XLSX.utils.json_to_sheet(movementsData);
  wsMovements['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 20 }, // Categoría
    { wch: 10 }, // Tipo
    { wch: 35 }, // Descripción
    { wch: 15 }, // Monto
    { wch: 20 }, // Cuenta
    { wch: 15 }, // ID Cuenta
    { wch: 15 }, // Mes
    { wch: 12 }  // Día
  ];

  // Aplicar estilos profesionales
  const movementsRange = XLSX.utils.decode_range(wsMovements['!ref'] || 'A1');
  for (let C = movementsRange.s.c; C <= movementsRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsMovements[cellAddress]) continue;
    wsMovements[cellAddress].s = styles.header;
  }

  // Formato para datos
  for (let R = movementsRange.s.r + 1; R <= movementsRange.e.r; R++) {
    // Fecha
    const dateCell = XLSX.utils.encode_cell({ r: R, c: 0 });
    if (wsMovements[dateCell]) {
      wsMovements[dateCell].s = { ...styles.date, ...styles.center };
      wsMovements[dateCell].z = 'dd/mm/yyyy';
    }
    
    // Monto (formato número con colores)
    const amountCell = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (wsMovements[amountCell]) {
      const amount = wsMovements[amountCell].v;
      const isIncome = amount > 0;
      wsMovements[amountCell].s = {
        font: { bold: true, color: { rgb: isIncome ? 'FF008000' : 'FFFF0000' } },
        alignment: { horizontal: 'right' },
        numFmt: '#,##0.00'
      };
    }
    
    // Tipo (colores)
    const typeCell = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (wsMovements[typeCell]) {
      const cellValue = wsMovements[typeCell].v;
      wsMovements[typeCell].s = cellValue === 'Ingreso' ? 
        { font: { bold: true, color: { rgb: 'FF008000' } }, alignment: { horizontal: 'center' } } : 
        { font: { bold: true, color: { rgb: 'FFFF0000' } }, alignment: { horizontal: 'center' } };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsMovements, 'Movimientos');

  // 📊 HOJA 2: RESUMEN (Sin Fórmulas - Datos Calculados)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const avgTransaction = transactions.length > 0 ? (totalIncome + totalExpense) / transactions.length : 0;
  const uniqueAccounts = Array.from(new Set(transactions.map(t => t.accountId))).length;
  const uniqueDates = Array.from(new Set(transactions.map(t => new Date(t.date).toDateString()))).length;
  const maxAmount = Math.max(...transactions.map(t => t.amount));
  const minAmount = Math.min(...transactions.map(t => t.amount));

  const summaryData = [
    { 'Indicador': 'Total de Ingresos', 'Valor': totalIncome, 'Unidad': 'moneda' },
    { 'Indicador': 'Total de Gastos', 'Valor': totalExpense, 'Unidad': 'moneda' },
    { 'Indicador': 'Balance Neto', 'Valor': netBalance, 'Unidad': 'moneda' },
    { 'Indicador': 'Promedio por Transacción', 'Valor': avgTransaction, 'Unidad': 'moneda' },
    { 'Indicador': 'Total de Cuentas', 'Valor': uniqueAccounts, 'Unidad': 'cuentas' },
    { 'Indicador': 'Días de Actividad', 'Valor': uniqueDates, 'Unidad': 'días' },
    { 'Indicador': 'Total de Transacciones', 'Valor': transactions.length, 'Unidad': 'movimientos' },
    { 'Indicador': 'Monto Máximo', 'Valor': maxAmount, 'Unidad': 'moneda' },
    { 'Indicador': 'Monto Mínimo', 'Valor': minAmount, 'Unidad': 'moneda' },
    { 'Indicador': 'Fecha de Exportación', 'Valor': new Date().toLocaleDateString('es-ES'), 'Unidad': 'fecha' }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 30 }, // Indicador
    { wch: 20 }, // Valor
    { wch: 12 }  // Unidad
  ];

  // Estilos para resumen
  const summaryRange = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1');
  for (let C = summaryRange.s.c; C <= summaryRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsSummary[cellAddress]) continue;
    wsSummary[cellAddress].s = styles.header;
  }

  // Formato para valores
  for (let R = summaryRange.s.r + 1; R <= summaryRange.e.r; R++) {
    // Indicador (negrita)
    const indicatorCell = XLSX.utils.encode_cell({ r: R, c: 0 });
    if (wsSummary[indicatorCell]) {
      wsSummary[indicatorCell].s = { ...styles.bold, ...styles.left };
    }
    
    // Valor (moneda o número)
    const valueCell = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (wsSummary[valueCell]) {
      const indicator = summaryData[R-1].Indicador;
      if (indicator.includes('Ingresos') || indicator.includes('Gastos') || indicator.includes('Balance') || indicator.includes('Promedio') || indicator.includes('Monto')) {
        wsSummary[valueCell].s = { ...styles.currency, ...styles.bold };
        wsSummary[valueCell].z = '"$"#,##0.00';
      } else {
        wsSummary[valueCell].s = { ...styles.bold, ...styles.center };
      }
    }
    
    // Unidad (gris pequeño)
    const unitCell = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (wsSummary[unitCell]) {
      wsSummary[unitCell].s = { font: { sz: 10, color: { rgb: 'FF666666' } }, alignment: { horizontal: 'center' } };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // 📊 HOJA 3: CUENTAS (Con Saldo Inicial)
  const accountsData = accounts.map(acc => {
    const accountTransactions = transactions.filter(t => t.accountId === acc.id);
    const totalIncome = accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncome - totalExpense;
    
    // Calcular saldo inicial (balance actual - flujo neto)
    const initialBalance = acc.balance - netFlow;
    
    return {
      'Cuenta': acc.name,
      'Tipo': acc.type === 'checking' ? 'Cuenta Corriente' : 
             acc.type === 'savings' ? 'Cuenta de Ahorros' : 
             acc.type === 'credit' ? 'Tarjeta de Crédito' : 
             acc.type === 'investment' ? 'Cuenta de Inversión' : 'Otra',
      'Saldo Inicial': initialBalance,
      'Total Ingresos': totalIncome,
      'Total Gastos': totalExpense,
      'Flujo Neto': netFlow,
      'Balance Actual': acc.balance,
      'Total Movimientos': accountTransactions.length,
      'Fecha Creación': new Date(acc.createdAt),
      'Días Activa': Math.floor((new Date().getTime() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      'Promedio Diario': accountTransactions.length > 0 ? netFlow / Math.max(1, Math.floor((new Date().getTime() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 0,
      'Estado': acc.balance >= 0 ? 'Positivo' : 'Negativo'
    };
  });

  const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
  wsAccounts['!cols'] = [
    { wch: 20 }, // Cuenta
    { wch: 18 }, // Tipo
    { wch: 15 }, // Saldo Inicial
    { wch: 15 }, // Total Ingresos
    { wch: 15 }, // Total Gastos
    { wch: 15 }, // Flujo Neto
    { wch: 15 }, // Balance Actual
    { wch: 18 }, // Total Movimientos
    { wch: 15 }, // Fecha Creación
    { wch: 12 }, // Días Activa
    { wch: 15 }, // Promedio Diario
    { wch: 12 }  // Estado
  ];

  // Estilos para cuentas
  const accountsRange = XLSX.utils.decode_range(wsAccounts['!ref'] || 'A1');
  for (let C = accountsRange.s.c; C <= accountsRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsAccounts[cellAddress]) continue;
    wsAccounts[cellAddress].s = styles.header;
  }

  // Formato para valores monetarios
  for (let R = accountsRange.s.r + 1; R <= accountsRange.e.r; R++) {
    // Saldo Inicial
    const initialCell = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (wsAccounts[initialCell]) {
      wsAccounts[initialCell].s = styles.currency;
      wsAccounts[initialCell].z = '"$"#,##0.00';
    }
    
    // Ingresos
    const incomeCell = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (wsAccounts[incomeCell]) {
      wsAccounts[incomeCell].s = { font: { color: { rgb: 'FF008000' } }, alignment: { horizontal: 'right' } };
      wsAccounts[incomeCell].z = '"$"#,##0.00';
    }
    
    // Gastos
    const expenseCell = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (wsAccounts[expenseCell]) {
      wsAccounts[expenseCell].s = { font: { color: { rgb: 'FFFF0000' } }, alignment: { horizontal: 'right' } };
      wsAccounts[expenseCell].z = '"$"#,##0.00';
    }
    
    // Flujo Neto
    const netCell = XLSX.utils.encode_cell({ r: R, c: 5 });
    if (wsAccounts[netCell]) {
      const netValue = wsAccounts[netCell].v;
      wsAccounts[netCell].s = { 
        font: { bold: true, color: { rgb: netValue >= 0 ? 'FF008000' : 'FFFF0000' } }, 
        alignment: { horizontal: 'right' } 
      };
      wsAccounts[netCell].z = '"$"#,##0.00';
    }
    
    // Balance Actual
    const balanceCell = XLSX.utils.encode_cell({ r: R, c: 6 });
    if (wsAccounts[balanceCell]) {
      wsAccounts[balanceCell].s = { ...styles.currency, ...styles.bold };
      wsAccounts[balanceCell].z = '"$"#,##0.00';
    }
    
    // Estado (colores)
    const statusCell = XLSX.utils.encode_cell({ r: R, c: 11 });
    if (wsAccounts[statusCell]) {
      const status = wsAccounts[statusCell].v;
      wsAccounts[statusCell].s = {
        font: { bold: true, color: { rgb: status === 'Positivo' ? 'FF008000' : 'FFFF0000' } },
        alignment: { horizontal: 'center' }
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Cuentas');

  // 📊 HOJA 4: ANÁLISIS POR CATEGORÍA
  const categoryData = categories.map(cat => {
    const catTransactions = transactions.filter(t => t.category === cat.name);
    const income = catTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = catTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalAmount = cat.type === 'income' ? income : expense;
    const totalIncomeAll = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenseAll = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      'Categoría': cat.name,
      'Tipo': cat.type === 'income' ? 'Ingreso' : 'Gasto',
      'Total Transacciones': catTransactions.length,
      'Monto Total': totalAmount,
      'Promedio por Transacción': catTransactions.length > 0 ? totalAmount / catTransactions.length : 0,
      'Porcentaje del Total': cat.type === 'income' ? 
        (totalIncomeAll > 0 ? (income / totalIncomeAll * 100).toFixed(2) + '%' : '0%') :
        (totalExpenseAll > 0 ? (expense / totalExpenseAll * 100).toFixed(2) + '%' : '0%'),
      'Primera Transacción': catTransactions.length > 0 ? new Date(Math.min(...catTransactions.map(t => new Date(t.date).getTime()))) : 'N/A',
      'Última Transacción': catTransactions.length > 0 ? new Date(Math.max(...catTransactions.map(t => new Date(t.date).getTime()))) : 'N/A',
      'Frecuencia Mensual': catTransactions.length > 0 ? (catTransactions.length / Math.max(1, uniqueDates) * 30).toFixed(1) : 0
    };
  });

  const wsCategories = XLSX.utils.json_to_sheet(categoryData);
  wsCategories['!cols'] = [
    { wch: 20 }, // Categoría
    { wch: 10 }, // Tipo
    { wch: 18 }, // Total Transacciones
    { wch: 15 }, // Monto Total
    { wch: 20 }, // Promedio por Transacción
    { wch: 15 }, // Porcentaje del Total
    { wch: 20 }, // Primera Transacción
    { wch: 20 }, // Última Transacción
    { wch: 15 }  // Frecuencia Mensual
  ];

  // Estilos para categorías
  const categoriesRange = XLSX.utils.decode_range(wsCategories['!ref'] || 'A1');
  for (let C = categoriesRange.s.c; C <= categoriesRange.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!wsCategories[cellAddress]) continue;
    wsCategories[cellAddress].s = styles.header;
  }

  // Formato para categorías
  for (let R = categoriesRange.s.r + 1; R <= categoriesRange.e.r; R++) {
    // Monto Total
    const amountCell = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (wsCategories[amountCell]) {
      wsCategories[amountCell].s = styles.currency;
      wsCategories[amountCell].z = '"$"#,##0.00';
    }
    
    // Promedio
    const avgCell = XLSX.utils.encode_cell({ r: R, c: 4 });
    if (wsCategories[avgCell]) {
      wsCategories[avgCell].s = styles.currency;
      wsCategories[avgCell].z = '"$"#,##0.00';
    }
    
    // Tipo (colores)
    const typeCell = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (wsCategories[typeCell]) {
      const cellValue = wsCategories[typeCell].v;
      wsCategories[typeCell].s = cellValue === 'Ingreso' ? 
        { font: { bold: true, color: { rgb: 'FF008000' } }, alignment: { horizontal: 'center' } } : 
        { font: { bold: true, color: { rgb: 'FFFF0000' } }, alignment: { horizontal: 'center' } };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsCategories, 'Categorías');

  // Generar archivo
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Reporte_Spendo_Profesional_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  saveAs(blob, fileName);
};
