# API 配置说明

## 为什么通常不需要设置 VITE_API_BASE_URL

本项目的前端代码使用了智能的 API 地址配置策略，在大多数情况下不需要手动设置 `VITE_API_BASE_URL` 环境变量。

## 自动配置逻辑

前端代码中的 API 基础 URL 配置如下：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')
```

这个配置的工作原理：

### 开发环境 (npm run dev)
- **自动使用**: `http://localhost:3001/api`
- **原因**: 开发时前端运行在 5173 端口，后端运行在 3001 端口，需要完整的 URL 进行跨域请求

### 生产环境 (npm run build)
- **自动使用**: `/api`
- **原因**: 生产环境中前端和后端通常部署在同一个域名下，使用相对路径即可

## 何时需要设置 VITE_API_BASE_URL

只有在以下特殊情况下才需要手动设置：

### 1. 自定义开发端口
如果后端不是运行在 3001 端口：
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. 跨域开发
如果前端需要连接到远程开发服务器：
```bash
VITE_API_BASE_URL=https://dev-api.example.com/api
```

### 3. 特殊部署架构
如果生产环境中 API 不在 `/api` 路径下：
```bash
VITE_API_BASE_URL=https://api.example.com/v1
```

## 推荐配置

### 标准开发环境
```bash
# .env.local (通常不需要创建)
# 使用默认配置即可
```

### Docker 开发环境
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:3001/api
```

### 生产环境
```bash
# .env.production (通常不需要创建)
# 使用默认的相对路径 /api
```

## 验证配置

### 检查当前配置
在浏览器开发者工具的 Console 中运行：
```javascript
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'))
```

### 测试 API 连接
访问以下 URL 检查 API 是否可达：
- 开发环境: `http://localhost:3001/api/health`
- 生产环境: `https://yourdomain.com/api/health`

## 常见问题

### Q: 为什么我的 API 请求失败了？
A: 检查以下几点：
1. 后端服务是否正在运行
2. 端口是否正确（默认 3001）
3. 是否有防火墙阻止连接
4. 浏览器网络选项卡中的实际请求 URL

### Q: 如何在生产环境中使用不同的 API 地址？
A: 在构建时设置环境变量：
```bash
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

### Q: Docker 部署时如何配置？
A: 通常不需要特殊配置，因为前后端在同一个容器中，使用相对路径 `/api` 即可。

## 总结

- **开发环境**: 无需配置，自动使用 `http://localhost:3001/api`
- **生产环境**: 无需配置，自动使用 `/api`
- **特殊需求**: 才需要设置 `VITE_API_BASE_URL`

这种设计让项目在大多数情况下都能开箱即用，减少了配置的复杂性。
