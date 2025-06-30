# Docker 部署指南

## 环境变量配置

### 必需的环境变量

在使用 Docker 部署时，需要在 `.env` 文件中设置以下变量：

```bash
# 必需 - API认证密钥
API_KEY=your_secure_api_key_here
```

### 可选的环境变量

```bash
# 可选 - 服务器端口（默认: 3001）
PORT=3001

# 可选 - 汇率API密钥
TIANAPI_KEY=your_tianapi_key_here

# 可选 - 日志级别（默认: warn）
LOG_LEVEL=warn
```

## 部署方式

### 方式一：使用 docker-compose（推荐）

1. **准备环境文件**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，至少设置 API_KEY
nano .env
```

2. **启动服务**
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

3. **停止服务**
```bash
docker-compose down
```

### 方式二：直接使用 Docker

1. **构建镜像**
```bash
docker build -t subscription-manager:latest .
```

2. **创建数据卷**
```bash
docker volume create subscription-data
```

3. **运行容器**
```bash
docker run -d \
  --name subscription-manager \
  -p 3001:3001 \
  -v subscription-data:/app/server/db \
  -e API_KEY=your_secure_api_key \
  -e TIANAPI_KEY=your_tianapi_key \
  -e LOG_LEVEL=warn \
  subscription-manager:latest
```

## 环境变量说明

### 在 docker-compose.yml 中的处理

```yaml
environment:
  - API_KEY=${API_KEY}                    # 从 .env 文件读取
  - NODE_ENV=production                   # 固定为生产环境
  - PORT=${PORT:-3001}                    # 默认 3001
  - TIANAPI_KEY=${TIANAPI_KEY}           # 可选，从 .env 读取
  - LOG_LEVEL=${LOG_LEVEL:-warn}         # 默认 warn
```

### 默认值处理

- `PORT`: 如果未设置，默认使用 3001
- `LOG_LEVEL`: 如果未设置，默认使用 warn（适合生产环境）
- `NODE_ENV`: 在 Docker 中固定为 production
- `TIANAPI_KEY`: 可选，如果未设置会在启动时显示提示

## 数据持久化

### 数据库存储
- 数据库文件存储在 `/app/server/db/database.sqlite`
- 通过 Docker 卷 `subscription-data` 持久化
- 容器重启或更新时数据不会丢失

### 备份数据
```bash
# 备份数据库
docker cp subscription-manager:/app/server/db/database.sqlite ./backup.sqlite

# 恢复数据库
docker cp ./backup.sqlite subscription-manager:/app/server/db/database.sqlite
docker restart subscription-manager
```

## 健康检查

### 内置健康检查
Docker 镜像包含健康检查，每 30 秒检查一次服务状态：

```bash
# 查看健康状态
docker ps

# 查看详细健康检查日志
docker inspect subscription-manager | grep -A 10 Health
```

### 手动检查
```bash
# 检查服务是否响应
curl http://localhost:3001/api/health

# 检查容器日志
docker logs subscription-manager
```

## 故障排查

### 常见问题

1. **容器启动失败**
   - 检查 API_KEY 是否设置
   - 查看容器日志: `docker logs subscription-manager`

2. **数据库初始化失败**
   - 检查数据卷权限
   - 重新创建容器: `docker-compose down && docker-compose up -d`

3. **汇率功能不工作**
   - 检查 TIANAPI_KEY 是否正确设置
   - 查看日志中的汇率更新信息

### 调试模式

如果需要调试，可以临时调整日志级别：

```bash
# 停止容器
docker-compose down

# 修改 .env 文件
LOG_LEVEL=debug

# 重新启动
docker-compose up -d

# 查看详细日志
docker-compose logs -f
```

## 更新部署

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 数据库迁移
应用启动时会自动检查并运行必要的数据库迁移，无需手动操作。
