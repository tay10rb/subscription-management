const Database = require('better-sqlite3');
const logger = require('../utils/logger');

/**
 * 月度支出服务
 * 处理基于payment_history的月度支出计算和存储
 */
class MonthlyExpenseService {
    constructor(dbPath) {
        this.db = new Database(dbPath);
    }

    /**
     * 获取所有支持的货币
     */
    getSupportedCurrencies() {
        const stmt = this.db.prepare(`
            SELECT DISTINCT to_currency FROM exchange_rates 
            WHERE from_currency = 'USD'
            ORDER BY to_currency
        `);
        return stmt.all().map(row => row.to_currency);
    }

    /**
     * 获取汇率 - 支持任意货币之间的转换
     */
    getExchangeRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1.0;

        // 如果是从USD转换到其他货币，直接查询
        if (fromCurrency === 'USD') {
            const stmt = this.db.prepare(`
                SELECT rate FROM exchange_rates
                WHERE from_currency = 'USD' AND to_currency = ?
            `);
            const result = stmt.get(toCurrency);
            return result ? parseFloat(result.rate) : 1.0;
        }

        // 如果是从其他货币转换到USD，使用倒数
        if (toCurrency === 'USD') {
            const stmt = this.db.prepare(`
                SELECT rate FROM exchange_rates
                WHERE from_currency = 'USD' AND to_currency = ?
            `);
            const result = stmt.get(fromCurrency);
            return result ? (1.0 / parseFloat(result.rate)) : 1.0;
        }

        // 如果是两种非USD货币之间的转换，通过USD作为中介
        const fromToUsdStmt = this.db.prepare(`
            SELECT rate FROM exchange_rates
            WHERE from_currency = 'USD' AND to_currency = ?
        `);
        const toToUsdStmt = this.db.prepare(`
            SELECT rate FROM exchange_rates
            WHERE from_currency = 'USD' AND to_currency = ?
        `);

        const fromToUsdResult = fromToUsdStmt.get(fromCurrency);
        const toToUsdResult = toToUsdStmt.get(toCurrency);

        if (fromToUsdResult && toToUsdResult) {
            // fromCurrency -> USD -> toCurrency
            const fromToUsd = 1.0 / parseFloat(fromToUsdResult.rate);
            const usdToTo = parseFloat(toToUsdResult.rate);
            return fromToUsd * usdToTo;
        }

        return 1.0; // 默认汇率
    }

    /**
     * 计算月份之间的差异
     */
    getMonthsBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = [];

        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

        while (current <= endMonth) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            const monthKey = `${year}${month.toString().padStart(2, '0')}`;
            months.push({ year, month, monthKey });
            current.setMonth(current.getMonth() + 1);
        }

        return months;
    }

    /**
     * 从指定日期开始计算指定数量的月份
     */
    getMonthsBetweenLimited(startDate, monthCount) {
        const start = new Date(startDate);
        const months = [];

        const current = new Date(start.getFullYear(), start.getMonth(), 1);

        for (let i = 0; i < monthCount; i++) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            const monthKey = `${year}${month.toString().padStart(2, '0')}`;
            months.push({ year, month, monthKey });
            current.setMonth(current.getMonth() + 1);
        }

        return months;
    }

    /**
     * 根据billing_cycle计算分摊月数
     */
    getDistributionMonths(billingCycle) {
        switch (billingCycle.toLowerCase()) {
            case 'monthly': return 1;
            case 'quarterly': return 3;
            case 'yearly': return 12;
            default: return 1;
        }
    }

    /**
     * 处理单个payment_history记录
     */
    processPaymentRecord(payment) {
        const billingStart = new Date(payment.billing_period_start);
        const billingEnd = new Date(payment.billing_period_end);
        const paymentDate = new Date(payment.payment_date);

        // 计算billing周期类型
        const monthsDiff = (billingEnd.getFullYear() - billingStart.getFullYear()) * 12 +
                          (billingEnd.getMonth() - billingStart.getMonth());

        let billingCycle;
        if (monthsDiff <= 1) billingCycle = 'monthly';
        else if (monthsDiff <= 3) billingCycle = 'quarterly';
        else billingCycle = 'yearly';

        const distributionMonths = this.getDistributionMonths(billingCycle);
        const amountPerMonth = parseFloat(payment.amount_paid) / distributionMonths;

        // 根据billing周期确定分摊策略
        let months = [];

        if (billingCycle === 'monthly') {
            // 月付：只计入payment_date所在的月份
            const year = paymentDate.getFullYear();
            const month = paymentDate.getMonth() + 1;
            const monthKey = `${year}${month.toString().padStart(2, '0')}`;
            months = [{ year, month, monthKey }];
        } else if (billingCycle === 'quarterly') {
            // 季付：从billing_period_start开始的3个月
            months = this.getMonthsBetweenLimited(payment.billing_period_start, 3);
        } else if (billingCycle === 'yearly') {
            // 年付：从billing_period_start开始的12个月
            months = this.getMonthsBetweenLimited(payment.billing_period_start, 12);
        }

        return months.map(monthInfo => ({
            ...monthInfo,
            paymentId: payment.id,
            originalAmount: parseFloat(payment.amount_paid),
            amountPerMonth,
            currency: payment.currency,
            billingCycle
        }));
    }

    /**
     * 更新或创建月度支出记录
     */
    updateMonthlyExpense(monthKey, year, month, paymentData) {
        const currencies = this.getSupportedCurrencies();
        
        // 检查记录是否存在
        const existingStmt = this.db.prepare(`
            SELECT * FROM monthly_expenses WHERE month_key = ?
        `);
        const existing = existingStmt.get(monthKey);
        
        if (existing) {
            // 更新现有记录
            this.updateExistingMonthlyExpense(existing, paymentData, currencies);
        } else {
            // 创建新记录
            this.createNewMonthlyExpense(monthKey, year, month, paymentData, currencies);
        }
    }

    /**
     * 创建新的月度支出记录
     */
    createNewMonthlyExpense(monthKey, year, month, paymentData, currencies) {
        // 准备货币金额
        const currencyAmounts = {};
        currencies.forEach(currency => {
            currencyAmounts[`amount_${currency.toLowerCase()}`] = 0.00;
        });

        // 计算当前支付的各货币金额
        paymentData.forEach(payment => {
            currencies.forEach(currency => {
                const rate = this.getExchangeRate(payment.currency, currency);
                const amount = payment.amountPerMonth * rate;
                currencyAmounts[`amount_${currency.toLowerCase()}`] += amount;
            });
        });

        // 检查是否存在 category_breakdown 列
        const hasBreakdownColumn = this.checkCategoryBreakdownColumn();

        // 计算分类明细（如果支持的话）
        const categoryBreakdown = hasBreakdownColumn ? this.calculateCategoryBreakdown(paymentData, currencies) : null;

        // 构建插入语句
        const columns = ['month_key', 'year', 'month', 'payment_history_ids'];
        const values = [monthKey, year, month, JSON.stringify(paymentData.map(p => p.paymentId))];

        if (hasBreakdownColumn) {
            columns.push('category_breakdown');
            values.push(JSON.stringify(categoryBreakdown));
        }

        columns.push(...Object.keys(currencyAmounts));
        values.push(...Object.values(currencyAmounts));

        const placeholders = columns.map(() => '?').join(', ');

        const stmt = this.db.prepare(`
            INSERT INTO monthly_expenses (${columns.join(', ')})
            VALUES (${placeholders})
        `);

        stmt.run(...values);
        logger.info(`Created monthly expense record for ${monthKey}`);
    }

    /**
     * 更新现有的月度支出记录
     */
    updateExistingMonthlyExpense(existing, paymentData, currencies) {
        // 解析现有的payment_history_ids
        let existingPaymentIds = [];
        try {
            existingPaymentIds = JSON.parse(existing.payment_history_ids || '[]');
        } catch (error) {
            logger.warn('Failed to parse existing payment_history_ids:', error.message);
        }

        // 添加新的payment IDs
        const newPaymentIds = paymentData.map(p => p.paymentId);
        const allPaymentIds = [...new Set([...existingPaymentIds, ...newPaymentIds])];

        // 重新计算所有货币金额
        const currencyAmounts = {};
        currencies.forEach(currency => {
            currencyAmounts[`amount_${currency.toLowerCase()}`] = 0.00;
        });

        // 获取所有相关的payment记录并重新计算
        if (allPaymentIds.length > 0) {
            const placeholders = allPaymentIds.map(() => '?').join(',');
            const paymentsStmt = this.db.prepare(`
                SELECT * FROM payment_history 
                WHERE id IN (${placeholders}) AND status = 'succeeded'
            `);
            const allPayments = paymentsStmt.all(...allPaymentIds);

            // 重新处理所有支付记录
            allPayments.forEach(payment => {
                const processedData = this.processPaymentRecord(payment);
                const relevantMonth = processedData.find(p => p.monthKey === existing.month_key);
                
                if (relevantMonth) {
                    currencies.forEach(currency => {
                        const rate = this.getExchangeRate(payment.currency, currency);
                        const amount = relevantMonth.amountPerMonth * rate;
                        currencyAmounts[`amount_${currency.toLowerCase()}`] += amount;
                    });
                }
            });
        }

        // 重新计算分类明细
        const allPaymentData = [];
        if (allPaymentIds.length > 0) {
            const placeholders = allPaymentIds.map(() => '?').join(',');
            const paymentsStmt = this.db.prepare(`
                SELECT * FROM payment_history
                WHERE id IN (${placeholders}) AND status = 'succeeded'
            `);
            const allPayments = paymentsStmt.all(...allPaymentIds);

            // 处理所有支付记录，获取当前月份的数据
            allPayments.forEach(payment => {
                const processedData = this.processPaymentRecord(payment);
                const relevantMonth = processedData.find(p => p.monthKey === existing.month_key);
                if (relevantMonth) {
                    allPaymentData.push(relevantMonth);
                }
            });
        }

        // 检查是否存在 category_breakdown 列
        const hasBreakdownColumn = this.checkCategoryBreakdownColumn();
        const categoryBreakdown = hasBreakdownColumn ? this.calculateCategoryBreakdown(allPaymentData, currencies) : null;

        // 构建更新语句
        const setClauses = ['payment_history_ids = ?'];
        const values = [JSON.stringify(allPaymentIds)];

        if (hasBreakdownColumn) {
            setClauses.push('category_breakdown = ?');
            values.push(JSON.stringify(categoryBreakdown));
        }

        setClauses.push(...currencies.map(currency => `amount_${currency.toLowerCase()} = ?`));
        values.push(...currencies.map(currency => currencyAmounts[`amount_${currency.toLowerCase()}`]));

        const stmt = this.db.prepare(`
            UPDATE monthly_expenses
            SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(...values, existing.id);
        logger.info(`Updated monthly expense record for ${existing.month_key}`);
    }

    /**
     * 处理新的payment_history记录
     */
    processNewPayment(paymentId) {
        try {
            // 获取payment记录
            const paymentStmt = this.db.prepare(`
                SELECT * FROM payment_history WHERE id = ? AND status = 'succeeded'
            `);
            const payment = paymentStmt.get(paymentId);
            
            if (!payment) {
                logger.warn(`Payment ${paymentId} not found or not succeeded`);
                return;
            }

            // 处理payment记录，获取需要更新的月份
            const monthlyData = this.processPaymentRecord(payment);
            
            // 为每个月份更新或创建记录
            monthlyData.forEach(monthData => {
                this.updateMonthlyExpense(
                    monthData.monthKey,
                    monthData.year,
                    monthData.month,
                    [monthData]
                );
            });

            logger.info(`Processed payment ${paymentId} for monthly expenses`);
        } catch (error) {
            logger.error(`Failed to process payment ${paymentId}:`, error.message);
            throw error;
        }
    }

    /**
     * 重新计算所有月度支出（用于数据修复或初始化）
     */
    recalculateAllMonthlyExpenses() {
        try {
            logger.info('Starting recalculation of all monthly expenses...');
            
            // 清空现有数据
            this.db.prepare('DELETE FROM monthly_expenses').run();
            
            // 获取所有成功的payment记录
            const paymentsStmt = this.db.prepare(`
                SELECT * FROM payment_history 
                WHERE status = 'succeeded'
                ORDER BY payment_date
            `);
            const payments = paymentsStmt.all();
            
            logger.info(`Processing ${payments.length} payment records...`);
            
            // 处理每个payment记录
            payments.forEach(payment => {
                this.processNewPayment(payment.id);
            });
            
            logger.info('Monthly expenses recalculation completed successfully');
        } catch (error) {
            logger.error('Failed to recalculate monthly expenses:', error.message);
            throw error;
        }
    }

    /**
     * 检查是否存在 category_breakdown 列
     */
    checkCategoryBreakdownColumn() {
        try {
            const stmt = this.db.prepare("PRAGMA table_info(monthly_expenses)");
            const columns = stmt.all();
            return columns.some(col => col.name === 'category_breakdown');
        } catch (error) {
            logger.warn('Failed to check category_breakdown column:', error.message);
            return false;
        }
    }

    /**
     * 计算分类明细
     */
    calculateCategoryBreakdown(paymentData, currencies) {
        const breakdown = {};

        // 获取所有相关的支付记录和订阅信息
        const paymentIds = paymentData.map(p => p.paymentId);
        if (paymentIds.length === 0) {
            return breakdown;
        }

        const placeholders = paymentIds.map(() => '?').join(',');
        const stmt = this.db.prepare(`
            SELECT ph.id, ph.amount_paid, ph.currency, s.category
            FROM payment_history ph
            JOIN subscriptions s ON ph.subscription_id = s.id
            WHERE ph.id IN (${placeholders}) AND ph.status = 'succeeded'
        `);
        const paymentDetails = stmt.all(...paymentIds);

        // 按分类分组计算
        paymentDetails.forEach(payment => {
            const category = payment.category || 'other';

            if (!breakdown[category]) {
                breakdown[category] = {
                    payment_ids: [],
                    amounts: {}
                };

                // 初始化所有货币金额为0
                currencies.forEach(currency => {
                    breakdown[category].amounts[currency] = 0.00;
                });
            }

            // 添加支付ID
            breakdown[category].payment_ids.push(payment.id);

            // 计算各货币金额
            const paymentDataItem = paymentData.find(p => p.paymentId === payment.id);
            if (paymentDataItem) {
                currencies.forEach(currency => {
                    const rate = this.getExchangeRate(payment.currency, currency);
                    const amount = paymentDataItem.amountPerMonth * rate;
                    breakdown[category].amounts[currency] += amount;
                });
            }
        });

        // 四舍五入金额
        Object.keys(breakdown).forEach(category => {
            currencies.forEach(currency => {
                breakdown[category].amounts[currency] = Math.round(breakdown[category].amounts[currency] * 100) / 100;
            });
        });

        return breakdown;
    }

    /**
     * 获取月度支出数据
     */
    getMonthlyExpenses(startYear, startMonth, endYear, endMonth) {
        const startKey = `${startYear}${startMonth.toString().padStart(2, '0')}`;
        const endKey = `${endYear}${endMonth.toString().padStart(2, '0')}`;

        const stmt = this.db.prepare(`
            SELECT * FROM monthly_expenses
            WHERE month_key >= ? AND month_key <= ?
            ORDER BY month_key
        `);

        return stmt.all(startKey, endKey);
    }

    close() {
        this.db.close();
    }
}

module.exports = MonthlyExpenseService;
