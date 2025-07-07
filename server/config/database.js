const Database = require('better-sqlite3');
const config = require('./index');

/**
 * 创建数据库连接
 * 专注于数据库连接的创建，不处理初始化逻辑
 * @returns {Database} 数据库连接实例
 */
function createDatabaseConnection() {
    const dbPath = config.getDatabasePath();
    console.log(`📂 数据库路径: ${dbPath}`);

    // 确保数据库目录存在
    config.ensureDatabaseDir();

    const db = new Database(dbPath);

    // 启用外键约束
    db.pragma('foreign_keys = ON');

    return db;
}

/**
 * 初始化数据库（包含迁移逻辑）
 * 如果需要完整的数据库初始化，请使用 db/init.js
 * @returns {Database} 数据库连接实例
 */
function initializeDatabase() {
    const db = createDatabaseConnection();

    try {
        // 检查数据库是否需要初始化
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const hasAnyTables = tables.length > 0;

        if (!hasAnyTables) {
            console.log('🔧 Empty database detected, running migrations...');

            // 运行迁移来设置数据库架构
            const DatabaseMigrations = require('../db/migrations');
            const migrations = new DatabaseMigrations(config.getDatabasePath());
            migrations.runMigrations();
            migrations.close();

            console.log('✅ Database initialized successfully via migrations!');
        } else {
            console.log('✅ Database tables already exist, skipping initialization.');
        }

        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        db.close();
        throw error;
    }
}

module.exports = {
    createDatabaseConnection,
    initializeDatabase
};
