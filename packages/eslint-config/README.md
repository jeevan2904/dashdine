# @dashdine/eslint-config

Shared ESLint configuration for the DashDine monorepo.

## Configs Available

| Config  | Use For                                    | Import Path                     |
| ------- | ------------------------------------------ | ------------------------------- |
| `base`  | Shared packages (types, utils, validators) | `@dashdine/eslint-config/base`  |
| `node`  | Backend services and BFF gateways          | `@dashdine/eslint-config/node`  |
| `react` | Frontend React applications                | `@dashdine/eslint-config/react` |

## Usage

In any package's `eslint.config.js`:

```javascript
// For a backend service:
export { default } from '@dashdine/eslint-config/node';

// For a frontend app:
export { default } from '@dashdine/eslint-config/react';

// For a shared package:
export { default } from '@dashdine/eslint-config/base';
```

## What's Enforced

### TypeScript Rules

- No `any` type (warn)
- No unused variables (error)
- Must await promises (error)
- Consistent type imports (error)
- Explicit return types on exports (warn)

### Import Rules

- Ordered imports: builtin → external → @dashdine → relative
- No duplicate imports
- Alphabetically sorted within groups

### Code Quality

- Strict equality (===) required
- No console.log (warn — use logger package)
- No eval()
- Prefer const over let
- Prefer template literals
