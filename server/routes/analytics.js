const express = require('express');

function createAnalyticsRoutes(db) {
    const router = express.Router();

    // GET monthly revenue statistics (Public)
    router.get('/monthly-revenue', (req, res) => {
        try {
            const { start_date, end_date, currency } = req.query;

            let query = `
                SELECT
                    strftime('%Y-%m', payment_date) as month,
                    currency,
                    SUM(amount_paid) as total_revenue,
                    COUNT(id) as payment_count,
                    AVG(amount_paid) as average_payment
                FROM payment_history
                WHERE status = 'succeeded'
            `;

            const params = [];

            // Add date filters if provided
            if (start_date) {
                query += ' AND payment_date >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND payment_date <= ?';
                params.push(end_date);
            }

            // Add currency filter if provided
            if (currency) {
                query += ' AND currency = ?';
                params.push(currency);
            }

            query += ' GROUP BY strftime(\'%Y-%m\', payment_date), currency ORDER BY month DESC, currency';

            const stmt = db.prepare(query);
            const results = stmt.all(...params);

            // Transform results for better readability
            const monthlyStats = results.map(row => ({
                month: row.month,
                currency: row.currency,
                totalRevenue: parseFloat(row.total_revenue),
                paymentCount: row.payment_count,
                averagePayment: parseFloat(row.average_payment)
            }));

            // Calculate summary statistics
            const summary = {
                totalMonths: new Set(results.map(r => r.month)).size,
                totalRevenue: results.reduce((sum, r) => sum + parseFloat(r.total_revenue), 0),
                totalPayments: results.reduce((sum, r) => sum + r.payment_count, 0),
                currencies: [...new Set(results.map(r => r.currency))]
            };

            res.json({
                monthlyStats,
                summary,
                filters: {
                    startDate: start_date || null,
                    endDate: end_date || null,
                    currency: currency || null
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET monthly active subscriptions statistics (Public)
    router.get('/monthly-active-subscriptions', (req, res) => {
        try {
            const { month, year } = req.query;

            if (!month || !year) {
                return res.status(400).json({
                    error: 'Month and year parameters are required. Format: month=07&year=2025'
                });
            }

            // Validate month and year
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            if (monthNum < 1 || monthNum > 12) {
                return res.status(400).json({ error: 'Month must be between 1 and 12' });
            }

            if (yearNum < 2000 || yearNum > 3000) {
                return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
            }

            // Format month with leading zero
            const monthStr = monthNum.toString().padStart(2, '0');
            const targetMonth = `${yearNum}-${monthStr}`;

            // Calculate the first and last day of the target month
            const firstDay = `${targetMonth}-01`;
            const lastDay = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]; // Last day of month

            // Query to find subscriptions that were active during the target month
            // A subscription is active in a month if it has payment records that cover that month
            const query = `
                SELECT DISTINCT
                    s.id,
                    s.name,
                    s.plan,
                    s.amount,
                    s.currency,
                    s.billing_cycle,
                    s.status,
                    s.category,
                    COUNT(ph.id) as payment_count_in_month,
                    SUM(ph.amount_paid) as total_paid_in_month,
                    MIN(ph.billing_period_start) as earliest_period_start,
                    MAX(ph.billing_period_end) as latest_period_end
                FROM subscriptions s
                INNER JOIN payment_history ph ON s.id = ph.subscription_id
                WHERE ph.status = 'succeeded'
                    AND (
                        -- Payment period overlaps with target month
                        (ph.billing_period_start <= ? AND ph.billing_period_end >= ?) OR
                        (ph.billing_period_start <= ? AND ph.billing_period_end >= ?) OR
                        (ph.billing_period_start >= ? AND ph.billing_period_start <= ?)
                    )
                GROUP BY s.id, s.name, s.plan, s.amount, s.currency, s.billing_cycle, s.status, s.category
                ORDER BY s.name
            `;

            const stmt = db.prepare(query);
            const activeSubscriptions = stmt.all(
                lastDay, firstDay,  // Period ends after month start and starts before month end
                firstDay, lastDay,  // Period starts before month end and ends after month start
                firstDay, lastDay   // Period starts and ends within the month
            );

            // Calculate summary statistics
            const summary = {
                totalActiveSubscriptions: activeSubscriptions.length,
                totalRevenue: activeSubscriptions.reduce((sum, sub) => sum + parseFloat(sub.total_paid_in_month || 0), 0),
                totalPayments: activeSubscriptions.reduce((sum, sub) => sum + (sub.payment_count_in_month || 0), 0),
                byCategory: {},
                byCurrency: {},
                byBillingCycle: {}
            };

            // Group by category, currency, and billing cycle
            activeSubscriptions.forEach(sub => {
                // By category
                if (!summary.byCategory[sub.category]) {
                    summary.byCategory[sub.category] = { count: 0, revenue: 0 };
                }
                summary.byCategory[sub.category].count++;
                summary.byCategory[sub.category].revenue += parseFloat(sub.total_paid_in_month || 0);

                // By currency
                if (!summary.byCurrency[sub.currency]) {
                    summary.byCurrency[sub.currency] = { count: 0, revenue: 0 };
                }
                summary.byCurrency[sub.currency].count++;
                summary.byCurrency[sub.currency].revenue += parseFloat(sub.total_paid_in_month || 0);

                // By billing cycle
                if (!summary.byBillingCycle[sub.billing_cycle]) {
                    summary.byBillingCycle[sub.billing_cycle] = { count: 0, revenue: 0 };
                }
                summary.byBillingCycle[sub.billing_cycle].count++;
                summary.byBillingCycle[sub.billing_cycle].revenue += parseFloat(sub.total_paid_in_month || 0);
            });

            res.json({
                targetMonth: targetMonth,
                period: {
                    start: firstDay,
                    end: lastDay
                },
                activeSubscriptions: activeSubscriptions.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    plan: sub.plan,
                    amount: parseFloat(sub.amount),
                    currency: sub.currency,
                    billingCycle: sub.billing_cycle,
                    status: sub.status,
                    category: sub.category,
                    paymentCountInMonth: sub.payment_count_in_month,
                    totalPaidInMonth: parseFloat(sub.total_paid_in_month || 0),
                    activePeriod: {
                        start: sub.earliest_period_start,
                        end: sub.latest_period_end
                    }
                })),
                summary
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = {
    createAnalyticsRoutes
};
