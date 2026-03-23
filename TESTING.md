# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

**Vitest** v4 — Vue 3 + TypeScript native test runner.

## Run Tests

```bash
cd apps/project-alpha
pnpm test        # run once
pnpm run test:watch  # watch mode
```

## Test Structure

```
apps/project-alpha/src/__tests__/
  ├── smoke.test.ts      # Setup verification
  └── user.test.ts       # User store & token tests
```

## Conventions

- **File naming**: `*.test.ts` or `*.test.vue`
- **Test location**: `src/__tests__/` directory
- **Assertion style**: Vitest `expect()` API
- **Environment**: `happy-dom` (DOM simulation without Chromium)
- **Globals**: enabled (`describe`, `it`, `expect`, `vi` are global)

## Test Layers

| Layer | What | Where |
|-------|------|-------|
| Unit tests | Pure functions, stores, types | `*.test.ts` |
| Component tests | Vue components rendering | `*.test.ts` or `*.test.vue` |
| Integration tests | API flows, auth sequences | `src/__tests__/` |

## Coverage Expectations

- **100% coverage** is the goal for new code
- When writing a new function, write a corresponding test
- When fixing a bug, write a regression test
- When adding error handling, write a test that triggers the error
- When adding a conditional (if/else, switch), write tests for **both** paths
- Never commit code that makes existing tests fail
