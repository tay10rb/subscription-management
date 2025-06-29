# 订阅管理系统 - 安装部署指南

本文档将指导您完成订阅管理系统的 Docker 部署。

## 系统要求

- Docker 20.10+ 
- Docker Compose 2.0+ (可选，用于简化部署)
- 至少 1GB 可用内存
- 至少 2GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd subscription-management
```

### 2. 配置环境变量

**重要**: 本项目使用统一的配置管理，所有环境变量都在根目录的 `.env` 文件中管理。

复制环境变量模板：
```bash
cp env.example .env
```

如果您之前在 `server/` 目录有 `.env` 文件，请将其内容迁移到根目录的 `.env` 文件中，然后删除 `server/.env` 文件以避免混乱。

### 3. 构建 Docker 镜像

```bash
docker build -t subscription-manager:latest .
```

### 4. 创建数据卷

为了持久化数据库，创建一个 Docker 卷：

```bash
docker volume create subscription-data
```

### 5. 配置 API 密钥

编辑根目录的 `.env` 文件，设置您的 API 密钥：

```bash
# 生成一个安全的 API 密钥
API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "API_KEY=$API_KEY" >> .env
echo "Generated API Key: $API_KEY"
```

或者手动编辑 `.env` 文件：
```bash
API_KEY=your-secure-32-character-api-key-here
PORT=3001
NODE_ENV=production
```

**重要说明**: 如果您的项目中没有预配置的数据库文件，系统会在首次启动时自动创建并初始化数据库表结构。您也可以手动初始化数据库（可选）：

```bash
# 手动初始化数据库（可选）
docker run --rm \
  -v subscription-data:/app/server/db \
  --env-file .env \
  subscription-manager:latest \
  node server/db/init.js
```

### 6. 启动容器

启动服务（API 密钥从 .env 文件读取）：

```bash
docker run -d \
  --name subscription-manager \
  -p 3001:3001 \
  -v subscription-data:/app/server/db \
  --env-file .env \
  subscription-manager:latest
```

### 7. 验证部署

访问 http://localhost:3001 验证服务是否正常运行。

## 使用 Docker Compose 部署（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  subscription-manager:
    build: .
    container_name: subscription-manager
    ports:
      - "3001:3001"
    volumes:
      - subscription-data:/app/server/db
    environment:
      - API_KEY=${API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "const http=require('http');const options={hostname:'localhost',port:3001,path:'/',timeout:2000};const req=http.request(options,res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end();"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

volumes:
  subscription-data:
    driver: local
```

创建 `.env` 文件：

```bash
# 替换为您的实际 API 密钥
API_KEY=your-secret-api-key-here
```

启动服务：

```bash
# 确保 .env 文件中已配置 API_KEY，然后启动服务
docker-compose up -d
```

## 生产环境部署

### 反向代理配置

建议在生产环境中使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### HTTPS 配置

使用 Let's Encrypt 配置 HTTPS：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 环境变量

生产环境推荐的环境变量：

```bash
# 必需
API_KEY=your-secure-api-key

# 可选
NODE_ENV=production
PORT=3001
```

## 数据备份

### 备份数据库

```bash
# 创建备份
docker run --rm \
  -v subscription-data:/app/server/db \
  -v $(pwd):/backup \
  alpine cp /app/server/db/database.sqlite /backup/backup-$(date +%Y%m%d-%H%M%S).sqlite
```

### 恢复数据库

```bash
# 恢复备份
docker run --rm \
  -v subscription-data:/app/server/db \
  -v $(pwd):/backup \
  alpine cp /backup/your-backup-file.sqlite /app/server/db/database.sqlite
```

## 监控和日志

### 查看日志

```bash
# 实时查看日志
docker logs -f subscription-manager

# 使用 Docker Compose
docker-compose logs -f
```

### 健康检查

```bash
# 检查容器状态
docker ps

# 检查健康状态
docker inspect subscription-manager | grep Health -A 10
```

## 故障排除

### 常见问题

1. **API_KEY 未设置**
   ```
   错误：API Key not configured on the server
   解决：确保在启动容器时设置了正确的 API_KEY 环境变量
   ```

2. **数据库权限问题**
   ```
   错误：SQLITE_CANTOPEN: unable to open database file
   解决：检查数据卷权限，确保容器可以写入数据库文件
   ```

3. **端口占用**
   ```
   错误：port is already allocated
   解决：更改端口映射或停止占用端口的服务
   ```

### 重置系统

如果需要完全重置系统：

```bash
# 停止并删除容器
docker stop subscription-manager
docker rm subscription-manager

# 删除数据卷（注意：这将删除所有数据）
docker volume rm subscription-data

# 重新初始化
docker volume create subscription-data
# 然后重新执行部署步骤
```

## 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker build -t subscription-manager:latest .

# 使用 Docker Compose 更新
docker-compose up -d --build

# 或手动更新
docker stop subscription-manager
docker rm subscription-manager
# 然后使用新镜像重新启动容器
```

## 性能优化

### 资源限制

```bash
docker run -d \
  --name subscription-manager \
  --memory="512m" \
  --cpus="0.5" \
  -p 3001:3001 \
  -v subscription-data:/app/server/db \
  -e API_KEY=<your-api-key> \
  subscription-manager:latest
```

### Docker Compose 资源限制

```yaml
services:
  subscription-manager:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## 安全建议

1. **使用强 API 密钥**: 确保 API 密钥足够复杂且唯一
2. **网络隔离**: 在生产环境中使用专用网络
3. **定期备份**: 设置自动备份计划
4. **监控日志**: 定期检查应用日志以发现异常
5. **更新依赖**: 定期更新 Docker 镜像和依赖包

## 数据库管理

### 自动初始化（推荐）

系统在首次启动时会自动检测并创建必要的数据库表结构，无需手动干预。这是最简单和推荐的方式。

### 手动数据库管理

如果需要手动管理数据库，可以使用以下命令：

#### 开发环境

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install

# 初始化数据库
npm run db:init

# 重置数据库（删除所有数据）
npm run db:reset
```

#### Docker 环境

```bash
# 手动初始化数据库
docker run --rm \
  -v subscription-data:/app/server/db \
  --env-file .env \
  subscription-manager:latest \
  node server/db/init.js

# 使用 Docker Compose 初始化
docker-compose run --rm subscription-manager node server/db/init.js
```

### 数据库表结构

系统会自动创建以下表：

- **subscriptions**: 存储订阅信息
  - 支持月付、年付、季付周期
  - 包含状态管理（active、inactive、cancelled）
  - 自动计算账单日期
  
- **settings**: 存储应用设置
  - 默认货币配置
  - 主题设置

### 无预配置数据库的情况

如果您的项目中没有 `server/db/database.sqlite` 文件：

1. **自动处理**：服务器启动时会自动创建数据库和表结构
2. **手动创建**：运行初始化脚本创建数据库
3. **验证**：检查 `server/db/` 目录是否包含 `database.sqlite` 文件

## 配置迁移指南

如果您之前使用的是 `server/.env` 文件，请按照以下步骤迁移到统一配置：

### 1. 备份现有配置
```bash
# 备份 server 目录下的 .env 文件（如果存在）
cp server/.env server/.env.backup 2>/dev/null || echo "No server/.env file found"
```

### 2. 迁移配置
```bash
# 复制环境变量模板到根目录
cp env.example .env

# 如果之前有 server/.env 文件，手动将内容迁移到根目录的 .env 文件
```

### 3. 清理旧配置
```bash
# 删除 server 目录下的 .env 文件以避免混乱
rm server/.env 2>/dev/null || echo "No server/.env file to remove"
```

### 4. 验证配置
```bash
# 检查根目录的 .env 文件内容
cat .env

# 确保包含必要的配置项
# API_KEY=your-secure-api-key
# PORT=3001
# NODE_ENV=production
```

## 支持

如遇问题，请检查：
1. Docker 和 Docker Compose 版本是否符合要求
2. 端口是否被其他服务占用
3. API_KEY 环境变量是否在**根目录的 .env 文件**中正确设置
4. 数据卷权限是否正确
5. 确保没有 `server/.env` 文件存在，以避免配置冲突

更多问题请查看项目的 GitHub Issues 或联系维护者。 