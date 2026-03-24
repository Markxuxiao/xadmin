# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - 2026-03-24

### Fixed
- **AuthService**: Require `JWT_SECRET` env var (throw on startup if unset); add refresh token with rotation (`POST /auth/refresh`, `POST /auth/logout`); remove password field from `userToRow`
- **UserService**: Add `findByUsername()` public method; set `department: null` on create; remove password from `userToRow`
- **UserController**: Check username uniqueness before create; handle PostgreSQL unique constraint violation (code 23505)
- **FileService**: Add `validateCategory()` preventing path traversal attacks; add soft-delete filter to `findOne`
- **MenuService**: Refactor from hardcoded `DEFAULT_MENU_TREE` to PostgreSQL-backed `getMenuTree`/`getMenuTreeByRoles` with proper `buildTree` ancestor inclusion
- **AuditLogService**: `JSON.parse` `responseBody` in `auditLogToRow`

### Added
- **Comprehensive test suite**: Full coverage for AuditLogService, DepartmentService, FileService, MenuService (294 tests total across 17 test files)
- **Menu entity**: Database-driven menu tree with soft-delete support

### Changed
- **Frontend**: `api/client.ts` response interceptor now redirects to `/403` on 403 responses; `isTokenExpired` handles null `expiresAt` safely

## [0.2.0] - 2026-03-24

### Added
- **PostgreSQL + MikroORM**: Migrated from SQLite to PostgreSQL via MikroORM with proper entity definitions, migrations, and schema management
- **字典管理 (Dict)**: CRUD API + 前端页面，支持字典类型、字典项管理
- **操作日志 (AuditLog)**: 完整 CRUD + 审计拦截器，自动记录所有 CRUD 操作
- **文件管理 (File)**: 本地存储上传/删除 API，支持文件记录和引用计数
- **部门管理 (Department)**: 树形结构 CRUD，支持父子部门软删除
- **菜单权限 (MenuPermission)**: 基于角色的菜单路径权限管理
- **数据权限 (DataPermission)**: 行级数据权限控制，支持全部/本部门/本人/自定义范围
- **在线用户 (OnlineUser)**: 内存 Map 管理在线用户状态
- **通知管理 (Notification)**: 通知发送/标记已读，支持多种通知类型
- **定时任务 (ScheduledTask)**: Cron 表达式调度任务执行，内置清理旧日志和统计任务
- **Swagger 文档**: @nestjs/swagger 集成 API 文档

### Fixed
- MenuPermission 软删除筛选修复
- TypeScript 编译错误全修复 (field→fieldName, filter→filters)
- NestJS 异常标准化 (Error → BadRequestException/NotFoundException)
- JSON.parse 错误处理完善
- 消除 AuthService → UserService 跨模块调用违反 (通过 EM 直接查询 User entity)
- 移除 RoleModule 中死掉的 UserModule 导入
- 删除 core/shared/ 含糊职责模块，菜单逻辑迁入 MenuService
- 移除 task-executor.ts 中未使用的 AuditLogService 死导入

## [0.1.3] - 2026-03-23

### Added
- **Role management UI**: `RoleList.vue` with table, search/pagination, create/edit dialog, and permission checkbox group
- **Role management API**: `GET/POST/PUT/DELETE /role` endpoints with JWT auth + admin role guard on write operations
- **Role entity**: SQLite `roles` table (id, name, code, description, permissions, enabled) seeded with default admin/user roles

### Fixed
- Race condition in role creation: concurrent POST requests with same code now return a clean error instead of unhandled 500

## [0.1.2] - 2026-03-23

### Security
- **HIGH**: Replaced plaintext password storage with bcrypt hashing (cost factor 10) for user passwords at rest
- **HIGH**: Replaced `Date.now().toString()` user IDs with `crypto.randomUUID()` for proper UUID entropy
- **HIGH**: Added role-based access control: `POST/PUT/DELETE /user` endpoints now require `admin` role via `RolesGuard`
- **HIGH**: Moved JWT signing secret from hardcoded fallback to `process.env.JWT_SECRET` environment variable
- **HIGH**: Seed admin password now stored as bcrypt hash instead of plaintext
- **MEDIUM**: Added `AuthGuard` to extract and validate JWT from `Authorization: Bearer` header on all `/user` endpoints

### Changed
- Refactored token storage to single source of truth in Pinia `useUserStore` — `client.ts` now reads from store instead of duplicating localStorage access

### Added
- Backend plugin system: `registerModules()` now maintains a registry of module entities and menu items for future MikroORM integration and dynamic menu building

## [0.1.1] - 2026-03-23

### Changed
- Refactored `user.ts` store: replaced plain token string with structured `TokenInfo` interface (JWT-compatible with `accessToken`, `expiresAt`, `refreshToken`)
- Added token expiry checking with 30s clock-skew buffer via `isTokenExpired()` helper
- Added localStorage helpers (`getStoredToken`, `setStoredToken`, `removeStoredToken`) with try-catch error handling
- Replaced duplicate `MenuItem`, `TabItem`, `UserInfo`, `LoginResult` type definitions with single shared `types.ts`
- Replaced O(n) menu title lookup with O(1) `Map`-based `menuPathMap` computed property
- Refactored `403.vue` and `404.vue` as thin wrappers around new shared `ErrorPage.vue` component

### Added
- Added tab right-click context menu (close current / close other / close all)
- Added `v-if="isMobile"` conditional rendering for mobile drawer instead of CSS `display:none`
- Added `contextMenuVisible`, `contextMenuTarget`, `tabContextMenuRef` state for tab context menu
- Added mobile breakpoint detection via `matchMedia` with change listener

### Fixed
- Fixed potential localStorage errors by wrapping all storage operations in try-catch
- Fixed missing error handling in `login()` and `fetchUserInfo()` with try-catch blocks
