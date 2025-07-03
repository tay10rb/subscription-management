const Database = require('better-sqlite3');
const path = require('path');

class DatabaseMigrations {
  constructor(dbPath) {
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

  // Migration 001: Initial schema (for existing databases)
  migration_001_initial_schema() {
    // This migration is for marking existing databases as version 1
    // The actual tables should already exist
    console.log('📝 Marking existing schema as version 1');
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

  // Migration 003: Add renewal_type field to subscriptions table
  migration_003_add_renewal_type_to_subscriptions() {
    console.log('📝 Adding renewal_type field to subscriptions table...');

    // Add renewal_type column to subscriptions table
    this.db.exec(`
      ALTER TABLE subscriptions
      ADD COLUMN renewal_type TEXT NOT NULL DEFAULT 'manual'
      CHECK (renewal_type IN ('auto', 'manual'))
    `);

    console.log('✅ renewal_type field added successfully');
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseMigrations;
