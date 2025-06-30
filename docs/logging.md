# 日志管理

本项目实现了统一的日志管理系统，可以通过环境变量控制日志输出级别，避免在生产环境中暴露过多调试信息。

## 日志级别

支持以下日志级别（按严重程度排序）：

1. **debug** - 详细的调试信息，仅在开发环境显示
2. **info** - 一般信息，如系统启动、操作完成等
3. **warn** - 警告信息，如配置缺失、API限制等
4. **error** - 错误信息，如API调用失败、数据库错误等

## 环境变量配置

### 前端日志配置

在 `.env` 文件中设置：

```bash
# 前端日志级别
VITE_LOG_LEVEL=warn
```

### 后端日志配置

在 `.env` 文件中设置：

```bash
# 后端日志级别
LOG_LEVEL=warn
```

## 推荐配置

### 开发环境
```bash
VITE_LOG_LEVEL=debug
LOG_LEVEL=debug
```

### 生产环境
```bash
VITE_LOG_LEVEL=warn
LOG_LEVEL=warn
```

### 故障排查
```bash
VITE_LOG_LEVEL=error
LOG_LEVEL=error
```

## 使用方法

### 前端代码

```typescript
import { logger } from '@/utils/logger';

// 调试信息（仅开发环境）
logger.debug('Fetching exchange rates', { currency: 'USD' });

// 一般信息
logger.info('Exchange rates updated successfully');

// 警告信息
logger.warn('API key not configured');

// 错误信息
logger.error('Failed to fetch exchange rates', error);
```

### 后端代码

```javascript
const logger = require('./utils/logger');

// 调试信息（仅开发环境）
logger.debug('Processing request', { userId: 123 });

// 一般信息
logger.info('Server started on port 3001');

// 警告信息
logger.warn('Database connection slow');

// 错误信息
logger.error('Database query failed', error);
```

## 日志过滤规则

1. **开发环境**：显示所有级别的日志
2. **生产环境**：
   - `debug` 级别的日志会被自动过滤
   - 只显示设置级别及以上的日志
3. **级别过滤**：如果设置 `LOG_LEVEL=warn`，则只显示 `warn` 和 `error` 级别的日志

## 注意事项

1. 生产环境建议使用 `warn` 或 `error` 级别，避免暴露敏感信息
2. 调试时可以临时调整为 `debug` 级别获取详细信息
3. 错误日志始终会显示，确保重要问题不会被忽略
4. 日志级别变更需要重启应用才能生效
