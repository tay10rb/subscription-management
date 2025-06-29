# 项目结构说明

本文档描述了订阅管理系统的项目结构和文件组织。

## 📁 根目录结构

```
subscription-management/
├── 📄 README.md              # 项目主要文档
├── 📄 TODO.md                # 开发计划和功能清单
├── 📄 STRUCTURE.md           # 项目结构说明（本文件）
├── 📁 docs/                  # 详细技术文档
├── 📁 src/                   # 前端源代码
├── 📁 server/                # 后端源代码
├── 📁 public/                # 静态资源
├── 📁 dist/                  # 构建输出
├── 📄 package.json           # 前端依赖配置
├── 📄 vite.config.ts         # Vite构建配置
├── 📄 tailwind.config.js     # Tailwind CSS配置
├── 📄 tsconfig.json          # TypeScript配置
├── 📄 eslint.config.js       # ESLint配置
├── 📄 components.json        # shadcn/ui组件配置
├── 📄 Dockerfile             # Docker镜像构建
├── 📄 docker-compose.yml     # Docker Compose配置
├── 📄 env.example            # 环境变量模板
└── 📄 .env                   # 环境变量（需要创建）
```

## 📚 docs/ 目录

```
docs/
├── 📄 README.md              # 文档目录说明
├── 📄 PROJECT.md             # 技术架构文档
├── 📄 install.md             # 部署安装指南
└── 📄 AUTO_RENEWAL_FEATURE.md # 自动续费功能文档
```

## 🎨 src/ 前端目录

```
src/
├── 📄 main.tsx               # 应用入口
├── 📄 App.tsx                # 主应用组件
├── 📄 index.css              # 全局样式
├── 📄 vite-env.d.ts          # Vite类型定义
├── 📁 components/            # React组件
│   ├── 📁 ui/                # shadcn/ui基础组件
│   ├── 📁 layouts/           # 布局组件
│   ├── 📁 subscription/      # 订阅相关组件
│   ├── 📁 dashboard/         # 仪表板组件
│   ├── 📁 imports/           # 导入功能组件
│   └── 📁 theme/             # 主题相关组件
├── 📁 pages/                 # 页面组件
│   ├── 📄 HomePage.tsx       # 主页
│   └── 📄 SettingsPage.tsx   # 设置页
├── 📁 store/                 # Zustand状态管理
│   ├── 📄 subscriptionStore.ts # 订阅状态
│   └── 📄 settingsStore.ts   # 设置状态
├── 📁 utils/                 # 工具函数
│   ├── 📄 currency.ts        # 货币处理
│   └── 📄 subscription-utils.ts # 订阅工具
├── 📁 lib/                   # 库文件
│   ├── 📄 utils.ts           # 通用工具
│   └── 📄 theme-sync.ts      # 主题同步
├── 📁 types/                 # TypeScript类型
├── 📁 hooks/                 # 自定义Hooks
└── 📁 services/              # API服务
```

## 🖥 server/ 后端目录

```
server/
├── 📄 server.js              # 主服务器文件
├── 📄 package.json           # 后端依赖配置
├── 📄 start.sh               # 启动脚本
├── 📁 db/                    # 数据库相关
│   ├── 📄 init.js            # 数据库初始化
│   ├── 📄 schema.sql         # 数据库结构
│   └── 📄 database.sqlite    # SQLite数据库文件
└── 📁 services/              # 业务服务
    ├── 📄 exchangeRateService.js      # 汇率服务
    └── 📄 exchangeRateScheduler.js    # 汇率定时任务
```

## 🔧 配置文件说明

### 前端配置
- **vite.config.ts**: Vite构建工具配置
- **tailwind.config.js**: Tailwind CSS样式配置
- **tsconfig.json**: TypeScript编译配置
- **eslint.config.js**: 代码检查配置
- **components.json**: shadcn/ui组件库配置

### 后端配置
- **server/package.json**: 后端Node.js依赖
- **server/start.sh**: 服务器启动脚本

### 部署配置
- **Dockerfile**: Docker镜像构建配置
- **docker-compose.yml**: Docker Compose服务编排
- **env.example**: 环境变量配置模板

## 🗄 数据库结构

### 主要数据表
- **subscriptions**: 订阅信息表
- **settings**: 系统设置表
- **exchange_rates**: 汇率信息表

### 数据库文件
- **server/db/database.sqlite**: SQLite数据库文件
- **server/db/schema.sql**: 数据库结构定义
- **server/db/init.js**: 数据库初始化脚本

## 🚀 构建输出

### dist/ 目录
- 前端构建后的静态文件
- 包含HTML、CSS、JavaScript等资源
- 生产环境部署时使用

### public/ 目录
- 静态资源文件
- 图标、图片等不需要处理的文件

## 📦 依赖管理

### 前端依赖
- **package.json**: 前端npm依赖配置
- **package-lock.json**: 依赖版本锁定

### 后端依赖
- **server/package.json**: 后端npm依赖配置
- **server/package-lock.json**: 后端依赖版本锁定

## 🔍 开发工具

### 代码质量
- **ESLint**: 代码检查和格式化
- **TypeScript**: 类型检查和编译
- **Prettier**: 代码格式化（通过ESLint集成）

### 构建工具
- **Vite**: 前端构建和开发服务器
- **Tailwind CSS**: 样式框架
- **PostCSS**: CSS处理工具

## 📝 文档维护

### 文档更新原则
1. 代码变更时同步更新相关文档
2. 新功能开发时补充功能文档
3. 定期检查文档的准确性和完整性
4. 保持文档结构清晰和易于导航

### 文档分类
- **README.md**: 项目概览和快速开始
- **docs/**: 详细技术文档
- **TODO.md**: 开发计划和功能清单
- **STRUCTURE.md**: 项目结构说明

---

**注意**: 本文档会随着项目结构的变化而更新，请保持同步。
