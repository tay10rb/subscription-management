const MonthlyExpenseService = require('../services/monthlyExpenseService');
const logger = require('./logger');

/**
 * 月度支出更新器
 * 处理payment_history变化时的月度支出自动更新
 */
class MonthlyExpenseUpdater {
    constructor(dbPath) {
        this.monthlyExpenseService = new MonthlyExpenseService(dbPath);
    }

    /**
     * 处理payment_history插入事件
     */
    async handlePaymentInsert(paymentId) {
        try {
            logger.info(`Processing new payment ${paymentId} for monthly expenses`);
            await this.monthlyExpenseService.processNewPayment(paymentId);
            logger.info(`Successfully processed payment ${paymentId}`);
        } catch (error) {
            logger.error(`Failed to process payment insert ${paymentId}:`, error.message);
            // 不抛出错误，避免影响主要的payment_history操作
        }
    }

    /**
     * 处理payment_history更新事件
     */
    async handlePaymentUpdate(paymentId, oldStatus, newStatus) {
        try {
            logger.info(`Processing payment update ${paymentId}: ${oldStatus} -> ${newStatus}`);
            
            // 如果状态从非succeeded变为succeeded，需要添加到月度支出
            if (oldStatus !== 'succeeded' && newStatus === 'succeeded') {
                await this.monthlyExpenseService.processNewPayment(paymentId);
                logger.info(`Added payment ${paymentId} to monthly expenses`);
            }
            // 如果状态从succeeded变为非succeeded，需要重新计算相关月份
            else if (oldStatus === 'succeeded' && newStatus !== 'succeeded') {
                await this.recalculateAffectedMonths(paymentId);
                logger.info(`Removed payment ${paymentId} from monthly expenses`);
            }
            // 如果都是succeeded状态，可能是金额或日期变化，重新计算
            else if (oldStatus === 'succeeded' && newStatus === 'succeeded') {
                await this.recalculateAffectedMonths(paymentId);
                logger.info(`Updated payment ${paymentId} in monthly expenses`);
            }
        } catch (error) {
            logger.error(`Failed to process payment update ${paymentId}:`, error.message);
        }
    }

    /**
     * 处理payment_history删除事件
     */
    async handlePaymentDelete(paymentId) {
        try {
            logger.info(`Processing payment deletion ${paymentId} for monthly expenses`);
            await this.recalculateAffectedMonths(paymentId);
            logger.info(`Successfully processed payment deletion ${paymentId}`);
        } catch (error) {
            logger.error(`Failed to process payment deletion ${paymentId}:`, error.message);
        }
    }

    /**
     * 重新计算受影响的月份
     */
    async recalculateAffectedMonths(paymentId) {
        try {
            // 获取包含此payment的所有月度支出记录
            const stmt = this.monthlyExpenseService.db.prepare(`
                SELECT * FROM monthly_expenses 
                WHERE payment_history_ids LIKE '%' || ? || '%'
            `);
            const affectedMonths = stmt.all(paymentId);

            // 为每个受影响的月份重新计算
            for (const monthRecord of affectedMonths) {
                await this.recalculateSpecificMonth(monthRecord.month_key);
            }
        } catch (error) {
            logger.error(`Failed to recalculate affected months for payment ${paymentId}:`, error.message);
            throw error;
        }
    }

    /**
     * 重新计算特定月份的支出
     */
    async recalculateSpecificMonth(monthKey) {
        try {
            // 获取该月份的记录
            const monthStmt = this.monthlyExpenseService.db.prepare(`
                SELECT * FROM monthly_expenses WHERE month_key = ?
            `);
            const monthRecord = monthStmt.get(monthKey);

            if (!monthRecord) {
                logger.warn(`Month record ${monthKey} not found`);
                return;
            }

            // 解析payment_history_ids
            let paymentIds = [];
            try {
                paymentIds = JSON.parse(monthRecord.payment_history_ids || '[]');
            } catch (error) {
                logger.warn(`Failed to parse payment_history_ids for ${monthKey}`);
                paymentIds = [];
            }

            if (paymentIds.length === 0) {
                // 如果没有payment记录，删除该月份记录
                const deleteStmt = this.monthlyExpenseService.db.prepare(`
                    DELETE FROM monthly_expenses WHERE month_key = ?
                `);
                deleteStmt.run(monthKey);
                logger.info(`Deleted empty month record ${monthKey}`);
                return;
            }

            // 获取所有有效的payment记录
            const placeholders = paymentIds.map(() => '?').join(',');
            const paymentsStmt = this.monthlyExpenseService.db.prepare(`
                SELECT * FROM payment_history 
                WHERE id IN (${placeholders}) AND status = 'succeeded'
            `);
            const validPayments = paymentsStmt.all(...paymentIds);

            // 重新计算该月份的支出
            const currencies = this.monthlyExpenseService.getSupportedCurrencies();
            const currencyAmounts = {};
            currencies.forEach(currency => {
                currencyAmounts[`amount_${currency.toLowerCase()}`] = 0.00;
            });

            const validPaymentIds = [];
            validPayments.forEach(payment => {
                validPaymentIds.push(payment.id);
                const processedData = this.monthlyExpenseService.processPaymentRecord(payment);
                const relevantMonth = processedData.find(p => p.monthKey === monthKey);
                
                if (relevantMonth) {
                    currencies.forEach(currency => {
                        const rate = this.monthlyExpenseService.getExchangeRate(payment.currency, currency);
                        const amount = relevantMonth.amountPerMonth * rate;
                        currencyAmounts[`amount_${currency.toLowerCase()}`] += amount;
                    });
                }
            });

            // 更新数据库记录
            const setClauses = [
                'payment_history_ids = ?',
                ...currencies.map(currency => `amount_${currency.toLowerCase()} = ?`)
            ];
            
            const values = [
                JSON.stringify(validPaymentIds),
                ...currencies.map(currency => currencyAmounts[`amount_${currency.toLowerCase()}`])
            ];

            const updateStmt = this.monthlyExpenseService.db.prepare(`
                UPDATE monthly_expenses 
                SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE month_key = ?
            `);
            
            updateStmt.run(...values, monthKey);
            logger.info(`Recalculated month ${monthKey} with ${validPaymentIds.length} payments`);

        } catch (error) {
            logger.error(`Failed to recalculate month ${monthKey}:`, error.message);
            throw error;
        }
    }

    /**
     * 批量处理多个payment变化
     */
    async handleBatchPaymentChanges(changes) {
        try {
            logger.info(`Processing batch payment changes: ${changes.length} items`);
            
            for (const change of changes) {
                switch (change.type) {
                    case 'insert':
                        await this.handlePaymentInsert(change.paymentId);
                        break;
                    case 'update':
                        await this.handlePaymentUpdate(change.paymentId, change.oldStatus, change.newStatus);
                        break;
                    case 'delete':
                        await this.handlePaymentDelete(change.paymentId);
                        break;
                    default:
                        logger.warn(`Unknown change type: ${change.type}`);
                }
            }
            
            logger.info('Batch payment changes processed successfully');
        } catch (error) {
            logger.error('Failed to process batch payment changes:', error.message);
            throw error;
        }
    }

    /**
     * 验证月度支出数据的一致性
     */
    async validateMonthlyExpenses() {
        try {
            logger.info('Starting monthly expenses validation...');
            
            const monthlyRecords = this.monthlyExpenseService.db.prepare(`
                SELECT * FROM monthly_expenses ORDER BY month_key
            `).all();

            let inconsistencies = 0;
            
            for (const record of monthlyRecords) {
                try {
                    const paymentIds = JSON.parse(record.payment_history_ids || '[]');
                    
                    if (paymentIds.length === 0) {
                        logger.warn(`Month ${record.month_key} has no payment IDs`);
                        inconsistencies++;
                        continue;
                    }

                    // 验证payment记录是否存在且状态正确
                    const placeholders = paymentIds.map(() => '?').join(',');
                    const validPayments = this.monthlyExpenseService.db.prepare(`
                        SELECT COUNT(*) as count FROM payment_history 
                        WHERE id IN (${placeholders}) AND status = 'succeeded'
                    `).get(...paymentIds);

                    if (validPayments.count !== paymentIds.length) {
                        logger.warn(`Month ${record.month_key} has ${paymentIds.length} payment IDs but only ${validPayments.count} valid payments`);
                        inconsistencies++;
                    }
                } catch (error) {
                    logger.error(`Failed to validate month ${record.month_key}:`, error.message);
                    inconsistencies++;
                }
            }

            logger.info(`Monthly expenses validation completed. Found ${inconsistencies} inconsistencies.`);
            return { totalRecords: monthlyRecords.length, inconsistencies };
        } catch (error) {
            logger.error('Failed to validate monthly expenses:', error.message);
            throw error;
        }
    }

    close() {
        this.monthlyExpenseService.close();
    }
}

module.exports = MonthlyExpenseUpdater;
