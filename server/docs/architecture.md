# Server 架构详细说明

## 架构概览

本文档详细说明了 server 模块的架构设计、各层职责以及模块间的交互关系。

## 分层架构详解

### 1. 表示层 (Presentation Layer)

**组件**：Routes + Controllers
**职责**：
- 处理 HTTP 请求和响应
- 参数解析和验证
- 响应格式化
- 错误处理

```javascript
// 路由层：定义端点
router.get('/payments', controller.getPaymentHistory);

// 控制器层：处理请求
class PaymentHistoryController {
    getPaymentHistory = asyncHandler(async (req, res) => {
        // 1. 参数验证
        const validator = this.validateParams(req.query);
        if (validator.hasErrors()) {
            return validationError(res, validator.getErrors());
        }
        
        // 2. 调用服务层
        const result = await this.service.getPaymentHistory(req.query);
        
        // 3. 格式化响应
        handleQueryResult(res, result, 'Payment history');
    });
}
```

### 2. 业务逻辑层 (Business Logic Layer)

**组件**：Services
**职责**：
- 实现业务规则
- 协调多个数据操作
- 事务管理
- 业务验证

```javascript
class PaymentHistoryService extends BaseRepository {
    async createPayment(paymentData) {
        // 1. 业务验证
        await this.validateBusinessRules(paymentData);
        
        // 2. 数据操作
        const result = this.create(paymentData);
        
        // 3. 触发相关业务逻辑
        if (paymentData.status === 'succeeded') {
            await this.monthlyExpenseService.handlePaymentInsert(result.lastInsertRowid);
        }
        
        return result;
    }
}
```

### 3. 数据访问层 (Data Access Layer)

**组件**：BaseRepository + Database
**职责**：
- 数据库 CRUD 操作
- 查询优化
- 事务管理
- 数据映射

```javascript
class BaseRepository {
    // 通用数据访问方法
    findAll(options) { /* 查询逻辑 */ }
    create(data) { /* 创建逻辑 */ }
    update(id, data) { /* 更新逻辑 */ }
    delete(id) { /* 删除逻辑 */ }
    transaction(callback) { /* 事务逻辑 */ }
}
```

## 核心设计模式

### 1. Repository 模式

**目的**：封装数据访问逻辑，提供统一的数据操作接口

```javascript
// 基础仓库
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
}

// 具体仓库
class PaymentHistoryService extends BaseRepository {
    constructor(db) {
        super(db, 'payment_history');
    }
    
    // 特定业务方法
    async getMonthlyStats(year, month) {
        // 复杂查询逻辑
    }
}
```

### 2. 依赖注入模式

**目的**：降低耦合度，提高可测试性

```javascript
// 控制器接收数据库连接
class PaymentHistoryController {
    constructor(db) {
        this.service = new PaymentHistoryService(db);
    }
}

// 路由工厂函数
function createPaymentHistoryRoutes(db) {
    const controller = new PaymentHistoryController(db);
    // 路由配置
}
```

### 3. 中间件模式

**目的**：横切关注点的统一处理

```javascript
// 错误处理中间件
app.use(errorHandler);

// 异步错误包装
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
```

## 数据流详解

### 创建支付记录的完整流程

```
1. POST /api/payment-history
   ↓
2. paymentHistory.js (路由)
   ↓
3. PaymentHistoryController.createPayment
   ├── 数据验证 (validator.js)
   ├── 调用服务层
   └── 响应格式化 (responseHelper.js)
   ↓
4. PaymentHistoryService.createPayment
   ├── 业务验证
   ├── 数据库操作 (BaseRepository)
   ├── 触发月度费用更新
   └── 返回结果
   ↓
5. BaseRepository.create
   ├── 参数化查询
   ├── 错误处理
   └── 返回数据库结果
   ↓
6. 响应返回给客户端
```

### 错误处理流程

```
任何层抛出错误
   ↓
asyncHandler 捕获 (如果是异步)
   ↓
errorHandler 中间件
   ├── 错误类型识别
   ├── 日志记录
   ├── 响应格式化
   └── 环境差异处理
   ↓
标准化错误响应
```

## 模块职责矩阵

| 模块 | 请求处理 | 数据验证 | 业务逻辑 | 数据访问 | 响应格式化 |
|------|----------|----------|----------|----------|------------|
| Routes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Controllers | ✅ | ✅ | ❌ | ❌ | ✅ |
| Services | ❌ | ✅ | ✅ | ✅ | ❌ |
| BaseRepository | ❌ | ❌ | ❌ | ✅ | ❌ |
| Middleware | ✅ | ❌ | ❌ | ❌ | ✅ |
| Utils | ❌ | ✅ | ❌ | ❌ | ✅ |

## 扩展性设计

### 1. 添加新实体

```javascript
// 1. 创建服务类
class OrderService extends BaseRepository {
    constructor(db) {
        super(db, 'orders');
    }
}

// 2. 创建控制器
class OrderController {
    constructor(db) {
        this.service = new OrderService(db);
    }
}

// 3. 添加路由
function createOrderRoutes(db) {
    const controller = new OrderController(db);
    // 路由定义
}
```

### 2. 添加新的验证规则

```javascript
// 扩展验证器
class Validator {
    phoneNumber(value, field) {
        if (value && !/^\+?[\d\s-()]+$/.test(value)) {
            this.addError(field, `${field} must be a valid phone number`);
        }
        return this;
    }
}
```

### 3. 添加新的响应类型

```javascript
// 扩展响应助手
function csvResponse(res, data, filename) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(convertToCSV(data));
}
```

## 性能考虑

### 1. 数据库优化

```javascript
// 索引策略
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_date 
    ON payment_history(payment_date);
    
    CREATE INDEX IF NOT EXISTS idx_subscription_status 
    ON subscriptions(status);
`);

// 查询优化
class PaymentHistoryService extends BaseRepository {
    async getRecentPayments(limit = 100) {
        // 使用索引的高效查询
        return this.findAll({
            orderBy: 'payment_date DESC',
            limit
        });
    }
}
```

### 2. 内存管理

```javascript
// 分页处理大数据集
async function processLargeDataset(service) {
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
        const batch = await service.findAll({
            limit: pageSize,
            offset
        });
        
        // 处理批次
        await processBatch(batch);
        
        hasMore = batch.length === pageSize;
        offset += pageSize;
    }
}
```

### 3. 缓存策略

```javascript
// 服务层缓存
class CachedService extends BaseRepository {
    constructor(db, tableName) {
        super(db, tableName);
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟
    }
    
    async findByIdCached(id) {
        const cacheKey = `${this.tableName}:${id}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        const data = this.findById(id);
        if (data) {
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
        }
        
        return data;
    }
}
```

## 安全架构

### 1. 输入验证层次

```
1. 路由层：基础参数检查
2. 控制器层：格式验证
3. 服务层：业务规则验证
4. 仓库层：数据完整性检查
```

### 2. 错误信息安全

```javascript
// 生产环境错误过滤
function sanitizeError(error, env) {
    if (env === 'production') {
        return {
            message: 'An error occurred',
            code: error.code
        };
    }
    
    return {
        message: error.message,
        stack: error.stack,
        code: error.code
    };
}
```

这个架构设计确保了系统的：
- **可维护性**：清晰的分层和职责分离
- **可扩展性**：模块化设计便于添加新功能
- **可测试性**：依赖注入和单一职责便于单元测试
- **性能**：优化的数据访问和缓存策略
- **安全性**：多层验证和错误处理机制

## 架构重构完成状态 (2025-07-07)

### 重构成果

本次重构完全实现了架构文档中定义的分层架构原则：

#### 新增服务层组件
- **AnalyticsService** - 收入分析和订阅统计业务逻辑
- **SettingsService** - 应用设置管理业务逻辑
- **ExchangeRateDbService** - 汇率数据库操作业务逻辑
- **SubscriptionManagementService** - 订阅生命周期管理业务逻辑

#### 新增控制器层组件
- **AnalyticsController** - 分析相关HTTP请求处理
- **SettingsController** - 设置相关HTTP请求处理
- **ExchangeRateController** - 汇率相关HTTP请求处理
- **SubscriptionManagementController** - 订阅管理HTTP请求处理
- **MonthlyExpenseController** - 月度费用HTTP请求处理

#### 重构完成的路由模块
所有路由模块现在严格遵循单一职责原则：
- ✅ **analytics.js** - 移除复杂SQL查询和业务逻辑，委托给AnalyticsController
- ✅ **settings.js** - 移除直接数据库操作，委托给SettingsController
- ✅ **exchangeRates.js** - 移除数据库操作，委托给ExchangeRateController
- ✅ **monthlyExpenses.js** - 移除复杂数据处理逻辑，委托给MonthlyExpenseController
- ✅ **subscriptionManagement.js** - 移除事务管理和业务逻辑，委托给SubscriptionManagementController

### 架构合规性验证

✅ **路由层合规**：只处理路由定义和中间件应用
✅ **控制器层合规**：只处理HTTP请求/响应和参数验证
✅ **服务层合规**：实现业务逻辑，使用BaseRepository进行数据访问
✅ **数据访问层合规**：通过BaseRepository统一数据库操作接口

### 重构效果

1. **代码质量提升**：消除了路由层中的业务逻辑违规
2. **可维护性增强**：清晰的职责分离使代码更易理解和修改
3. **可测试性改善**：业务逻辑与HTTP处理分离，便于单元测试
4. **一致性保证**：所有模块现在遵循相同的架构模式
5. **扩展性提升**：新功能可以轻松添加到相应的架构层

**重构完成时间**：2025年7月7日
