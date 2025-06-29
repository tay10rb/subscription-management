const cron = require('node-cron');
const ExchangeRateService = require('./exchangeRateService');

/**
 * 汇率更新调度器
 * 负责定时更新汇率数据
 */
class ExchangeRateScheduler {
    constructor(database, apiKey) {
        this.db = database;
        this.exchangeRateService = new ExchangeRateService(apiKey);
        this.isRunning = false;
        this.task = null;
    }

    /**
     * 启动定时任务
     * 每天凌晨2点更新汇率
     */
    start() {
        if (this.isRunning) {
            console.log('Exchange rate scheduler is already running');
            return;
        }

        // 每天凌晨2点执行 (0 2 * * *)
        this.task = cron.schedule('0 2 * * *', async () => {
            console.log('🔄 Starting scheduled exchange rate update...');
            await this.updateExchangeRates();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai' // 使用中国时区
        });

        this.task.start();
        this.isRunning = true;
        
        console.log('✅ Exchange rate scheduler started (daily at 2:00 AM CST)');
        
        // 启动时立即执行一次更新（如果数据库中没有最新数据）
        this.checkAndUpdateIfNeeded();
    }

    /**
     * 停止定时任务
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
        this.isRunning = false;
        console.log('🛑 Exchange rate scheduler stopped');
    }

    /**
     * 检查并在需要时更新汇率
     */
    async checkAndUpdateIfNeeded() {
        try {
            // 检查最后更新时间
            const lastUpdate = this.db.prepare(`
                SELECT MAX(updated_at) as last_update 
                FROM exchange_rates
            `).get();

            const now = new Date();
            const lastUpdateDate = lastUpdate?.last_update ? new Date(lastUpdate.last_update) : null;
            
            // 如果没有数据或者超过24小时没有更新，则立即更新
            if (!lastUpdateDate || (now - lastUpdateDate) > 24 * 60 * 60 * 1000) {
                console.log('🔄 Exchange rates are outdated, updating now...');
                await this.updateExchangeRates();
            } else {
                console.log('✅ Exchange rates are up to date');
            }
        } catch (error) {
            console.error('❌ Error checking exchange rate update status:', error.message);
        }
    }

    /**
     * 手动触发汇率更新
     */
    async updateExchangeRates() {
        try {
            console.log('📡 Fetching latest exchange rates from API...');
            
            // 获取最新汇率
            const rates = await this.exchangeRateService.getAllExchangeRates();
            
            if (rates.length === 0) {
                console.warn('⚠️ No exchange rates received from API');
                return { success: false, message: 'No rates received' };
            }

            // 更新数据库
            const updateCount = await this.updateRatesInDatabase(rates);
            
            console.log(`✅ Successfully updated ${updateCount} exchange rates`);
            return { 
                success: true, 
                message: `Updated ${updateCount} exchange rates`,
                updatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Failed to update exchange rates:', error.message);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    /**
     * 更新数据库中的汇率
     * @param {Array} rates - 汇率数组
     * @returns {number} 更新的记录数
     */
    async updateRatesInDatabase(rates) {
        const upsertRate = this.db.prepare(`
            INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(from_currency, to_currency) 
            DO UPDATE SET 
                rate = excluded.rate,
                updated_at = CURRENT_TIMESTAMP
        `);

        const transaction = this.db.transaction((rates) => {
            let count = 0;
            for (const rate of rates) {
                try {
                    upsertRate.run(rate.from_currency, rate.to_currency, rate.rate);
                    count++;
                } catch (error) {
                    console.error(`Failed to update rate ${rate.from_currency}->${rate.to_currency}:`, error.message);
                }
            }
            return count;
        });

        return transaction(rates);
    }

    /**
     * 获取调度器状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextRun: this.task ? this.task.nextDate() : null,
            hasApiKey: !!this.exchangeRateService.apiKey
        };
    }
}

module.exports = ExchangeRateScheduler;
