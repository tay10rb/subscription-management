const express = require('express');
const { calculateNextBillingDate, getTodayString, isDateDueOrOverdue } = require('../utils/dateUtils');

function createSubscriptionManagementRoutes(db) {
    const router = express.Router();

    // POST to process auto renewals (Protected)
    router.post('/auto-renew', (req, res) => {
        try {
            // Get all active subscriptions with auto renewal
            const selectStmt = db.prepare('SELECT * FROM subscriptions WHERE status = ? AND renewal_type = ?');
            const activeAutoRenewalSubscriptions = selectStmt.all('active', 'auto');

            let processed = 0;
            let errors = 0;
            const renewedSubscriptions = [];

            // Check each subscription for renewal
            for (const sub of activeAutoRenewalSubscriptions) {
                try {
                    // Check if subscription is due (today or overdue)
                    if (isDateDueOrOverdue(sub.next_billing_date)) {
                        // Calculate new dates
                        const todayStr = getTodayString();

                        // Calculate actual next billing date (one cycle forward)
                        const newNextBillingStr = calculateNextBillingDate(sub.next_billing_date, sub.billing_cycle);

                        // Use transaction to ensure data consistency
                        const renewSubscription = db.transaction((subscriptionId, lastBilling, nextBilling, paymentData) => {
                            // Update subscription
                            const updateStmt = db.prepare(`
                                UPDATE subscriptions
                                SET last_billing_date = ?, next_billing_date = ?, updated_at = CURRENT_TIMESTAMP
                                WHERE id = ?
                            `);
                            const updateResult = updateStmt.run(lastBilling, nextBilling, subscriptionId);

                            if (updateResult.changes > 0) {
                                // Create payment history record
                                const paymentStmt = db.prepare(`
                                    INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                `);
                                paymentStmt.run(subscriptionId, ...paymentData);
                                return true;
                            }
                            return false;
                        });

                        const paymentData = [
                            todayStr, // payment_date
                            sub.amount, // amount_paid
                            sub.currency, // currency
                            sub.next_billing_date, // billing_period_start (current period start)
                            newNextBillingStr, // billing_period_end (new period end)
                            'succeeded', // status
                            'Auto renewal payment' // notes
                        ];

                        const success = renewSubscription(sub.id, todayStr, newNextBillingStr, paymentData);

                        if (success) {
                            processed++;
                            renewedSubscriptions.push({
                                id: sub.id,
                                name: sub.name,
                                oldNextBilling: sub.next_billing_date,
                                newLastBilling: todayStr,
                                newNextBilling: newNextBillingStr
                            });
                        } else {
                            errors++;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing renewal for subscription ${sub.id}:`, error);
                    errors++;
                }
            }

            res.json({
                message: `Auto renewal complete: ${processed} processed, ${errors} errors`,
                processed,
                errors,
                renewedSubscriptions
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST to process expired manual subscriptions (Protected)
    router.post('/process-expired', (req, res) => {
        try {
            // Get all active manual subscriptions that are overdue
            const selectStmt = db.prepare('SELECT * FROM subscriptions WHERE status = ? AND renewal_type = ?');
            const activeManualSubscriptions = selectStmt.all('active', 'manual');

            let processed = 0;
            let errors = 0;
            const expiredSubscriptions = [];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check each manual subscription for expiration
            for (const sub of activeManualSubscriptions) {
                try {
                    const billingDate = new Date(sub.next_billing_date);
                    billingDate.setHours(0, 0, 0, 0);

                    // If billing date has passed, mark as cancelled
                    if (billingDate < today) {
                        const updateStmt = db.prepare(`
                            UPDATE subscriptions
                            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `);

                        const updateResult = updateStmt.run(sub.id);

                        if (updateResult.changes > 0) {
                            processed++;
                            expiredSubscriptions.push({
                                id: sub.id,
                                name: sub.name,
                                expiredDate: sub.next_billing_date
                            });
                        } else {
                            errors++;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing expiration for subscription ${sub.id}:`, error);
                    errors++;
                }
            }

            res.json({
                message: `Expired subscriptions processed: ${processed} expired, ${errors} errors`,
                processed,
                errors,
                expiredSubscriptions
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST to manually renew a subscription (Protected)
    router.post('/:id/manual-renew', (req, res) => {
        try {
            const { id } = req.params;

            // Get the subscription
            const getStmt = db.prepare('SELECT * FROM subscriptions WHERE id = ?');
            const subscription = getStmt.get(id);

            if (!subscription) {
                return res.status(404).json({ error: 'Subscription not found' });
            }

            if (subscription.renewal_type !== 'manual') {
                return res.status(400).json({ error: 'Only manual renewal subscriptions can be manually renewed' });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = getTodayString();

            const currentNextBilling = new Date(subscription.next_billing_date);
            currentNextBilling.setHours(0, 0, 0, 0);

            // If renewing before the due date, calculate from the original due date
            // If renewing after the due date, calculate from today
            const baseDate = currentNextBilling >= today ? subscription.next_billing_date : todayStr;
            const newNextBillingStr = calculateNextBillingDate(baseDate, subscription.billing_cycle);

            // Use transaction to ensure data consistency
            const renewSubscription = db.transaction((subscriptionId, lastBilling, nextBilling, paymentData) => {
                // Update subscription
                const updateStmt = db.prepare(`
                    UPDATE subscriptions
                    SET last_billing_date = ?, next_billing_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                const updateResult = updateStmt.run(lastBilling, nextBilling, subscriptionId);

                if (updateResult.changes > 0) {
                    // Create payment history record
                    const paymentStmt = db.prepare(`
                        INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    paymentStmt.run(subscriptionId, ...paymentData);
                    return true;
                }
                return false;
            });

            const paymentData = [
                todayStr, // payment_date
                subscription.amount, // amount_paid
                subscription.currency, // currency
                subscription.next_billing_date, // billing_period_start (current period start)
                newNextBillingStr, // billing_period_end (new period end)
                'succeeded', // status
                'Manual renewal payment' // notes
            ];

            const success = renewSubscription(id, todayStr, newNextBillingStr, paymentData);

            if (success) {
                res.json({
                    message: 'Subscription renewed successfully',
                    renewalData: {
                        id: subscription.id,
                        name: subscription.name,
                        oldNextBilling: subscription.next_billing_date,
                        newLastBilling: todayStr,
                        newNextBilling: newNextBillingStr,
                        renewedEarly: currentNextBilling >= today
                    }
                });
            } else {
                res.status(500).json({ error: 'Failed to update subscription' });
            }

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST to reactivate a cancelled subscription (Protected)
    router.post('/:id/reactivate', (req, res) => {
        try {
            const { id } = req.params;

            // Get the subscription
            const getStmt = db.prepare('SELECT * FROM subscriptions WHERE id = ?');
            const subscription = getStmt.get(id);

            if (!subscription) {
                return res.status(404).json({ error: 'Subscription not found' });
            }

            if (subscription.status !== 'cancelled') {
                return res.status(400).json({ error: 'Only cancelled subscriptions can be reactivated' });
            }

            const todayStr = getTodayString();

            // Calculate new next billing date from today
            const newNextBillingStr = calculateNextBillingDate(todayStr, subscription.billing_cycle);

            // Use transaction to ensure data consistency
            const reactivateSubscription = db.transaction((subscriptionId, lastBilling, nextBilling, paymentData) => {
                // Update subscription
                const updateStmt = db.prepare(`
                    UPDATE subscriptions
                    SET last_billing_date = ?, next_billing_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                const updateResult = updateStmt.run(lastBilling, nextBilling, subscriptionId);

                if (updateResult.changes > 0) {
                    // Create payment history record for reactivation
                    const paymentStmt = db.prepare(`
                        INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    paymentStmt.run(subscriptionId, ...paymentData);
                    return true;
                }
                return false;
            });

            const paymentData = [
                todayStr, // payment_date
                subscription.amount, // amount_paid
                subscription.currency, // currency
                todayStr, // billing_period_start (new period starts today)
                newNextBillingStr, // billing_period_end
                'succeeded', // status
                'Subscription reactivation payment' // notes
            ];

            const success = reactivateSubscription(id, todayStr, newNextBillingStr, paymentData);

            if (success) {
                res.json({
                    message: 'Subscription reactivated successfully',
                    reactivationData: {
                        id: subscription.id,
                        name: subscription.name,
                        newLastBilling: todayStr,
                        newNextBilling: newNextBillingStr,
                        status: 'active'
                    }
                });
            } else {
                res.status(500).json({ error: 'Failed to reactivate subscription' });
            }

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST to reset all subscriptions (Protected)
    router.post('/reset', (req, res) => {
        try {
            // Use transaction to ensure data consistency
            const resetAll = db.transaction(() => {
                // Delete all subscriptions (payment_history will cascade automatically)
                const subscriptionStmt = db.prepare('DELETE FROM subscriptions');
                const subscriptionResult = subscriptionStmt.run();

                // Explicitly clean up monthly_expenses table
                const monthlyExpensesStmt = db.prepare('DELETE FROM monthly_expenses');
                const monthlyExpensesResult = monthlyExpensesStmt.run();

                return {
                    subscriptions: subscriptionResult.changes,
                    monthlyExpenses: monthlyExpensesResult.changes
                };
            });

            const result = resetAll();

            console.log(`✅ Reset completed: ${result.subscriptions} subscriptions, ${result.monthlyExpenses} monthly expense records deleted`);

            res.json({
                message: 'All subscriptions and related data have been deleted.',
                deletedCounts: {
                    subscriptions: result.subscriptions,
                    monthlyExpenses: result.monthlyExpenses
                }
            });
        } catch (error) {
            console.error('❌ Failed to reset subscriptions:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createSubscriptionManagementRoutes
};
