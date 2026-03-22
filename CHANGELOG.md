# Changelog

All notable changes to this project will be documented in this file.

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
