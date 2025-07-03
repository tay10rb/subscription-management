const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const ExchangeRateScheduler = require('./services/exchangeRateScheduler');

// Load environment variables from root .env file (unified configuration)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const port = process.env.PORT || 3001; // Use PORT from environment or default to 3001

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'db', 'database.sqlite');

// Initialize database with tables if they don't exist
function initializeDatabase() {
    const db = new Database(dbPath);

    try {
        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        // Check if tables exist
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const hasSubscriptions = tables.some(table => table.name === 'subscriptions');
        const hasSettings = tables.some(table => table.name === 'settings');
        const hasExchangeRates = tables.some(table => table.name === 'exchange_rates');

        if (!hasSubscriptions || !hasSettings || !hasExchangeRates) {
            console.log('🔧 Initializing database tables...');
            
            // Create subscriptions table
            db.exec(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    plan TEXT NOT NULL,
                    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly')),
                    next_billing_date DATE,
                    last_billing_date DATE,
                    amount DECIMAL(10, 2) NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'USD',
                    payment_method TEXT NOT NULL,
                    start_date DATE,
                    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
                    category TEXT NOT NULL DEFAULT 'other',
                    renewal_type TEXT NOT NULL DEFAULT 'manual' CHECK (renewal_type IN ('auto', 'manual')),
                    notes TEXT,
                    website TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create settings table
            db.exec(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    currency TEXT NOT NULL DEFAULT 'USD',
                    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create exchange_rates table
            db.exec(`
                CREATE TABLE IF NOT EXISTS exchange_rates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_currency TEXT NOT NULL,
                    to_currency TEXT NOT NULL,
                    rate DECIMAL(15, 8) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(from_currency, to_currency)
                )
            `);

            // Create categories table
            db.exec(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL UNIQUE,
                    label TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create payment_methods table
            db.exec(`
                CREATE TABLE IF NOT EXISTS payment_methods (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL UNIQUE,
                    label TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create triggers
            db.exec(`
                CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
                AFTER UPDATE ON subscriptions
                FOR EACH ROW
                BEGIN
                    UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
            `);
            
            db.exec(`
                CREATE TRIGGER IF NOT EXISTS settings_updated_at
                AFTER UPDATE ON settings
                FOR EACH ROW
                BEGIN
                    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
            `);

            db.exec(`
                CREATE TRIGGER IF NOT EXISTS exchange_rates_updated_at
                AFTER UPDATE ON exchange_rates
                FOR EACH ROW
                BEGIN
                    UPDATE exchange_rates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
            `);
            
            // Insert default settings
            const insertDefaultSettings = db.prepare(`
                INSERT OR IGNORE INTO settings (id, currency, theme)
                VALUES (1, 'USD', 'system')
            `);
            insertDefaultSettings.run();

            // Insert default categories
            const defaultCategories = [
                { value: 'video', label: 'Video Streaming' },
                { value: 'music', label: 'Music Streaming' },
                { value: 'software', label: 'Software' },
                { value: 'cloud', label: 'Cloud Storage' },
                { value: 'news', label: 'News & Magazines' },
                { value: 'game', label: 'Games' },
                { value: 'productivity', label: 'Productivity' },
                { value: 'education', label: 'Education' },
                { value: 'finance', label: 'Finance' },
                { value: 'other', label: 'Other' }
            ];

            const insertCategory = db.prepare(`
                INSERT OR IGNORE INTO categories (value, label)
                VALUES (?, ?)
            `);

            for (const category of defaultCategories) {
                insertCategory.run(category.value, category.label);
            }

            // Insert default payment methods
            const defaultPaymentMethods = [
                { value: 'creditcard', label: 'Credit Card' },
                { value: 'debitcard', label: 'Debit Card' },
                { value: 'paypal', label: 'PayPal' },
                { value: 'applepay', label: 'Apple Pay' },
                { value: 'googlepay', label: 'Google Pay' },
                { value: 'banktransfer', label: 'Bank Transfer' },
                { value: 'crypto', label: 'Cryptocurrency' },
                { value: 'other', label: 'Other' }
            ];

            const insertPaymentMethod = db.prepare(`
                INSERT OR IGNORE INTO payment_methods (value, label)
                VALUES (?, ?)
            `);

            for (const paymentMethod of defaultPaymentMethods) {
                insertPaymentMethod.run(paymentMethod.value, paymentMethod.label);
            }

            // Insert default exchange rates (fallback rates)
            const defaultRates = [
                { from: 'USD', to: 'USD', rate: 1.0 },
                { from: 'USD', to: 'EUR', rate: 0.93 },
                { from: 'USD', to: 'GBP', rate: 0.79 },
                { from: 'USD', to: 'CAD', rate: 1.36 },
                { from: 'USD', to: 'AUD', rate: 1.52 },
                { from: 'USD', to: 'JPY', rate: 151.16 },
                { from: 'USD', to: 'CNY', rate: 7.24 }
            ];

            const insertRate = db.prepare(`
                INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate)
                VALUES (?, ?, ?)
            `);

            for (const rate of defaultRates) {
                insertRate.run(rate.from, rate.to, rate.rate);
            }

            console.log('✅ Database tables initialized successfully!');
        } else {
            console.log('✅ Database tables already exist');
        }
        
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

const db = initializeDatabase();

// Initialize exchange rate scheduler
const exchangeRateScheduler = new ExchangeRateScheduler(db, process.env.TIANAPI_KEY);
exchangeRateScheduler.start();

// Function to calculate last billing date based on next billing date and billing cycle
function calculateLastBillingDate(nextBillingDate, startDate, billingCycle) {
    const nextDate = new Date(nextBillingDate);
    const startDateObj = new Date(startDate);
    let lastBillingDate;
    
    switch (billingCycle) {
        case 'monthly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 1);
            break;
        case 'yearly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setFullYear(lastBillingDate.getFullYear() - 1);
            break;
        case 'quarterly':
            lastBillingDate = new Date(nextDate);
            lastBillingDate.setMonth(lastBillingDate.getMonth() - 3);
            break;
        default:
            return null;
    }
    
    // Ensure last billing date is not before start date
    if (lastBillingDate < startDateObj) {
        lastBillingDate = startDateObj;
    }
    
    return lastBillingDate.toISOString().split('T')[0];
}

// Middleware to check API Key
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.get('X-API-KEY');
    const serverApiKey = process.env.API_KEY;

    if (!serverApiKey) {
        // This is a server configuration error
        console.error('API_KEY not found in .env file. Server is not secured.');
        return res.status(500).json({ message: 'API Key not configured on the server.' });
    }

    if (apiKey && apiKey === serverApiKey) {
        next();
    } else {
        res.status(401).json({ message: 'Invalid or missing API Key' });
    }
};

// Serve static files from the public directory (frontend build)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Subscription Management Backend is running!', status: 'healthy' });
});

    // --- API Routers ---
    const apiRouter = express.Router();
    const protectedApiRouter = express.Router();

    // Apply auth middleware to the protected router
    protectedApiRouter.use(apiKeyAuth);


// --- Subscription Routes ---

// GET all subscriptions (Public)
apiRouter.get('/subscriptions', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM subscriptions');
    const subscriptions = stmt.all();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single subscription by ID (Public)
apiRouter.get('/subscriptions/:id', (req, res) => {
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

// POST a new subscription (Protected)
protectedApiRouter.post('/subscriptions', (req, res) => {
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

        // Calculate billing period for the initial payment
        const startDateObj = new Date(start_date);
        const nextBillingDateObj = new Date(next_billing_date);

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
        res.status(201).json({ id: subscriptionId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to bulk-insert subscriptions (Protected)
protectedApiRouter.post('/subscriptions/bulk', (req, res) => {
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
        res.status(201).json({ message: `Successfully imported ${count} subscriptions.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT to update a subscription (Protected)
protectedApiRouter.put('/subscriptions/:id', (req, res) => {
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
protectedApiRouter.delete('/subscriptions/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM subscriptions WHERE id = ?');
        const info = stmt.run(req.params.id);
        if (info.changes > 0) {
            res.json({ message: 'Subscription deleted successfully' });
        } else {
            res.status(404).json({ message: 'Subscription not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to process auto renewals (Protected)
protectedApiRouter.post('/subscriptions/auto-renew', (req, res) => {
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
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const billingDate = new Date(sub.next_billing_date);
                billingDate.setHours(0, 0, 0, 0);

                if (billingDate <= today) {
                    // Calculate new dates
                    const todayStr = new Date().toISOString().split('T')[0];

                    // Calculate actual next billing date (one cycle forward)
                    const nextBillingDate = new Date(sub.next_billing_date);
                    switch (sub.billing_cycle) {
                        case 'monthly':
                            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
                            break;
                        case 'yearly':
                            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
                            break;
                        case 'quarterly':
                            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
                            break;
                    }
                    const newNextBillingStr = nextBillingDate.toISOString().split('T')[0];

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
protectedApiRouter.post('/subscriptions/process-expired', (req, res) => {
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
protectedApiRouter.post('/subscriptions/:id/manual-renew', (req, res) => {
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
        const todayStr = today.toISOString().split('T')[0];

        const currentNextBilling = new Date(subscription.next_billing_date);
        currentNextBilling.setHours(0, 0, 0, 0);

        let newNextBilling;

        // If renewing before the due date, calculate from the original due date
        // If renewing after the due date, calculate from today
        const baseDate = currentNextBilling >= today ? currentNextBilling : today;

        switch (subscription.billing_cycle) {
            case 'monthly':
                newNextBilling = new Date(baseDate);
                newNextBilling.setMonth(newNextBilling.getMonth() + 1);
                break;
            case 'yearly':
                newNextBilling = new Date(baseDate);
                newNextBilling.setFullYear(newNextBilling.getFullYear() + 1);
                break;
            case 'quarterly':
                newNextBilling = new Date(baseDate);
                newNextBilling.setMonth(newNextBilling.getMonth() + 3);
                break;
            default:
                return res.status(400).json({ error: 'Invalid billing cycle' });
        }

        const newNextBillingStr = newNextBilling.toISOString().split('T')[0];

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
protectedApiRouter.post('/subscriptions/:id/reactivate', (req, res) => {
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Calculate new next billing date from today
        let newNextBilling;
        switch (subscription.billing_cycle) {
            case 'monthly':
                newNextBilling = new Date(today);
                newNextBilling.setMonth(newNextBilling.getMonth() + 1);
                break;
            case 'yearly':
                newNextBilling = new Date(today);
                newNextBilling.setFullYear(newNextBilling.getFullYear() + 1);
                break;
            case 'quarterly':
                newNextBilling = new Date(today);
                newNextBilling.setMonth(newNextBilling.getMonth() + 3);
                break;
            default:
                return res.status(400).json({ error: 'Invalid billing cycle' });
        }

        const newNextBillingStr = newNextBilling.toISOString().split('T')[0];

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
protectedApiRouter.post('/subscriptions/reset', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM subscriptions');
        stmt.run();
        res.json({ message: 'All subscriptions have been deleted.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Analytics Routes ---

// GET monthly revenue statistics (Public)
apiRouter.get('/analytics/monthly-revenue', (req, res) => {
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

// --- Settings Routes ---

// GET settings (Public)
apiRouter.get('/settings', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
        const settings = stmt.get();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT to update settings (Protected)
protectedApiRouter.put('/settings', (req, res) => {
    try {
        const updates = [];
        const params = [];
        
        if (req.body.currency) {
            updates.push('currency = ?');
            params.push(req.body.currency);
        }
        if (req.body.theme) {
            updates.push('theme = ?');
            params.push(req.body.theme);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No update fields provided' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');

        const stmt = db.prepare(`
            UPDATE settings 
            SET ${updates.join(', ')}
            WHERE id = 1
        `);

        const info = stmt.run(...params);

        if (info.changes > 0) {
            res.json({ message: 'Settings updated successfully' });
        } else {
            res.status(404).json({ message: 'Settings not found' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to reset settings (Protected)
protectedApiRouter.post('/settings/reset', (req, res) => {
    try {
        // This will delete the row. A new one will need to be created.
        const stmt = db.prepare('DELETE FROM settings WHERE id = 1');
        stmt.run();
        // Optionally, re-initialize with default settings
        const insertStmt = db.prepare('INSERT INTO settings (id, currency, theme) VALUES (1, ?, ?)');
        insertStmt.run('USD', 'system'); // Default values, api_key is removed
        res.json({ message: 'Settings have been reset to default.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Exchange Rate Routes ---

// GET all exchange rates (Public)
apiRouter.get('/exchange-rates', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM exchange_rates ORDER BY from_currency, to_currency');
        const rates = stmt.all();
        res.json(rates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET specific exchange rate (Public)
apiRouter.get('/exchange-rates/:from/:to', (req, res) => {
    try {
        const { from, to } = req.params;
        const stmt = db.prepare('SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ?');
        const rate = stmt.get(from.toUpperCase(), to.toUpperCase());

        if (!rate) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }

        res.json(rate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to manually update exchange rates (Protected)
protectedApiRouter.post('/exchange-rates/update', async (req, res) => {
    try {
        const result = await exchangeRateScheduler.updateExchangeRates();

        if (result.success) {
            res.json({
                message: result.message,
                updatedAt: result.updatedAt
            });
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET exchange rate scheduler status (Protected)
protectedApiRouter.get('/exchange-rates/status', (req, res) => {
    try {
        const status = exchangeRateScheduler.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET monthly active subscriptions statistics (Public)
apiRouter.get('/analytics/monthly-active-subscriptions', (req, res) => {
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

// --- Payment History Routes ---

// GET payment history with filters (Public)
apiRouter.get('/payment-history', (req, res) => {
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
apiRouter.get('/payment-history/:id', (req, res) => {
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

// POST create new payment history record (Protected)
protectedApiRouter.post('/payment-history', (req, res) => {
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
protectedApiRouter.put('/payment-history/:id', (req, res) => {
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
protectedApiRouter.delete('/payment-history/:id', (req, res) => {
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

// --- Categories Routes ---

// GET all categories (Public)
apiRouter.get('/categories', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM categories ORDER BY label');
        const categories = stmt.all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST a new category (Protected)
protectedApiRouter.post('/categories', (req, res) => {
    try {
        const { value, label } = req.body;

        if (!value || !label) {
            return res.status(400).json({ error: 'Value and label are required' });
        }

        const stmt = db.prepare('INSERT INTO categories (value, label) VALUES (?, ?)');
        const info = stmt.run(value, label);

        res.status(201).json({
            id: info.lastInsertRowid,
            value,
            label,
            message: 'Category created successfully'
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Category with this value already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PUT to update a category (Protected)
protectedApiRouter.put('/categories/:value', (req, res) => {
    try {
        const { value: oldValue } = req.params;
        const { value: newValue, label } = req.body;

        if (!newValue || !label) {
            return res.status(400).json({ error: 'Value and label are required' });
        }

        const stmt = db.prepare('UPDATE categories SET value = ?, label = ? WHERE value = ?');
        const info = stmt.run(newValue, label, oldValue);

        if (info.changes > 0) {
            res.json({ message: 'Category updated successfully' });
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Category with this value already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// DELETE a category (Protected)
protectedApiRouter.delete('/categories/:value', (req, res) => {
    try {
        const { value } = req.params;

        const stmt = db.prepare('DELETE FROM categories WHERE value = ?');
        const info = stmt.run(value);

        if (info.changes > 0) {
            res.json({ message: 'Category deleted successfully' });
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Payment Methods Routes ---

// GET all payment methods (Public)
apiRouter.get('/payment-methods', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM payment_methods ORDER BY label');
        const paymentMethods = stmt.all();
        res.json(paymentMethods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST a new payment method (Protected)
protectedApiRouter.post('/payment-methods', (req, res) => {
    try {
        const { value, label } = req.body;

        if (!value || !label) {
            return res.status(400).json({ error: 'Value and label are required' });
        }

        const stmt = db.prepare('INSERT INTO payment_methods (value, label) VALUES (?, ?)');
        const info = stmt.run(value, label);

        res.status(201).json({
            id: info.lastInsertRowid,
            value,
            label,
            message: 'Payment method created successfully'
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Payment method with this value already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PUT to update a payment method (Protected)
protectedApiRouter.put('/payment-methods/:value', (req, res) => {
    try {
        const { value: oldValue } = req.params;
        const { value: newValue, label } = req.body;

        if (!newValue || !label) {
            return res.status(400).json({ error: 'Value and label are required' });
        }

        const stmt = db.prepare('UPDATE payment_methods SET value = ?, label = ? WHERE value = ?');
        const info = stmt.run(newValue, label, oldValue);

        if (info.changes > 0) {
            res.json({ message: 'Payment method updated successfully' });
        } else {
            res.status(404).json({ error: 'Payment method not found' });
        }
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Payment method with this value already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// DELETE a payment method (Protected)
protectedApiRouter.delete('/payment-methods/:value', (req, res) => {
    try {
        const { value } = req.params;

        const stmt = db.prepare('DELETE FROM payment_methods WHERE value = ?');
        const info = stmt.run(value);

        if (info.changes > 0) {
            res.json({ message: 'Payment method deleted successfully' });
        } else {
            res.status(404).json({ error: 'Payment method not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register routers
app.use('/api', apiRouter);
app.use('/api', protectedApiRouter);

// SPA fallback: serve index.html for all non-API routes
// Use a more specific pattern to avoid path-to-regexp issues
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // For all other routes, serve the index.html (SPA fallback)
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).send('Frontend not found');
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Subscription Management Server is running on http://localhost:${port}`);
  console.log(`📂 Frontend available at: http://localhost:${port}`);
  console.log(`🔧 API available at: http://localhost:${port}/api`);
});