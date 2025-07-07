const MonthlyExpenseService = require('../services/monthlyExpenseService');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleQueryResult, handleDbResult, validationError, success } = require('../utils/responseHelper');
const { createValidator } = require('../utils/validator');
const logger = require('../utils/logger');

/**
 * 月度费用控制器
 * 处理月度费用相关的HTTP请求
 */
class MonthlyExpenseController {
    constructor(db) {
        this.monthlyExpenseService = new MonthlyExpenseService(db.name);
    }

    /**
     * 获取月度费用列表
     */
    getMonthlyExpenses = asyncHandler(async (req, res) => {
        const {
            start_year,
            start_month = 1,
            end_year,
            end_month = 12,
            currency
        } = req.query;

        // 验证参数
        const validator = createValidator();
        
        if (start_year) {
            validator
                .integer(start_year, 'start_year')
                .range(start_year, 'start_year', 2000, 3000);
        }
        
        if (end_year) {
            validator
                .integer(end_year, 'end_year')
                .range(end_year, 'end_year', 2000, 3000);
        }

        validator
            .integer(start_month, 'start_month')
            .range(start_month, 'start_month', 1, 12)
            .integer(end_month, 'end_month')
            .range(end_month, 'end_month', 1, 12);

        if (currency) {
            validator
                .string(currency, 'currency')
                .length(currency, 'currency', 3, 3);
        }

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        // 默认查询当前年份
        const currentYear = new Date().getFullYear();
        const startYear = parseInt(start_year) || currentYear;
        const endYear = parseInt(end_year) || currentYear;

        // 验证年份范围
        if (startYear > endYear) {
            return validationError(res, 'start_year cannot be greater than end_year');
        }

        const expenses = this.monthlyExpenseService.getMonthlyExpenses(
            startYear,
            parseInt(start_month),
            endYear,
            parseInt(end_month)
        );

        // 格式化响应数据
        const formattedExpenses = this._formatExpensesResponse(expenses, currency);

        const result = {
            expenses: formattedExpenses,
            summary: {
                totalRecords: formattedExpenses.length,
                dateRange: {
                    startYear,
                    startMonth: parseInt(start_month),
                    endYear,
                    endMonth: parseInt(end_month)
                },
                currency: currency || 'ALL'
            }
        };

        handleQueryResult(res, result, 'Monthly expenses');
    });

    /**
     * 获取单个月度费用记录
     */
    getMonthlyExpense = asyncHandler(async (req, res) => {
        const { monthKey } = req.params;

        // 验证月份键格式 (YYYY-MM)
        const validator = createValidator();
        validator
            .required(monthKey, 'monthKey')
            .string(monthKey, 'monthKey')
            .custom(monthKey, 'monthKey', 
                (value) => /^\d{4}-\d{2}$/.test(value),
                'monthKey must be in format YYYY-MM'
            );

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const expense = await this._getDetailedMonthlyExpense(monthKey);
        
        if (!expense) {
            return handleQueryResult(res, null, 'Monthly expense record');
        }

        handleQueryResult(res, expense, 'Monthly expense record');
    });

    /**
     * 获取月度费用汇总统计
     */
    getMonthlyExpensesSummary = asyncHandler(async (req, res) => {
        const {
            start_year,
            start_month = 1,
            end_year,
            end_month = 12,
            currency = 'USD'
        } = req.query;

        // 验证参数
        const validator = createValidator();
        
        if (start_year) {
            validator
                .integer(start_year, 'start_year')
                .range(start_year, 'start_year', 2000, 3000);
        }
        
        if (end_year) {
            validator
                .integer(end_year, 'end_year')
                .range(end_year, 'end_year', 2000, 3000);
        }

        validator
            .integer(start_month, 'start_month')
            .range(start_month, 'start_month', 1, 12)
            .integer(end_month, 'end_month')
            .range(end_month, 'end_month', 1, 12)
            .string(currency, 'currency')
            .length(currency, 'currency', 3, 3);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const currentYear = new Date().getFullYear();
        const startYear = parseInt(start_year) || currentYear;
        const endYear = parseInt(end_year) || currentYear;

        const expenses = this.monthlyExpenseService.getMonthlyExpenses(
            startYear,
            parseInt(start_month),
            endYear,
            parseInt(end_month)
        );

        const summary = this._calculateExpensesSummary(expenses, currency);

        handleQueryResult(res, summary, 'Monthly expenses summary');
    });

    /**
     * 重置月度费用数据
     */
    resetMonthlyExpenses = asyncHandler(async (req, res) => {
        const { confirm } = req.body;

        if (confirm !== 'RESET_MONTHLY_EXPENSES') {
            return validationError(res, 'To confirm reset, include "confirm": "RESET_MONTHLY_EXPENSES" in request body');
        }

        logger.info('Resetting all monthly expenses data...');

        // 删除所有月度费用记录
        const deleteStmt = this.monthlyExpenseService.db.prepare('DELETE FROM monthly_expenses');
        const result = deleteStmt.run();

        logger.info(`Deleted ${result.changes} monthly expense records`);

        success(res, {
            deletedRecords: result.changes,
            timestamp: new Date().toISOString()
        }, 'Monthly expenses have been reset successfully');
    });

    /**
     * 重新计算所有月度费用
     */
    recalculateMonthlyExpenses = asyncHandler(async (req, res) => {
        logger.info('Recalculating all monthly expenses...');

        this.monthlyExpenseService.recalculateAllMonthlyExpenses();

        success(res, {
            timestamp: new Date().toISOString()
        }, 'Monthly expenses recalculated successfully');
    });

    /**
     * 处理特定支付的月度费用
     */
    processPaymentForMonthlyExpenses = asyncHandler(async (req, res) => {
        const { paymentId } = req.params;

        // 验证支付ID
        const validator = createValidator();
        validator
            .required(paymentId, 'paymentId')
            .integer(paymentId, 'paymentId')
            .range(paymentId, 'paymentId', 1, Infinity);

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        this.monthlyExpenseService.processNewPayment(parseInt(paymentId));

        success(res, {
            paymentId: parseInt(paymentId),
            timestamp: new Date().toISOString()
        }, `Payment ${paymentId} processed for monthly expenses`);
    });

    /**
     * 删除月度费用记录
     */
    deleteMonthlyExpense = asyncHandler(async (req, res) => {
        const { monthKey } = req.params;

        // 验证月份键格式
        const validator = createValidator();
        validator
            .required(monthKey, 'monthKey')
            .string(monthKey, 'monthKey')
            .custom(monthKey, 'monthKey', 
                (value) => /^\d{4}-\d{2}$/.test(value),
                'monthKey must be in format YYYY-MM'
            );

        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }

        const stmt = this.monthlyExpenseService.db.prepare('DELETE FROM monthly_expenses WHERE month_key = ?');
        const result = stmt.run(monthKey);

        handleDbResult(res, result, 'delete', 'Monthly expense record');
    });

    /**
     * 格式化费用响应数据
     * @private
     */
    _formatExpensesResponse(expenses, currency) {
        return expenses.map(expense => {
            const result = {
                id: expense.id,
                monthKey: expense.month_key,
                year: expense.year,
                month: expense.month,
                paymentHistoryIds: JSON.parse(expense.payment_history_ids || '[]'),
                amounts: {},
                categoryBreakdown: {},
                createdAt: expense.created_at,
                updatedAt: expense.updated_at
            };

            // 添加所有货币金额
            Object.keys(expense).forEach(key => {
                if (key.startsWith('amount_')) {
                    const currencyCode = key.replace('amount_', '').toUpperCase();
                    result.amounts[currencyCode] = parseFloat(expense[key]) || 0;
                }
            });

            // 解析分类明细
            try {
                result.categoryBreakdown = JSON.parse(expense.category_breakdown || '{}');
            } catch (error) {
                logger.warn('Failed to parse category_breakdown:', error.message);
                result.categoryBreakdown = {};
            }

            // 如果指定了特定货币，只返回该货币
            if (currency) {
                const currencyKey = currency.toUpperCase();
                result.amount = result.amounts[currencyKey] || 0;
                result.currency = currencyKey;

                // 为分类明细也只返回指定货币
                Object.keys(result.categoryBreakdown).forEach(category => {
                    if (result.categoryBreakdown[category].amounts) {
                        result.categoryBreakdown[category].amount = result.categoryBreakdown[category].amounts[currencyKey] || 0;
                        result.categoryBreakdown[category].currency = currencyKey;
                    }
                });
            }

            return result;
        });
    }

    /**
     * 获取详细的月度费用记录
     * @private
     */
    async _getDetailedMonthlyExpense(monthKey) {
        const stmt = this.monthlyExpenseService.db.prepare('SELECT * FROM monthly_expenses WHERE month_key = ?');
        const expense = stmt.get(monthKey);

        if (!expense) {
            return null;
        }

        // 格式化基础数据
        const result = this._formatExpensesResponse([expense])[0];

        // 获取相关的payment_history记录详情
        if (result.paymentHistoryIds.length > 0) {
            const placeholders = result.paymentHistoryIds.map(() => '?').join(',');
            const paymentsStmt = this.monthlyExpenseService.db.prepare(`
                SELECT ph.*, s.name as subscription_name, s.plan as subscription_plan, s.billing_cycle as subscription_billing_cycle
                FROM payment_history ph
                LEFT JOIN subscriptions s ON ph.subscription_id = s.id
                WHERE ph.id IN (${placeholders})
                ORDER BY ph.payment_date
            `);

            const payments = paymentsStmt.all(...result.paymentHistoryIds);

            result.paymentDetails = payments.map(p => {
                // 计算分摊信息
                const distributionMonths = p.subscription_billing_cycle === 'monthly' ? 1 :
                                         p.subscription_billing_cycle === 'quarterly' ? 3 : 12;
                const allocatedAmount = parseFloat(p.amount_paid) / distributionMonths;

                return {
                    id: p.id,
                    subscriptionId: p.subscription_id,
                    subscriptionName: p.subscription_name,
                    subscriptionPlan: p.subscription_plan,
                    paymentDate: p.payment_date,
                    amountPaid: parseFloat(p.amount_paid),
                    allocatedAmount: Math.round(allocatedAmount * 100) / 100,
                    currency: p.currency,
                    billingPeriod: {
                        start: p.billing_period_start,
                        end: p.billing_period_end
                    },
                    billingCycle: p.subscription_billing_cycle,
                    status: p.status
                };
            });
        }

        return result;
    }

    /**
     * 计算费用汇总统计
     * @private
     */
    _calculateExpensesSummary(expenses, currency) {
        const currencyColumn = `amount_${currency.toLowerCase()}`;
        let totalAmount = 0;
        let monthlyTotals = [];

        expenses.forEach(expense => {
            const amount = parseFloat(expense[currencyColumn]) || 0;
            totalAmount += amount;
            
            monthlyTotals.push({
                monthKey: expense.month_key,
                year: expense.year,
                month: expense.month,
                amount: amount,
                paymentCount: JSON.parse(expense.payment_history_ids || '[]').length
            });
        });

        return {
            summary: {
                totalAmount: Math.round(totalAmount * 100) / 100,
                currency: currency.toUpperCase(),
                monthCount: expenses.length,
                averageMonthly: expenses.length > 0 ? Math.round((totalAmount / expenses.length) * 100) / 100 : 0,
                dateRange: {
                    startYear: expenses.length > 0 ? Math.min(...expenses.map(e => e.year)) : null,
                    endYear: expenses.length > 0 ? Math.max(...expenses.map(e => e.year)) : null
                }
            },
            monthlyTotals
        };
    }
}

module.exports = MonthlyExpenseController;
