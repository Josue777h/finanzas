export const formatCurrency = (amount: number, currency?: string) => {
  const currentCurrency = currency || localStorage.getItem('preferredCurrency') || 'USD';
  const locale = navigator.language || 'es-MX';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currentCurrency,
      minimumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currentCurrency}`;
  }
};
