const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const DatabaseMigrations = require('./migrations');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'database.sqlite');

console.log('🔄 Initializing database...');
console.log('📂 Database path:', dbPath);

async function initializeDatabase() {
    try {
        // Ensure database directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Created database directory: ${dbDir}`);
        }

        // Check if database file exists
        const dbExists = fs.existsSync(dbPath);
        if (!dbExists) {
            console.log('📝 Creating new database file...');
        } else {
            console.log('📋 Database file exists, checking for migrations...');
        }

        // Run migrations to create/update database schema
        console.log('🔄 Running database migrations...');
        const migrations = new DatabaseMigrations(dbPath);
        await migrations.runMigrations();
        migrations.close();

        console.log('✅ Database schema is up to date!');

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

        console.log('🎉 Database initialization completed successfully!');
        console.log('\n📊 Database is ready with all required tables and data.');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization if this script is executed directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;