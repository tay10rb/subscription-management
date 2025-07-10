# 货币系统重构指南

## 问题分析

当前系统存在大量硬编码的基础货币（USD/CNY），分散在各个文件中：

### 硬编码问题
- ❌ 基础货币硬编码在多个文件中
- ❌ 修改基础货币需要改动十几个文件
- ❌ 容易遗漏某些地方导致不一致
- ❌ 维护成本高，容易出错

## 解决方案：中央配置

### 1. 前端中央配置 (`src/config/currency.ts`)

```typescript
// 所有支持的货币（固定不变）
const ALL_SUPPORTED_CURRENCIES: CurrencyType[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];

// 基础货币配置 - 只需要修改这一个地方！
export const BASE_CURRENCY: CurrencyType = 'CNY';

// 支持的货币列表（基础货币在前，避免重复和遗漏）
export const SUPPORTED_CURRENCIES: CurrencyType[] = [
  BASE_CURRENCY,
  ...ALL_SUPPORTED_CURRENCIES.filter(currency => currency !== BASE_CURRENCY).sort()
];

// 多基础货币汇率配置
const BASE_RATES: Record<CurrencyType, Record<CurrencyType, number>> = {
  CNY: { CNY: 1, USD: 0.1538, EUR: 0.1308, /* ... */ },
  USD: { USD: 1, CNY: 6.5000, EUR: 0.8500, /* ... */ },
  // ... 其他货币的汇率
};

// 根据基础货币动态获取汇率
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyType, number> = BASE_RATES[BASE_CURRENCY];
```

### 2. 后端中央配置 (`server/config/currencies.js`)

```javascript
// 所有支持的货币（固定不变）
const ALL_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];

// 基础货币配置 - 只需要修改这一个地方！
const BASE_CURRENCY = 'CNY';

// 支持的货币列表（基础货币在前，避免重复和遗漏）
const SUPPORTED_CURRENCY_CODES = [
    BASE_CURRENCY,
    ...ALL_CURRENCY_CODES.filter(code => code !== BASE_CURRENCY).sort()
];

// 多基础货币汇率配置
const BASE_RATES = {
    CNY: { CNY: 1.0000, USD: 0.1538, /* ... */ },
    USD: { USD: 1.0000, CNY: 6.5000, /* ... */ },
    // ... 其他货币的汇率
};

// 根据基础货币动态生成汇率数据
const DEFAULT_EXCHANGE_RATES = Object.entries(BASE_RATES[BASE_CURRENCY] || {}).map(([to_currency, rate]) => ({
    from_currency: BASE_CURRENCY,
    to_currency,
    rate
}));
```

## 重构步骤

### 第一步：替换硬编码引用

#### 前端文件修改示例：

**之前 (硬编码):**
```typescript
// src/store/settingsStore.ts
currency: 'CNY' as CurrencyType,
exchangeRates: {
  CNY: 1,
  USD: 0.1538,
  // ...
}
```

**之后 (使用配置):**
```typescript
import { BASE_CURRENCY, DEFAULT_EXCHANGE_RATES } from '@/config/currency';

currency: BASE_CURRENCY,
exchangeRates: DEFAULT_EXCHANGE_RATES,
```

#### 后端文件修改示例：

**之前 (硬编码):**
```javascript
// server/services/exchangeRateService.js
const baseCurrency = 'CNY';
```

**之后 (使用配置):**
```javascript
const { getBaseCurrency } = require('../config/currencies');
const baseCurrency = getBaseCurrency();
```

### 第二步：需要修改的文件清单

#### 前端文件：
- [ ] `src/store/settingsStore.ts` - 初始设置
- [ ] `src/services/exchangeRateApi.ts` - 汇率映射
- [ ] `src/components/ExchangeRateManager.tsx` - 基础货币标识
- [ ] `src/components/subscription/SubscriptionForm.tsx` - 默认货币
- [ ] `src/lib/expense-analytics-api.ts` - 费用分析转换

#### 后端文件：
- [ ] `server/services/exchangeRateService.js` - API服务
- [ ] `server/services/settingsService.js` - 默认设置
- [ ] `server/db/schema.sql` - 数据库默认值

#### 文档文件：
- [ ] `docs/CURRENCY_SYSTEM_ARCHITECTURE.md`
- [ ] `docs/API_DOCUMENTATION.md`
- [ ] `docs/PROJECT.md`
- [ ] `README.md`

## 优势

### ✅ 重构后的优势：
- 🎯 **单点修改**: 只需修改一个配置文件
- 🔒 **类型安全**: TypeScript 确保类型一致性
- 🧹 **代码清洁**: 消除重复的硬编码
- 🚀 **易于维护**: 降低维护成本
- 🔄 **灵活切换**: 轻松切换基础货币

### 使用示例：

```typescript
// 获取基础货币
import { getBaseCurrency, isBaseCurrency } from '@/config/currency';

const baseCurrency = getBaseCurrency(); // 'CNY'
const isBase = isBaseCurrency('CNY');   // true

// 货币转换时使用基础货币
const convertedAmount = convertCurrency(amount, getBaseCurrency(), targetCurrency);
```

## 实施建议

1. **分阶段重构**: 先创建配置文件，再逐步替换硬编码
2. **测试验证**: 每次修改后进行功能测试
3. **文档更新**: 同步更新相关文档
4. **代码审查**: 确保没有遗漏的硬编码

## 验证测试

### 测试不同基础货币的配置：

```typescript
// 测试 CNY 作为基础货币
const BASE_CURRENCY = 'CNY';
console.log('支持的货币:', SUPPORTED_CURRENCIES);
// 输出: ['CNY', 'AUD', 'CAD', 'EUR', 'GBP', 'JPY', 'USD']

// 测试 USD 作为基础货币
const BASE_CURRENCY = 'USD';
console.log('支持的货币:', SUPPORTED_CURRENCIES);
// 输出: ['USD', 'AUD', 'CAD', 'CNY', 'EUR', 'GBP', 'JPY']

// 测试 EUR 作为基础货币
const BASE_CURRENCY = 'EUR';
console.log('支持的货币:', SUPPORTED_CURRENCIES);
// 输出: ['EUR', 'AUD', 'CAD', 'CNY', 'GBP', 'JPY', 'USD']
```

✅ **验证结果**：
- 无重复货币
- 无遗漏货币
- 基础货币始终在第一位
- 其他货币按字母排序

## 未来扩展

有了中央配置后，还可以轻松实现：
- 🌍 **多基础货币支持**: 不同用户使用不同基础货币
- ⚙️ **运行时切换**: 通过配置文件动态切换基础货币
- 📊 **A/B测试**: 测试不同基础货币的用户体验
- 🔄 **自动汇率**: 根据基础货币自动选择正确的汇率表
