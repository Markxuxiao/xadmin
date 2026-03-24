# XAdmin — 通用后台管理系统框架

## 项目结构

```
packages/
  core/
    frontend/     # @xadmin/frontend — Vue3 前端核心
    backend/      # @xadmin/backend — NestJS 后端核心
  module-user/    # 用户模块
  module-order/   # 订单模块

apps/
  project-alpha/  # 示例项目 A
    backend/      # NestJS 应用入口 (独立数据库)
    src/         # Vue 应用入口
```

## 技术栈

- **前端**: Vue 3 + Vite 8 + Element Plus + Pinia + Vue Router
- **后端**: NestJS + MikroORM + PostgreSQL
- **工程**: pnpm Monorepo + Workspace

## 后端核心模块

```
packages/core/backend/core/
  auth/           — JWT 登录/登出/Token 刷新
  user/           — 用户 CRUD
  role/           — 角色 CRUD + 权限关联
  menu/           — 菜单 CRUD + 树形结构
  dict/           — 字典管理（系统配置）
  audit-log/      — 操作日志（审计拦截器）
  file/           — 文件上传/删除
  department/     — 部门管理（树形结构）
  menu-permission/— 基于角色的菜单路径权限
  notification/   — 通知发送/标记已读
  online-user/    — 在线用户状态
  scheduled-task/ — Cron 定时任务
```

## 核心设计原则

1. **模块隔离**: Module Service 禁止调用其他 Module Service
2. **跨模块查询**: 通过 EntityManager 查询，不跨 Service
3. **显式注册**: 模块在 app 层显式 import，不使用 auto-discovery
4. **组件复用**: Module 通过 `components/` 目录导出可复用组件

## 相关文档

- 设计文档: `~/.gstack/projects/xadmin-framework/xuxiao-unknown-design-20260322-153000.md`
- Test Plan: `~/.gstack/projects/xadmin-framework/xuxiao-unknown-test-plan-20260322-165500.md`

## Testing

- **Framework**: Vitest + @vue/test-utils + happy-dom
- **Run**: `cd packages/core/backend && pnpm test`
- **Doc**: See `TESTING.md` for conventions and expectations
- **Goal**: 100% coverage for new code
  - When writing a new function, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail
