export function formatCurrency(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '₦0.00';

  // Abbreviate millions with M (e.g. 1.34M) while keeping commas
  if (Math.abs(value) >= 1_000_000) {
    const short = value / 1_000_000;
    const formattedShort = new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(short);
    return `₦${formattedShort}M`;
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumberWithCommas(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 2,
  }).format(num);
}
