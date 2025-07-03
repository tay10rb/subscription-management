const express = require('express');

function createPaymentHistoryRoutes(db) {
    const router = express.Router();

    // GET payment history with filters (Public)
    router.get('/', (req, res) => {
        try {
            const {
                subscription_id,
                start_date,
                end_date,
                status,
                currency,
                limit = 50,
                offset = 0
            } = req.query;

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

            // Add filters
            if (subscription_id) {
                query += ' AND ph.subscription_id = ?';
                params.push(subscription_id);
            }

            if (start_date) {
                query += ' AND ph.payment_date >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND ph.payment_date <= ?';
                params.push(end_date);
            }

            if (status) {
                query += ' AND ph.status = ?';
                params.push(status);
            }

            if (currency) {
                query += ' AND ph.currency = ?';
                params.push(currency);
            }

            query += ' ORDER BY ph.payment_date DESC, ph.id DESC';
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const stmt = db.prepare(query);
            const payments = stmt.all(...params);

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total
                FROM payment_history ph
                WHERE 1=1
            `;

            const countParams = [];
            if (subscription_id) {
                countQuery += ' AND ph.subscription_id = ?';
                countParams.push(subscription_id);
            }
            if (start_date) {
                countQuery += ' AND ph.payment_date >= ?';
                countParams.push(start_date);
            }
            if (end_date) {
                countQuery += ' AND ph.payment_date <= ?';
                countParams.push(end_date);
            }
            if (status) {
                countQuery += ' AND ph.status = ?';
                countParams.push(status);
            }
            if (currency) {
                countQuery += ' AND ph.currency = ?';
                countParams.push(currency);
            }

            const countStmt = db.prepare(countQuery);
            const { total } = countStmt.get(...countParams);

            res.json({
                payments: payments.map(p => ({
                    id: p.id,
                    subscriptionId: p.subscription_id,
                    subscriptionName: p.subscription_name,
                    subscriptionPlan: p.subscription_plan,
                    paymentDate: p.payment_date,
                    amountPaid: parseFloat(p.amount_paid),
                    currency: p.currency,
                    billingPeriod: {
                        start: p.billing_period_start,
                        end: p.billing_period_end
                    },
                    status: p.status,
                    notes: p.notes,
                    createdAt: p.created_at
                })),
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + parseInt(limit) < total
                },
                filters: {
                    subscriptionId: subscription_id || null,
                    startDate: start_date || null,
                    endDate: end_date || null,
                    status: status || null,
                    currency: currency || null
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET single payment history record (Public)
    router.get('/:id', (req, res) => {
        try {
            const { id } = req.params;

            const stmt = db.prepare(`
                SELECT
                    ph.*,
                    s.name as subscription_name,
                    s.plan as subscription_plan,
                    s.billing_cycle
                FROM payment_history ph
                LEFT JOIN subscriptions s ON ph.subscription_id = s.id
                WHERE ph.id = ?
            `);

            const payment = stmt.get(id);

            if (!payment) {
                return res.status(404).json({ error: 'Payment record not found' });
            }

            res.json({
                id: payment.id,
                subscriptionId: payment.subscription_id,
                subscriptionName: payment.subscription_name,
                subscriptionPlan: payment.subscription_plan,
                subscriptionBillingCycle: payment.billing_cycle,
                paymentDate: payment.payment_date,
                amountPaid: parseFloat(payment.amount_paid),
                currency: payment.currency,
                billingPeriod: {
                    start: payment.billing_period_start,
                    end: payment.billing_period_end
                },
                status: payment.status,
                notes: payment.notes,
                createdAt: payment.created_at
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function createProtectedPaymentHistoryRoutes(db) {
    const router = express.Router();

    // POST create new payment history record (Protected)
    router.post('/', (req, res) => {
        try {
            const {
                subscription_id,
                payment_date,
                amount_paid,
                currency,
                billing_period_start,
                billing_period_end,
                status = 'succeeded',
                notes
            } = req.body;

            // Validate required fields
            if (!subscription_id || !payment_date || !amount_paid || !currency || !billing_period_start || !billing_period_end) {
                return res.status(400).json({
                    error: 'Missing required fields: subscription_id, payment_date, amount_paid, currency, billing_period_start, billing_period_end'
                });
            }

            // Verify subscription exists
            const subscriptionStmt = db.prepare('SELECT id FROM subscriptions WHERE id = ?');
            const subscription = subscriptionStmt.get(subscription_id);

            if (!subscription) {
                return res.status(404).json({ error: 'Subscription not found' });
            }

            // Validate status
            const validStatuses = ['succeeded', 'failed', 'refunded'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const stmt = db.prepare(`
                INSERT INTO payment_history (
                    subscription_id, payment_date, amount_paid, currency,
                    billing_period_start, billing_period_end, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                subscription_id, payment_date, amount_paid, currency,
                billing_period_start, billing_period_end, status, notes
            );

            res.status(201).json({
                id: info.lastInsertRowid,
                message: 'Payment history record created successfully'
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // PUT update payment history record (Protected)
    router.put('/:id', (req, res) => {
        try {
            const { id } = req.params;
            const {
                payment_date,
                amount_paid,
                currency,
                billing_period_start,
                billing_period_end,
                status,
                notes
            } = req.body;

            // Check if payment record exists
            const checkStmt = db.prepare('SELECT id FROM payment_history WHERE id = ?');
            const existingPayment = checkStmt.get(id);

            if (!existingPayment) {
                return res.status(404).json({ error: 'Payment record not found' });
            }

            // Validate status if provided
            if (status) {
                const validStatuses = ['succeeded', 'failed', 'refunded'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                    });
                }
            }

            // Build dynamic update query
            const updates = [];
            const params = [];

            if (payment_date !== undefined) {
                updates.push('payment_date = ?');
                params.push(payment_date);
            }
            if (amount_paid !== undefined) {
                updates.push('amount_paid = ?');
                params.push(amount_paid);
            }
            if (currency !== undefined) {
                updates.push('currency = ?');
                params.push(currency);
            }
            if (billing_period_start !== undefined) {
                updates.push('billing_period_start = ?');
                params.push(billing_period_start);
            }
            if (billing_period_end !== undefined) {
                updates.push('billing_period_end = ?');
                params.push(billing_period_end);
            }
            if (status !== undefined) {
                updates.push('status = ?');
                params.push(status);
            }
            if (notes !== undefined) {
                updates.push('notes = ?');
                params.push(notes);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            params.push(id);

            const stmt = db.prepare(`
                UPDATE payment_history
                SET ${updates.join(', ')}
                WHERE id = ?
            `);

            const result = stmt.run(...params);

            if (result.changes > 0) {
                res.json({ message: 'Payment history record updated successfully' });
            } else {
                res.status(500).json({ error: 'Failed to update payment record' });
            }

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE payment history record (Protected)
    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;

            const stmt = db.prepare('DELETE FROM payment_history WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes > 0) {
                res.json({ message: 'Payment history record deleted successfully' });
            } else {
                res.status(404).json({ error: 'Payment record not found' });
            }

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createPaymentHistoryRoutes,
    createProtectedPaymentHistoryRoutes
};
