# Database Management Guide

This document explains the proper way to manage the database schema and initialization for the subscription management system.

## Overview

The database management system has been refactored to eliminate redundancy and ensure consistency across different environments. The system now uses a single source of truth for database schema management through the migration system.

## Key Components

### 1. `migrations.js` - The Schema Authority
- **Purpose**: Defines and manages all database schema changes
- **Responsibility**: Single source of truth for database structure evolution
- **Contains**: All table definitions, triggers, indexes, and default data

### 2. `migrate.js` - Migration Executor
- **Purpose**: Executes database migrations
- **Usage**: `node db/migrate.js` or `npm run db:migrate`
- **Features**: 
  - Automatically detects current database version
  - Runs only pending migrations
  - Works in both local and Docker environments

### 3. `init.js` - Database Initializer (Refactored)
- **Purpose**: Initialize database for new environments
- **Responsibility**: 
  - Create database file if it doesn't exist
  - Call migration system to set up schema
  - Generate API key if needed
- **No longer contains**: Manual table creation (delegated to migrations)

## Recommended Workflow

### For New Environments
```bash
# Initialize database (creates file + runs all migrations)
npm run db:init

# OR directly run migrations (if database file already exists)
npm run db:migrate
```

### For Existing Environments
```bash
# Update database schema to latest version
npm run db:migrate
```

### For Development Reset
```bash
# Reset database completely
npm run db:reset
```

## Migration System Benefits

### ✅ Advantages of the New System
1. **Single Source of Truth**: All schema changes are managed through migrations
2. **Version Control**: Database schema changes are tracked and versioned
3. **Environment Consistency**: Same schema across development, staging, and production
4. **Incremental Updates**: Only applies necessary changes, not full recreation
5. **Rollback Safety**: Each migration is atomic and can be tracked
6. **Docker Compatibility**: Works seamlessly in containerized environments

### ❌ Problems Solved
1. **Eliminated Duplication**: No more maintaining schema in both `init.js` and `migrations.js`
2. **Prevented Inconsistency**: No risk of forgetting to update `init.js` after adding migrations
3. **Reduced Maintenance**: Schema changes only need to be defined once
4. **Fixed Incomplete Initialization**: New environments get complete, up-to-date schema

## Migration Structure

Each migration includes:
- **Version Number**: Sequential numbering for ordering
- **Descriptive Name**: Clear description of what the migration does
- **Up Method**: Code to apply the migration
- **Atomic Execution**: Each migration runs in a transaction

Example migration:
```javascript
{
  version: 1,
  name: 'initial_schema',
  up: () => this.migration_001_initial_schema()
}
```

## Database Schema Evolution

### Current Migrations
1. **Migration 001**: Initial schema (subscriptions, settings, exchange_rates)
2. **Migration 002**: Add categories and payment_methods tables
3. **Migration 003**: Add renewal_type field to subscriptions (legacy compatibility)
4. **Migration 004**: Create payment_history table
5. **Migration 005**: Migrate existing subscriptions to payment_history
6. **Migration 006**: Create monthly_expenses table
7. **Migration 007**: Initialize monthly_expenses data
8. **Migration 008**: Add category_breakdown to monthly_expenses

### Adding New Migrations
When you need to modify the database schema:

1. Add a new migration to the `migrations` array in `migrations.js`
2. Implement the migration method
3. Run `npm run db:migrate` to apply the change
4. **Do NOT** modify `init.js` - the migration system handles everything

## Environment Variables

The system respects the following environment variables:
- `DATABASE_PATH`: Custom database file location
- `API_KEY`: Pre-existing API key (if not set, one will be generated)

## Docker Deployment

The migration system automatically detects Docker environments and uses appropriate paths:
- Docker: `/app/data/database.sqlite`
- Local: `./db/database.sqlite`

## Best Practices

1. **Always use migrations** for schema changes
2. **Never manually edit database files** in production
3. **Test migrations** in development before deploying
4. **Use `npm run db:migrate`** as the standard database update command
5. **Keep migrations atomic** - each migration should be a complete, reversible unit of work

## Troubleshooting

### Database Version Issues
```bash
# Check current database version
sqlite3 db/database.sqlite "SELECT * FROM migrations ORDER BY version DESC LIMIT 1;"

# Force re-run migrations (if needed)
npm run db:reset
```

### Migration Failures
- Migrations run in transactions - failed migrations are automatically rolled back
- Check the error message and fix the migration code
- Re-run `npm run db:migrate` after fixing

### Environment Inconsistencies
- Always use the migration system instead of manual database modifications
- If databases are out of sync, use `npm run db:reset` to start fresh
