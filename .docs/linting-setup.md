# Linting and Formatting Setup

This document explains the linting, formatting, and type checking tools used in the FlowMaestro codebase.

---

## Overview

FlowMaestro uses a modern TypeScript development stack with automated code quality enforcement at multiple levels:

1. **Editor Level** (.editorconfig) - IDE consistency
2. **Linting Level** (ESLint) - Code quality and bug prevention
3. **Formatting Level** (Prettier) - Code style consistency
4. **Type Level** (TypeScript) - Type safety
5. **Git Level** (Husky + lint-staged) - Pre-commit enforcement

---

## Tools and Their Purposes

### 1. EditorConfig

**File:** `.editorconfig`

**Purpose:** Provides IDE-level consistency before any linters run.

**What it does:**

- Ensures consistent indentation (4 spaces)
- Sets line endings (LF/Unix)
- Sets character encoding (UTF-8)
- Trims trailing whitespace
- Works across all editors (VS Code, WebStorm, Vim, etc.)

**When it runs:** Automatically in your IDE as you type

---

### 2. ESLint

**Files:** `.eslintrc.json`, `package.json` (devDependencies)

**Purpose:** Finds bugs, enforces patterns, and ensures code quality.

**What it checks:**

- Logic errors (unused variables, unreachable code)
- TypeScript-specific issues (proper typing, no `any`)
- Code patterns and best practices
- Import organization and sorting
- Formatting (via Prettier integration)

**Plugins used:**

- `@typescript-eslint/parser` - Parses TypeScript syntax
- `@typescript-eslint/eslint-plugin` - TypeScript-specific rules
- `eslint-plugin-prettier` - Runs Prettier as ESLint rule
- `eslint-plugin-import` - Import/export validation and sorting

**Key rules:**

```json
{
    "quotes": ["error", "double"],
    "semi": ["error", "always"],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "import/order": "error" // Auto-sorts imports
}
```

**When it runs:**

- Pre-commit (via lint-staged)
- Manually: `npm run lint` or `npm run lint:fix`

---

### 3. Prettier

**Files:** `.prettierrc.json`, `.prettierignore`

**Purpose:** Enforces consistent code formatting (whitespace, quotes, etc.)

**What it formats:**

- Indentation (4 spaces)
- Quotes (double)
- Semicolons (always)
- Line length (100 chars max)
- Trailing commas (none)
- Arrow function parentheses (always)

**Configuration:**

```json
{
    "semi": true,
    "trailingComma": "none",
    "singleQuote": false,
    "printWidth": 100,
    "tabWidth": 4,
    "useTabs": false,
    "arrowParens": "always",
    "endOfLine": "lf"
}
```

**When it runs:**

- Integrated into ESLint (via eslint-plugin-prettier)
- Pre-commit for JSON/MD files (via lint-staged)
- Manually: `npm run format` or `npm run format:check`

**Why not run separately?** ESLint already runs Prettier for TypeScript files via `eslint-plugin-prettier`, so running Prettier separately would be redundant.

---

### 4. TypeScript

**Files:** `tsconfig.json`, `tsconfig.base.json` (per workspace)

**Purpose:** Type checking and compilation.

**What it checks:**

- Type correctness
- Null/undefined safety (strict mode)
- Unused locals and parameters
- Implicit returns
- Function type strictness

**Strict mode enabled:**

```json
{
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
}
```

**When it runs:**

- Pre-commit (via Husky)
- Manually: `npm run typecheck`
- During build: `npm run build`

---

### 5. Husky

**Files:** `.husky/pre-commit`

**Purpose:** Runs checks before git commits.

**What it does:**

- Runs lint-staged (lints only changed files)
- Runs TypeScript type checking (entire codebase)
- Prevents commits if checks fail

**Workflow:**

```
git commit
  ↓
Husky pre-commit hook
  ↓
lint-staged (on staged files only)
  ├─ TypeScript files → ESLint --fix (includes Prettier)
  └─ JSON/MD files → Prettier --write
  ↓
TypeScript type check (entire codebase)
  ↓
Commit succeeds (or fails)
```

**Version:** Husky 9.x (compatible with v10)

---

### 6. lint-staged

**File:** `package.json` (lint-staged config)

**Purpose:** Runs linters only on staged files for performance.

**Configuration:**

```json
{
    "*.{ts,tsx}": ["eslint --fix"],
    "*.{json,md}": ["prettier --write"]
}
```

**Why optimized:**

- TypeScript files: Only ESLint (which already runs Prettier)
- JSON/MD files: Only Prettier (no ESLint for these)
- Avoids redundant formatting passes

**When it runs:** Pre-commit (via Husky)

---

## Workflow Examples

### Developer Writing Code

1. **Typing in editor:**
    - EditorConfig ensures 4-space indentation, LF line endings
    - IDE may show ESLint warnings in real-time

2. **Saving file:**
    - IDE may auto-format via Prettier (if enabled)
    - No automated checks yet

3. **Git commit:**

    ```bash
    git add .
    git commit -m "feat: add new feature"
    ```

    **What happens:**
    - Husky runs `.husky/pre-commit` hook
    - lint-staged checks only staged files:
        - `.ts/.tsx` files → `eslint --fix` (auto-fixes issues)
        - `.json/.md` files → `prettier --write` (formats)
    - TypeScript runs `tsc --noEmit` (checks types on entire codebase)
    - If any check fails → commit is blocked
    - If all pass → commit succeeds

### Manual Commands

```bash
# Lint all TypeScript files (show issues)
npm run lint

# Lint and auto-fix all TypeScript files
npm run lint:fix

# Format all files with Prettier
npm run format

# Check formatting without changing files
npm run format:check

# Type check entire codebase
npm run typecheck

# Run all workspaces type checks
npm run typecheck --workspaces
```

---

## Tool Comparison Table

| Responsibility     | EditorConfig | ESLint        | Prettier   | TypeScript | Husky       | lint-staged  |
| ------------------ | ------------ | ------------- | ---------- | ---------- | ----------- | ------------ |
| **Indentation**    | ✅ IDE       | ✅ Lint       | ✅ Format  | ❌         | ❌          | ❌           |
| **Code Quality**   | ❌           | ✅ Primary    | ❌         | ⚠️ Some    | ❌          | ❌           |
| **Type Safety**    | ❌           | ❌            | ❌         | ✅ Primary | ❌          | ❌           |
| **Formatting**     | ⚠️ Basic     | ⚠️ Via Plugin | ✅ Primary | ❌         | ❌          | ❌           |
| **Automation**     | ❌           | ❌            | ❌         | ❌         | ✅ Triggers | ✅ Optimizes |
| **Import Sorting** | ❌           | ✅ Plugin     | ❌         | ❌         | ❌          | ❌           |

---

## Import Sorting

ESLint automatically sorts imports according to this order:

1. **Built-in modules** (Node.js core: `fs`, `path`, etc.)
2. **External modules** (npm packages: `react`, `express`, etc.)
3. **Internal modules** (`@flowmaestro/*` packages)
4. **Parent imports** (`../`)
5. **Sibling imports** (`./`)
6. **Index imports** (`./index`)
7. **Type imports** (`import type`)

**Alphabetized within each group**

**Example:**

```typescript
// ✅ Correct order (auto-sorted by ESLint)
import { readFile } from "fs"; // Built-in
import { FastifyInstance } from "fastify"; // External
import type { JsonValue } from "@flowmaestro/shared"; // Internal
import { UserRepository } from "../repositories"; // Parent
import { validateInput } from "./validation"; // Sibling
```

**To auto-fix imports:**

```bash
npm run lint:fix
```

---

## Common Issues and Solutions

### Issue: "Prettier and ESLint are conflicting"

**Cause:** Both trying to format the same file differently

**Solution:** Already resolved! We use `eslint-config-prettier` to disable ESLint formatting rules, and `eslint-plugin-prettier` to run Prettier through ESLint.

---

### Issue: "Pre-commit hook is slow"

**Cause:** Running checks on entire codebase

**Solution:** Already optimized! `lint-staged` only checks staged files. TypeScript type checking still checks all files (necessary for type safety).

---

### Issue: "Import order errors after adding new imports"

**Cause:** ESLint `import/order` rule

**Solution:**

```bash
npm run lint:fix  # Auto-fixes import order
```

---

### Issue: "Type errors but ESLint passes"

**Cause:** ESLint doesn't do full type checking

**Solution:** Run TypeScript compiler:

```bash
npm run typecheck
```

---

### Issue: "Husky hook not running"

**Cause:** Husky not initialized or hook not executable

**Solution:**

```bash
# Reinstall Husky
npm install
npx husky install

# Make hook executable
chmod +x .husky/pre-commit
```

---

## File Organization

```
flowmaestro/
├── .editorconfig              # IDE consistency
├── .eslintrc.json             # ESLint config
├── .prettierrc.json           # Prettier config
├── .prettierignore            # Prettier exclusions
├── .husky/
│   └── pre-commit            # Pre-commit hook (v10 syntax)
├── package.json              # lint-staged config + scripts
├── tsconfig.base.json        # Base TypeScript config
├── backend/tsconfig.json     # Backend TS config
├── frontend/tsconfig.json    # Frontend TS config
└── shared/tsconfig.json      # Shared TS config
```

---

## Best Practices

1. **Always run `npm run lint:fix` before committing** (or let pre-commit do it)
2. **Never commit with `--no-verify`** unless absolutely necessary
3. **Fix type errors immediately** - Don't let them accumulate
4. **Use `_` prefix for intentionally unused variables** (e.g., `_ignored`)
5. **Let ESLint auto-fix imports** instead of manually organizing
6. **Trust the tools** - If ESLint/Prettier reformats your code, it's for consistency

---

## Updating Configuration

### To change indentation (e.g., 2 spaces instead of 4):

1. Update `.editorconfig`: `indent_size = 2`
2. Update `.prettierrc.json`: `"tabWidth": 2`
3. Run: `npm run format` to reformat all files

### To add new ESLint rules:

1. Edit `.eslintrc.json` rules section
2. Run: `npm run lint:fix` to apply
3. Commit changes: `git add .eslintrc.json && git commit -m "chore: update eslint rules"`

### To disable a rule for a specific file:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Code that needs 'any' type
/* eslint-enable @typescript-eslint/no-explicit-any */
```

---

## Summary

| Tool             | Purpose                   | When It Runs       |
| ---------------- | ------------------------- | ------------------ |
| **EditorConfig** | IDE consistency           | As you type        |
| **ESLint**       | Code quality + formatting | Pre-commit, manual |
| **Prettier**     | Code formatting           | Via ESLint, manual |
| **TypeScript**   | Type checking             | Pre-commit, build  |
| **Husky**        | Git hook automation       | Pre-commit         |
| **lint-staged**  | Performance optimization  | Pre-commit         |

**All tools work together to ensure:**

- ✅ Consistent code style across team
- ✅ Early bug detection
- ✅ Type safety
- ✅ Automated enforcement
- ✅ Fast pre-commit checks

---

## Need Help?

- **ESLint docs:** https://eslint.org/docs/latest/
- **Prettier docs:** https://prettier.io/docs/en/
- **TypeScript docs:** https://www.typescriptlang.org/docs/
- **Husky docs:** https://typicode.github.io/husky/
- **EditorConfig docs:** https://editorconfig.org/

For project-specific questions, ask the team or check other docs in `.docs/`.
