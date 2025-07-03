/**
 * 支付历史功能验证测试脚本
 * 验证需求文档中的所有验收标准
 */

const Database = require('better-sqlite3');
const path = require('path');

class PaymentHistoryValidator {
    constructor() {
        this.db = new Database(path.join(__dirname, '../server/db/database.sqlite'));
        this.testResults = [];
    }

    log(message, status = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${status}] ${message}`;
        console.log(logMessage);
        this.testResults.push({ timestamp, status, message });
    }

    async runAllTests() {
        this.log('开始支付历史功能验证测试', 'START');
        
        try {
            // FR1.1 验证：数据库结构
            await this.validateDatabaseStructure();
            
            // FR1.2 验证：订阅生命周期管理
            await this.validateSubscriptionLifecycle();
            
            // FR2 验证：支付历史管理
            await this.validatePaymentHistoryManagement();
            
            // FR3 验证：数据分析功能
            await this.validateAnalyticsFeatures();
            
            this.log('所有验证测试完成', 'COMPLETE');
            this.generateReport();
            
        } catch (error) {
            this.log(`测试执行失败: ${error.message}`, 'ERROR');
        } finally {
            this.db.close();
        }
    }

    async validateDatabaseStructure() {
        this.log('验证数据库结构 (FR1.1)', 'TEST');
        
        // 验证payment_history表存在
        const tableExists = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='payment_history'
        `).get();
        
        if (!tableExists) {
            throw new Error('payment_history表不存在');
        }
        this.log('✅ payment_history表存在', 'PASS');
        
        // 验证表结构
        const tableInfo = this.db.prepare('PRAGMA table_info(payment_history)').all();
        const requiredColumns = [
            'id', 'subscription_id', 'payment_date', 'amount_paid', 
            'currency', 'billing_period_start', 'billing_period_end', 
            'status', 'notes', 'created_at'
        ];
        
        const existingColumns = tableInfo.map(col => col.name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
            throw new Error(`缺少必需字段: ${missingColumns.join(', ')}`);
        }
        this.log('✅ 所有必需字段存在', 'PASS');
        
        // 验证外键约束
        const foreignKeys = this.db.prepare('PRAGMA foreign_key_list(payment_history)').all();
        const hasSubscriptionFK = foreignKeys.some(fk => fk.table === 'subscriptions');
        
        if (!hasSubscriptionFK) {
            throw new Error('缺少subscription_id外键约束');
        }
        this.log('✅ 外键约束正确设置', 'PASS');
        
        // 验证索引
        const indexes = this.db.prepare('PRAGMA index_list(payment_history)').all();
        const expectedIndexes = ['idx_payment_history_subscription_id', 'idx_payment_history_payment_date'];
        
        for (const expectedIndex of expectedIndexes) {
            if (!indexes.some(idx => idx.name === expectedIndex)) {
                this.log(`⚠️ 缺少索引: ${expectedIndex}`, 'WARN');
            } else {
                this.log(`✅ 索引存在: ${expectedIndex}`, 'PASS');
            }
        }
    }

    async validateSubscriptionLifecycle() {
        this.log('验证订阅生命周期管理 (FR1.2)', 'TEST');
        
        // 获取测试订阅数据
        const testSubscriptions = this.db.prepare(`
            SELECT s.*, COUNT(ph.id) as payment_count
            FROM subscriptions s
            LEFT JOIN payment_history ph ON s.id = ph.subscription_id
            WHERE s.name LIKE '%Test%'
            GROUP BY s.id
            LIMIT 3
        `).all();
        
        if (testSubscriptions.length === 0) {
            throw new Error('没有找到测试订阅数据');
        }
        
        for (const subscription of testSubscriptions) {
            // 验证每个订阅都有对应的支付历史记录
            if (subscription.payment_count === 0) {
                this.log(`⚠️ 订阅 ${subscription.name} 没有支付历史记录`, 'WARN');
            } else {
                this.log(`✅ 订阅 ${subscription.name} 有 ${subscription.payment_count} 条支付记录`, 'PASS');
            }
            
            // 验证支付记录的完整性
            const payments = this.db.prepare(`
                SELECT * FROM payment_history 
                WHERE subscription_id = ? 
                ORDER BY payment_date
            `).all(subscription.id);
            
            for (const payment of payments) {
                // 验证必需字段不为空
                if (!payment.payment_date || !payment.amount_paid || !payment.currency) {
                    this.log(`❌ 支付记录 ${payment.id} 缺少必需字段`, 'FAIL');
                } else {
                    this.log(`✅ 支付记录 ${payment.id} 字段完整`, 'PASS');
                }
                
                // 验证金额与订阅金额匹配
                if (parseFloat(payment.amount_paid) !== parseFloat(subscription.amount)) {
                    this.log(`⚠️ 支付记录 ${payment.id} 金额与订阅金额不匹配`, 'WARN');
                }
            }
        }
    }

    async validatePaymentHistoryManagement() {
        this.log('验证支付历史管理功能 (FR2)', 'TEST');
        
        // 验证支付历史记录总数
        const totalPayments = this.db.prepare('SELECT COUNT(*) as count FROM payment_history').get();
        this.log(`✅ 总支付记录数: ${totalPayments.count}`, 'PASS');
        
        // 验证不同状态的支付记录
        const statusCounts = this.db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM payment_history 
            GROUP BY status
        `).all();
        
        for (const statusCount of statusCounts) {
            this.log(`✅ ${statusCount.status} 状态记录: ${statusCount.count} 条`, 'PASS');
        }
        
        // 验证数据完整性
        const invalidRecords = this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM payment_history 
            WHERE payment_date IS NULL 
               OR amount_paid IS NULL 
               OR currency IS NULL
               OR billing_period_start IS NULL
               OR billing_period_end IS NULL
        `).get();
        
        if (invalidRecords.count > 0) {
            this.log(`❌ 发现 ${invalidRecords.count} 条无效记录`, 'FAIL');
        } else {
            this.log('✅ 所有支付记录数据完整', 'PASS');
        }
    }

    async validateAnalyticsFeatures() {
        this.log('验证数据分析功能 (FR3)', 'TEST');
        
        // FR3.1: 月度收入统计
        const monthlyRevenue = this.db.prepare(`
            SELECT 
                strftime('%Y-%m', payment_date) as month,
                currency,
                SUM(amount_paid) as total_revenue,
                COUNT(id) as payment_count
            FROM payment_history 
            WHERE status = 'succeeded'
            GROUP BY strftime('%Y-%m', payment_date), currency
            ORDER BY month DESC
            LIMIT 5
        `).all();
        
        if (monthlyRevenue.length > 0) {
            this.log(`✅ 月度收入统计功能正常，找到 ${monthlyRevenue.length} 个月的数据`, 'PASS');
            for (const month of monthlyRevenue) {
                this.log(`  ${month.month}: ${month.total_revenue} ${month.currency} (${month.payment_count} 笔)`, 'INFO');
            }
        } else {
            this.log('⚠️ 没有找到月度收入数据', 'WARN');
        }
        
        // FR3.2: 月度活跃订阅统计
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const activeSubscriptions = this.db.prepare(`
            SELECT DISTINCT s.id, s.name
            FROM subscriptions s
            INNER JOIN payment_history ph ON s.id = ph.subscription_id
            WHERE ph.status = 'succeeded'
                AND strftime('%Y-%m', ph.billing_period_start) <= ?
                AND strftime('%Y-%m', ph.billing_period_end) >= ?
        `).all(currentMonth, currentMonth);
        
        this.log(`✅ 当前月份 (${currentMonth}) 活跃订阅: ${activeSubscriptions.length} 个`, 'PASS');
    }

    generateReport() {
        this.log('生成测试报告', 'REPORT');
        
        const summary = {
            total: this.testResults.length,
            passed: this.testResults.filter(r => r.status === 'PASS').length,
            failed: this.testResults.filter(r => r.status === 'FAIL').length,
            warnings: this.testResults.filter(r => r.status === 'WARN').length
        };
        
        console.log('\n=== 测试报告摘要 ===');
        console.log(`总测试项: ${summary.total}`);
        console.log(`通过: ${summary.passed}`);
        console.log(`失败: ${summary.failed}`);
        console.log(`警告: ${summary.warnings}`);
        
        if (summary.failed === 0) {
            console.log('\n🎉 所有关键测试都通过了！');
        } else {
            console.log('\n❌ 存在失败的测试项，请检查上述日志');
        }
    }
}

// 运行验证测试
if (require.main === module) {
    const validator = new PaymentHistoryValidator();
    validator.runAllTests().catch(console.error);
}

module.exports = PaymentHistoryValidator;
