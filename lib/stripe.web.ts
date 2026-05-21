export const initializeStripe = async () => {
  // Stripe React Native SDK is not available on web — no-op
};

export const formatCurrency = (
  amount: number,
  currency: 'usd' | 'cop',
  country: 'usa' | 'colombia'
): string => {
  if (country === 'usa') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};
