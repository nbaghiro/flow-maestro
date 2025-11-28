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

## 5. Component Hierarchy

## 6. Data Flow

## 7. Data Structures

## 8. Node Behavior & UX

## 9. Inspector Panel (If Applicable)

## 10. Keyboard Shortcuts

## 11. Implementation Steps

## 12. Validation & Edge Cases

## 13. Future Enhancements
