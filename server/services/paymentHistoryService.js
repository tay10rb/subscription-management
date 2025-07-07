const BaseRepository = require('../utils/BaseRepository');
const MonthlyExpenseService = require('./monthlyExpenseService');
const logger = require('../utils/logger');
const { NotFoundError } = require('../middleware/errorHandler');

class PaymentHistoryService extends BaseRepository {
    constructor(db) {
        super(db, 'payment_history');
        this.monthlyExpenseService = new MonthlyExpenseService(db.name);
    }

    /**
     * 获取支付历史记录（带过滤和分页）
     */
    async getPaymentHistory(filters = {}, options = {}) {
        let query = `
            SELECT
                ph.*,
                s.name as subscription_name,
                s.plan as subscription_plan
            FROM payment_history ph
            LEFT JOIN subscriptions s ON ph.subscription_id = s.id
            WHERE 1=1
        `;

        const params = [];

        // 添加过滤条件
        if (filters.subscription_id) {
            query += ' AND ph.subscription_id = ?';
            params.push(filters.subscription_id);
        }

        if (filters.start_date) {
            query += ' AND ph.payment_date >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            query += ' AND ph.payment_date <= ?';
            params.push(filters.end_date);
        }

        if (filters.status) {
            query += ' AND ph.status = ?';
            params.push(filters.status);
        }

        if (filters.currency) {
            query += ' AND ph.currency = ?';
            params.push(filters.currency);
        }

        // 添加排序
        query += ' ORDER BY ph.payment_date DESC, ph.id DESC';

        // 添加分页
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);

            if (options.offset) {
                query += ' OFFSET ?';
                params.push(options.offset);
            }
        }

        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    /**
     * 根据ID获取支付记录
     */
    async getPaymentById(id) {
        const query = `
            SELECT
                ph.*,
                s.name as subscription_name,
                s.plan as subscription_plan,
                s.category as subscription_category
            FROM payment_history ph
            LEFT JOIN subscriptions s ON ph.subscription_id = s.id
            WHERE ph.id = ?
        `;

        const stmt = this.db.prepare(query);
        return stmt.get(id);
    }

    /**
     * 获取月度支付统计
     */
    async getMonthlyStats(year, month) {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 月末日期

        const query = `
            SELECT
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'succeeded' THEN amount_paid ELSE 0 END) as total_amount,
                COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                currency,
                AVG(CASE WHEN status = 'succeeded' THEN amount_paid ELSE NULL END) as avg_payment_amount
            FROM payment_history
            WHERE payment_date >= ? AND payment_date <= ?
            GROUP BY currency
            ORDER BY total_amount DESC
        `;

        const stmt = this.db.prepare(query);
        return stmt.all(startDate, endDate);
    }

    /**
     * 获取年度支付统计
     */
    async getYearlyStats(year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const query = `
            SELECT
                strftime('%m', payment_date) as month,
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'succeeded' THEN amount_paid ELSE 0 END) as total_amount,
                COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
                currency
            FROM payment_history
            WHERE payment_date >= ? AND payment_date <= ?
            GROUP BY strftime('%m', payment_date), currency
            ORDER BY month, currency
        `;

        const stmt = this.db.prepare(query);
        return stmt.all(startDate, endDate);
    }

    /**
     * 获取季度支付统计
     */
    async getQuarterlyStats(year, quarter) {
        const quarterMonths = {
            1: { start: '01', end: '03' },
            2: { start: '04', end: '06' },
            3: { start: '07', end: '09' },
            4: { start: '10', end: '12' }
        };

        const { start, end } = quarterMonths[quarter];
        const startDate = `${year}-${start}-01`;
        const endDate = `${year}-${end}-31`;

        const query = `
            SELECT
                strftime('%m', payment_date) as month,
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'succeeded' THEN amount_paid ELSE 0 END) as total_amount,
                COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
                currency
            FROM payment_history
            WHERE payment_date >= ? AND payment_date <= ?
            GROUP BY strftime('%m', payment_date), currency
            ORDER BY month, currency
        `;

        const stmt = this.db.prepare(query);
        return stmt.all(startDate, endDate);
    }

    /**
     * 创建支付记录
     */
    async createPayment(paymentData) {
        const {
            subscription_id,
            payment_date,
            amount_paid,
            currency,
            billing_period_start,
            billing_period_end,
            status = 'succeeded',
            notes
        } = paymentData;

        // 验证订阅是否存在
        const subscriptionExists = this.db.prepare('SELECT id FROM subscriptions WHERE id = ?').get(subscription_id);
        if (!subscriptionExists) {
            throw new NotFoundError('Subscription');
        }

        const result = this.create({
            subscription_id,
            payment_date,
            amount_paid,
            currency,
            billing_period_start,
            billing_period_end,
            status,
            notes
        });

        // 如果支付成功，更新月度费用
        if (status === 'succeeded') {
            try {
                await this.monthlyExpenseService.handlePaymentInsert(result.lastInsertRowid);
                logger.info(`Monthly expenses updated for new payment ${result.lastInsertRowid}`);
            } catch (error) {
                logger.error(`Failed to update monthly expenses for payment ${result.lastInsertRowid}:`, error.message);
            }
        }

        return result;
    }

    /**
     * 更新支付记录
     */
    async updatePayment(id, updateData) {
        // 检查记录是否存在
        const existingPayment = this.findById(id);
        if (!existingPayment) {
            throw new NotFoundError('Payment record');
        }

        const result = this.update(id, updateData);

        // 如果状态发生变化，更新月度费用
        if (updateData.status && updateData.status !== existingPayment.status) {
            try {
                await this.monthlyExpenseService.handlePaymentUpdate(id, existingPayment.status, updateData.status);
                logger.info(`Monthly expenses updated for payment ${id} status change`);
            } catch (error) {
                logger.error(`Failed to update monthly expenses for payment ${id}:`, error.message);
            }
        }

        return result;
    }

    /**
     * 删除支付记录
     */
    async deletePayment(id) {
        // 检查记录是否存在
        const existingPayment = this.findById(id);
        if (!existingPayment) {
            throw new NotFoundError('Payment record');
        }

        const result = this.delete(id);

        // 更新月度费用
        if (existingPayment.status === 'succeeded') {
            try {
                await this.monthlyExpenseService.handlePaymentDelete(id);
                logger.info(`Monthly expenses updated for deleted payment ${id}`);
            } catch (error) {
                logger.error(`Failed to update monthly expenses for deleted payment ${id}:`, error.message);
            }
        }

        return result;
    }

    /**
     * 批量创建支付记录
     */
    async bulkCreatePayments(paymentsData) {
        return this.transaction(() => {
            const results = [];
            for (const paymentData of paymentsData) {
                const result = this.createPayment(paymentData);
                results.push(result);
            }
            return results;
        });
    }

    /**
     * 重新计算月度费用
     */
    async recalculateMonthlyExpenses() {
        try {
            await this.monthlyExpenseService.recalculateAllMonthlyExpenses();
            logger.info('Monthly expenses recalculated successfully');
        } catch (error) {
            logger.error('Failed to recalculate monthly expenses:', error.message);
            throw error;
        }
    }

    /**
     * 关闭资源
     */
    close() {
        if (this.monthlyExpenseService) {
            this.monthlyExpenseService.close();
        }
    }
}

module.exports = PaymentHistoryService;
