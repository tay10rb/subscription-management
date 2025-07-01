# Cursor Background Agent 配置

这个目录包含了为订阅管理项目配置 Cursor Background Agent 所需的文件。

## 文件说明

### `environment.json` (推荐)
标准配置文件，适合大多数开发场景：
- **install**: 安装项目依赖的命令
- **start**: 环境初始化命令
- **terminals**: 后台运行的终端进程

### `environment-docker.json`
包含 Docker 支持的配置，适合容器化开发：
- 启动 Docker 服务
- 提供 Docker 构建和运行终端
- 包含数据库管理终端

### `environment-simple.json`
简化配置，适合快速开发和测试：
- 最少的配置
- 单个终端运行全栈应用
- 自动处理环境变量和数据库初始化

## 配置详情

### 安装阶段 (install)
```bash
npm install && cd server && npm install && cd ..
```
- 安装前端依赖
- 安装后端依赖

### 启动阶段 (start)
```bash
if [ ! -f .env ]; then cp env.example .env && echo 'Created .env from env.example'; fi
```
- 检查并创建环境变量文件

### 终端进程 (terminals)

1. **Frontend Dev Server**: 运行 Vite 开发服务器
2. **Backend Server**: 初始化数据库并启动 Express 服务器
3. **Build & Test**: 用于构建和测试的终端

## 使用说明

### 选择配置文件
根据你的需求选择合适的配置：

- **标准开发**: 使用 `environment.json`
- **Docker 开发**: 将 `environment-docker.json` 重命名为 `environment.json`
- **快速测试**: 将 `environment-simple.json` 重命名为 `environment.json`

### 设置步骤
1. 确保你的 GitHub 仓库已经连接到 Cursor
2. 在 Cursor 中打开 Background Agent 控制面板 (快捷键)
3. 创建新的 Background Agent
4. 系统会自动读取 `.cursor/environment.json` 配置
5. Agent 将自动设置环境并启动所需的服务

### 访问应用
- 前端开发服务器: `http://localhost:5173`
- 后端 API 服务器: `http://localhost:3001`

## 环境变量

Background Agent 会自动从 `env.example` 创建 `.env` 文件。你可能需要在 Cursor 的设置中配置以下密钥：

- `API_KEY`: 应用程序 API 密钥
- `TIANAPI_KEY`: 天行数据汇率 API 密钥（可选）

## 注意事项

- Background Agent 运行在隔离的 Ubuntu 环境中
- 具有互联网访问权限
- 可以自动安装所需的包和依赖
- 会在单独的分支上工作并推送到你的仓库

## 故障排除

如果遇到问题：

1. 检查 GitHub 连接权限
2. 确保 `environment.json` 格式正确
3. 查看 Background Agent 的日志输出
4. 在 Cursor Discord 的 #background-agent 频道寻求帮助
