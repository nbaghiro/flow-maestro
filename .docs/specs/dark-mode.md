# Dark Mode Implementation Specification

## Overview

FlowMaestro has partial dark mode infrastructure in place:

- Tailwind configured with `darkMode: ["class"]`
- CSS variables defined for light and dark themes in `App.css`
- Semantic color tokens configured in `tailwind.config.js`
- Some components (StatusBadge, AppSidebar) already use dark: variants

This spec defines the work needed to complete dark mode support across the application.

**Configuration:**

- Theme toggle location: Settings page only
- Default theme: Light mode
- Canvas node colors: Muted with opacity (StatusBadge pattern)
- Scope: All pages including authentication

---

## Implementation Phases

### Phase 1: Theme State Management & UI

Create theme infrastructure and Settings page integration.

**New Files:**

- `frontend/src/stores/themeStore.ts` - Zustand store for theme state
- `frontend/src/components/ThemeProvider.tsx` - React provider component

**Modified Files:**

- `frontend/src/pages/Settings.tsx` - Add theme selector UI
- `frontend/src/App.tsx` - Wrap with ThemeProvider

**Theme Store Interface:**

```typescript
interface ThemeStore {
    theme: "light" | "dark" | "system";
    effectiveTheme: "light" | "dark";
    setTheme: (theme: "light" | "dark" | "system") => void;
}
```

**Responsibilities:**

- Follow existing `workflowStore.ts` pattern (Zustand with set/get)
- Initialize from localStorage (key: "theme", default: "light")
- Detect system preference via `window.matchMedia("(prefers-color-scheme: dark)")`
- Listen for system preference changes when theme is "system"
- Apply `.dark` class to `document.documentElement` when effectiveTheme is "dark"

**ThemeProvider Responsibilities:**

- Initialize theme on mount
- Prevent flash of wrong theme (FOUT)
- Sync effectiveTheme with DOM class

**Settings Page Updates:**

- Replace "Theme" placeholder text (line 10) with actual theme selector
- Create theme section with 3 radio options: Light / Dark / System
- Show current selection
- Use semantic tokens (bg-card, text-foreground, border-border)

---

### Phase 2: Core UI Components

Convert foundational components to support dark mode.

**Files to Modify:**

- `frontend/src/components/common/Dialog.tsx`
- `frontend/src/components/common/ConfirmDialog.tsx`
- `frontend/src/components/common/Toast.tsx`
- `frontend/src/components/common/PageHeader.tsx`
- `frontend/src/components/common/EmptyState.tsx`
- `frontend/src/components/common/Select.tsx`
- `frontend/src/components/common/Tooltip.tsx`

**Dialog Component Conversions:**

- Line 66: `bg-white` → `bg-card`
- Line 83: `border-gray-200` → `border-border`
- Line 92: `text-gray-900` → `text-foreground`
- Line 95: `text-gray-600` → `text-muted-foreground`
- Line 104: `hover:bg-gray-50` → `hover:bg-muted`

**Tooltip Component:**
Currently uses `bg-gray-900 text-white`. Options:

- Change to `bg-popover text-popover-foreground`, OR
- Add dark variant: `bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900`

**Reference:** `StatusBadge.tsx` already implements dark mode correctly - use as pattern.

---

### Phase 3: Layout Components

Ensure app shell supports dark mode.

**Files to Modify:**

- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/layout/AppSidebar.tsx`
- `frontend/src/components/layout/Breadcrumbs.tsx`

**AppLayout:**

- Line 22: `bg-gray-50` → `bg-background`

**AppSidebar:**

- Already has dark variant on line 194 for badge
- Update hover states: `hover:bg-gray-100` → `hover:bg-muted`

---

### Phase 4: Page Components (Tier 1)

Convert most-used pages first.

**Files to Modify:**

- `frontend/src/pages/Workflows.tsx`
- `frontend/src/pages/FlowBuilder.tsx`
- `frontend/src/pages/Settings.tsx` (partially done in Phase 1)
- `frontend/src/pages/Login.tsx`

**Standard Conversions:**

- Page backgrounds: `bg-white/bg-gray-50` → `bg-background`
- Card backgrounds: `bg-white` → `bg-card`
- Text colors: `text-gray-*` → semantic tokens
- Borders: `border-gray-*` → `border-border`

---

### Phase 5: Canvas Components (React Flow)

Update workflow canvas and all node types.

**Files to Modify:**

- `frontend/src/canvas/nodes/BaseNode.tsx` (CRITICAL - affects all 24 node types)
- `frontend/src/canvas/panels/NodeLibrary.tsx`
- `frontend/src/canvas/panels/NodeInspector.tsx`
- `frontend/src/App.css` (lines 61-145 for React Flow custom styles)

**BaseNode Category Colors:**

```typescript
// AI category (blue)
iconBg: "bg-blue-500/10 dark:bg-blue-400/20";
iconColor: "text-blue-600 dark:text-blue-400";

// Logic category (purple)
iconBg: "bg-purple-500/10 dark:bg-purple-400/20";
iconColor: "text-purple-600 dark:text-purple-400";

// Data category (green)
iconBg: "bg-green-500/10 dark:bg-green-400/20";
iconColor: "text-green-600 dark:text-green-400";

// Integration category (orange)
iconBg: "bg-orange-500/10 dark:bg-orange-400/20";
iconColor: "text-orange-600 dark:text-orange-400";

// Communication category (pink)
iconBg: "bg-pink-500/10 dark:bg-pink-400/20";
iconColor: "text-pink-600 dark:text-pink-400";
```

**BaseNode Status Indicators:**

```typescript
idle: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
}
```

**React Flow Custom CSS:**
Add dark variants for node borders:

```css
.dark .react-flow__node.selected .node-ai-category {
    @apply !border-blue-400;
}
```

---

### Phase 6: Page Components (Tier 2)

Convert remaining main pages.

**Files to Modify:**

- `frontend/src/pages/Agents.tsx`
- `frontend/src/pages/AgentBuilder.tsx`
- `frontend/src/pages/Connections.tsx`
- `frontend/src/pages/KnowledgeBases.tsx`
- `frontend/src/pages/KnowledgeBaseDetail.tsx`

Apply standard conversions (see Phase 4).

---

### Phase 7: Authentication Pages

Apply dark mode to all auth pages.

**Files to Modify:**

- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/ForgotPassword.tsx`
- `frontend/src/pages/ResetPassword.tsx`
- `frontend/src/pages/VerifyEmail.tsx`

**Focus Areas:**

- Auth card backgrounds → `bg-card`
- Form inputs and labels → semantic tokens
- Ensure good contrast for error messages

---

### Phase 8: Feature-Specific Components

Convert remaining feature components.

**Component Groups:**

- Knowledge Base components (7 files in `components/knowledgebases/`)
- Connection components (9 files in `components/connections/`)
- Agent components (8 files in `components/agents/`)
- Execution components (4 files in `components/execution/`)
- Trigger components (3 files in `components/triggers/`)
- Template components (6 files in `components/templates/`)

---

### Phase 9: Remaining Components

Handle edge cases and remaining components.

**Files to Modify:**

- `frontend/src/pages/Analytics.tsx`
- `frontend/src/pages/Templates.tsx`
- `frontend/src/pages/Account.tsx`
- `frontend/src/pages/Workspace.tsx`
- Config panels in `frontend/src/canvas/panels/configs/` (20+ files)
- Miscellaneous components (EmailVerificationBanner, UserDropdown, etc.)

---

## Color Conversion Reference

### Master Conversion Table

| Current Class       | Semantic Token          | Usage Context                       |
| ------------------- | ----------------------- | ----------------------------------- |
| `bg-white`          | `bg-card`               | Cards, modals, panels, dialogs      |
| `bg-white`          | `bg-background`         | Page backgrounds                    |
| `bg-gray-50`        | `bg-background`         | Page backgrounds                    |
| `bg-gray-100`       | `bg-muted`              | Subtle backgrounds, disabled states |
| `text-gray-900`     | `text-foreground`       | Primary text, headings              |
| `text-gray-700`     | `text-foreground`       | Body text                           |
| `text-gray-600`     | `text-muted-foreground` | Secondary text, labels              |
| `text-gray-500`     | `text-muted-foreground` | Tertiary text, placeholders         |
| `border-gray-200`   | `border-border`         | Default borders                     |
| `border-gray-300`   | `border-border`         | Emphasized borders                  |
| `hover:bg-gray-50`  | `hover:bg-muted`        | Hover states on light backgrounds   |
| `hover:bg-gray-100` | `hover:bg-accent`       | Stronger hover emphasis             |

### Status Colors (StatusBadge Pattern)

Keep colored indicators with dark variants:

```typescript
// Success/Active (Green)
className = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";

// Error/Failed (Red)
className = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

// Warning (Yellow)
className = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

// Info (Blue)
className = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

// Neutral (Gray)
className = "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
```

### Canvas Category Colors (Muted Opacity Pattern)

Use opacity-based colors for better dark mode appearance:

```typescript
// AI (Blue)
iconBg: "bg-blue-500/10 dark:bg-blue-400/20";
iconColor: "text-blue-600 dark:text-blue-400";

// Logic (Purple)
iconBg: "bg-purple-500/10 dark:bg-purple-400/20";
iconColor: "text-purple-600 dark:text-purple-400";

// Data (Green)
iconBg: "bg-green-500/10 dark:bg-green-400/20";
iconColor: "text-green-600 dark:text-green-400";

// Integration (Orange)
iconBg: "bg-orange-500/10 dark:bg-orange-400/20";
iconColor: "text-orange-600 dark:text-orange-400";

// Communication (Pink)
iconBg: "bg-pink-500/10 dark:bg-pink-400/20";
iconColor: "text-pink-600 dark:text-pink-400";
```

---

## Critical Files

These files should be reviewed before implementation:

1. **`frontend/src/stores/workflowStore.ts`**
    - Reference for Zustand pattern used in FlowMaestro
    - Follow this structure for themeStore.ts

2. **`frontend/src/canvas/nodes/BaseNode.tsx`**
    - Most complex component with 10+ hardcoded colors
    - Affects all 24 node types
    - Critical for canvas dark mode

3. **`frontend/src/components/common/StatusBadge.tsx`**
    - Already implements dark mode correctly
    - Reference pattern for status colors
    - Shows exact syntax to use

4. **`frontend/src/App.css`**
    - CSS variables for light/dark themes (lines 6-50)
    - React Flow custom styles (lines 61-145)
    - Central theming configuration

5. **`frontend/tailwind.config.js`**
    - Semantic color token configuration
    - Shows how tokens map to CSS variables

---

## Technical Notes

### Existing Infrastructure

**CSS Variables (App.css):**

Light mode (`:root`):

```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;
```

Dark mode (`.dark`):

```css
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--primary: 210 40% 98%;
--muted: 217.2 32.6% 17.5%;
--border: 217.2 32.6% 17.5%;
```

**Semantic Tokens (tailwind.config.js):**

- background, foreground
- card, card-foreground
- popover, popover-foreground
- primary, primary-foreground
- secondary, secondary-foreground
- muted, muted-foreground
- accent, accent-foreground
- destructive, destructive-foreground
- border, input, ring

All colors use HSL CSS variables. Dark theme uses dark blue-grays (222.2 hue) as foundation.

### Scope

**Total Files Requiring Updates:** ~71 files with hardcoded colors

- 18 pages
- ~75 components
- 24 canvas node types (inherit from BaseNode)

**Existing Dark Mode Support:**

- 12 files already have partial dark: variants
- StatusBadge shows correct pattern
- AppSidebar has dark variant for badge
