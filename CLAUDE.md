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
- **后端**: NestJS + better-sqlite3 (SQLite)
- **工程**: pnpm Monorepo + Workspace

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
- **Run**: `cd apps/project-alpha && pnpm test`
- **Doc**: See `TESTING.md` for conventions and expectations
- **Goal**: 100% coverage for new code
  - When writing a new function, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail
