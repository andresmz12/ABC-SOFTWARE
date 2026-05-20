import { initStripe } from '@stripe/stripe-react-native';

export const initializeStripe = async () => {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key || key === 'pk_test_placeholder') return;
  try {
    await initStripe({
      publishableKey: key,
      merchantIdentifier: 'merchant.com.provendor.app',
      urlScheme: 'provendor',
    });
  } catch (e) {
    console.warn('Stripe init skipped:', e);
  }
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
