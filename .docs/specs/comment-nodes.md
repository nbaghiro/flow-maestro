# Comment Node Technical Specification

## Overview

This specification describes the implementation of a **Comment Node** feature for the FlowMaestro workflow builder. Comment nodes act as sticky notes that users can place anywhere on the canvas to annotate and explain different parts of their workflow.

### Goals

- Allow users to add visual annotations to workflows without affecting execution
- Provide basic rich text formatting for readable notes
- Support customizable background colors for visual organization
- Keep the UI lightweight with an inline toolbar (no side panel configuration)

### Non-Goals

- Comment nodes do NOT participate in workflow execution
- Comment nodes do NOT have connection handles
- Comment nodes are NOT listed in the NodeLibrary sidebar

---

## User Stories

1. **As a workflow author**, I want to add explanatory notes to complex workflow sections so that other team members can understand my design decisions.

2. **As a workflow reviewer**, I want to see color-coded comments that highlight different concerns (warnings in red, tips in green, etc.).

3. **As a power user**, I want to quickly create a comment by pressing a keyboard shortcut without navigating through menus.

4. **As a workflow author**, I want to format my comments with bold, italic, and bullet lists for better readability.

---

## Technical Architecture

### Component Hierarchy

```
WorkflowCanvas
├── CommentNode (React Flow custom node)
│   ├── Content area (contentEditable div)
│   └── CommentNodeToolbar (Radix Popover - appears on selection)
│       ├── Formatting buttons (Bold, Italic, Underline, List)
│       └── ColorPalette (preset color selector)
└── useKeyboardShortcuts (N key handler)
```

### Data Flow

```
User presses N key
    ↓
useKeyboardShortcuts detects keypress
    ↓
workflowStore.addNode() called with type: "comment"
    ↓
React Flow renders CommentNode at canvas center
    ↓
User clicks node → toolbar appears
    ↓
User edits content/color → workflowStore.updateNode()
    ↓
On save → workflow definition persisted with comment nodes in nodes Record
```

---

## Data Structures

### CommentNodeConfig Interface

Add to `shared/src/types.ts`:

```typescript
export interface CommentNodeConfig {
    content: string; // HTML string for rich text content
    backgroundColor: string; // Hex color code (e.g., "#FEF3C7")
    textColor?: string; // Optional text color, defaults to dark gray
}
```

### React Flow Node Data

The comment node uses React Flow's standard node structure:

```typescript
interface CommentNodeData {
    label: string; // Not displayed, but required by React Flow
    content: string; // HTML content
    backgroundColor: string; // Background color hex
    textColor?: string; // Text color hex
}
```

### Default Values

```typescript
const DEFAULT_COMMENT_CONFIG: CommentNodeConfig = {
    content: "",
    backgroundColor: "#FEF3C7", // Light yellow (default sticky note color)
    textColor: "#1F2937" // Gray-800
};

const DEFAULT_COMMENT_STYLE = {
    width: 200,
    height: 150,
    minWidth: 120,
    minHeight: 80
};
```

---

## Component Specifications

### 1. CommentNode (`frontend/src/canvas/nodes/CommentNode.tsx`)

A custom React Flow node that does NOT extend BaseNode.

**Props:**

```typescript
interface CommentNodeProps extends NodeProps<CommentNodeData> {
    // Standard React Flow NodeProps
    id: string;
    data: CommentNodeData;
    selected: boolean;
    dragging: boolean;
}
```

**Visual Design:**

- Rounded corners (8px border-radius)
- Subtle shadow when not selected
- Prominent shadow + ring when selected
- No header bar (unlike BaseNode)
- No connection handles (input/output)
- Resize handle in bottom-right corner (reuse pattern from BaseNode)

**Behavior:**

- Single click: Select node, show toolbar
- Double click: Focus content for editing
- Drag: Move node on canvas
- Resize: Drag corner handle to resize

**Content Editing:**

- Use `contentEditable` div for inline editing
- Capture `onInput` to sync content to store
- Support basic HTML tags: `<b>`, `<i>`, `<u>`, `<ul>`, `<li>`
- Prevent default drag behavior when editing text

**Implementation Notes:**

```typescript
import { memo, useRef, useCallback } from "react";
import { NodeProps, NodeResizeControl } from "reactflow";
import { useWorkflowStore } from "../../stores/workflowStore";
import { CommentNodeToolbar } from "./CommentNodeToolbar";

function CommentNode({ id, data, selected }: NodeProps<CommentNodeData>) {
    const contentRef = useRef<HTMLDivElement>(null);
    const updateNode = useWorkflowStore((state) => state.updateNode);

    const handleContentChange = useCallback(() => {
        if (contentRef.current) {
            updateNode(id, { content: contentRef.current.innerHTML });
        }
    }, [id, updateNode]);

    return (
        <div
            className={cn(
                "rounded-lg p-3 cursor-move transition-shadow",
                selected ? "ring-2 ring-blue-500 shadow-lg" : "shadow-md"
            )}
            style={{ backgroundColor: data.backgroundColor }}
        >
            {selected && (
                <CommentNodeToolbar
                    nodeId={id}
                    contentRef={contentRef}
                    backgroundColor={data.backgroundColor}
                />
            )}

            <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                onBlur={handleContentChange}
                className="outline-none min-h-[60px] text-sm"
                style={{ color: data.textColor || "#1F2937" }}
                dangerouslySetInnerHTML={{ __html: data.content }}
            />

            <NodeResizeControl
                minWidth={120}
                minHeight={80}
                // Style the resize handle
            />
        </div>
    );
}

export default memo(CommentNode);
```

---

### 2. CommentNodeToolbar (`frontend/src/canvas/nodes/CommentNodeToolbar.tsx`)

A floating toolbar that appears when a comment node is selected.

**Position:** Above the node, horizontally centered

**Components:**

1. **Formatting Buttons:**
    - Bold (B) - wraps selection in `<b>` tags
    - Italic (I) - wraps selection in `<i>` tags
    - Underline (U) - wraps selection in `<u>` tags
    - Bullet List - wraps lines in `<ul><li>` tags

2. **Color Picker Trigger:**
    - Small color swatch showing current color
    - Opens ColorPalette popover on click

**Implementation:**

```typescript
import { Bold, Italic, Underline, List, Palette } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { ColorPalette } from "../../components/common/ColorPalette";

interface CommentNodeToolbarProps {
    nodeId: string;
    contentRef: React.RefObject<HTMLDivElement>;
    backgroundColor: string;
}

export function CommentNodeToolbar({
    nodeId,
    contentRef,
    backgroundColor
}: CommentNodeToolbarProps) {
    const updateNode = useWorkflowStore((state) => state.updateNode);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
    };

    const handleColorChange = (color: string) => {
        updateNode(nodeId, { backgroundColor: color });
    };

    return (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-lg border px-2 py-1">
            <ToolbarButton onClick={() => execCommand("bold")} icon={Bold} title="Bold" />
            <ToolbarButton onClick={() => execCommand("italic")} icon={Italic} title="Italic" />
            <ToolbarButton onClick={() => execCommand("underline")} icon={Underline} title="Underline" />
            <ToolbarButton onClick={() => execCommand("insertUnorderedList")} icon={List} title="Bullet List" />

            <div className="w-px h-5 bg-gray-200 mx-1" /> {/* Divider */}

            <Popover.Root>
                <Popover.Trigger asChild>
                    <button
                        className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400"
                        style={{ backgroundColor }}
                        title="Change color"
                    />
                </Popover.Trigger>
                <Popover.Portal>
                    <Popover.Content sideOffset={8} className="z-50">
                        <ColorPalette
                            selectedColor={backgroundColor}
                            onSelect={handleColorChange}
                        />
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </div>
    );
}

function ToolbarButton({ onClick, icon: Icon, title }: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}) {
    return (
        <button
            onClick={onClick}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}
```

---

### 3. ColorPalette (`frontend/src/components/common/ColorPalette.tsx`)

A reusable preset color picker component.

**Preset Colors (10 colors):**

```typescript
const PRESET_COLORS = [
    { name: "Yellow", hex: "#FEF3C7" }, // Default sticky note
    { name: "Orange", hex: "#FFEDD5" },
    { name: "Red", hex: "#FEE2E2" },
    { name: "Pink", hex: "#FCE7F3" },
    { name: "Purple", hex: "#F3E8FF" },
    { name: "Blue", hex: "#DBEAFE" },
    { name: "Cyan", hex: "#CFFAFE" },
    { name: "Green", hex: "#D1FAE5" },
    { name: "Gray", hex: "#F3F4F6" },
    { name: "White", hex: "#FFFFFF" }
];
```

**Implementation:**

```typescript
interface ColorPaletteProps {
    selectedColor: string;
    onSelect: (color: string) => void;
}

export function ColorPalette({ selectedColor, onSelect }: ColorPaletteProps) {
    return (
        <div className="bg-white rounded-lg shadow-lg border p-2 grid grid-cols-5 gap-1.5">
            {PRESET_COLORS.map((color) => (
                <button
                    key={color.hex}
                    onClick={() => onSelect(color.hex)}
                    className={cn(
                        "w-7 h-7 rounded-md border-2 transition-transform hover:scale-110",
                        selectedColor === color.hex
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                />
            ))}
        </div>
    );
}
```

---

## File Modifications

### 1. WorkflowCanvas.tsx

**Add comment to nodeTypes:**

```typescript
import CommentNode from "./nodes/CommentNode";

const nodeTypes = {
    // ... existing nodes
    comment: CommentNode
};
```

**Add comment node creation function:**

```typescript
const createCommentNode = useCallback(() => {
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

    const newNode: Node = {
        id: `comment-${Date.now()}`,
        type: "comment",
        position: { x: centerX - 100, y: centerY - 75 }, // Center the 200x150 node
        data: {
            label: "Comment",
            content: "",
            backgroundColor: "#FEF3C7"
        },
        style: { width: 200, height: 150 }
    };

    addNode(newNode);
    setSelectedNode(newNode.id);
}, [reactFlowInstance, addNode, setSelectedNode]);
```

### 2. useKeyboardShortcuts.ts

**Add N key handler:**

```typescript
// Inside the keydown handler, add:
case "n":
case "N":
    if (!isInputFocused) {
        e.preventDefault();
        onCreateComment?.();  // New callback prop
    }
    break;
```

**Update hook signature:**

```typescript
interface UseKeyboardShortcutsOptions {
    // ... existing options
    onCreateComment?: () => void;
}
```

### 3. NodeInspector.tsx

**Skip rendering for comment nodes:**

```typescript
// At the start of the component:
if (selectedNodeData?.type === "comment") {
    return null; // No inspector panel for comments
}
```

### 4. NodeLibrary.tsx

**No changes needed** - comment nodes are intentionally excluded from the library.

### 5. Workflow Validation (Backend)

**Update `workflow-schemas.ts`:**

The existing schema already supports comment nodes since `workflowNodeSchema` uses:

```typescript
config: z.record(z.any()); // Flexible - accepts CommentNodeConfig
```

No backend changes required for basic functionality.

---

## Keyboard Shortcuts

| Key                    | Action                                   | Condition                           |
| ---------------------- | ---------------------------------------- | ----------------------------------- |
| `N`                    | Create new comment node at canvas center | Canvas focused, not typing in input |
| `Delete` / `Backspace` | Delete selected comment                  | Comment node selected               |
| `Cmd+C` / `Ctrl+C`     | Copy comment node                        | Comment node selected               |
| `Cmd+V` / `Ctrl+V`     | Paste comment node                       | Clipboard has comment               |
| `Cmd+D` / `Ctrl+D`     | Duplicate comment node                   | Comment node selected               |
| `Escape`               | Deselect / exit edit mode                | Comment selected or editing         |

---

## Styling Specifications

### Comment Node Appearance

```css
/* Base state */
.comment-node {
    border-radius: 8px;
    padding: 12px;
    min-width: 120px;
    min-height: 80px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: move;
}

/* Selected state */
.comment-node--selected {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    ring: 2px solid #3b82f6;
}

/* Content area */
.comment-node__content {
    font-size: 14px;
    line-height: 1.5;
    outline: none;
    min-height: 60px;
}

/* Resize handle */
.comment-node__resize-handle {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 12px;
    height: 12px;
    cursor: se-resize;
    opacity: 0.5;
}
```

### Toolbar Appearance

```css
.comment-toolbar {
    position: absolute;
    top: -48px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    background: white;
    border-radius: 8px;
    padding: 4px 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid #e5e7eb;
}
```

---

## Implementation Steps

### Phase 1: Core Node Component

1. Create `CommentNode.tsx` with basic rendering (no toolbar yet)
2. Add `comment` type to `nodeTypes` in WorkflowCanvas
3. Test: Manually add a comment node to verify rendering

### Phase 2: Keyboard Shortcut

4. Add `onCreateComment` callback to `useKeyboardShortcuts`
5. Implement `createCommentNode` function in WorkflowCanvas
6. Wire up N key to create comment at canvas center
7. Test: Press N to create comment node

### Phase 3: Content Editing

8. Add `contentEditable` div to CommentNode
9. Implement content sync with workflowStore
10. Test: Edit text in comment node, verify persistence

### Phase 4: Toolbar - Formatting

11. Create `CommentNodeToolbar.tsx` with formatting buttons
12. Implement `document.execCommand` for bold/italic/underline/list
13. Position toolbar above selected node
14. Test: Select comment, use formatting buttons

### Phase 5: Toolbar - Color Picker

15. Create `ColorPalette.tsx` component
16. Add color picker to toolbar using Radix Popover
17. Implement color change handler
18. Test: Change comment background color

### Phase 6: Polish & Edge Cases

19. Add resize handle functionality
20. Update NodeInspector to skip comment nodes
21. Handle copy/paste/duplicate for comment nodes
22. Test keyboard shortcuts (delete, copy, paste, duplicate)
23. Test workflow save/load with comment nodes

---

## Testing Considerations

### Unit Tests

- CommentNode renders with correct background color
- ColorPalette calls onSelect with correct color
- Toolbar buttons trigger correct execCommand

### Integration Tests

- N key creates comment at canvas center
- Comment content persists after edit
- Comment color persists after change
- Comment nodes save/load with workflow
- Comment nodes excluded from workflow execution

### Manual Testing Checklist

- [ ] Create comment with N key
- [ ] Edit text content
- [ ] Apply bold, italic, underline formatting
- [ ] Create bullet list
- [ ] Change background color
- [ ] Resize comment node
- [ ] Delete comment node
- [ ] Copy/paste comment node
- [ ] Save workflow with comments
- [ ] Load workflow with comments
- [ ] Execute workflow (comments should not affect execution)

---

## Future Enhancements (V2)

These features are out of scope for initial implementation but could be added later:

1. **Optional connection handles** - Toggle to visually link comments to specific nodes
2. **Markdown support** - Parse markdown syntax instead of HTML formatting
3. **Comment threading** - Reply chains on comments
4. **Mentions** - @mention team members in comments
5. **Comment visibility toggle** - Show/hide all comments on canvas
6. **Comment search** - Find comments by content
7. **Export comments** - Generate documentation from comments
8. **Full color picker** - HSL/RGB picker for custom colors

---

## Appendix: File Summary

| File                                               | Action | Description                     |
| -------------------------------------------------- | ------ | ------------------------------- |
| `frontend/src/canvas/nodes/CommentNode.tsx`        | Create | Main comment node component     |
| `frontend/src/canvas/nodes/CommentNodeToolbar.tsx` | Create | Inline formatting toolbar       |
| `frontend/src/components/common/ColorPalette.tsx`  | Create | Preset color picker             |
| `frontend/src/canvas/WorkflowCanvas.tsx`           | Modify | Add nodeType, create function   |
| `frontend/src/hooks/useKeyboardShortcuts.ts`       | Modify | Add N key handler               |
| `frontend/src/canvas/panels/NodeInspector.tsx`     | Modify | Skip comment type               |
| `shared/src/types.ts`                              | Modify | Add CommentNodeConfig interface |
