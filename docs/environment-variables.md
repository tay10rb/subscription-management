# 环境变量配置说明

## 必需的环境变量

### API_KEY
- **用途**: 后端API认证密钥，保护所有写操作（创建、更新、删除）
- **示例**: `API_KEY=your_secret_api_key_here`
- **注意**: 请使用强密码，避免使用简单字符串

### PORT
- **用途**: 服务器运行端口
- **默认值**: 3001
- **示例**: `PORT=3001`

## 可选的环境变量

### TIANAPI_KEY
- **用途**: 天行数据汇率API密钥，用于自动更新汇率
- **示例**: `TIANAPI_KEY=your_tianapi_key_here`
- **说明**: 如果不设置，汇率功能仍可使用，但需要手动设置汇率

### VITE_LOG_LEVEL
- **用途**: 前端日志级别控制
- **可选值**: `debug`, `info`, `warn`, `error`
- **默认值**: `info`
- **建议**: 
  - 开发环境: `info` 或 `debug`
  - 生产环境: `warn` 或 `error`

### LOG_LEVEL
- **用途**: 后端日志级别控制
- **可选值**: `debug`, `info`, `warn`, `error`
- **默认值**: `info`
- **建议**: 
  - 开发环境: `info` 或 `debug`
  - 生产环境: `warn` 或 `error`

### VITE_API_BASE_URL
- **用途**: 自定义前端API基础URL
- **默认行为**: 
  - 开发环境: `http://localhost:3001/api`
  - 生产环境: `/api`
- **何时需要**: 仅在特殊部署架构时需要设置

## 不建议设置的环境变量

### NODE_ENV
- **说明**: 应该由运行环境自动设置
- **开发环境**: 自动设为 `development`
- **生产环境**: 部署时设为 `production`
- **问题**: 在开发环境中手动设为 `production` 会影响调试

## 环境配置示例

### 开发环境 (.env)
```bash
# Server Configuration
API_KEY=dev_secret_key_123
PORT=3001

# API Configuration
TIANAPI_KEY=your_tianapi_key_here

# Logging Configuration (可选)
VITE_LOG_LEVEL=info
LOG_LEVEL=info
```

### 生产环境
```bash
# Server Configuration
API_KEY=super_secure_production_key
PORT=3001

# API Configuration
TIANAPI_KEY=your_tianapi_key_here

# Logging Configuration
VITE_LOG_LEVEL=warn
LOG_LEVEL=warn
```

### Docker 部署
```bash
# docker-compose.yml 或 Dockerfile 中设置
API_KEY=your_secure_key
NODE_ENV=production
TIANAPI_KEY=your_tianapi_key
LOG_LEVEL=warn
```

## 安全注意事项

1. **API_KEY**: 使用强密码，定期更换
2. **TIANAPI_KEY**: 不要在公开代码中暴露
3. **环境文件**: 确保 `.env` 文件在 `.gitignore` 中
4. **生产部署**: 使用环境变量而不是文件存储敏感信息

## 验证配置

### 检查服务器配置
```bash
# 检查服务器是否正常启动
curl http://localhost:3001/api/health
```

### 检查日志级别
观察控制台输出，确认日志级别设置是否生效。

### 检查汇率功能
在设置页面查看汇率状态，确认 TIANAPI_KEY 是否正确配置。
