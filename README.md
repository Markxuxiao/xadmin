# XAdmin

通用后台管理系统框架 — Vue3 + NestJS + pnpm Monorepo

## 项目结构

```
packages/
  core/           # 框架核心
    frontend/     # 前端核心 (@xadmin/frontend)
    backend/     # 后端核心 (@xadmin/backend)
  module-user/   # 用户模块 (@xadmin/module-user)
  module-order/  # 订单模块 (@xadmin/module-order)

apps/
  project-alpha/ # 示例项目
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev
```

## 设计文档

设计文档位于: `~/.gstack/projects/xadmin-framework/`
