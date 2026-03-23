# Changelog

All notable changes to this project will be documented in this file.

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
