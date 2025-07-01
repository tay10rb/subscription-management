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
            notes,
            website
        } = req.body;

        // Calculate last billing date automatically
        const last_billing_date = calculateLastBillingDate(next_billing_date, start_date, billing_cycle);

        const stmt = db.prepare(`
            INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, notes, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, notes, website);
        res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST to bulk-insert subscriptions (Protected)
protectedApiRouter.post('/subscriptions/bulk', (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Request body must be an array of subscriptions.' });
    }

    const insert = db.prepare(`
        INSERT INTO subscriptions (name, plan, billing_cycle, next_billing_date, last_billing_date, amount, currency, payment_method, start_date, status, category, notes, website)
        VALUES (@name, @plan, @billing_cycle, @next_billing_date, @last_billing_date, @amount, @currency, @payment_method, @start_date, @status, @category, @notes, @website)
    `);

    const insertMany = db.transaction((subscriptions) => {
        let insertedCount = 0;
        for (const sub of subscriptions) {
            try {
                const last_billing_date = calculateLastBillingDate(sub.next_billing_date, sub.start_date, sub.billing_cycle);
                insert.run({
                    ...sub,
                    last_billing_date
                });
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
        // Get all active subscriptions
        const selectStmt = db.prepare('SELECT * FROM subscriptions WHERE status = ?');
        const activeSubscriptions = selectStmt.all('active');

        let processed = 0;
        let errors = 0;
        const renewedSubscriptions = [];

        // Check each subscription for renewal
        for (const sub of activeSubscriptions) {
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

                    // Update subscription
                    const updateStmt = db.prepare(`
                        UPDATE subscriptions
                        SET last_billing_date = ?, next_billing_date = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `);

                    const updateResult = updateStmt.run(todayStr, newNextBillingStr, sub.id);

                    if (updateResult.changes > 0) {
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
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }

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