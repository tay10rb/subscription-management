#!/usr/bin/env node

const path = require('path');
const DatabaseMigrations = require('./migrations');

async function runMigrations() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
  const migrations = new DatabaseMigrations(dbPath);

  try {
    await migrations.runMigrations();
    console.log('🎉 Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    migrations.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
