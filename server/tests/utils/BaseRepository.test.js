const Database = require('better-sqlite3');
const BaseRepository = require('../../utils/BaseRepository');
const path = require('path');
const fs = require('fs');

describe('BaseRepository', () => {
    let db;
    let repository;
    const testDbPath = path.join(__dirname, 'test.db');

    beforeEach(() => {
        // 创建内存数据库用于测试
        db = new Database(':memory:');
        
        // 创建测试表
        db.exec(`
            CREATE TABLE test_table (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                age INTEGER,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        repository = new BaseRepository(db, 'test_table');
    });

    afterEach(() => {
        if (db) {
            db.close();
        }
        // 清理测试文件
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('create', () => {
        test('should create a new record', () => {
            const data = {
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            const result = repository.create(data);
            
            expect(result.lastInsertRowid).toBe(1);
            expect(result.changes).toBe(1);
        });

        test('should handle unique constraint violations', () => {
            const data = {
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            repository.create(data);
            
            expect(() => {
                repository.create(data);
            }).toThrow();
        });
    });

    describe('findAll', () => {
        beforeEach(() => {
            // 插入测试数据
            repository.create({ name: 'John Doe', email: 'john@example.com', age: 30 });
            repository.create({ name: 'Jane Smith', email: 'jane@example.com', age: 25 });
            repository.create({ name: 'Bob Johnson', email: 'bob@example.com', age: 35 });
        });

        test('should return all records', () => {
            const results = repository.findAll();
            expect(results).toHaveLength(3);
            expect(results[0].name).toBe('John Doe');
        });

        test('should filter records', () => {
            const results = repository.findAll({ filters: { name: 'John Doe' } });
            expect(results).toHaveLength(1);
            expect(results[0].email).toBe('john@example.com');
        });

        test('should limit results', () => {
            const results = repository.findAll({ limit: 2 });
            expect(results).toHaveLength(2);
        });

        test('should apply offset', () => {
            const results = repository.findAll({ limit: 2, offset: 1 });
            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('Jane Smith');
        });

        test('should order results', () => {
            const results = repository.findAll({ orderBy: 'age DESC' });
            expect(results[0].age).toBe(35);
            expect(results[2].age).toBe(25);
        });
    });

    describe('findById', () => {
        test('should find record by id', () => {
            const createResult = repository.create({ name: 'John Doe', email: 'john@example.com' });
            const result = repository.findById(createResult.lastInsertRowid);
            
            expect(result).toBeTruthy();
            expect(result.name).toBe('John Doe');
            expect(result.email).toBe('john@example.com');
        });

        test('should return null for non-existent id', () => {
            const result = repository.findById(999);
            expect(result).toBeUndefined();
        });
    });

    describe('findOne', () => {
        test('should find single record by filters', () => {
            repository.create({ name: 'John Doe', email: 'john@example.com' });
            
            const result = repository.findOne({ email: 'john@example.com' });
            expect(result).toBeTruthy();
            expect(result.name).toBe('John Doe');
        });

        test('should return null when no match found', () => {
            const result = repository.findOne({ email: 'nonexistent@example.com' });
            expect(result).toBeUndefined();
        });
    });

    describe('update', () => {
        test('should update existing record', () => {
            const createResult = repository.create({ name: 'John Doe', email: 'john@example.com' });
            const updateResult = repository.update(createResult.lastInsertRowid, { name: 'John Smith' });
            
            expect(updateResult.changes).toBe(1);
            
            const updated = repository.findById(createResult.lastInsertRowid);
            expect(updated.name).toBe('John Smith');
            expect(updated.email).toBe('john@example.com');
        });

        test('should return 0 changes for non-existent record', () => {
            const result = repository.update(999, { name: 'Test' });
            expect(result.changes).toBe(0);
        });
    });

    describe('delete', () => {
        test('should delete existing record', () => {
            const createResult = repository.create({ name: 'John Doe', email: 'john@example.com' });
            const deleteResult = repository.delete(createResult.lastInsertRowid);
            
            expect(deleteResult.changes).toBe(1);
            
            const deleted = repository.findById(createResult.lastInsertRowid);
            expect(deleted).toBeUndefined();
        });

        test('should return 0 changes for non-existent record', () => {
            const result = repository.delete(999);
            expect(result.changes).toBe(0);
        });
    });

    describe('count', () => {
        test('should count all records', () => {
            repository.create({ name: 'John Doe', email: 'john@example.com' });
            repository.create({ name: 'Jane Smith', email: 'jane@example.com' });
            
            const count = repository.count();
            expect(count).toBe(2);
        });

        test('should count filtered records', () => {
            repository.create({ name: 'John Doe', email: 'john@example.com', age: 30 });
            repository.create({ name: 'Jane Smith', email: 'jane@example.com', age: 25 });
            
            const count = repository.count({ age: 30 });
            expect(count).toBe(1);
        });
    });

    describe('exists', () => {
        test('should return true for existing record', () => {
            repository.create({ name: 'John Doe', email: 'john@example.com' });
            
            const exists = repository.exists({ email: 'john@example.com' });
            expect(exists).toBe(true);
        });

        test('should return false for non-existing record', () => {
            const exists = repository.exists({ email: 'nonexistent@example.com' });
            expect(exists).toBe(false);
        });
    });

    describe('createMany', () => {
        test('should create multiple records', () => {
            const data = [
                { name: 'John Doe', email: 'john@example.com' },
                { name: 'Jane Smith', email: 'jane@example.com' }
            ];
            
            const results = repository.createMany(data);
            expect(results).toHaveLength(2);
            expect(results[0].changes).toBe(1);
            expect(results[1].changes).toBe(1);
            
            const count = repository.count();
            expect(count).toBe(2);
        });

        test('should handle empty array', () => {
            const results = repository.createMany([]);
            expect(results).toHaveLength(0);
        });
    });

    describe('transaction', () => {
        test('should execute transaction successfully', () => {
            const result = repository.transaction(() => {
                repository.create({ name: 'John Doe', email: 'john@example.com' });
                repository.create({ name: 'Jane Smith', email: 'jane@example.com' });
                return 'success';
            });
            
            expect(result).toBe('success');
            expect(repository.count()).toBe(2);
        });

        test('should rollback on error', () => {
            expect(() => {
                repository.transaction(() => {
                    repository.create({ name: 'John Doe', email: 'john@example.com' });
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
            
            expect(repository.count()).toBe(0);
        });
    });
});
