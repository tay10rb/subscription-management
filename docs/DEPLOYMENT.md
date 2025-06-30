# 部署指南

## 数据库迁移系统

本项目现在包含一个自动化的数据库迁移系统，确保在部署新版本时数据库结构能够自动更新。

### 迁移系统工作原理

1. **迁移文件**: `server/db/migrations.js` 包含所有数据库迁移
2. **迁移脚本**: `server/db/migrate.js` 执行迁移
3. **启动脚本**: `server/start.sh` 在容器启动时自动运行迁移
4. **版本控制**: 使用 `migrations` 表跟踪已执行的迁移

### 本地开发

如果您在本地开发环境中需要手动运行迁移：

```bash
cd server
node db/migrate.js
```

### Docker 部署

#### 首次部署

1. 确保您有 `.env` 文件包含必要的环境变量：
```bash
API_KEY=your_secret_api_key_here
TIANAPI_KEY=your_tianapi_key_here
```

2. 构建并启动容器：
```bash
docker-compose up -d --build
```

#### 更新部署

当您需要部署包含数据库更改的新版本时：

1. 拉取最新代码
2. 重新构建并启动容器：
```bash
docker-compose down
docker-compose up -d --build
```

容器启动时会自动：
- 检查数据库是否存在
- 运行所有待执行的迁移
- 启动应用服务器

#### 数据持久化

数据库文件存储在 Docker volume 中，确保数据在容器重启时不会丢失：
```yaml
volumes:
  - subscription-data:/app/server/db
```

### 迁移版本历史

- **Version 1**: 初始数据库结构（subscriptions, settings, exchange_rates）
- **Version 2**: 添加 categories 和 payment_methods 表

### 故障排除

#### 迁移失败

如果迁移失败，容器将不会启动。检查日志：
```bash
docker-compose logs subscription-manager
```

#### 手动迁移

如果需要手动运行迁移：
```bash
# 进入容器
docker-compose exec subscription-manager sh

# 运行迁移
node /app/server/db/migrate.js
```

#### 回滚迁移

目前系统不支持自动回滚。如果需要回滚：

1. 备份数据库
2. 手动修改数据库结构
3. 更新 migrations 表中的版本号

### 添加新迁移

当需要添加新的数据库更改时：

1. 在 `server/db/migrations.js` 中添加新的迁移：
```javascript
{
  version: 3,
  name: 'add_new_feature',
  up: () => this.migration_003_add_new_feature()
}
```

2. 实现迁移方法：
```javascript
migration_003_add_new_feature() {
  console.log('📝 Adding new feature...');
  // 数据库更改代码
}
```

3. 测试迁移
4. 部署

### 安全注意事项

- 始终在生产环境部署前测试迁移
- 在重要更新前备份数据库
- 确保 API_KEY 环境变量安全设置
- 定期更新依赖包

### 监控

容器包含健康检查，可以监控应用状态：
```bash
docker-compose ps
```

查看详细日志：
```bash
docker-compose logs -f subscription-manager
```
