# 数据重置脚本使用指南

本目录包含用于重置 `payment_history` 和 `monthly_expenses` 数据表的脚本和工具。

## 📁 文件说明

- `resetData.js` - 主要的数据重置脚本
- `resetDataExample.js` - 演示不同重置方法的示例脚本
- `README.md` - 本说明文件

## 🚀 快速开始

### 方法1: 使用重置脚本（推荐）

```bash
# 查看帮助
node server/scripts/resetData.js

# 重置所有数据
node server/scripts/resetData.js --all

# 仅重置 payment_history
node server/scripts/resetData.js --payment-history

# 仅重置 monthly_expenses
node server/scripts/resetData.js --monthly-expenses

# 重置 payment_history 并重新计算 monthly_expenses
node server/scripts/resetData.js --payment-history --recalculate

# 🆕 从订阅数据重建所有支付历史和月度支出（推荐用于数据修复）
node server/scripts/resetData.js --rebuild-from-subscriptions
```

### 方法2: 使用API端点

确保服务器正在运行，然后使用API端点：

```bash
# 重置 payment_history
curl -X POST http://localhost:3001/api/payment-history/reset \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json"

# 重置 monthly_expenses
curl -X POST http://localhost:3001/api/monthly-expenses/reset \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json"

# 重新计算 monthly_expenses
curl -X POST http://localhost:3001/api/monthly-expenses/recalculate \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json"

# 🆕 从订阅数据重建 payment_history 并重新计算 monthly_expenses
curl -X POST http://localhost:3001/api/payment-history/rebuild-from-subscriptions \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json"
```

### 方法3: 直接数据库操作

```javascript
const Database = require('better-sqlite3');
const db = new Database('server/db/database.sqlite');

// 重置 payment_history
db.prepare('DELETE FROM payment_history').run();

// 重置 monthly_expenses
db.prepare('DELETE FROM monthly_expenses').run();

db.close();
```

## 📊 数据表说明

### payment_history 表
存储所有支付历史记录，包括：
- 支付日期
- 支付金额和货币
- 账单周期
- 支付状态
- 关联的订阅ID

### monthly_expenses 表
存储按月汇总的支出数据，包括：
- 月份标识
- 支付历史ID列表
- 各货币的金额汇总
- 分类明细（如果启用）

## ⚠️ 注意事项

1. **数据备份**: 重置操作会永久删除数据，建议先备份数据库文件
2. **关联性**: `monthly_expenses` 基于 `payment_history` 计算，重置 `payment_history` 后应重新计算 `monthly_expenses`
3. **API权限**: 使用API端点需要有效的API密钥
4. **服务器状态**: API方法需要服务器正在运行

## 🔧 常见使用场景

### 场景1: 从订阅数据重建所有支付数据（最常用）
```bash
# 这是您需要的场景：subscriptions → payment_history → monthly_expenses
node server/scripts/resetData.js --rebuild-from-subscriptions
```

### 场景2: 完全重置所有数据
```bash
node server/scripts/resetData.js --all
```

### 场景3: 重置支付历史并重新计算月度支出
```bash
node server/scripts/resetData.js --payment-history --recalculate
```

### 场景3: 仅重新计算月度支出（不删除数据）
```bash
# 使用API
curl -X POST http://localhost:3001/api/monthly-expenses/recalculate \
  -H "X-API-KEY: your-api-key"

# 或使用脚本
node -e "
const MonthlyExpenseService = require('./server/services/monthlyExpenseService');
const service = new MonthlyExpenseService('./server/db/database.sqlite');
service.recalculateAllMonthlyExpenses();
service.close();
console.log('重新计算完成');
"
```

### 场景4: 查看当前数据状态
```bash
node server/scripts/resetDataExample.js --status
```

## 🛠️ 故障排除

### 问题1: 数据库文件不存在
```bash
# 确保数据库路径正确
export DATABASE_PATH="/path/to/your/database.sqlite"
```

### 问题2: API调用失败
```bash
# 检查服务器是否运行
curl http://localhost:3001/api/health

# 检查API密钥是否正确
echo $API_KEY
```

### 问题3: 权限错误
```bash
# 确保有数据库文件的读写权限
chmod 644 server/db/database.sqlite
```

## 📝 日志和监控

重置操作会产生详细的日志输出，包括：
- 操作开始时间
- 删除的记录数量
- 操作完成状态
- 错误信息（如果有）

示例日志输出：
```
🔧 数据重置脚本
📂 数据库路径: /app/data/database.sqlite
✅ 数据库连接成功

📝 重置 payment_history 表...
📊 当前记录数: 150
🗑️  已删除 150 条 payment_history 记录

🔄 重新计算 monthly_expenses...
✅ monthly_expenses 重新计算完成

🎉 数据重置完成!
```

## 🔗 相关文档

- [API文档](../../docs/API_DOCUMENTATION.md) - 完整的API端点文档
- [数据库架构](../db/schema.sql) - 数据库表结构定义
- [月度支出服务](../services/monthlyExpenseService.js) - 月度支出计算逻辑
