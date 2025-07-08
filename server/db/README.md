# Database Management Guide

This document explains the database schema and initialization system for the subscription management system.

## Overview

The database management system has been **consolidated and simplified** to use a single source of truth for all database schema definitions. The system now uses a unified approach with `schema.sql` as the definitive schema definition and a simplified migration system.

## Key Components

### 1. `schema.sql` - The Single Source of Truth
- **Purpose**: Contains the complete, up-to-date database schema
- **Includes**: All table definitions, triggers, indexes, and default data
- **Benefits**: Easy to read, version control friendly, and serves as documentation

### 2. `migrations.js` - Simplified Migration System
- **Purpose**: Executes the consolidated schema for new databases
- **Contains**: Single migration that applies the complete schema from `schema.sql`
- **Features**:
  - Automatically detects database version
  - Applies complete schema for new installations
  - Handles SQL parsing for complex statements (triggers, etc.)

### 3. `migrate.js` - Migration Executor
- **Purpose**: Executes database migrations
- **Usage**: `node db/migrate.js` or `npm run db:migrate`
- **Works**: In both local and Docker environments

### 4. `init.js` - Database Initializer
- **Purpose**: Initialize database for new environments
- **Responsibility**:
  - Create database file if it doesn't exist
  - Call migration system to set up schema
  - Generate API key if needed

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

## Consolidated System Benefits

### ✅ Advantages of the New Consolidated System
1. **Single Source of Truth**: `schema.sql` contains the complete, authoritative schema
2. **Simplified Maintenance**: Schema changes only need to be made in one place
3. **Easy to Review**: Complete schema is visible in a single, readable SQL file
4. **Version Control Friendly**: SQL changes are easy to track in git diffs
5. **Documentation**: `schema.sql` serves as living documentation of the database structure
6. **Environment Consistency**: Same schema across all environments
7. **Docker Compatibility**: Works seamlessly in containerized environments

### ❌ Problems Solved
1. **Eliminated Complex Migration History**: No more managing multiple incremental migrations
2. **Reduced Maintenance Overhead**: Schema changes only need to be defined once
3. **Simplified Deployment**: New environments get the complete, current schema immediately
4. **Eliminated Migration Conflicts**: No more complex migration dependency issues

## Current Database Schema

The complete database schema includes:

### Core Tables
- **settings**: Application settings (currency, theme)
- **exchange_rates**: Currency exchange rates with automatic updates
- **categories**: Subscription categories (foreign key reference)
- **payment_methods**: Payment methods (foreign key reference)
- **subscriptions**: Main subscription data with foreign key relationships
- **payment_history**: Historical payment records with billing periods
- **monthly_category_summary**: Pre-calculated monthly spending summaries

### Features
- **Foreign Key Relationships**: Proper referential integrity between tables
- **Automatic Timestamps**: All tables have `created_at` and `updated_at` fields with triggers
- **Default Data**: Pre-populated categories, payment methods, and exchange rates
- **Indexes**: Optimized for common query patterns

## Schema Management

### For New Installations
The system automatically applies the complete schema from `schema.sql`:
```bash
# Initialize new database
npm run db:init

# OR directly run migrations
npm run db:migrate
```

### For Schema Updates
When you need to modify the database schema:

1. **Update `schema.sql`** with your changes
2. **Test locally** to ensure the schema works correctly
3. **For existing databases**: Create a specific migration if needed, or use reset for development
4. **Deploy**: The consolidated schema will be applied to new environments automatically

### Development Reset
```bash
# Reset database completely (applies current schema.sql)
npm run db:reset
```

## Environment Variables

The system respects the following environment variables:
- `DATABASE_PATH`: Custom database file location
- `API_KEY`: Pre-existing API key (if not set, one will be generated)

## Docker Deployment

The migration system automatically detects Docker environments and uses appropriate paths:
- Docker: `/app/data/database.sqlite`
- Local: `./db/database.sqlite`

## Best Practices

1. **Use `schema.sql` as the authoritative source** for all schema definitions
2. **Test schema changes locally** before deploying
3. **Use `npm run db:migrate`** for applying schema to new environments
4. **Use `npm run db:reset`** for development database resets
5. **Never manually edit database files** in production
6. **Keep `schema.sql` well-documented** with comments explaining complex structures

## Troubleshooting

### Database Version Issues
```bash
# Check current database version
sqlite3 db/database.sqlite "SELECT * FROM migrations ORDER BY version DESC LIMIT 1;"

# Check if database has expected tables
sqlite3 db/database.sqlite ".tables"

# Force re-run schema (development only)
npm run db:reset
```

### Schema Application Issues
- The migration system parses SQL carefully to handle complex statements (triggers, etc.)
- If schema application fails, check the error message for specific SQL issues
- PRAGMA statements are handled separately from transactional statements

### Environment Inconsistencies
- Always use the migration system instead of manual database modifications
- For development: use `npm run db:reset` to apply the current schema
- For production: ensure proper deployment procedures apply the schema correctly

## File Structure Summary

```
db/
├── schema.sql          # Complete database schema (SINGLE SOURCE OF TRUTH)
├── migrations.js       # Simplified migration system
├── migrate.js          # Migration executor
├── init.js            # Database initializer
├── database.sqlite    # SQLite database file
└── README.md          # This documentation
```
