# 测试指南

本文档详细说明了 server 模块的测试策略、测试结构和最佳实践。

## 📋 目录

- [测试概述](#测试概述)
- [测试结构](#测试结构)
- [运行测试](#运行测试)
- [编写测试](#编写测试)
- [测试类型](#测试类型)
- [最佳实践](#最佳实践)
- [CI/CD 集成](#cicd-集成)

## 测试概述

重构后的 server 模块采用全面的测试策略，确保代码质量和系统稳定性：

- **单元测试**：测试独立的函数和类
- **集成测试**：测试模块间的交互
- **API 测试**：测试完整的请求-响应流程
- **数据库测试**：测试数据访问层

### 测试框架

- **Jest**：主要测试框架
- **Supertest**：API 测试
- **better-sqlite3**：内存数据库测试

## 测试结构

```
tests/
├── utils/                      # 工具类测试
│   ├── BaseRepository.test.js  # 基础仓库测试
│   ├── validator.test.js       # 验证器测试
│   └── responseHelper.test.js  # 响应助手测试
├── controllers/                # 控制器测试
│   ├── subscriptionController.test.js
│   └── paymentHistoryController.test.js
├── services/                   # 服务层测试
│   ├── subscriptionService.test.js
│   └── paymentHistoryService.test.js
├── integration/                # 集成测试
│   ├── subscription-api.test.js
│   └── payment-history-api.test.js
├── fixtures/                   # 测试数据
│   ├── subscriptions.json
│   └── payments.json
├── helpers/                    # 测试辅助工具
│   ├── testDatabase.js
│   └── testServer.js
├── jest.config.js             # Jest 配置
├── jest.setup.js              # 测试设置
└── README.md                  # 本文档
```

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 监视模式（开发时推荐）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- BaseRepository.test.js

# 运行特定测试套件
npm test -- --testNamePattern="create"

# 详细输出
npm test -- --verbose
```

### 覆盖率报告

```bash
# 生成 HTML 覆盖率报告
npm run test:coverage

# 查看报告
open coverage/lcov-report/index.html
```

目标覆盖率：
- **语句覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **函数覆盖率**: > 95%
- **行覆盖率**: > 90%

## 编写测试

### 1. 单元测试模板

```javascript
// tests/services/exampleService.test.js
const Database = require('better-sqlite3');
const ExampleService = require('../../services/exampleService');

describe('ExampleService', () => {
    let db;
    let service;
    
    beforeEach(() => {
        // 创建内存数据库
        db = new Database(':memory:');
        
        // 创建测试表
        db.exec(`
            CREATE TABLE examples (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                value INTEGER
            )
        `);
        
        // 初始化服务
        service = new ExampleService(db);
    });
    
    afterEach(() => {
        // 清理资源
        if (db) {
            db.close();
        }
    });
    
    describe('createExample', () => {
        test('should create example successfully', async () => {
            // Arrange
            const data = { name: 'Test', value: 100 };
            
            // Act
            const result = await service.createExample(data);
            
            // Assert
            expect(result.lastInsertRowid).toBe(1);
            expect(result.changes).toBe(1);
        });
        
        test('should throw error for invalid data', async () => {
            // Arrange
            const invalidData = { name: '', value: -1 };
            
            // Act & Assert
            await expect(service.createExample(invalidData))
                .rejects
                .toThrow('Validation failed');
        });
    });
});
```

### 2. 控制器测试模板

```javascript
// tests/controllers/exampleController.test.js
const request = require('supertest');
const express = require('express');
const ExampleController = require('../../controllers/exampleController');
const { errorHandler } = require('../../middleware/errorHandler');

describe('ExampleController', () => {
    let app;
    let db;
    let controller;
    
    beforeEach(() => {
        // 设置测试应用
        app = express();
        app.use(express.json());
        
        // 创建内存数据库
        db = new Database(':memory:');
        db.exec(`CREATE TABLE examples (id INTEGER PRIMARY KEY, name TEXT)`);
        
        // 初始化控制器
        controller = new ExampleController(db);
        
        // 设置路由
        app.post('/examples', controller.createExample);
        app.get('/examples/:id', controller.getExample);
        
        // 错误处理
        app.use(errorHandler);
    });
    
    afterEach(() => {
        if (db) db.close();
    });
    
    describe('POST /examples', () => {
        test('should create example successfully', async () => {
            const data = { name: 'Test Example' };
            
            const response = await request(app)
                .post('/examples')
                .send(data)
                .expect(201);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBeDefined();
        });
        
        test('should return validation error for invalid data', async () => {
            const invalidData = { name: '' };
            
            const response = await request(app)
                .post('/examples')
                .send(invalidData)
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });
});
```

### 3. 集成测试模板

```javascript
// tests/integration/example-api.test.js
const request = require('supertest');
const { createTestServer } = require('../helpers/testServer');

describe('Example API Integration', () => {
    let app;
    let server;
    
    beforeAll(async () => {
        // 创建测试服务器
        const testServer = await createTestServer();
        app = testServer.app;
        server = testServer.server;
    });
    
    afterAll(async () => {
        // 清理服务器
        if (server) {
            await server.close();
        }
    });
    
    describe('Complete workflow', () => {
        test('should handle full CRUD operations', async () => {
            // Create
            const createResponse = await request(app)
                .post('/api/examples')
                .send({ name: 'Integration Test' })
                .expect(201);
            
            const exampleId = createResponse.body.data.id;
            
            // Read
            const getResponse = await request(app)
                .get(`/api/examples/${exampleId}`)
                .expect(200);
            
            expect(getResponse.body.data.name).toBe('Integration Test');
            
            // Update
            await request(app)
                .put(`/api/examples/${exampleId}`)
                .send({ name: 'Updated Test' })
                .expect(200);
            
            // Delete
            await request(app)
                .delete(`/api/examples/${exampleId}`)
                .expect(200);
            
            // Verify deletion
            await request(app)
                .get(`/api/examples/${exampleId}`)
                .expect(404);
        });
    });
});
```

## 测试类型

### 1. 单元测试

**目标**：测试独立的函数和类方法

```javascript
// 测试工具函数
describe('dateUtils', () => {
    test('should format date correctly', () => {
        const date = new Date('2024-01-01');
        const formatted = formatDate(date);
        expect(formatted).toBe('2024-01-01');
    });
});

// 测试验证器
describe('validator', () => {
    test('should validate email format', () => {
        const validator = createValidator();
        validator.email('test@example.com', 'email');
        expect(validator.hasErrors()).toBe(false);
    });
});
```

### 2. 服务层测试

**目标**：测试业务逻辑和数据访问

```javascript
describe('SubscriptionService', () => {
    test('should create subscription with payment history', async () => {
        const subscriptionData = {
            name: 'Netflix',
            amount: 15.99,
            billing_cycle: 'monthly'
        };
        
        const result = await service.createSubscription(subscriptionData);
        
        // 验证订阅创建
        expect(result.lastInsertRowid).toBeDefined();
        
        // 验证支付历史自动创建
        const payments = await service.getSubscriptionPaymentHistory(result.lastInsertRowid);
        expect(payments).toHaveLength(1);
    });
});
```

### 3. 控制器测试

**目标**：测试请求处理和响应格式

```javascript
describe('SubscriptionController', () => {
    test('should return standardized response format', async () => {
        const response = await request(app)
            .get('/api/subscriptions')
            .expect(200);
        
        // 验证响应格式
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
    });
});
```

### 4. 集成测试

**目标**：测试完整的用户场景

```javascript
describe('Subscription Management Workflow', () => {
    test('should handle subscription lifecycle', async () => {
        // 创建订阅
        const subscription = await createSubscription();
        
        // 添加支付记录
        await addPaymentRecord(subscription.id);
        
        // 更新订阅
        await updateSubscription(subscription.id);
        
        // 验证月度费用计算
        const monthlyExpenses = await getMonthlyExpenses();
        expect(monthlyExpenses).toContainSubscription(subscription.id);
        
        // 删除订阅
        await deleteSubscription(subscription.id);
        
        // 验证级联删除
        const payments = await getPaymentHistory(subscription.id);
        expect(payments).toHaveLength(0);
    });
});
```

## 最佳实践

### 1. 测试命名

```javascript
// ✅ 描述性测试名称
test('should create subscription with valid data', () => {});
test('should throw ValidationError when name is empty', () => {});
test('should return 404 when subscription not found', () => {});

// ❌ 模糊的测试名称
test('create subscription', () => {});
test('error handling', () => {});
test('test1', () => {});
```

### 2. 测试结构 (AAA 模式)

```javascript
test('should calculate monthly total correctly', () => {
    // Arrange - 准备测试数据
    const payments = [
        { amount: 10.99, currency: 'USD' },
        { amount: 15.99, currency: 'USD' }
    ];
    
    // Act - 执行被测试的操作
    const total = calculateMonthlyTotal(payments);
    
    // Assert - 验证结果
    expect(total).toBe(26.98);
});
```

### 3. 测试数据管理

```javascript
// 使用工厂函数创建测试数据
function createTestSubscription(overrides = {}) {
    return {
        name: 'Test Subscription',
        plan: 'Basic',
        billing_cycle: 'monthly',
        amount: 9.99,
        currency: 'USD',
        ...overrides
    };
}

// 使用 fixtures 文件
const testData = require('../fixtures/subscriptions.json');
```

### 4. 异步测试

```javascript
// ✅ 使用 async/await
test('should create subscription asynchronously', async () => {
    const result = await service.createSubscription(data);
    expect(result).toBeDefined();
});

// ✅ 测试 Promise 拒绝
test('should reject invalid data', async () => {
    await expect(service.createSubscription(invalidData))
        .rejects
        .toThrow('Validation failed');
});
```

### 5. Mock 和 Stub

```javascript
// Mock 外部依赖
jest.mock('../services/emailService');
const emailService = require('../services/emailService');

test('should send notification email', async () => {
    emailService.sendEmail.mockResolvedValue(true);
    
    await service.createSubscription(data);
    
    expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
            to: 'user@example.com',
            subject: 'Subscription Created'
        })
    );
});
```

### 6. 数据库测试

```javascript
// 每个测试使用独立的内存数据库
beforeEach(() => {
    db = new Database(':memory:');
    setupTestSchema(db);
});

afterEach(() => {
    db.close();
});

// 测试数据库约束
test('should enforce unique constraint', () => {
    const data = { email: 'test@example.com' };
    
    service.createUser(data);
    
    expect(() => service.createUser(data))
        .toThrow('UNIQUE constraint failed');
});
```

## CI/CD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      working-directory: ./server
      
    - name: Run tests
      run: npm test
      working-directory: ./server
      
    - name: Generate coverage report
      run: npm run test:coverage
      working-directory: ./server
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
      with:
        file: ./server/coverage/lcov.info
```

### 测试脚本

```json
{
  "scripts": {
    "test": "jest --config tests/jest.config.js",
    "test:watch": "jest --config tests/jest.config.js --watch",
    "test:coverage": "jest --config tests/jest.config.js --coverage",
    "test:ci": "jest --config tests/jest.config.js --ci --coverage --watchAll=false"
  }
}
```

## 故障排除

### 常见问题

1. **测试超时**
   ```javascript
   // 增加超时时间
   jest.setTimeout(10000);
   
   // 或在特定测试中
   test('long running test', async () => {
       // 测试代码
   }, 15000);
   ```

2. **数据库连接问题**
   ```javascript
   // 确保正确关闭数据库连接
   afterEach(() => {
       if (db && db.open) {
           db.close();
       }
   });
   ```

3. **异步测试未等待**
   ```javascript
   // ✅ 正确等待异步操作
   test('async test', async () => {
       await expect(asyncFunction()).resolves.toBe(expected);
   });
   
   // ❌ 忘记等待
   test('async test', () => {
       expect(asyncFunction()).resolves.toBe(expected);
   });
   ```

### 调试技巧

```javascript
// 启用详细输出
npm test -- --verbose

// 运行单个测试文件
npm test -- BaseRepository.test.js

// 使用调试器
test('debug test', () => {
    debugger; // 在浏览器开发工具中暂停
    // 测试代码
});

// 输出调试信息
test('debug test', () => {
    console.log('Debug info:', data);
    // 测试代码
});
```

---

📝 **注意**：保持测试的简洁性和可读性，每个测试应该只验证一个特定的行为。定期运行测试套件，确保代码质量。
