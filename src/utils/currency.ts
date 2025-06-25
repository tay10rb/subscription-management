import { useSettingsStore } from "@/store/settingsStore"

// Currency symbols for common currencies
export const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: 'Mex$',
  RUB: '₽',
  KRW: '₩',
  ZAR: 'R',
  NZD: 'NZ$',
  CHF: 'Fr',
  SGD: 'S$',
  HKD: 'HK$'
}

/**
 * Format amount in the specified currency
 */
export function formatCurrencyAmount(
  amount: number, 
  currency: string,
  showSymbol: boolean = true
): string {
  // Get the currency symbol, or use currency code if not found
  const symbol = showSymbol ? (currencySymbols[currency] || currency) : ''
  
  // Format the number based on currency
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  })
  
  const formattedAmount = formatter.format(amount)
  
  // Return formatted amount with symbol (removed the currency code display for CNY/JPY)
  return symbol + formattedAmount
}

/**
 * Convert an amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const { exchangeRates } = useSettingsStore.getState()
  
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  // Check if we have exchange rates for both currencies
  if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
    console.warn(`Missing exchange rate for ${fromCurrency} or ${toCurrency}`)
    return amount // Return original amount if we can't convert
  }
  
  // Direct calculation using the ratio of the exchange rates
  // This is more accurate than converting to USD and back
  const conversionRate = exchangeRates[toCurrency] / exchangeRates[fromCurrency]
  return amount * conversionRate
}

/**
 * Format amount in user's preferred currency, with optional original display
 */
export function formatWithUserCurrency(
  amount: number,
  originalCurrency: string,
  showOriginal: boolean = true
): string {
  const { currency: userCurrency, showOriginalCurrency } = useSettingsStore.getState()
  
  // Convert to user's preferred currency
  const convertedAmount = convertCurrency(amount, originalCurrency, userCurrency)
  
  // Format the converted amount
  const formattedConverted = formatCurrencyAmount(convertedAmount, userCurrency)
  
  // If the currencies are the same or we don't want to show original, just return the converted
  if (originalCurrency === userCurrency || (!showOriginal && !showOriginalCurrency)) {
    return formattedConverted
  }
  
  // Format the original amount
  const formattedOriginal = formatCurrencyAmount(amount, originalCurrency)
  
  // Return both the converted and original amounts
  return `${formattedConverted} (${formattedOriginal})`
}