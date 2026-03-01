export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'Dollar US' },
  { code: 'GBP', symbol: '£', label: 'Livre sterling' },
  { code: 'CHF', symbol: 'CHF', label: 'Franc suisse' },
  { code: 'CAD', symbol: '$', label: 'Dollar canadien' },
  { code: 'ILS', symbol: '₪', label: 'Shekel' },
  { code: 'MAD', symbol: 'DH', label: 'Dirham marocain' }
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
