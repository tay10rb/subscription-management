#!/usr/bin/env node

const path = require('path');
const DatabaseMigrations = require('./migrations');

async function runMigrations() {
  // 获取数据库路径 - 支持多种环境
  function getDatabasePath() {
    // 优先使用环境变量
    if (process.env.DATABASE_PATH) {
      return process.env.DATABASE_PATH;
    }

    // Docker 环境中的常见路径
    const fs = require('fs');
    const dockerPath = '/app/data/database.sqlite';

    // 检查 Docker 数据目录是否存在
    if (fs.existsSync('/app/data')) {
      return dockerPath;
    }

    // 本地开发环境
    return path.join(__dirname, 'database.sqlite');
  }

  const dbPath = getDatabasePath();
  console.log(`📂 数据库路径: ${dbPath}`);

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
