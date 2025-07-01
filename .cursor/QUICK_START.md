# 🚀 Cursor Background Agent 快速开始

## 立即开始使用

### 1️⃣ 验证配置
```bash
node .cursor/validate.js
```

### 2️⃣ 启动 Background Agent
1. 在 Cursor 中按 `Ctrl+Shift+P` (或 `Cmd+Shift+P`)
2. 搜索 "Background Agent"
3. 选择 "Create Background Agent"
4. 系统会自动读取配置并启动

### 3️⃣ 访问应用
- **前端**: http://localhost:5173
- **后端**: http://localhost:3001

## 🔧 配置选项

| 配置文件 | 适用场景 | 特点 |
|---------|---------|------|
| `environment.json` | 标准开发 | 分离的前后端终端，完整功能 |
| `environment-docker.json` | 容器化开发 | 包含 Docker 支持 |
| `environment-simple.json` | 快速测试 | 单终端，最简配置 |

## 🛠️ 切换配置
```bash
# 使用设置脚本
./.cursor/setup.sh

# 或手动切换
cp .cursor/environment-simple.json .cursor/environment.json
```

## 📋 终端说明

### 标准配置的终端
1. **Frontend Dev Server**: Vite 开发服务器 (端口 5173)
2. **Backend Server**: Express API 服务器 (端口 3001)  
3. **Build & Test**: 构建和测试命令

### 常用命令
```bash
# 在 Build & Test 终端中
npm run build      # 构建前端
npm run lint       # 代码检查
cd server && npm run db:reset  # 重置数据库
```

## 🔐 环境变量

Background Agent 会自动创建 `.env` 文件。你可能需要设置：

```env
API_KEY=your-secret-api-key-here
TIANAPI_KEY=your-tianapi-key-here
PORT=3001
```

## 🆘 故障排除

### 常见问题
1. **端口冲突**: 确保 3001 和 5173 端口未被占用
2. **数据库错误**: 运行 `cd server && npm run db:reset`
3. **依赖问题**: 检查 `npm install` 是否成功

### 获取帮助
- 查看 Background Agent 日志
- 访问 [Cursor Discord #background-agent](https://discord.gg/jfgpZtYpmb)
- 发送邮件到 background-agent-feedback@cursor.com

## 🎯 下一步

配置完成后，你可以：
- 让 Background Agent 帮你开发新功能
- 运行测试和调试代码
- 自动化部署和构建任务

享受 AI 驱动的开发体验！ 🎉
