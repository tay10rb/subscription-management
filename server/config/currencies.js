/**
 * 货币配置文件
 * 集中管理支持的货币列表，避免在多个服务中重复定义
 */

/**
 * 支持的货币代码列表
 * 这些货币支持汇率API获取和转换
 */
const SUPPORTED_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];

/**
 * 支持的货币详细信息
 * 包含货币代码、名称和符号
 */
const SUPPORTED_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
];

/**
 * 默认汇率数据（以USD为基准）
 * 用于数据库初始化
 */
const DEFAULT_EXCHANGE_RATES = [
    { from_currency: 'USD', to_currency: 'USD', rate: 1.0000 },
    { from_currency: 'USD', to_currency: 'EUR', rate: 0.8500 },
    { from_currency: 'USD', to_currency: 'GBP', rate: 0.7500 },
    { from_currency: 'USD', to_currency: 'CAD', rate: 1.2500 },
    { from_currency: 'USD', to_currency: 'AUD', rate: 1.3500 },
    { from_currency: 'USD', to_currency: 'JPY', rate: 110.0000 },
    { from_currency: 'USD', to_currency: 'CNY', rate: 6.5000 }
];

/**
 * 验证货币代码是否受支持
 * @param {string} currencyCode - 货币代码
 * @returns {boolean} 是否受支持
 */
function isSupportedCurrency(currencyCode) {
    return SUPPORTED_CURRENCY_CODES.includes(currencyCode?.toUpperCase());
}

/**
 * 获取货币信息
 * @param {string} currencyCode - 货币代码
 * @returns {Object|null} 货币信息对象或null
 */
function getCurrencyInfo(currencyCode) {
    return SUPPORTED_CURRENCIES.find(currency => 
        currency.code === currencyCode?.toUpperCase()
    ) || null;
}

/**
 * 获取货币符号
 * @param {string} currencyCode - 货币代码
 * @returns {string} 货币符号
 */
function getCurrencySymbol(currencyCode) {
    const currency = getCurrencyInfo(currencyCode);
    return currency ? currency.symbol : currencyCode;
}

module.exports = {
    SUPPORTED_CURRENCY_CODES,
    SUPPORTED_CURRENCIES,
    DEFAULT_EXCHANGE_RATES,
    isSupportedCurrency,
    getCurrencyInfo,
    getCurrencySymbol
};
