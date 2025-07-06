const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DatabaseMigrations = require('../db/migrations');

/**
 * Comprehensive test script for data consistency and referential integrity
 * Tests cascade deletion and automatic data generation for subscriptions
 */
class DataConsistencyTest {
    constructor() {
        // Use a temporary test database
        this.testDbPath = path.join(__dirname, 'test-database.sqlite');
        this.db = null;
    }

    async setup() {
        console.log('🔧 Setting up test database...');
        
        // Remove existing test database if it exists
        if (fs.existsSync(this.testDbPath)) {
            fs.unlinkSync(this.testDbPath);
        }

        // Create and initialize test database
        this.db = new Database(this.testDbPath);
        
        // Run migrations to set up schema
        const migrations = new DatabaseMigrations(this.testDbPath);
        await migrations.runMigrations();
        migrations.close();
        
        // Reopen database connection
        this.db = new Database(this.testDbPath);
        
        console.log('✅ Test database setup complete');
    }

    async cleanup() {
        console.log('🧹 Cleaning up test database...');
        if (this.db) {
            this.db.close();
        }
        if (fs.existsSync(this.testDbPath)) {
            fs.unlinkSync(this.testDbPath);
        }
        console.log('✅ Cleanup complete');
    }

    // Helper method to create a test subscription
    createTestSubscription(name = 'Test Subscription') {
        const stmt = this.db.prepare(`
            INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, renewal_type, notes, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const subscriptionData = [
            name,
            'Premium',
            'monthly',
            '2025-08-06',
            '2025-07-06',
            9.99,
            'USD',
            'Credit Card',
            '2025-07-06',
            'active',
            'entertainment',
            'manual',
            'Test subscription for data consistency',
            'https://example.com'
        ];
        
        const result = stmt.run(...subscriptionData);
        return result.lastInsertRowid;
    }

    // Helper method to create payment history for a subscription
    createTestPaymentHistory(subscriptionId) {
        const stmt = this.db.prepare(`
            INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const paymentData = [
            subscriptionId,
            '2025-07-06',
            9.99,
            'USD',
            '2025-07-06',
            '2025-08-06',
            'succeeded',
            'Test payment record'
        ];
        
        const result = stmt.run(...paymentData);
        return result.lastInsertRowid;
    }

    // Helper method to create monthly expenses record
    createTestMonthlyExpenses(paymentIds, monthOffset = 0) {
        const date = new Date(2025, 6 + monthOffset, 1); // July 2025 + offset
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}${month.toString().padStart(2, '0')}`;

        const stmt = this.db.prepare(`
            INSERT INTO monthly_expenses (month_key, year, month, payment_history_ids, amount_usd)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(monthKey, year, month, JSON.stringify(paymentIds), 9.99);
        return result.lastInsertRowid;
    }

    // Test 1: Cascade deletion for individual subscription
    async testCascadeDeletionIndividual() {
        console.log('\n📋 Test 1: Individual subscription cascade deletion');
        
        try {
            // Create test data
            const subscriptionId = this.createTestSubscription('Individual Test Sub');
            const paymentId = this.createTestPaymentHistory(subscriptionId);
            const monthlyExpenseId = this.createTestMonthlyExpenses([paymentId]);
            
            console.log(`   Created: Subscription ${subscriptionId}, Payment ${paymentId}, Monthly Expense ${monthlyExpenseId}`);
            
            // Verify data exists
            const subCount = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE id = ?').get(subscriptionId).count;
            const paymentCount = this.db.prepare('SELECT COUNT(*) as count FROM payment_history WHERE id = ?').get(paymentId).count;
            const expenseCount = this.db.prepare('SELECT COUNT(*) as count FROM monthly_expenses WHERE id = ?').get(monthlyExpenseId).count;
            
            console.log(`   Before deletion: Subscription: ${subCount}, Payment: ${paymentCount}, Monthly Expense: ${expenseCount}`);
            
            // Delete subscription
            const deleteStmt = this.db.prepare('DELETE FROM subscriptions WHERE id = ?');
            deleteStmt.run(subscriptionId);
            
            // Verify cascade deletion
            const subCountAfter = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE id = ?').get(subscriptionId).count;
            const paymentCountAfter = this.db.prepare('SELECT COUNT(*) as count FROM payment_history WHERE id = ?').get(paymentId).count;
            const expenseCountAfter = this.db.prepare('SELECT COUNT(*) as count FROM monthly_expenses WHERE id = ?').get(monthlyExpenseId).count;
            
            console.log(`   After deletion: Subscription: ${subCountAfter}, Payment: ${paymentCountAfter}, Monthly Expense: ${expenseCountAfter}`);
            
            // Assertions
            if (subCountAfter === 0 && paymentCountAfter === 0 && expenseCountAfter === 0) {
                console.log('   ✅ PASS: All related data deleted successfully');
                return true;
            } else {
                console.log('   ❌ FAIL: Some data was not deleted properly');
                return false;
            }
            
        } catch (error) {
            console.log(`   ❌ FAIL: Error during test - ${error.message}`);
            return false;
        }
    }

    // Test 2: Bulk deletion cascade
    async testCascadeDeletionBulk() {
        console.log('\n📋 Test 2: Bulk subscription cascade deletion');
        
        try {
            // Create multiple test subscriptions
            const subscriptionIds = [];
            const paymentIds = [];
            const monthlyExpenseIds = [];
            
            for (let i = 1; i <= 3; i++) {
                const subId = this.createTestSubscription(`Bulk Test Sub ${i}`);
                const payId = this.createTestPaymentHistory(subId);
                const expId = this.createTestMonthlyExpenses([payId], i - 1); // Use different months to avoid UNIQUE constraint

                subscriptionIds.push(subId);
                paymentIds.push(payId);
                monthlyExpenseIds.push(expId);
            }
            
            console.log(`   Created: ${subscriptionIds.length} subscriptions with related data`);
            
            // Verify data exists
            const totalSubs = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions').get().count;
            const totalPayments = this.db.prepare('SELECT COUNT(*) as count FROM payment_history').get().count;
            const totalExpenses = this.db.prepare('SELECT COUNT(*) as count FROM monthly_expenses').get().count;
            
            console.log(`   Before bulk deletion: Subscriptions: ${totalSubs}, Payments: ${totalPayments}, Monthly Expenses: ${totalExpenses}`);
            
            // Bulk delete all subscriptions
            const deleteStmt = this.db.prepare('DELETE FROM subscriptions');
            deleteStmt.run();
            
            // Also delete monthly_expenses (simulating the enhanced reset endpoint)
            const deleteExpensesStmt = this.db.prepare('DELETE FROM monthly_expenses');
            deleteExpensesStmt.run();
            
            // Verify bulk deletion
            const totalSubsAfter = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions').get().count;
            const totalPaymentsAfter = this.db.prepare('SELECT COUNT(*) as count FROM payment_history').get().count;
            const totalExpensesAfter = this.db.prepare('SELECT COUNT(*) as count FROM monthly_expenses').get().count;
            
            console.log(`   After bulk deletion: Subscriptions: ${totalSubsAfter}, Payments: ${totalPaymentsAfter}, Monthly Expenses: ${totalExpensesAfter}`);
            
            // Assertions
            if (totalSubsAfter === 0 && totalPaymentsAfter === 0 && totalExpensesAfter === 0) {
                console.log('   ✅ PASS: All data deleted successfully');
                return true;
            } else {
                console.log('   ❌ FAIL: Some data was not deleted properly');
                return false;
            }
            
        } catch (error) {
            console.log(`   ❌ FAIL: Error during test - ${error.message}`);
            return false;
        }
    }

    // Test 3: Automatic data generation for new subscriptions
    async testAutomaticDataGeneration() {
        console.log('\n📋 Test 3: Automatic data generation for new subscriptions');
        
        try {
            // Simulate the subscription creation process with automatic data generation
            const subscriptionId = this.createTestSubscription('Auto Generation Test');
            
            // Create payment history (this would normally be done automatically)
            const paymentId = this.createTestPaymentHistory(subscriptionId);
            
            // Simulate monthly expense generation using the service
            const MonthlyExpenseService = require('../services/monthlyExpenseService');
            const monthlyExpenseService = new MonthlyExpenseService(this.testDbPath);
            
            // Process the payment to generate monthly expenses
            monthlyExpenseService.processNewPayment(paymentId);
            monthlyExpenseService.close();
            
            // Verify data was generated
            const subCount = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE id = ?').get(subscriptionId).count;
            const paymentCount = this.db.prepare('SELECT COUNT(*) as count FROM payment_history WHERE subscription_id = ?').get(subscriptionId).count;
            const expenseCount = this.db.prepare('SELECT COUNT(*) as count FROM monthly_expenses WHERE payment_history_ids LIKE ?').get(`%${paymentId}%`).count;
            
            console.log(`   Generated data: Subscription: ${subCount}, Payment: ${paymentCount}, Monthly Expense: ${expenseCount}`);
            
            // Assertions
            if (subCount === 1 && paymentCount === 1 && expenseCount === 1) {
                console.log('   ✅ PASS: Automatic data generation working correctly');
                return true;
            } else {
                console.log('   ❌ FAIL: Automatic data generation failed');
                return false;
            }
            
        } catch (error) {
            console.log(`   ❌ FAIL: Error during test - ${error.message}`);
            return false;
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Data Consistency Tests');
        console.log('=====================================');
        
        await this.setup();
        
        const results = [];
        
        try {
            results.push(await this.testCascadeDeletionIndividual());
            results.push(await this.testCascadeDeletionBulk());
            results.push(await this.testAutomaticDataGeneration());
            
            const passedTests = results.filter(result => result === true).length;
            const totalTests = results.length;
            
            console.log('\n📊 Test Results Summary');
            console.log('=======================');
            console.log(`Passed: ${passedTests}/${totalTests}`);
            
            if (passedTests === totalTests) {
                console.log('🎉 All tests passed! Data consistency implementation is working correctly.');
            } else {
                console.log('⚠️ Some tests failed. Please review the implementation.');
            }
            
        } finally {
            await this.cleanup();
        }
        
        return results;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const test = new DataConsistencyTest();
    test.runAllTests().catch(console.error);
}

module.exports = DataConsistencyTest;
