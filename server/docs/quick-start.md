# 快速开始指南

本指南帮助开发者快速了解和使用重构后的 server 模块。

## 🚀 5分钟快速上手

### 1. 环境准备

```bash
# 进入 server 目录
cd server

# 安装依赖
npm install

# 初始化数据库
npm run db:init

# 启动服务器
npm start
```

### 2. 测试 API

```bash
# 获取所有订阅
curl http://localhost:3000/api/subscriptions

# 创建新订阅（需要 API Key）
curl -X POST http://localhost:3000/api/protected/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "name": "Netflix",
    "plan": "Premium",
    "billing_cycle": "monthly",
    "amount": 15.99,
    "currency": "USD",
    "payment_method": "credit_card",
    "start_date": "2024-01-01",
    "next_billing_date": "2024-02-01",
    "category": "streaming"
  }'
```

## 📚 核心概念

### 1. 分层架构

```
请求 → 路由 → 控制器 → 服务 → 仓库 → 数据库
```

每一层都有明确的职责，便于维护和测试。

### 2. 统一响应格式

所有 API 都返回标准格式：

```javascript
// 成功
{
    "success": true,
    "message": "操作成功",
    "data": { /* 数据 */ }
}

// 失败
{
    "success": false,
    "message": "错误描述",
    "error": true
}
```

### 3. 自动错误处理

使用 `asyncHandler` 包装异步函数，错误会自动被捕获和处理：

```javascript
const createUser = asyncHandler(async (req, res) => {
    // 任何错误都会被自动捕获
    const user = await userService.create(req.body);
    success(res, user, 'User created');
});
```

## 🛠️ 开发新功能

### 步骤 1：创建服务类

```javascript
// services/userService.js
const BaseRepository = require('../utils/BaseRepository');

class UserService extends BaseRepository {
    constructor(db) {
        super(db, 'users');
    }
    
    async createUser(userData) {
        // 业务逻辑
        return this.create(userData);
    }
}

module.exports = UserService;
```

### 步骤 2：创建控制器

```javascript
// controllers/userController.js
const UserService = require('../services/userService');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleDbResult, validationError } = require('../utils/responseHelper');
const { createValidator } = require('../utils/validator');

class UserController {
    constructor(db) {
        this.userService = new UserService(db);
    }
    
    createUser = asyncHandler(async (req, res) => {
        // 验证数据
        const validator = createValidator()
            .required(req.body.name, 'name')
            .email(req.body.email, 'email');
            
        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }
        
        // 调用服务
        const result = await this.userService.createUser(req.body);
        
        // 返回结果
        handleDbResult(res, result, 'create', 'User');
    });
}

module.exports = UserController;
```

### 步骤 3：添加路由

```javascript
// routes/users.js
const express = require('express');
const UserController = require('../controllers/userController');

function createUserRoutes(db) {
    const router = express.Router();
    const controller = new UserController(db);
    
    router.post('/', controller.createUser);
    
    return router;
}

module.exports = { createUserRoutes };
```

### 步骤 4：注册路由

```javascript
// server.js
const { createUserRoutes } = require('./routes/users');

// 注册路由
app.use('/api/users', createUserRoutes(db));
```

## 🧪 编写测试

### 单元测试示例

```javascript
// tests/services/userService.test.js
const Database = require('better-sqlite3');
const UserService = require('../../services/userService');

describe('UserService', () => {
    let db;
    let userService;
    
    beforeEach(() => {
        db = new Database(':memory:');
        db.exec(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE
            )
        `);
        userService = new UserService(db);
    });
    
    afterEach(() => {
        db.close();
    });
    
    test('should create user', async () => {
        const userData = {
            name: 'John Doe',
            email: 'john@example.com'
        };
        
        const result = await userService.createUser(userData);
        
        expect(result.lastInsertRowid).toBe(1);
        expect(result.changes).toBe(1);
    });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 🔧 常用工具

### 1. 数据验证

```javascript
const validator = createValidator()
    .required(value, 'field')        // 必填
    .string(value, 'field')          // 字符串
    .number(value, 'field')          // 数字
    .email(value, 'field')           // 邮箱
    .length(value, 'field', 1, 100)  // 长度
    .range(value, 'field', 0, 999)   // 范围
    .enum(value, 'field', ['a', 'b']) // 枚举
    .custom(value, 'field', fn, msg); // 自定义
```

### 2. 响应处理

```javascript
// 成功响应
success(res, data, message);
created(res, data, message);
updated(res, data, message);
deleted(res, message);

// 错误响应
error(res, message, statusCode);
validationError(res, errors);
notFound(res, resource);

// 数据库结果处理
handleDbResult(res, result, 'create', 'User');
handleQueryResult(res, data, 'Users');
```

### 3. 数据库操作

```javascript
// 基础操作
const users = repository.findAll();
const user = repository.findById(1);
const result = repository.create(data);
const updated = repository.update(1, data);
const deleted = repository.delete(1);

// 高级操作
const filtered = repository.findAll({
    filters: { status: 'active' },
    orderBy: 'created_at DESC',
    limit: 10,
    offset: 0
});

const count = repository.count({ status: 'active' });
const exists = repository.exists({ email: 'test@example.com' });

// 事务
repository.transaction(() => {
    repository.create(user1);
    repository.create(user2);
});
```

## 🐛 调试技巧

### 1. 启用详细日志

```bash
# 设置环境变量
export LOG_LEVEL=debug
npm start
```

### 2. 数据库查询日志

```javascript
// 在服务中添加
console.log('Executing query:', query, params);
```

### 3. 错误堆栈跟踪

开发环境会自动显示完整的错误堆栈，生产环境会隐藏敏感信息。

## 📝 最佳实践

### 1. 错误处理

```javascript
// ✅ 使用自定义错误
throw new ValidationError('Invalid email format');
throw new NotFoundError('User');

// ✅ 使用 asyncHandler
const method = asyncHandler(async (req, res) => {
    // 异步代码
});

// ❌ 避免手动 try-catch
try {
    // 代码
} catch (error) {
    res.status(500).json({ error: error.message });
}
```

### 2. 数据验证

```javascript
// ✅ 链式验证
const validator = createValidator()
    .required(data.name, 'name')
    .string(data.name, 'name')
    .length(data.name, 'name', 1, 100);

// ❌ 手动验证
if (!data.name) {
    return res.status(400).json({ error: 'Name is required' });
}
```

### 3. 响应格式

```javascript
// ✅ 使用响应助手
handleQueryResult(res, users, 'Users');

// ❌ 手动响应
res.json({ users: users });
```

## 🚀 部署

### 开发环境

```bash
npm start
```

### 生产环境

```bash
NODE_ENV=production npm start
```

### Docker

```bash
docker build -t subscription-server .
docker run -p 3000:3000 -v /data:/app/data subscription-server
```

## 📖 更多资源

- [完整架构文档](./architecture.md)
- [API 使用示例](./api-examples.md)
- [主 README](../README.md)

---

🎉 **恭喜！** 你已经掌握了重构后 server 模块的基本使用方法。现在可以开始开发新功能了！
