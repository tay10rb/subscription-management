const Database = require('better-sqlite3');
const path = require('path');

// Load environment variables from root .env file (unified configuration)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function initializeDatabase() {
    const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '..', 'db', 'database.sqlite');
    const db = new Database(dbPath);

    try {
        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        // Check if tables exist
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const hasSubscriptions = tables.some(table => table.name === 'subscriptions');
        const hasSettings = tables.some(table => table.name === 'settings');
        const hasExchangeRates = tables.some(table => table.name === 'exchange_rates');
        const hasCategories = tables.some(table => table.name === 'categories');
        const hasPaymentMethods = tables.some(table => table.name === 'payment_methods');
        const hasPaymentHistory = tables.some(table => table.name === 'payment_history');

        if (!hasSubscriptions || !hasSettings || !hasExchangeRates || !hasCategories || !hasPaymentMethods || !hasPaymentHistory) {
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

            // Create payment_history table
            db.exec(`
                CREATE TABLE IF NOT EXISTS payment_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subscription_id INTEGER NOT NULL,
                    payment_date DATE NOT NULL,
                    amount_paid DECIMAL(10, 2) NOT NULL,
                    currency TEXT NOT NULL,
                    billing_period_start DATE,
                    billing_period_end DATE,
                    status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'pending', 'cancelled')),
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
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

            db.exec(`
                CREATE TRIGGER IF NOT EXISTS payment_history_updated_at
                AFTER UPDATE ON payment_history
                FOR EACH ROW
                BEGIN
                    UPDATE payment_history SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
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

module.exports = {
    initializeDatabase
};
