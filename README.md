# XAdmin

通用后台管理系统框架 — Vue 3 + NestJS + MikroORM + pnpm Monorepo

## 技术栈

- **前端**: Vue 3 + Vite 8 + Element Plus + Pinia + Vue Router
- **后端**: NestJS + MikroORM + PostgreSQL
- **工程**: pnpm Monorepo + Workspace

## 项目结构

```
packages/
  core/
    frontend/       # @xadmin/frontend — 前端核心（Vue 插件、通用组件、框架页面）
    backend/        # @xadmin/backend — 后端核心（12 个核心模块 + 基类）
  module-user/      # @xadmin/module-user — 用户模块（含角色管理界面）
  module-order/     # @xadmin/module-order — 订单模块

apps/
  project-alpha/    # 示例项目
    backend/        # NestJS 应用入口
    src/            # Vue 应用入口
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 前端开发
cd apps/project-alpha && pnpm dev

# 后端开发
cd apps/project-alpha/backend && pnpm dev

# 运行测试
cd apps/project-alpha && pnpm test          # 前端测试
cd packages/core/backend && pnpm test        # 后端测试
```

## 核心模块

| 模块 | 说明 |
|------|------|
| Auth | JWT 登录/登出/Token 刷新 |
| User | 用户 CRUD |
| Role | 角色 CRUD + 权限关联 |
| Menu | 菜单 CRUD + 树形结构 |
| Dict | 字典管理 |
| AuditLog | 操作日志审计 |
| File | 文件上传/删除 |
| Department | 部门管理（树形） |
| MenuPermission | 菜单路径权限 |
| Notification | 通知管理 |
| OnlineUser | 在线用户状态 |
| ScheduledTask | Cron 定时任务 |

## 相关文档

- 设计文档: `~/.gstack/projects/xadmin-framework/`
- 测试规范: `TESTING.md`
