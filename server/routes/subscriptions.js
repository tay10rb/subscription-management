const express = require('express');
const { calculateLastBillingDate, calculateNextBillingDate, getTodayString, isDateDueOrOverdue } = require('../utils/dateUtils');

function createSubscriptionRoutes(db) {
    const router = express.Router();

    // GET all subscriptions (Public)
    router.get('/', (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM subscriptions');
            const subscriptions = stmt.all();
            res.json(subscriptions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET a single subscription by ID (Public)
    router.get('/:id', (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM subscriptions WHERE id = ?');
            const subscription = stmt.get(req.params.id);
            if (subscription) {
                res.json(subscription);
            } else {
                res.status(404).json({ message: 'Subscription not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedSubscriptionRoutes(db) {
    const router = express.Router();

    // POST a new subscription (Protected)
    router.post('/', (req, res) => {
        try {
            const {
                name,
                plan,
                billing_cycle,
                next_billing_date,
                amount,
                currency,
                payment_method,
                start_date,
                status,
                category,
                renewal_type,
                notes,
                website
            } = req.body;

            // Calculate last billing date automatically
            const last_billing_date = calculateLastBillingDate(next_billing_date, start_date, billing_cycle);

            // Use transaction to ensure data consistency
            const createSubscriptionWithPayment = db.transaction((subscriptionData, paymentData) => {
                // Insert subscription
                const subscriptionStmt = db.prepare(`
                    INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, renewal_type, notes, website)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                const subscriptionInfo = subscriptionStmt.run(...subscriptionData);
                const subscriptionId = subscriptionInfo.lastInsertRowid;

                // Insert initial payment record
                const paymentStmt = db.prepare(`
                    INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                paymentStmt.run(subscriptionId, ...paymentData);

                return subscriptionId;
            });

            const subscriptionData = [name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, renewal_type || 'manual', notes, website];
            const paymentData = [
                start_date, // payment_date (assuming payment was made on start date)
                amount, // amount_paid
                currency, // currency
                start_date, // billing_period_start
                next_billing_date, // billing_period_end
                'succeeded', // status
                'Initial subscription payment' // notes
            ];

            const subscriptionId = createSubscriptionWithPayment(subscriptionData, paymentData);

            // Automatically generate monthly_expenses from the new payment_history record
            try {
                const MonthlyExpenseUpdater = require('../utils/monthlyExpenseUpdater');
                const monthlyExpenseUpdater = new MonthlyExpenseUpdater(db.name);

                // Get the payment record we just created
                const paymentStmt = db.prepare(`
                    SELECT id FROM payment_history
                    WHERE subscription_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                `);
                const payment = paymentStmt.get(subscriptionId);

                if (payment) {
                    await monthlyExpenseUpdater.handlePaymentInsert(payment.id);
                    console.log(`✅ Monthly expenses generated for new subscription ${subscriptionId}`);
                }

                monthlyExpenseUpdater.close();
            } catch (error) {
                console.error(`⚠️ Failed to generate monthly expenses for subscription ${subscriptionId}:`, error.message);
                // Don't fail the subscription creation if monthly expense generation fails
            }

            res.status(201).json({ id: subscriptionId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST to bulk-insert subscriptions (Protected)
    router.post('/bulk', (req, res) => {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ message: 'Request body must be an array of subscriptions.' });
        }

        const insertSubscription = db.prepare(`
            INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, renewal_type, notes, website)
            VALUES (@name, @plan, @billing_cycle, @next_billing_date, @last_billing_date, @amount, @currency, @payment_method, @start_date, @status, @category, @renewal_type, @notes, @website)
        `);

        const insertPayment = db.prepare(`
            INSERT INTO payment_history (subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((subscriptions) => {
            let insertedCount = 0;
            for (const sub of subscriptions) {
                try {
                    const last_billing_date = calculateLastBillingDate(sub.next_billing_date, sub.start_date, sub.billing_cycle);

                    // Insert subscription
                    const subscriptionInfo = insertSubscription.run({
                        ...sub,
                        last_billing_date,
                        renewal_type: sub.renewal_type || 'manual'
                    });

                    // Insert initial payment record
                    insertPayment.run(
                        subscriptionInfo.lastInsertRowid, // subscription_id
                        sub.start_date, // payment_date
                        sub.amount, // amount_paid
                        sub.currency, // currency
                        sub.start_date, // billing_period_start
                        sub.next_billing_date, // billing_period_end
                        'succeeded', // status
                        'Initial subscription payment (bulk import)' // notes
                    );

                    insertedCount++;
                } catch (error) {
                    console.error('Failed to insert subscription:', sub.name, error);
                }
            }
            return insertedCount;
        });

        try {
            const count = insertMany(req.body);

            // Automatically generate monthly_expenses for all new subscriptions
            if (count > 0) {
                try {
                    const MonthlyExpenseService = require('../services/monthlyExpenseService');
                    const monthlyExpenseService = new MonthlyExpenseService(db.name);

                    // Recalculate all monthly expenses to include the new subscriptions
                    monthlyExpenseService.recalculateAllMonthlyExpenses();
                    monthlyExpenseService.close();

                    console.log(`✅ Monthly expenses recalculated after bulk import of ${count} subscriptions`);
                } catch (error) {
                    console.error(`⚠️ Failed to recalculate monthly expenses after bulk import:`, error.message);
                    // Don't fail the bulk import if monthly expense generation fails
                }
            }

            res.status(201).json({ message: `Successfully imported ${count} subscriptions.` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PUT to update a subscription (Protected)
    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Get the original subscription to have all fields available for last_billing_date calculation
            const getStmt = db.prepare('SELECT * FROM subscriptions WHERE id = ?');
            const originalSub = getStmt.get(id);

            if (!originalSub) {
                return res.status(404).json({ message: 'Subscription not found' });
            }

            // --- Dynamically build the UPDATE query ---
            const fields = [];
            const values = [];

            // Define allowed fields (frontend already sends snake_case via transformToApi)
            const allowedFields = [
                'name',
                'plan',
                'billing_cycle',
                'next_billing_date',
                'amount',
                'currency',
                'payment_method',
                'start_date',
                'status',
                'category',
                'renewal_type',
                'notes',
                'website'
            ];

            // Filter updates to only include allowed fields (already in snake_case)
            const snakeCaseUpdates = {};
            for (const key in updates) {
                if (allowedFields.includes(key)) {
                    snakeCaseUpdates[key] = updates[key];
                }
            }

            // Handle special logic for last_billing_date
            const nextBillingDate = snakeCaseUpdates.next_billing_date || originalSub.next_billing_date;
            const startDate = snakeCaseUpdates.start_date || originalSub.start_date;
            const billingCycle = snakeCaseUpdates.billing_cycle || originalSub.billing_cycle;

            // Recalculate if relevant fields are changing
            if (snakeCaseUpdates.next_billing_date || snakeCaseUpdates.start_date || snakeCaseUpdates.billing_cycle) {
                snakeCaseUpdates.last_billing_date = calculateLastBillingDate(nextBillingDate, startDate, billingCycle);
            }

            // Build the query parts
            for (const key in snakeCaseUpdates) {
                if (Object.prototype.hasOwnProperty.call(snakeCaseUpdates, key)) {
                    fields.push(`${key} = ?`);
                    values.push(snakeCaseUpdates[key]);
                }
            }

            if (fields.length === 0) {
                return res.status(400).json({ message: 'No valid fields to update' });
            }

            // Always update the 'updated_at' timestamp
            fields.push('updated_at = CURRENT_TIMESTAMP');

            const stmt = db.prepare(`
                UPDATE subscriptions
                SET ${fields.join(', ')}
                WHERE id = ?
            `);

            values.push(id);
            const info = stmt.run(...values);

            if (info.changes > 0) {
                res.json({ message: 'Subscription updated successfully' });
            } else {
                // This case should theoretically not be hit if we check for originalSub existence
                res.status(404).json({ message: 'Subscription not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE a subscription (Protected)
    router.delete('/:id', (req, res) => {
        try {
            const subscriptionId = req.params.id;

            // Get subscription info before deletion for logging
            const getStmt = db.prepare('SELECT name FROM subscriptions WHERE id = ?');
            const subscription = getStmt.get(subscriptionId);

            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }

            // Delete subscription (cascade triggers will handle payment_history and monthly_expenses)
            const stmt = db.prepare('DELETE FROM subscriptions WHERE id = ?');
            const info = stmt.run(subscriptionId);

            if (info.changes > 0) {
                console.log(`✅ Subscription deleted: ${subscription.name} (ID: ${subscriptionId}), related data cleaned up automatically`);
                res.json({ message: 'Subscription deleted successfully' });
            } else {
                res.status(404).json({ message: 'Subscription not found' });
            }
        } catch (error) {
            console.error(`❌ Failed to delete subscription ${req.params.id}:`, error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createSubscriptionRoutes,
    createProtectedSubscriptionRoutes
};
