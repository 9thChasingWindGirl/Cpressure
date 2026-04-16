# Cpressure - Windows C盘空间释放工具

一款功能强大的Windows C盘空间管理工具，帮助用户分析磁盘空间使用情况、清理无用文件、管理应用程序缓存。

## 功能特性

### 1. 大文件管理
- 扫描并显示C盘大文件
- 按文件大小、名称、修改时间排序
- 支持文件删除和打开所在位置

### 2. 空间分析可视化
- 使用Treemap热力图可视化磁盘空间占用
- 支持点击目录钻取查看详情
- 面包屑导航方便层级浏览
- **集成 SpaceSniffer 扫描**：可一键调用 SpaceSniffer 对指定盘符进行深度空间扫描

### 3. 应用程序分析
- 扫描已安装的Windows应用程序
- 分析应用程序的缓存和配置目录
- **支持符号链接迁移**：将缓存目录迁移到其他盘符，释放C盘空间

### 4. Windows更新清理
- 检测Windows更新残留文件
- 区分安全可清理和谨慎清理的项目
- 一键清理，释放空间

### 5. 自动化构建工作流
- 提供 GitHub Actions 工作流
- 自动执行类型检查和前端构建
- 自动构建 Windows 现代化 GUI 客户端安装包
- 支持 tag 触发自动 Release

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + ECharts
- **桌面**: Electron 28
- **后端**: Node.js (Electron主进程)
- **API**: Octokit (GitHub API)

## 开发环境

### 前置要求

- Node.js 18+
- pnpm 8+
- Windows 10/11

### 安装依赖

```bash
pnpm install
```

### 运行开发模式

```bash
pnpm run dev
```

### 构建生产版本

```bash
pnpm run build
```

### 构建Electron应用

```bash
pnpm run electron:build
```

## 项目结构

```
Cpressure/
├── electron/              # Electron主进程代码
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── services/         # 后端服务
│       ├── fileScanner.ts
│       ├── appAnalyzer.ts
│       ├── symlinkManager.ts
│       ├── winUpdateCleanup.ts
│       └── githubActions.ts
├── src/                  # React前端代码
│   ├── components/       # React组件
│   ├── App.tsx
│   └── main.tsx
├── .github/
│   └── workflows/        # GitHub Actions配置
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

## 使用说明

### 大文件管理
1. 选择要扫描的驱动器
2. 设置最小文件大小阈值
3. 点击"开始扫描"
4. 可以对文件进行删除或打开位置操作

### 应用缓存迁移
1. 点击"扫描应用"获取已安装程序列表
2. 选择要管理的应用
3. 查看缓存目录及大小
4. 点击"迁移"将目录移动到其他盘符

### Windows更新清理
1. 点击"检测更新残留"
2. 选择要清理的项目（建议只选择"安全删除"的项目）
3. 点击"清理选中项目"

## 注意事项

- 部分功能需要管理员权限
- 清理系统文件前请谨慎确认
- 迁移应用缓存后需要重启相关应用

## 许可证

MIT License
