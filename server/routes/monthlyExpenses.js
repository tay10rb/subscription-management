const express = require('express');
const MonthlyExpenseService = require('../services/monthlyExpenseService');
const logger = require('../utils/logger');

function createMonthlyExpensesRoutes(db) {
    const router = express.Router();
    const monthlyExpenseService = new MonthlyExpenseService(db.name);

    // GET monthly expenses with filters (Public)
    router.get('/', (req, res) => {
        try {
            const {
                start_year,
                start_month = 1,
                end_year,
                end_month = 12,
                currency
            } = req.query;

            // 默认查询当前年份
            const currentYear = new Date().getFullYear();
            const startYear = parseInt(start_year) || currentYear;
            const endYear = parseInt(end_year) || currentYear;

            const expenses = monthlyExpenseService.getMonthlyExpenses(
                startYear,
                parseInt(start_month),
                endYear,
                parseInt(end_month)
            );

            // 格式化响应数据
            const formattedExpenses = expenses.map(expense => {
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
                    console.warn('Failed to parse category_breakdown:', error.message);
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

            res.json({
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
            });

        } catch (error) {
            logger.error('Failed to get monthly expenses:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // GET single monthly expense record (Public)
    router.get('/:monthKey', (req, res) => {
        try {
            const { monthKey } = req.params;

            const stmt = db.prepare('SELECT * FROM monthly_expenses WHERE month_key = ?');
            const expense = stmt.get(monthKey);

            if (!expense) {
                return res.status(404).json({ error: 'Monthly expense record not found' });
            }

            // 格式化响应数据
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
                console.warn('Failed to parse category_breakdown:', error.message);
                result.categoryBreakdown = {};
            }

            // 获取相关的payment_history记录详情
            if (result.paymentHistoryIds.length > 0) {
                const placeholders = result.paymentHistoryIds.map(() => '?').join(',');
                const paymentsStmt = db.prepare(`
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

            res.json(result);

        } catch (error) {
            logger.error('Failed to get monthly expense:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // GET monthly expenses summary (Public)
    router.get('/summary/totals', (req, res) => {
        try {
            const {
                start_year,
                start_month = 1,
                end_year,
                end_month = 12,
                currency = 'USD'
            } = req.query;

            const currentYear = new Date().getFullYear();
            const startYear = parseInt(start_year) || currentYear;
            const endYear = parseInt(end_year) || currentYear;

            const expenses = monthlyExpenseService.getMonthlyExpenses(
                startYear,
                parseInt(start_month),
                endYear,
                parseInt(end_month)
            );

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

            res.json({
                summary: {
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    currency: currency.toUpperCase(),
                    monthCount: expenses.length,
                    averageMonthly: expenses.length > 0 ? Math.round((totalAmount / expenses.length) * 100) / 100 : 0,
                    dateRange: {
                        startYear,
                        startMonth: parseInt(start_month),
                        endYear,
                        endMonth: parseInt(end_month)
                    }
                },
                monthlyTotals
            });

        } catch (error) {
            logger.error('Failed to get monthly expenses summary:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedMonthlyExpensesRoutes(db) {
    const router = express.Router();
    const monthlyExpenseService = new MonthlyExpenseService(db.name);

    // POST to reset all monthly expenses data (Protected)
    router.post('/reset', (req, res) => {
        try {
            logger.info('Resetting all monthly expenses data...');

            // Delete all monthly expenses records
            const deleteStmt = monthlyExpenseService.db.prepare('DELETE FROM monthly_expenses');
            const result = deleteStmt.run();

            logger.info(`Deleted ${result.changes} monthly expense records`);

            res.json({
                message: 'Monthly expenses have been reset successfully',
                deletedRecords: result.changes,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Failed to reset monthly expenses:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // POST recalculate all monthly expenses (Protected)
    router.post('/recalculate', (req, res) => {
        try {
            monthlyExpenseService.recalculateAllMonthlyExpenses();

            res.json({
                message: 'Monthly expenses recalculated successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Failed to recalculate monthly expenses:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // POST process specific payment for monthly expenses (Protected)
    router.post('/process-payment/:paymentId', (req, res) => {
        try {
            const { paymentId } = req.params;
            
            monthlyExpenseService.processNewPayment(parseInt(paymentId));
            
            res.json({
                message: `Payment ${paymentId} processed for monthly expenses`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error(`Failed to process payment ${req.params.paymentId}:`, error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE monthly expense record (Protected)
    router.delete('/:monthKey', (req, res) => {
        try {
            const { monthKey } = req.params;

            const stmt = db.prepare('DELETE FROM monthly_expenses WHERE month_key = ?');
            const result = stmt.run(monthKey);

            if (result.changes > 0) {
                res.json({ message: 'Monthly expense record deleted successfully' });
            } else {
                res.status(404).json({ error: 'Monthly expense record not found' });
            }

        } catch (error) {
            logger.error('Failed to delete monthly expense:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createMonthlyExpensesRoutes,
    createProtectedMonthlyExpensesRoutes
};
