# Comment Node — Implementation Design

## 1. Overview

The Comment Node is a non-executable, UI-only node designed to let workflow authors annotate their canvas with notes, explanations, and visual markers. Unlike operational workflow nodes, the Comment Node does not participate in execution, validation, or downstream data flow. Its purpose is to improve clarity within complex workflows and provide a lightweight way for teams to communicate intent directly within the builder.

Comment Nodes are fully custom React Flow nodes that do NOT extend the standard BaseNode component and do NOT have connection handles. This allows the component to have a unique layout, inline rich-text editing, a floating formatting toolbar, customizable background colors, and flexible sizing without inheriting the constraints of execution nodes.

The implementation is focused on tight integration with the WorkflowCanvas, workflowStore, and keyboard shortcuts, while maintaining minimal coupling with the rest of the system. The node behaves like a sticky note: freely placed, editable, resizable, and visually distinct, but operationally isolated from the workflow engine.

## 2. Goals

- Enable users to add visual annotations directly on the workflow canvas to improve clarity, documentation, and team communication without leaving the builder.
- Provide an inline, lightweight editing experience using a contentEditable region that supports basic rich-text formatting (bold, italic, underline, lists).
- Allow users to visually distinguish comments through customizable background colors and optional text color adjustments.
- Support flexible node sizing via a resize handle so comments can adapt to short notes or longer explanations.
- Integrate seamlessly with existing workflowStore APIs for node creation, updates, persistence, copy/paste, and deletion.
- Ensure the Comment Node behaves as a first-class React Flow node while remaining isolated from execution logic, validation, and the NodeInspector panel.
- Provide keyboard shortcut support (e.g., “N”) to quickly create comments and maintain efficient workflow-building ergonomics.

## 3. Non-Goals

- The Comment Node does not participate in workflow execution, branching, data transformation, or any runtime logic within the engine.
- The node is not intended to send or receive data, interact with external services, or influence workflow outcomes.
- No NodeInspector configuration panel will be provided; all editing is done inline within the node itself.
- The Comment Node will not appear in the NodeLibrary and will not be treated as a selectable workflow step.
- The feature does not aim to provide full text-editing capabilities such as markdown parsing, advanced formatting, code blocks, or collaborative editing.
- The node is not designed to support connection handles, ports, or linking logic to other nodes.
- This implementation does not include comment-level permissions, visibility toggles, or user mentions.

## 4. Technical Architecture

The Comment Node is implemented as a fully custom React Flow node that bypasses the BaseNode component used by executable workflow nodes. This allows the component to define its own internal layout, editing behavior, and styling without inheriting logic intended for execution nodes.

The node integrates directly with the workflowStore for state management. All content, color changes, position, and size updates are synchronized through existing store actions such as `updateNode`, `addNode`, and `deleteNode`. This ensures Comment Nodes behave consistently with the rest of the system in terms of persistence, undo/redo history, and copy/paste operations.

Node creation is handled inside the WorkflowCanvas, which registers the `comment` type in `nodeTypes` and exposes a helper function (`createCommentNode`) used by keyboard shortcuts. When triggered, the canvas computes the current viewport center and inserts a new Comment Node at the calculated position.

Inline text editing is powered by a contentEditable element. The component emits updates to the store on `input` and `blur` events. A floating toolbar provides formatting actions by executing browser commands (such as, bold, italic, underline, unordered list) and updates the node’s data through store mutations.

The color picker is implemented using a Radix Popover and a predefined palette. Selecting a new color immediately updates the node’s `backgroundColor` in the workflowStore, which React Flow rerenders automatically.

The node uses React Flow’s `NodeResizeControl` for resizing, allowing dimensions to be changed dynamically while still enforcing minimum width and height constraints.

Importantly, the Comment Node is excluded from the NodeInspector and execution engine. The backend treats it as a passive data container with no execution semantics, and workflow validation bypasses it entirely. This ensures the feature adds UI utility without affecting runtime behavior.

## 5. Component Hierarchy

The Comment Node is composed of several UI and logic components that work together to provide editing, formatting, resizing, and creation behavior. The structure emphasizes a clear separation between the visual node, its internal editing surface, and supporting utilities such as keyboard shortcuts and formatting controls.

```
WorkflowCanvas
├── CommentNode (custom React Flow node)
│   ├── ContentArea (contentEditable div responsible for text input)
│   └── CommentNodeToolbar (floating formatting toolbar)
│       ├── FormattingButtons (Bold, Italic, Underline, List)
│       └── ColorPalette (preset color selector powered by Radix Popover)
└── useKeyboardShortcuts (handles creation via "N" key and other interactions)
```

This hierarchy shows the separation of responsibilities: the canvas manages creation and registration, the CommentNode handles rendering and editing, the toolbar manages formatting actions, and the keyboard shortcut system provides fast interaction for power users.

The Comment Node is composed of several UI and logic components that work together to provide editing, formatting, resizing, and creation behavior. The structure emphasizes a clear separation between the visual node, its internal editing surface, and supporting utilities such as keyboard shortcuts and formatting controls.

## 6. Data Flow

### 6.1 Node Creation

- The user presses the “N” key while the canvas is focused.
- `useKeyboardShortcuts` calls the `onCreateComment` callback.
- `WorkflowCanvas` invokes `createCommentNode()`, computes the current viewport center, and inserts a new Comment Node into the workflowStore via `addNode`.

### 6.2 Rendering

- React Flow detects the new node in the store.
- It renders the `CommentNode` component registered under `nodeTypes.comment`.
- Initial data (content, background color, size) is passed down through `node.data`.

### 6.3 Inline Editing

- The user types inside the contentEditable region.
- `onInput` and `onBlur` events trigger updates to workflowStore:
  `updateNode(id, { content: innerHTML })`.
- React Flow re-renders the Comment Node with updated content.

### 6.4 Formatting Actions

- When the user clicks a formatting button (bold, italic, underline, list), the toolbar runs a `document.execCommand` operation.
- The contentEditable region updates internally and triggers a store update on blur/input.

### 6.5 Color Updates

- The user selects a color from the ColorPalette (via Radix Popover).
- The palette calls `updateNode(id, { backgroundColor: newColor })`.
- React Flow immediately reflects the new color.

### 6.6 Resizing

- The user drags the `NodeResizeControl` handle.
- React Flow updates the node’s dimensions and emits `onResize` events internally.
- The updated width/height is stored in workflowStore.

### 6.7 Persistence & History

- All changes flow through workflowStore, ensuring:
    - undo/redo history tracking
    - persistence when the workflow is saved
    - compatibility with copy, paste, and delete operations.

### 6.8 Execution

- During workflow execution, Comment Nodes are ignored.
- The engine skips them entirely since they contain no operational config.

Comment Nodes are saved in the workflow definition like any other node.
During save, their content, colors, size, and position are serialized into the workflow JSON under the `config` field.
The backend persists this JSON structure without modification.
When the workflow is reloaded, the frontend reconstructs Comment Nodes from this saved configuration and renders them through the registered `comment` node type.

## 7. Data Structures

### 7.1 CommentNodeConfig (shared schema)

```typescript
export interface CommentNodeConfig {
    content: string; // HTML string for rich text
    backgroundColor: string; // Hex color code
    textColor?: string; // Optional text color override
}
```

### 7.2 React Flow Node Data

```typescript
interface CommentNodeData {
    label: string; // Required by React Flow but not displayed
    content: string; // Rich-text HTML content
    backgroundColor: string; // Background color for the node
    textColor?: string; // Optional text color
}
```

### 7.3 Default Values

```typescript
const DEFAULT_COMMENT_CONFIG: CommentNodeConfig = {
    content: "",
    backgroundColor: "#FEF3C7",
    textColor: "#1F2937"
};
```

### 7.4 WorkflowStore Node Shape

Comment Nodes use the same underlying node structure as other workflow nodes:

```typescript
interface WorkflowNode {
    id: string;
    type: string; // "comment"
    position: { x: number; y: number };
    data: CommentNodeData;
    style?: {
        width?: number;
        height?: number;
    };
}
```

### 7.5 Backend Representation

Comment Nodes are stored in the workflow definition as passive config records:

```typescript
{
  "id": "comment-12345",
  "type": "comment",
  "position": { "x": 300, "y": 200 },
  "config": {
    "content": "<p>Note here...</p>",
    "backgroundColor": "#FEF3C7"
  }
}
```

The backend accepts comment node configuration through the existing flexible
config: z.record(z.any()) schema without requiring additional validation rules.

## 8. Node Behavior & UX

The Comment Node is designed to behave like a lightweight, free-form annotation element within the canvas. Its interaction model prioritizes flexibility, immediacy, and minimal friction while ensuring visual clarity and consistency with the rest of the workflow builder.

### 8.1 Selection & Focus

- Clicking the node selects it and displays the floating toolbar.
- Double-clicking the content area enters text-edit mode and focuses the contentEditable region.
- Clicking outside the node or pressing Escape removes focus and hides the toolbar.

### 8.2 Inline Editing

- Text editing occurs directly within the content area using a contentEditable surface.
- HTML tags are applied for bold, italic, underline, and list formatting.
- The node dynamically grows or shrinks vertically based on content flow within resize constraints.

### 8.3 Formatting Toolbar

- The toolbar appears only when the node is selected.
- Formatting actions apply immediately to the user’s selected text.
- The toolbar repositions correctly during canvas zoom, pan, or drag events.

### 8.4 Visual Customization

- Background color updates instantly when a new color is selected.
- Text color adjusts automatically to maintain legibility.
- Styling uses rounded corners, soft shadows, and subtle transitions for a sticky-note feel.

### 8.5 Resizing Behavior

- Users resize the node via React Flow’s NodeResizeControl handle.
- Minimum width and height prevent collapsing into unusable dimensions.
- The text layout adapts fluidly to new dimensions.

### 8.6 Dragging & Positioning

- Dragging anywhere except the text surface moves the node across the canvas.
- While typing, drag behavior is disabled to prevent accidental movement.
- Position updates sync continuously to workflowStore.

### 8.7 UX Principles

- Interaction must feel lightweight, responsive, and unobtrusive.
- Use patterns familiar from common sticky-note applications.
- Avoid complex modals or configuration steps to maintain fast annotation flow.

## 9. Inspector Panel (If Applicable)

The Comment Node does not use the NodeInspector panel. All editing and configuration occurs inline within the node itself.

- No fields, schemas, or configuration options are displayed in the inspector for comment nodes.
- The inspector intentionally ignores comment nodes to avoid implying that they have executable or configurable behavior.
- Visual customization like color, text formatting, sizing is handled entirely through the node’s own UI components rather than through the inspector.
- This keeps the Comment Node lightweight and reinforces its role as a purely UI/annotation element.

## 10. Keyboard Shortcuts

### 10.1 Creation Shortcut

- Pressing the **“N”** key while the canvas is focused (NOT while typing) creates a new Comment Node.
- The shortcut is handled by `useKeyboardShortcuts`, which calls `onCreateComment`.
- The canvas computes the current viewport center and inserts the node at that position.

### 10.2 Editing Behavior

- When a Comment Node is selected, pressing **Enter** focuses the contentEditable area.
- Pressing **Escape** exits editing mode and hides the toolbar.

### 10.3 Interaction Constraints

- While typing inside the contentEditable region, global shortcuts (copy, paste, delete) defer to native browser behavior.
- Canvas-level keyboard shortcuts like delete node, duplicate node only apply when the Comment Node is _selected_ but **not actively editing**.

### 10.4 Consistency With Other Nodes

- The “N” shortcut follows the same pattern as other node-creation shortcuts (e.g., “A” for agent, “H” for HTTP, etc.).
- Comment Node shortcuts are intentionally lightweight to maintain fast annotation workflows.

## 11. Implementation Steps

### Phase 1 — Node Registration & Data Model

1. Add the `"comment"` entry to `nodeTypes` inside `WorkflowCanvas`.
2. Implement `createCommentNode()` to generate a node with default config, size, and position.
3. Define the `CommentNodeConfig` and `CommentNodeData` types in the shared schema.

### Phase 2 — CommentNode Component

4. Create `CommentNode.tsx` as a fully custom React Flow node.
5. Implement the contentEditable `ContentArea` with controlled update events.
6. Add the floating `CommentNodeToolbar` and wire formatting actions to the active contentEditable region.
7. Apply background color and text color through inline styles.

### Phase 3 — Toolbar & Formatting Logic

8. Implement formatting buttons such as bold, italic, underline, list using `document.execCommand`.
9. Add the Radix Popover color picker and integrate it with workflowStore updates.
10. Ensure toolbar visibility only when the node is selected.

### Phase 4 — Interaction & Behavior

11. Add drag constraints to disable movement while editing text.
12. Integrate React Flow’s `NodeResizeControl` for dynamic resizing.
13. Sync width/height changes to workflowStore.

### Phase 5 — Keyboard Shortcuts

14. Update `useKeyboardShortcuts` to include the “N” shortcut for comment creation.
15. Add Enter/Escape behavior to toggle between editing and selection modes.

### Phase 6 — Persistence & History

16. Ensure all updates (content, color, size, position) flow through workflowStore.
17. Verify compatibility with undo/redo, copy/paste, and delete operations.

### Phase 7 — Final Validation

18. Confirm the Comment Node is excluded from:
    - Execution engine
    - NodeInspector
    - Workflow validation rules
19. Test zoom, pan, and selection interactions for correct toolbar positioning.
20. Polish visual styling and finalize UX details.

```
frontend/
└── src/
    ├── canvas/
    │   ├── WorkflowCanvas.tsx               # Registers comment node & handles creation
    │   └── nodes/
    │       ├── BaseNode.tsx                 # Other operational nodes
    │       ├── AudioNode.tsx
    │       ├── HTTPNode.tsx
    │       ├── ...                          # (many other node types)
    │       └── CommentNode.tsx              # NEW – main React Flow renderer
    │
    ├── components/
    │   └── comment-node/
    │       ├── ContentArea.tsx              # contentEditable implementation
    │       ├── CommentNodeToolbar.tsx       # floating toolbar
    │       ├── FormattingButtons.tsx        # bold / italic / underline / lists
    │       └── ColorPalette.tsx             # Radix color picker component
    │
    ├── hooks/
    │   └── useKeyboardShortcuts.ts          # Add “N” for comment creation
    │
    ├── stores/
    │   ├── workflowStore.ts                 # updateNode(), addNode(), deleteNode()
    │   └── historyStore.ts                  # undo/redo integration
    │
    ├── types/
    │   └── nodes/
    │       └── comment.ts                   # CommentNodeConfig & CommentNodeData definitions
    │
    └── lib/
        └── workflowLayout.ts                # Position calculations (used by createCommentNode)
```

## 12. Validation & Edge Cases

### 12.1 Node Creation

- Prevent creation of a new Comment Node when the user is actively typing inside another comment’s contentEditable region.
- Ensure viewport-based placement never spawns nodes outside the visible canvas bounds.
- Enforce minimum width and height on creation to avoid zero-size or invisible nodes.

### 12.2 Inline Editing Edge Cases

- Ensure that pressing Delete or Backspace while editing text does not accidentally delete the entire node.
- Prevent React Flow drag events from firing while the contentEditable region is focused.
- Sanitize pasted content to remove unsupported styles, scripts, or external HTML wrappers.

### 12.3 Toolbar Behavior

- Toolbar must remain anchored to the node even during rapid zooming, panning, or resizing.
- Hide the toolbar when the node loses selection or the user clicks outside the component.
- Ensure toolbar actions apply only to text inside the targeted comment instance, not other nodes.

### 12.4 Color & Formatting States

- Fallback to a default background color if an invalid or unsupported color code is provided.
- Automatically adjust text color for contrast when the background color changes.
- Prevent unsupported formatting tags (e.g., `<script>`, `<style>`, `<iframe>`) from being inserted.

### 12.5 Resizing & Layout

- Enforce minimum dimensions to prevent the node from collapsing below a readable size.
- Retain text flow integrity when resizing, avoiding overflow that would break the layout.
- Ensure resizing does not trigger unintended canvas interactions (e.g., selecting other nodes).

### 12.6 Copy/Paste & Duplication

- When duplicating a Comment Node, ensure the new node has a unique ID and position offset.
- Preserve content, background color, and size when nodes are copied or duplicated.
- Avoid clipboard conflicts where copying text inside the node triggers copy of the entire node.

### 12.7 Undo/Redo Behavior

- Confirm that text edits, style changes, position updates, and resizing all generate correct snapshots.
- Prevent undo from reverting a node into a broken or zero-size state.
- Ensure redo correctly reapplies formatting and content changes without losing HTML structure.

### 12.8 Persistence & Loading

- Validate that empty or null comment content does not break rendering.
- When loading workflows, gracefully handle missing fields by falling back to default config.
- Ensure that older workflows (saved before Comment Nodes existed) load without errors.

### 12.9 Keyboard Shortcuts

- Ensure the “N” shortcut is disabled while editing inside a comment.
- Prevent Enter/Escape shortcuts from interfering with global shortcuts or other nodes.
- Avoid accidental node creation when system modifiers (Cmd, Ctrl) are held.

### 12.10 Execution Engine Isolation

- Ensure Comment Nodes are fully ignored during workflow execution.
- Confirm they are skipped by validation pipelines that expect operational nodes.
- Prevent users from accidentally connecting edges to comment nodes.

### 12.11 Interaction Conflicts

- Prevent comment nodes from intercepting context menus intended for the canvas.
- Ensure that selecting text inside a comment does not trigger canvas-level drag events.
- Block multi-select (Shift+click) while actively editing text to avoid conflicting states.

## 13. Future Enhancements

### 13.1 Richer Text Editing

- Add support for additional formatting options such as headings, code spans, highlight colors, or blockquotes.
- Consider migrating from `document.execCommand` to a modern, fully controlled rich-text engine (such as, Lexical, Slate, TipTap).

### 13.2 Mentioning Users

- Support `@mentions` to tag teammates in collaborative environments.
- Trigger notifications or highlight nodes that require review.

### 13.3 Improved Color Customization

- Add custom color input or full color picker (HSL/RGB/hex sliders).
- Automatically adjust text color to maintain WCAG accessibility contrast.

### 13.4 Auto-Layout & Smart Positioning

- Snap comment nodes to nearby workflow nodes for cleaner layouts.
- Optionally auto-group comments around related operational nodes.

### 13.5 Comment Threads

- Allow users to reply to comments inside a node, forming a lightweight threaded discussion.
- Collapse/expand threads for clarity.
