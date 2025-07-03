const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'database.sqlite');

console.log('Initializing database...');
console.log('Database path:', dbPath);

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys for SQLite
db.pragma('foreign_keys = ON');

try {
    // Create subscriptions table
    const createSubscriptionsTable = `
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
    `;

    // Create settings table
    const createSettingsTable = `
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            currency TEXT NOT NULL DEFAULT 'USD',
            theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Create trigger to update updated_at timestamp for subscriptions
    const createSubscriptionsUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
        AFTER UPDATE ON subscriptions
        FOR EACH ROW
        BEGIN
            UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    `;

    // Create trigger to update updated_at timestamp for settings
    const createSettingsUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS settings_updated_at
        AFTER UPDATE ON settings
        FOR EACH ROW
        BEGIN
            UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    `;

    // Execute table creation
    console.log('Creating subscriptions table...');
    db.exec(createSubscriptionsTable);
    
    console.log('Creating settings table...');
    db.exec(createSettingsTable);
    
    console.log('Creating triggers...');
    db.exec(createSubscriptionsUpdateTrigger);
    db.exec(createSettingsUpdateTrigger);

    // Insert default settings if not exists
    const insertDefaultSettings = db.prepare(`
        INSERT OR IGNORE INTO settings (id, currency, theme)
        VALUES (1, 'USD', 'system')
    `);
    insertDefaultSettings.run();
    console.log('Default settings inserted.');

    // Generate API key if not provided via environment
    let apiKey = process.env.API_KEY;
    if (!apiKey) {
        apiKey = crypto.randomBytes(32).toString('hex');
        console.log('\n🔑 Generated API Key:');
        console.log('=====================================');
        console.log(apiKey);
        console.log('=====================================');
        console.log('\n⚠️  IMPORTANT: Save this API key securely!');
        console.log('Add it to your .env file:');
        console.log(`API_KEY=${apiKey}`);
        console.log('');
    } else {
        console.log('✅ Using API key from environment variables');
    }

    console.log('✅ Database initialization completed successfully!');
    console.log('\nDatabase tables created:');
    console.log('- subscriptions (for managing subscription data)');
    console.log('- settings (for application settings)');

} catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
} finally {
    db.close();
} 