# 订阅管理系统 - 技术文档

本文档详细介绍订阅管理系统的技术架构、API设计和开发指南。

## 🏗 系统架构

### 技术栈
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**: Node.js + Express 5 + SQLite
- **状态管理**: Zustand
- **数据库**: SQLite (better-sqlite3)
- **部署**: Docker + Docker Compose

### 项目结构
```
subscription-management/
├── src/                    # 前端源码
│   ├── components/         # React组件
│   ├── pages/             # 页面组件
│   ├── store/             # Zustand状态管理
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript类型定义
├── server/                # 后端源码
│   ├── db/                # 数据库相关
│   ├── services/          # 业务服务
│   └── server.js          # 主服务器文件
├── docs/                  # 项目文档
├── public/                # 静态资源
└── dist/                  # 构建输出
```

## 🔐 认证与安全

### API密钥认证
系统使用API密钥保护所有写操作（创建、更新、删除）：

#### 1. 环境变量配置
在**根目录**创建 `.env` 文件：
```bash
API_KEY=your_secret_api_key_here
PORT=3001
NODE_ENV=development
TIANAPI_KEY=your_tianapi_key_here  # 可选：汇率API密钥
```

#### 2. 生成安全密钥
```bash
# 生成32字节随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. 请求头认证
所有受保护的API端点需要在请求头中包含：
```http
X-API-KEY: your_secret_api_key_here
Content-Type: application/json
```

### 安全特性
- ✅ API密钥保护写操作
- ✅ 本地数据存储，无外部数据传输
- ✅ 环境变量管理敏感信息
- ✅ CORS配置限制跨域访问

## 🗄 数据库设计

### 数据库表结构

#### subscriptions 表
```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- 订阅服务名称
    plan TEXT NOT NULL,                    -- 订阅计划
    billing_cycle TEXT NOT NULL,           -- 计费周期: monthly/yearly/quarterly
    next_billing_date DATE,                -- 下次计费日期
    last_billing_date DATE,                -- 最后计费日期
    amount DECIMAL(10, 2) NOT NULL,        -- 金额
    currency TEXT NOT NULL DEFAULT 'USD',  -- 货币
    payment_method TEXT NOT NULL,          -- 支付方式
    start_date DATE,                       -- 开始日期
    status TEXT NOT NULL DEFAULT 'active', -- 状态: active/inactive/cancelled
    category TEXT NOT NULL DEFAULT 'other', -- 分类
    notes TEXT,                            -- 备注
    website TEXT,                          -- 官网
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### settings 表
```sql
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- 单例模式
    currency TEXT NOT NULL DEFAULT 'USD',   -- 默认货币
    theme TEXT NOT NULL DEFAULT 'system',   -- 主题: light/dark/system
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### exchange_rates 表
```sql
CREATE TABLE exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_currency TEXT NOT NULL,           -- 源货币
    to_currency TEXT NOT NULL,             -- 目标货币
    rate DECIMAL(15, 8) NOT NULL,          -- 汇率
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency)
);
```

### 数据库初始化

#### 自动初始化（推荐）
服务器启动时会自动检测并创建数据库：
```javascript
// 服务器启动时自动执行
if (!fs.existsSync(dbPath)) {
    console.log('Database not found, initializing...');
    initializeDatabase();
}
```

#### 手动初始化
```bash
# 开发环境
cd server && npm run db:init

# Docker环境
docker run --rm -v subscription-data:/app/server/db \
  --env-file .env subscription-manager:latest \
  node server/db/init.js
```

#### 数据库重置
```bash
# 开发环境
cd server && npm run db:reset

# 注意：这将删除所有数据！
```

## 🔄 API密钥管理

### 动态更新API密钥
通过API端点更新密钥：

**请求示例:**
```http
PUT /api/settings
Content-Type: application/json
X-API-KEY: current_api_key

{
  "api_key": "new_api_key_here"
}
```

**响应示例:**
```json
{
  "message": "API key updated successfully"
}
```

### 密钥验证流程
1. 客户端发送请求时在 `X-API-KEY` 头中包含密钥
2. 服务器中间件验证密钥是否匹配环境变量
3. 验证通过则继续处理请求，否则返回401错误

### 安全建议
- 🔒 使用至少32字符的随机密钥
- 🔄 定期更换API密钥
- 📝 不要在代码中硬编码密钥
- 🚫 避免在日志中记录密钥信息

## 📡 API接口文档

### 公开接口（无需认证）

#### 获取所有订阅
```http
GET /api/subscriptions
```
**响应:**
```json
[
  {
    "id": 1,
    "name": "Netflix",
    "plan": "Premium",
    "billing_cycle": "monthly",
    "next_billing_date": "2025-07-15",
    "last_billing_date": "2025-06-15",
    "amount": 15.99,
    "currency": "USD",
    "payment_method": "Credit Card",
    "status": "active",
    "category": "entertainment"
  }
]
```

#### 获取系统设置
```http
GET /api/settings
```
**响应:**
```json
{
  "currency": "USD",
  "theme": "system",
  "showOriginalCurrency": true
}
```

#### 获取汇率信息
```http
GET /api/exchange-rates
```
**响应:**
```json
{
  "USD": 1.0,
  "EUR": 0.85,
  "GBP": 0.73,
  "CNY": 7.25
}
```

### 受保护接口（需要API密钥）

#### 创建订阅
```http
POST /api/subscriptions
X-API-KEY: your_api_key
Content-Type: application/json

{
  "name": "Spotify",
  "plan": "Premium",
  "billing_cycle": "monthly",
  "next_billing_date": "2025-07-01",
  "amount": 9.99,
  "currency": "USD",
  "payment_method": "Credit Card",
  "start_date": "2025-06-01",
  "status": "active",
  "category": "music"
}
```

#### 更新订阅
```http
PUT /api/subscriptions/:id
X-API-KEY: your_api_key
Content-Type: application/json

{
  "amount": 12.99,
  "plan": "Premium Plus"
}
```

#### 删除订阅
```http
DELETE /api/subscriptions/:id
X-API-KEY: your_api_key
```

#### 触发自动续费
```http
POST /api/subscriptions/auto-renew
X-API-KEY: your_api_key
```
**响应:**
```json
{
  "message": "Auto renewal complete: 2 processed, 0 errors",
  "processed": 2,
  "errors": 0,
  "renewedSubscriptions": [
    {
      "id": 1,
      "name": "Netflix",
      "oldNextBilling": "2025-06-29",
      "newLastBilling": "2025-06-29",
      "newNextBilling": "2025-07-29"
    }
  ]
}
```

#### 手动更新汇率
```http
POST /api/exchange-rates/update
X-API-KEY: your_api_key
```

## 🔄 自动续费机制

### 核心逻辑
1. **检测到期**: 检查 `next_billing_date <= 今天` 的活跃订阅
2. **更新日期**:
   - `last_billing_date` = 今天
   - `next_billing_date` = 根据计费周期计算
3. **计费周期计算**:
   - `monthly`: +1个月
   - `yearly`: +1年
   - `quarterly`: +3个月

### 触发时机
- ✅ 页面加载时自动执行
- ✅ 手动API调用触发
- ✅ 可集成定时任务

### 实现细节
```javascript
// 检查订阅是否到期
function isSubscriptionDue(nextBillingDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const billingDate = new Date(nextBillingDate);
  billingDate.setHours(0, 0, 0, 0);

  return billingDate <= today;
}

// 计算下次计费日期
function calculateNextBillingDate(currentDate, billingCycle) {
  const nextDate = new Date(currentDate);

  switch (billingCycle) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
  }

  return nextDate.toISOString().split('T')[0];
}
```

## 💱 汇率服务

### 天行数据API集成
```javascript
// 获取实时汇率
const response = await axios.get('https://apis.tianapi.com/fxrate/index', {
  params: {
    key: TIANAPI_KEY,
    fromcoin: 'USD',
    tocoin: 'EUR',
    money: 1
  }
});
```

### 汇率更新策略
- 🕐 **定时更新**: 每日自动更新（可配置）
- 🔄 **手动更新**: 通过API端点触发
- 💾 **本地缓存**: 汇率存储在本地数据库
- 🛡 **降级策略**: API失败时使用缓存汇率

### 支持货币
- USD (美元) - 基准货币
- EUR (欧元)
- GBP (英镑)
- CAD (加拿大元)
- AUD (澳大利亚元)
- JPY (日元)
- CNY (人民币)

## 🚀 部署配置

### 环境变量
```bash
# 必需配置
API_KEY=your_secure_api_key_here
PORT=3001
NODE_ENV=production

# 可选配置
TIANAPI_KEY=your_tianapi_key_here
```

### Docker配置
```dockerfile
# 多阶段构建
FROM node:18-alpine AS frontend-build
# 构建前端...

FROM node:18-alpine AS runtime
# 运行时环境...
```

### 健康检查
```bash
# 检查服务状态
curl http://localhost:3001/api/subscriptions

# 检查数据库连接
curl http://localhost:3001/api/settings
```

## 🔧 开发指南

### 前端开发
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

### 后端开发
```bash
# 启动服务器
cd server && npm start

# 数据库操作
npm run db:init    # 初始化
npm run db:reset   # 重置
```

### 调试技巧
- 🔍 使用浏览器开发者工具查看网络请求
- 📝 检查服务器日志了解API调用情况
- 🗄 使用SQLite浏览器工具查看数据库
- 🧪 使用Postman测试API端点

## 📊 性能优化

### 前端优化
- ⚡ Vite构建工具，快速热重载
- 🎯 按需加载组件
- 💾 Zustand状态管理，减少不必要渲染
- 🖼 图标使用Lucide React，体积小

### 后端优化
- 🗄 SQLite索引优化查询性能
- 🔄 批量处理减少数据库操作
- 📦 Express中间件优化请求处理
- 💾 汇率缓存减少API调用

### 数据库优化
```sql
-- 性能索引
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_category ON subscriptions(category);
```

## 🧪 测试策略

### 单元测试
- 前端组件测试
- 后端API测试
- 工具函数测试

### 集成测试
- 前后端API集成
- 数据库操作测试
- 汇率服务测试

### 手动测试
- 浏览器兼容性测试
- 移动端响应式测试
- 用户体验测试