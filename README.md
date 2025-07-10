# 订阅管理系统 (Subscription Management System)

一个简单、本地优先的订阅管理工具，帮助您跟踪和管理所有定期付费订阅。

## ✨ 核心功能

### 📊 订阅管理
- 添加、编辑、删除订阅服务
- 支持月付、年付、季付等多种计费周期
- 自定义分类和支付方式
- 订阅状态管理（活跃、暂停、已取消）

### 📈 智能仪表板
- 月度和年度支出概览
- 分类支出统计图表
- 即将到期的订阅提醒（未来7天）
- 最近付费记录（过去7天）

### 📊 费用报告分析
- **综合费用指标** - 总支出、月均支出、增长率等关键指标
- **多维度分析** - 按时间、分类、支付方式的深度分析
- **可视化图表** - 趋势线图、饼图、柱状图等丰富展示
- **高级筛选** - 灵活的时间范围和条件筛选
- **数据洞察** - 智能识别费用模式和优化建议

### 🔄 自动续费功能
- **智能到期检测** - 自动识别到期订阅
- **自动日期更新** - 根据计费周期自动计算下次付费日期
- **批量处理** - 页面加载时自动处理所有到期订阅
- **手动触发** - 提供API端点支持手动续费处理

### 💱 多币种支持
- **7种主要货币** - CNY, USD, EUR, GBP, CAD, AUD, JPY
- **实时汇率更新** - 集成天行数据API，支持每日自动更新
- **智能货币转换** - 所有金额可转换为用户首选货币显示
- **双币种显示** - 可选择同时显示原始货币和转换后货币

### 🎨 用户体验
- **响应式设计** - 完美适配桌面和移动设备
- **深色/浅色主题** - 支持系统主题自动切换
- **高级筛选** - 按状态、分类、关键词搜索
- **数据导入导出** - 支持CSV格式批量导入和导出

## 🛠 技术栈

- **前端:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **后端:** Node.js, Express 5
- **数据库:** SQLite (better-sqlite3)
- **状态管理:** Zustand
- **图表:** Recharts
- **UI组件:** Radix UI, Lucide React

## 🏗 本地优先架构

本应用完全运行在您的本地机器上，无需依赖外部服务器或云服务：

- **前端**: 标准React应用，运行在浏览器中
- **后端**: 轻量级Node.js/Express服务器
- **数据库**: 本地SQLite文件，数据完全掌控在您手中
- **安全性**: API密钥保护写操作，密钥存储在浏览器本地存储中

## 🚀 快速开始

### 📋 系统要求

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) (随Node.js安装)
- 操作系统: Windows, macOS, Linux

### 🔧 开发环境安装

#### 1. 克隆并安装前端依赖
```bash
# 克隆项目到本地
git clone <repository-url>
cd subscription-management

# 安装前端依赖
npm install

# 启动前端开发服务器
npm run dev
```
前端将在 `http://localhost:5173` 运行

#### 2. 配置并启动后端服务
```bash
# 进入服务器目录
cd server

# 安装后端依赖
npm install

# 初始化数据库（仅需执行一次）
npm run db:init

# 启动后端服务器
npm start
```
后端将在 `http://localhost:3000` 运行

#### 3. 环境变量配置（可选）

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件，添加以下配置：
API_KEY=your-secret-api-key-here
TIANAPI_KEY=your-tianapi-key-here  # 可选：用于自动汇率更新
PORT=3001
NODE_ENV=development
```

**说明:**
- `API_KEY`: 必需，用于保护写操作的安全密钥
- `TIANAPI_KEY`: 可选，用于自动汇率更新的天行数据API密钥

#### 4. 首次使用配置

1. 在浏览器中打开 `http://localhost:5173`
2. 进入"设置"页面
3. 设置您的API密钥（与.env文件中的API_KEY保持一致）
4. 选择您的首选货币和主题

## 🐳 Docker部署（推荐生产环境）

### 快速部署
```bash
# 1. 配置环境变量
cp env.example .env
# 编辑 .env 文件设置 API_KEY

# 2. 构建并启动
docker-compose up -d
```

### 手动Docker部署
```bash
# 构建镜像
docker build -t subscription-manager:latest .

# 创建数据卷
docker volume create subscription-data

# 启动容器
docker run -d \
  --name subscription-manager \
  -p 3001:3001 \
  -v subscription-data:/app/server/db \
  --env-file .env \
  subscription-manager:latest
```

访问 `http://localhost:3001` 即可使用

详细部署指南请参考: [📖 docs/install.md](./docs/install.md)

## 📚 项目文档

- **[📋 项目技术文档](./docs/PROJECT.md)** - 后端架构、API认证、数据库管理
- **[🔄 自动续费功能](./docs/AUTO_RENEWAL_FEATURE.md)** - 自动续费功能详细说明
- **[📊 费用报告功能](./docs/EXPENSE_REPORTS_FEATURE.md)** - 费用分析仪表板完整文档
- **[⚡ 费用报告快速入门](./docs/EXPENSE_REPORTS_QUICKSTART.md)** - 5分钟快速上手指南
- **[🚀 部署指南](./docs/install.md)** - Docker部署和生产环境配置

## 🔧 主要功能说明

### 自动续费处理
系统会在页面加载时自动检查到期订阅并更新计费日期：
- 检测今天或已过期的活跃订阅
- 自动计算下次计费日期（月付+1月，年付+1年，季付+3月）
- 更新最后付费日期为今天
- 支持手动触发: `POST /api/subscriptions/auto-renew`

### 多币种转换
- 支持7种主要货币间的实时转换
- 使用天行数据API获取最新汇率
- 每日自动更新汇率（需配置TIANAPI_KEY）
- 可选择显示原始货币和转换后货币

### 数据安全
- 所有数据存储在本地SQLite数据库
- API密钥保护所有写操作
- 支持数据备份和恢复
- 无外部数据传输（除汇率更新）

## 🛡 API端点

### 公开端点（只读）
- `GET /api/subscriptions` - 获取所有订阅
- `GET /api/subscriptions/:id` - 获取单个订阅
- `GET /api/settings` - 获取系统设置
- `GET /api/exchange-rates` - 获取汇率信息

### 受保护端点（需要API密钥）
- `POST /api/subscriptions` - 创建订阅
- `PUT /api/subscriptions/:id` - 更新订阅
- `DELETE /api/subscriptions/:id` - 删除订阅
- `POST /api/subscriptions/auto-renew` - 触发自动续费
- `PUT /api/settings` - 更新设置
- `POST /api/exchange-rates/update` - 手动更新汇率

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 支持与反馈

- 🐛 **问题报告**: [GitHub Issues](https://github.com/your-repo/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **联系方式**: your-email@example.com

---

**⭐ 如果这个项目对您有帮助，请给我们一个星标！**
