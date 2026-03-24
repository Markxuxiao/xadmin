# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

**Vitest** v1.6 — Vue 3 + TypeScript native test runner.

## Run Tests

```bash
# Frontend + app-level tests (happy-dom)
cd apps/project-alpha && pnpm test

# Backend core tests (node environment)
cd packages/core/backend && pnpm test
```

## Test Structure

```
packages/core/backend/__tests__/       # Backend core tests
  ├── helpers/test-db.ts               # Test ORM setup
  ├── audit-log.test.ts
  ├── auth-guard.test.ts
  ├── auth.service.test.ts
  ├── data-permission.test.ts
  ├── department.test.ts
  ├── dict.test.ts
  ├── file.test.ts
  ├── menu-permission.test.ts
  ├── menu.test.ts
  ├── notification.test.ts
  ├── online-user.test.ts
  ├── role-entity.test.ts
  ├── role.service.test.ts
  ├── row-transform.test.ts
  ├── scheduled-task.test.ts
  ├── user-entity.test.ts
  └── user.service.test.ts

apps/project-alpha/src/__tests__/       # App-level tests
  ├── smoke.test.ts                     # Setup verification
  └── user.test.ts                      # User store & token tests
```

## Conventions

- **File naming**: `*.test.ts` or `*.test.vue`
- **Assertion style**: Vitest `expect()` API
- **Environment**: `happy-dom` for frontend, `node` for backend
- **Globals**: enabled (`describe`, `it`, `expect`, `vi` are global)

## Test Layers

| Layer | What | Where | Environment |
|-------|------|-------|-------------|
| Backend unit tests | Services, guards, entities | `packages/core/backend/__tests__/` | `node` |
| Backend integration tests | Full request flows with test DB | `packages/core/backend/__tests__/` | `node` |
| Frontend unit tests | Pure functions, stores, types | `apps/project-alpha/src/__tests__/` | `happy-dom` |
| Component tests | Vue components rendering | `apps/project-alpha/src/__tests__/` | `happy-dom` |

## Coverage Expectations

- **100% coverage** is the goal for new code
- When writing a new function, write a corresponding test
- When fixing a bug, write a regression test
- When adding error handling, write a test that triggers the error
- When adding a conditional (if/else, switch), write tests for **both** paths
- Never commit code that makes existing tests fail
