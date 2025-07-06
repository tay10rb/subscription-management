const Database = require('better-sqlite3');
const path = require('path');

class DatabaseMigrations {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.migrations = [
      {
        version: 1,
        name: 'initial_schema',
        up: () => this.migration_001_initial_schema()
      },
      {
        version: 2,
        name: 'add_categories_and_payment_methods',
        up: () => this.migration_002_add_categories_and_payment_methods()
      },
      {
        version: 3,
        name: 'add_renewal_type_to_subscriptions',
        up: () => this.migration_003_add_renewal_type_to_subscriptions()
      },
      {
        version: 4,
        name: 'create_payment_history_table',
        up: () => this.migration_004_create_payment_history_table()
      },
      {
        version: 5,
        name: 'migrate_existing_subscriptions_to_payment_history',
        up: () => this.migration_005_migrate_existing_subscriptions_to_payment_history()
      },
      {
        version: 6,
        name: 'create_monthly_expenses_table',
        up: () => this.migration_006_create_monthly_expenses_table()
      },
      {
        version: 7,
        name: 'initialize_monthly_expenses_data',
        up: () => this.migration_007_initialize_monthly_expenses_data()
      },
      {
        version: 8,
        name: 'add_category_breakdown_to_monthly_expenses',
        up: () => this.migration_008_add_category_breakdown_to_monthly_expenses()
      }
    ];
  }

  // Initialize migrations table
  initMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Get current database version
  getCurrentVersion() {
    try {
      const result = this.db.prepare('SELECT MAX(version) as version FROM migrations').get();
      return result.version || 0;
    } catch (error) {
      return 0;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    console.log('🔄 Checking for database migrations...');
    
    this.initMigrationsTable();
    const currentVersion = this.getCurrentVersion();
    
    console.log(`📊 Current database version: ${currentVersion}`);
    
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`⏳ Running migration ${migration.version}: ${migration.name}`);
        
        // Run migration in transaction
        this.db.transaction(() => {
          migration.up();
          this.db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        })();
        
        console.log(`✅ Migration ${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  }

  // Migration 001: Initial schema - Create core tables
  migration_001_initial_schema() {
    console.log('📝 Creating initial database schema...');

    // Create subscriptions table
    this.db.exec(`
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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        currency TEXT NOT NULL DEFAULT 'USD',
        theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create exchange_rates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate DECIMAL(15, 8) NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_currency, to_currency)
      )
    `);

    // Create triggers to update updated_at timestamp
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
      AFTER UPDATE ON subscriptions
      FOR EACH ROW
      BEGIN
        UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS settings_updated_at
      AFTER UPDATE ON settings
      FOR EACH ROW
      BEGIN
        UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    // Insert default settings if not exists
    this.db.prepare(`
      INSERT OR IGNORE INTO settings (id, currency, theme)
      VALUES (1, 'USD', 'system')
    `).run();

    // Insert default exchange rates
    this.insertDefaultExchangeRates();

    console.log('✅ Initial schema created successfully');
  }

  // Helper method to insert default exchange rates
  insertDefaultExchangeRates() {
    const defaultRates = [
      { from: 'USD', to: 'USD', rate: 1.0000 },
      { from: 'USD', to: 'EUR', rate: 0.8500 },
      { from: 'USD', to: 'GBP', rate: 0.7500 },
      { from: 'USD', to: 'JPY', rate: 110.0000 },
      { from: 'USD', to: 'CNY', rate: 6.5000 },
      { from: 'USD', to: 'CAD', rate: 1.2500 },
      { from: 'USD', to: 'AUD', rate: 1.3500 },
      { from: 'USD', to: 'CHF', rate: 0.9200 },
      { from: 'USD', to: 'SEK', rate: 8.5000 },
      { from: 'USD', to: 'NOK', rate: 8.8000 },
      { from: 'USD', to: 'DKK', rate: 6.3000 },
      { from: 'USD', to: 'PLN', rate: 3.9000 },
      { from: 'USD', to: 'CZK', rate: 22.0000 },
      { from: 'USD', to: 'HUF', rate: 300.0000 },
      { from: 'USD', to: 'RUB', rate: 75.0000 },
      { from: 'USD', to: 'BRL', rate: 5.2000 },
      { from: 'USD', to: 'MXN', rate: 20.0000 },
      { from: 'USD', to: 'INR', rate: 74.0000 },
      { from: 'USD', to: 'KRW', rate: 1180.0000 },
      { from: 'USD', to: 'SGD', rate: 1.3500 },
      { from: 'USD', to: 'HKD', rate: 7.8000 },
      { from: 'USD', to: 'NZD', rate: 1.4200 },
      { from: 'USD', to: 'ZAR', rate: 14.5000 },
      { from: 'USD', to: 'TRY', rate: 8.5000 },
      { from: 'USD', to: 'ILS', rate: 3.2000 },
      { from: 'USD', to: 'THB', rate: 31.0000 },
      { from: 'USD', to: 'MYR', rate: 4.1000 },
      { from: 'USD', to: 'PHP', rate: 50.0000 },
      { from: 'USD', to: 'IDR', rate: 14300.0000 },
      { from: 'USD', to: 'VND', rate: 23000.0000 }
    ];

    const insertRate = this.db.prepare(`
      INSERT OR IGNORE INTO exchange_rates (from_currency, to_currency, rate)
      VALUES (?, ?, ?)
    `);

    for (const rate of defaultRates) {
      insertRate.run(rate.from, rate.to, rate.rate);
    }
  }

  // Migration 002: Add categories and payment_methods tables
  migration_002_add_categories_and_payment_methods() {
    console.log('📝 Creating categories and payment_methods tables...');

    // Create categories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payment_methods table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create triggers
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS categories_updated_at
      AFTER UPDATE ON categories
      FOR EACH ROW
      BEGIN
        UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS payment_methods_updated_at
      AFTER UPDATE ON payment_methods
      FOR EACH ROW
      BEGIN
        UPDATE payment_methods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    // Create indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_categories_value ON categories(value)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_methods_value ON payment_methods(value)`);

    // Insert default data
    this.insertDefaultCategories();
    this.insertDefaultPaymentMethods();
  }

  insertDefaultCategories() {
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

    const insertCategory = this.db.prepare(`
      INSERT OR IGNORE INTO categories (value, label)
      VALUES (?, ?)
    `);

    for (const category of defaultCategories) {
      insertCategory.run(category.value, category.label);
    }
  }

  insertDefaultPaymentMethods() {
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

    const insertPaymentMethod = this.db.prepare(`
      INSERT OR IGNORE INTO payment_methods (value, label)
      VALUES (?, ?)
    `);

    for (const paymentMethod of defaultPaymentMethods) {
      insertPaymentMethod.run(paymentMethod.value, paymentMethod.label);
    }
  }

  // Migration 003: Add renewal_type field to subscriptions table (legacy migration)
  migration_003_add_renewal_type_to_subscriptions() {
    console.log('📝 Checking renewal_type field in subscriptions table...');

    // Check if renewal_type column already exists
    const tableInfo = this.db.prepare("PRAGMA table_info(subscriptions)").all();
    const renewalTypeExists = tableInfo.some(column => column.name === 'renewal_type');

    if (!renewalTypeExists) {
      // Add renewal_type column to subscriptions table (for databases created before this field was added to initial schema)
      this.db.exec(`
        ALTER TABLE subscriptions
        ADD COLUMN renewal_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (renewal_type IN ('auto', 'manual'))
      `);
      console.log('✅ renewal_type field added successfully');
    } else {
      console.log('ℹ️  renewal_type field already exists (included in initial schema), skipping...');
    }
  }

  // Migration 004: Create payment_history table
  migration_004_create_payment_history_table() {
    console.log('📝 Creating payment_history table');

    // Create payment_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id INTEGER NOT NULL,
        payment_date DATE NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        currency TEXT NOT NULL,
        billing_period_start DATE NOT NULL,
        billing_period_end DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'refunded')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id
      ON payment_history (subscription_id)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date
      ON payment_history (payment_date)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payment_history_billing_period
      ON payment_history (billing_period_start, billing_period_end)
    `);

    console.log('✅ Created payment_history table with indexes');
  }

  // Migration 005: Migrate existing subscriptions to payment_history
  migration_005_migrate_existing_subscriptions_to_payment_history() {
    console.log('📝 Migrating existing subscriptions to payment_history...');

    // Get all existing subscriptions
    const subscriptions = this.db.prepare(`
      SELECT id, start_date, billing_cycle, amount, currency, last_billing_date, status
      FROM subscriptions
      WHERE start_date IS NOT NULL
    `).all();

    console.log(`Found ${subscriptions.length} subscriptions to migrate`);

    const insertPayment = this.db.prepare(`
      INSERT INTO payment_history (
        subscription_id, payment_date, amount_paid, currency,
        billing_period_start, billing_period_end, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let migratedCount = 0;

    for (const sub of subscriptions) {
      try {
        const payments = this.generateHistoricalPayments(sub);

        for (const payment of payments) {
          insertPayment.run(
            sub.id,
            payment.payment_date,
            sub.amount,
            sub.currency,
            payment.billing_period_start,
            payment.billing_period_end,
            'succeeded',
            'Migrated from existing subscription data'
          );
          migratedCount++;
        }
      } catch (error) {
        console.error(`Error migrating subscription ${sub.id}:`, error);
      }
    }

    console.log(`✅ Migrated ${migratedCount} payment records for ${subscriptions.length} subscriptions`);
  }

  // Helper method to generate historical payments based on subscription data
  generateHistoricalPayments(subscription) {
    const payments = [];
    const startDate = new Date(subscription.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If subscription is cancelled and has no last_billing_date, only create initial payment
    if (subscription.status === 'cancelled' && !subscription.last_billing_date) {
      const billingPeriodEnd = this.calculateNextBillingDate(startDate, subscription.billing_cycle);
      payments.push({
        payment_date: startDate.toISOString().split('T')[0],
        billing_period_start: startDate.toISOString().split('T')[0],
        billing_period_end: billingPeriodEnd.toISOString().split('T')[0]
      });
      return payments;
    }

    // Generate payments from start_date to last_billing_date or today
    let currentDate = new Date(startDate);
    const endDate = subscription.last_billing_date ?
      new Date(subscription.last_billing_date) : today;

    while (currentDate <= endDate) {
      const nextBillingDate = this.calculateNextBillingDate(currentDate, subscription.billing_cycle);

      payments.push({
        payment_date: currentDate.toISOString().split('T')[0],
        billing_period_start: currentDate.toISOString().split('T')[0],
        billing_period_end: nextBillingDate.toISOString().split('T')[0]
      });

      currentDate = new Date(nextBillingDate);
    }

    return payments;
  }

  // Helper method to calculate next billing date
  calculateNextBillingDate(date, billingCycle) {
    const nextDate = new Date(date);

    switch (billingCycle) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      default:
        throw new Error(`Unknown billing cycle: ${billingCycle}`);
    }

    return nextDate;
  }

  // Migration 006: Create monthly_expenses table
  migration_006_create_monthly_expenses_table() {
    console.log('📝 Creating monthly_expenses table');

    // Create monthly_expenses table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monthly_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_key TEXT NOT NULL UNIQUE,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        payment_history_ids TEXT NOT NULL DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_monthly_expenses_month_key ON monthly_expenses(month_key);
      CREATE INDEX IF NOT EXISTS idx_monthly_expenses_year_month ON monthly_expenses(year, month);
    `);

    // Get all supported currencies from exchange_rates table
    const currencies = this.db.prepare(`
      SELECT DISTINCT to_currency FROM exchange_rates
      WHERE from_currency = 'USD'
      ORDER BY to_currency
    `).all();

    // Add currency columns dynamically
    for (const currency of currencies) {
      const columnName = `amount_${currency.to_currency.toLowerCase()}`;
      try {
        this.db.exec(`ALTER TABLE monthly_expenses ADD COLUMN ${columnName} DECIMAL(15, 2) DEFAULT 0.00`);
        console.log(`✅ Added column: ${columnName}`);
      } catch (error) {
        // Column might already exist, ignore error
        if (!error.message.includes('duplicate column name')) {
          console.warn(`⚠️ Warning adding column ${columnName}:`, error.message);
        }
      }
    }

    // Create trigger to automatically update updated_at timestamp
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS monthly_expenses_updated_at
      AFTER UPDATE ON monthly_expenses
      FOR EACH ROW
      BEGIN
        UPDATE monthly_expenses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    console.log('✅ Monthly expenses table created successfully');
  }

  // Migration 007: Initialize monthly_expenses data from payment_history
  migration_007_initialize_monthly_expenses_data() {
    console.log('📝 Initializing monthly_expenses data from payment_history...');

    try {
      // Import MonthlyExpenseService to use its recalculation logic
      const MonthlyExpenseService = require('../services/monthlyExpenseService');
      const monthlyExpenseService = new MonthlyExpenseService(this.dbPath);

      // Use the existing recalculation method to populate the table
      monthlyExpenseService.recalculateAllMonthlyExpenses();

      console.log('✅ Monthly expenses data initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize monthly expenses data:', error.message);
      throw error;
    }
  }

  // Migration 008: Add category_breakdown column to monthly_expenses table
  migration_008_add_category_breakdown_to_monthly_expenses() {
    console.log('📝 Adding category_breakdown column to monthly_expenses table');

    try {
      // Check if category_breakdown column already exists
      const tableInfo = this.db.prepare("PRAGMA table_info(monthly_expenses)").all();
      const categoryBreakdownExists = tableInfo.some(column => column.name === 'category_breakdown');

      if (!categoryBreakdownExists) {
        // Add category_breakdown column
        this.db.exec(`
          ALTER TABLE monthly_expenses
          ADD COLUMN category_breakdown TEXT DEFAULT '{}'
        `);
        console.log('✅ Added category_breakdown column to monthly_expenses table');
      } else {
        console.log('ℹ️  category_breakdown column already exists, skipping...');
      }

      // Initialize category_breakdown data for existing records
      console.log('📝 Initializing category_breakdown data for existing records...');

      // Update all existing records to have empty category_breakdown
      this.db.exec(`
        UPDATE monthly_expenses
        SET category_breakdown = '{}'
        WHERE category_breakdown IS NULL OR category_breakdown = ''
      `);

      console.log('✅ Category breakdown data initialized successfully');
    } catch (error) {
      console.error('❌ Failed to add category_breakdown column:', error.message);
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseMigrations;
