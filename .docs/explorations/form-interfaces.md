# Form Interfaces - Implementation Plan

## Overview

Form Interfaces allow users to create customizable, public-facing forms that collect user input and provide it to **workflows** or **agents**. This creates a bridge between external users and FlowMaestro's automation capabilities.

**Core Value Proposition**: Enable non-technical users to interact with complex workflows and AI agents through simple, branded forms.

---

## User Preferences

| Decision          | Choice                                        |
| ----------------- | --------------------------------------------- |
| Form URLs         | Path-based (`/f/{slug}`)                      |
| File Storage      | GCS (existing infrastructure)                 |
| Spam Prevention   | Rate limiting only (10/min/IP)                |
| Conditional Logic | Not in MVP                                    |
| Entry Points      | Both `/forms` page and workflow/agent editors |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FORM INTERFACES                             │
│                                                                     │
│  ┌─────────────-┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │ Form Builder │    │ Public Form │    │ Submission Handler      │ │
│  │   (Editor)   │───▶│  (Renderer) │───▶│                         │ │
│  └─────────────-┘    └─────────────┘    │  ┌─────────────────┐    │ │
│                                         │  │ Target Type?    │    │ │
│                                         │  └────────┬────────┘    │ │
│                                         │           │             │ │
│                                         │     ┌─────┴─────┐       │ │
│                                         │     ▼           ▼       │ │
│                                         │ ┌───────-┐ ┌─────────┐  │ │
│                                         │ │Workflow│ │  Agent  │  │ │
│                                         │ │Trigger │ │ Message │  │ │
│                                         │ └───┬───-┘ └────┬────┘  │ │
│                                         └─────┼──────────┼───────-┘ │
└───────────────────────────────────────────────┼──────────┼────────-─┘
                                                │          │
                    ┌───────────────────────────┘          │
                    ▼                                      ▼
          ┌─────────────────┐                   ┌─────────────────┐
          │    WORKFLOWS    │                   │     AGENTS      │
          │                 │                   │                 │
          │  Deterministic  │                   │  Conversational │
          │  Node-based     │                   │  LLM-powered    │
          │  Automation     │                   │  ReAct Pattern  │
          │                 │                   │                 │
          │  ┌───────────┐  │                   │  ┌───────────┐  │
          │  │  Temporal │  │                   │  │  Threads  │  │
          │  │  Workflow │  │                   │  │  Messages │  │
          │  └───────────┘  │                   │  └───────────┘  │
          └─────────────────┘                   └─────────────────┘
```

---

## Integration Patterns

### Pattern 1: Form → Workflow (Direct Trigger)

Form submission directly triggers workflow execution with form data as input variables.

```
User fills form → Submit → Workflow executes → Result stored
```

**Use Cases**:

- Lead capture → CRM workflow
- Support ticket → Ticket creation workflow
- File upload → Document processing workflow
- Order form → Order processing workflow

**Data Flow**:

```typescript
// Form submission becomes workflow input
const workflowInput = {
    _formId: "form-uuid",
    _submissionId: "submission-uuid",
    _submittedAt: "2024-01-15T10:30:00Z",

    // Each field's outputVariable maps to input
    customerName: "John Doe", // text field
    email: "john@example.com", // email field
    priority: "high", // select field
    attachments: [
        {
            // file field
            fileName: "document.pdf",
            fileSize: 1024000,
            mimeType: "application/pdf",
            gcsUri: "gs://bucket/path/file.pdf",
            downloadUrl: "https://signed-url..."
        }
    ]
};

// Temporal workflow starts with these inputs
await temporalClient.workflow.start("formTriggeredWorkflow", {
    workflowId: `form-${formId}-${submissionId}`,
    args: [{ workflowId: form.workflowId, inputs: workflowInput }]
});
```

### Pattern 2: Form → Agent (Conversation Starter)

Form submission starts or continues an agent conversation with form data as context.

```
User fills form → Submit → Agent receives context → Conversation begins
```

**Use Cases**:

- Contact form → Support agent conversation
- Intake form → Onboarding agent guidance
- Query form → Research agent analysis
- Feedback form → Feedback agent discussion

**Data Flow**:

```typescript
// Form data becomes structured context message
const agentMessage = `
New form submission received:

**Customer Information**
- Name: ${formData.customerName}
- Email: ${formData.email}
- Company: ${formData.company}

**Issue Details**
- Category: ${formData.category}
- Priority: ${formData.priority}
- Description: ${formData.description}

Please assist this customer based on their submission.
`;

// Start agent execution with form context
await agentStore.executeAgent(agentId, agentMessage, threadId);
```

### Pattern 3: Agent → Form (Mid-Conversation Request)

Agent requests structured input from user via form during conversation.

```
User chats with agent → Agent needs specific data → Shows form → User submits → Agent continues
```

**Use Cases**:

- Agent needs contact details mid-conversation
- Agent requires file upload for analysis
- Agent collects structured feedback
- Agent gathers multi-field data efficiently

**Data Flow**:

```typescript
// Agent tool call triggers form display
// In agent-activities.ts:
{
    type: "function",
    name: "request_form_input",
    description: "Request structured input from user via form",
    schema: {
        properties: {
            formId: { type: "string" },
            context: { type: "string" }
        }
    }
}

// Frontend intercepts tool call, displays form
// On submit, sends via message endpoint
POST /agents/:id/executions/:executionId/message
{
    role: "tool_response",
    content: JSON.stringify(formData),
    toolCallId: "call-uuid"
}
```

---

## Comprehensive User Flows

### Flow 1: Creating a Form for a Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: Create Form for Lead Capture Workflow                     │
└─────────────────────────────────────────────────────────────────────────┘

1. USER STARTS
   │
   ├─► Option A: From /forms page
   │   └── Click "Create Form" → New form editor opens
   │
   └─► Option B: From Workflow Editor
       └── Click "Create Form Interface" button → Form editor opens
           (workflow pre-linked)

2. FORM BUILDER
   │
   ├── Left Panel: Field Library
   │   ├── Inputs: Text, Email, Phone, Number, Date, Select, Multi-select,
   │   │           Checkbox, File Upload
   │   └── Structure: Heading, Description, Divider
   │
   ├── Center Panel: Form Canvas (drag-and-drop)
   │   ├── Header image upload area
   │   ├── Icon upload/emoji picker
   │   ├── Title: "Contact Us"
   │   ├── Description: "We'd love to hear from you"
   │   └── Form fields (reorderable)
   │       ├── [Text] Full Name* (outputVariable: fullName)
   │       ├── [Email] Email Address* (outputVariable: email)
   │       ├── [Select] Interest (outputVariable: interest)
   │       │   └── Options: Sales, Support, Partnership
   │       └── [Textarea] Message (outputVariable: message)
   │
   └── Right Panel: Field Editor / Settings
       ├── Field Properties
       │   ├── Label, Placeholder, Help Text
       │   ├── Required toggle
       │   ├── Validation rules
       │   └── Output Variable name (maps to workflow input)
       │
       ├── Branding Tab
       │   ├── Header image
       │   ├── Icon
       │   ├── Primary color
       │   └── Footer text
       │
       └── Settings Tab
           ├── Submit button text
           ├── Success message
           ├── Redirect URL (optional)
           ├── Rate limit settings
           └── Workflow/Agent link selector

3. LINK TO WORKFLOW
   │
   └── Settings → "Trigger on Submit"
       ├── [Dropdown] Select target type: Workflow | Agent
       └── [Dropdown] Select workflow: "Lead Capture Pipeline"
           └── Shows workflow's expected input variables
               └── Auto-maps matching outputVariable names

4. PUBLISH
   │
   ├── Click "Publish" button
   ├── Confirmation dialog shows public URL
   │   └── "Your form is live at: /f/contact-us"
   └── Copy link, share with customers

5. FORM LIVE
   │
   └── Public URL accessible without authentication
       └── Branded form with user's styling
```

### Flow 2: External User Submitting a Form

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: Customer Submits Contact Form                             │
└─────────────────────────────────────────────────────────────────────────┘

1. CUSTOMER ARRIVES
   │
   └── Visits: https://app.flowmaestro.com/f/contact-us
       └── Sees branded form with company styling

2. FILLS FORM
   │
   ├── Enters: Full Name = "Jane Smith"
   ├── Enters: Email = "jane@company.com"
   ├── Selects: Interest = "Sales"
   ├── Enters: Message = "Interested in enterprise plan"
   └── (Optional) Uploads: Attachment = requirements.pdf

3. SUBMITS
   │
   ├── Client-side validation runs
   │   └── Required fields checked, email format validated
   │
   ├── POST /api/public/forms/contact-us/submit
   │   └── Rate limiter checks (10 submissions/min/IP)
   │
   ├── Files uploaded to GCS
   │   └── gs://bucket/users/{userId}/forms/{formId}/submissions/{subId}/...
   │
   └── Submission record created
       └── form_submissions table entry

4. WORKFLOW TRIGGERED
   │
   ├── FormWorkflowTriggerService.triggerFromSubmission()
   │
   ├── Maps form fields to workflow inputs:
   │   {
   │     _formId: "form-uuid",
   │     _submissionId: "submission-uuid",
   │     fullName: "Jane Smith",
   │     email: "jane@company.com",
   │     interest: "Sales",
   │     message: "Interested in enterprise plan",
   │     attachment: { fileName: "requirements.pdf", downloadUrl: "..." }
   │   }
   │
   └── Temporal workflow starts execution

5. SUCCESS RESPONSE
   │
   └── Customer sees success message:
       "Thank you! We'll be in touch within 24 hours."
       └── Optional: Redirects to specified URL

6. WORKFLOW EXECUTES (Background)
   │
   ├── Node 1: Validate email
   ├── Node 2: Create CRM contact
   ├── Node 3: Send notification to sales team
   ├── Node 4: Send confirmation email to customer
   └── Node 5: Log to analytics

7. FORM OWNER MONITORS
   │
   └── /forms/{formId}/submissions
       ├── List of all submissions
       ├── Submission details (data, files, timestamp)
       ├── Execution status (pending, running, completed, failed)
       └── Export to CSV option
```

### Flow 3: Creating a Form for an Agent

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: Create Intake Form for Support Agent                      │
└─────────────────────────────────────────────────────────────────────────┘

1. USER NAVIGATES
   │
   ├─► Option A: From /forms page
   │   └── Create Form → Select target: "Agent"
   │
   └─► Option B: From Agent Builder
       └── Click "Create Intake Form" → Form builder opens
           (agent pre-linked)

2. FORM BUILDER
   │
   └── Designs intake form:
       ├── [Heading] "Technical Support Request"
       ├── [Description] "Please provide details so our AI assistant can help"
       ├── [Divider]
       ├── [Email] Your Email* (outputVariable: userEmail)
       ├── [Select] Product* (outputVariable: product)
       │   └── Options: FlowMaestro Pro, FlowMaestro Enterprise
       ├── [Select] Issue Type* (outputVariable: issueType)
       │   └── Options: Bug, Feature Request, How-To, Account
       ├── [Textarea] Describe Your Issue* (outputVariable: issueDescription)
       ├── [File Upload] Screenshots (optional) (outputVariable: screenshots)
       └── [Checkbox] I've checked the documentation (outputVariable: checkedDocs)

3. LINK TO AGENT
   │
   └── Settings → "Trigger on Submit"
       ├── Target Type: Agent
       ├── Select Agent: "Technical Support Agent"
       └── Conversation Mode:
           ├── [x] Start new thread per submission
           └── [ ] Continue existing thread (if returning user)

4. CONFIGURE AGENT CONTEXT
   │
   └── Settings → "Agent Context Template"
       └── Customize how form data is presented to agent:

       """
       New support request from {{userEmail}}:

       **Product**: {{product}}
       **Issue Type**: {{issueType}}
       **Checked Documentation**: {{checkedDocs}}

       **Issue Description**:
       {{issueDescription}}

       {{#if screenshots}}
       **Attachments**: {{screenshots.length}} file(s) uploaded
       {{/if}}

       Please assist this user with their {{issueType}} issue.
       """

5. PUBLISH
   │
   └── Form live at /f/support-request
```

### Flow 4: Customer Interacting with Agent via Form

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: Customer Gets AI Support via Form + Agent                 │
└─────────────────────────────────────────────────────────────────────────┘

1. CUSTOMER VISITS FORM
   │
   └── https://app.flowmaestro.com/f/support-request

2. FILLS AND SUBMITS
   │
   ├── Email: "alex@startup.io"
   ├── Product: "FlowMaestro Pro"
   ├── Issue Type: "How-To"
   ├── Description: "How do I connect my Slack workspace?"
   └── Checked Docs: Yes

3. AGENT CONVERSATION STARTS
   │
   ├── Submission creates new thread
   │
   ├── Customer redirected to chat interface:
   │   └── /agents/{agentId}/chat?thread={threadId}
   │
   └── Agent receives context message:
       """
       New support request from alex@startup.io:

       **Product**: FlowMaestro Pro
       **Issue Type**: How-To
       **Checked Documentation**: Yes

       **Issue Description**:
       How do I connect my Slack workspace?

       Please assist this user with their How-To issue.
       """

4. AGENT RESPONDS
   │
   ├── Agent (LLM reasoning):
   │   "User wants to connect Slack. I should provide step-by-step guide."
   │
   └── Agent response:
       """
       Hi Alex! I'd be happy to help you connect your Slack workspace.

       Here's how to do it:

       1. Go to Settings → Integrations
       2. Click "Add Integration" → Select Slack
       3. Click "Connect to Slack"
       4. Authorize FlowMaestro in the Slack popup
       5. Select which channel to post notifications

       Would you like me to walk you through any of these steps in detail?
       """

5. CONVERSATION CONTINUES
   │
   ├── Customer: "Step 3 isn't working, I get an error"
   │
   ├── Agent uses knowledge base tool:
   │   └── Searches docs for "Slack connection error"
   │
   └── Agent: "That error usually means... [detailed help]"

6. AGENT REQUESTS MORE INFO (Optional)
   │
   ├── Agent realizes it needs structured data:
   │   └── Calls `request_form_input` tool
   │
   ├── Mini-form appears in chat:
   │   ├── [Text] Error message you see
   │   ├── [Select] Browser: Chrome | Firefox | Safari
   │   └── [File] Screenshot of error
   │
   ├── Customer fills mini-form
   │
   └── Agent receives structured data, continues helping

7. RESOLUTION
   │
   ├── Issue resolved
   ├── Agent: "Glad I could help! Is there anything else?"
   ├── Customer: "No, thanks!"
   └── Thread archived, satisfaction logged
```

### Flow 5: Form Owner Viewing Submissions

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: Reviewing Form Submissions                                │
└─────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO SUBMISSIONS
   │
   └── /forms/{formId}/submissions

2. SUBMISSIONS LIST VIEW
   │
   ├── Table columns:
   │   ├── Submitted At
   │   ├── Key Fields (configurable, e.g., email, name)
   │   ├── Status (workflow: pending/running/completed/failed)
   │   │         (agent: thread active/archived)
   │   └── Actions
   │
   ├── Filters:
   │   ├── Date range
   │   ├── Status
   │   └── Search (by field values)
   │
   └── Bulk actions:
       ├── Export to CSV
       ├── Re-trigger failed submissions
       └── Delete submissions

3. SUBMISSION DETAIL VIEW
   │
   ├── All submitted field values
   ├── Uploaded files (with download links)
   ├── Submission metadata (IP, user agent, timestamp)
   │
   ├── If Workflow target:
   │   ├── Execution ID (link to execution details)
   │   ├── Execution status
   │   ├── Execution logs (expandable)
   │   └── Re-trigger button
   │
   └── If Agent target:
       ├── Thread ID (link to conversation)
       ├── Thread status (active/archived)
       ├── Message count
       └── "View Conversation" button

4. ANALYTICS (Future)
   │
   ├── Submission trends over time
   ├── Completion rates
   ├── Field drop-off analysis
   └── Average response times (for agents)
```

---

## Database Schema

### Migration: `1730000000020_create-form-interfaces.sql`

```sql
SET search_path TO flowmaestro, public;

-- Form interface definitions
CREATE TABLE IF NOT EXISTS form_interfaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Target (workflow OR agent, not both)
    target_type VARCHAR(20) NOT NULL DEFAULT 'workflow', -- 'workflow' | 'agent'
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,

    -- Configuration (JSONB)
    fields JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    branding JSONB NOT NULL DEFAULT '{}',

    -- Agent-specific: context template for how form data is presented
    agent_context_template TEXT,

    -- State
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP NULL,

    -- Tracking
    submission_count BIGINT DEFAULT 0,
    last_submission_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    -- Constraints
    CONSTRAINT unique_user_slug UNIQUE (user_id, slug),
    CONSTRAINT valid_target CHECK (
        (target_type = 'workflow' AND workflow_id IS NOT NULL AND agent_id IS NULL) OR
        (target_type = 'agent' AND agent_id IS NOT NULL AND workflow_id IS NULL) OR
        (target_type = 'none')  -- Form without target (just collect data)
    )
);

-- Indexes
CREATE INDEX idx_form_interfaces_user_id ON form_interfaces(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_workflow_id ON form_interfaces(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_agent_id ON form_interfaces(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_slug ON form_interfaces(slug) WHERE status = 'published' AND deleted_at IS NULL;

-- Form submissions
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_interface_id UUID NOT NULL REFERENCES form_interfaces(id) ON DELETE CASCADE,

    -- Submission data
    data JSONB NOT NULL,
    files JSONB DEFAULT '[]',

    -- Target execution tracking
    target_type VARCHAR(20) NOT NULL, -- 'workflow' | 'agent' | 'none'

    -- Workflow execution (if target_type = 'workflow')
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    execution_status VARCHAR(50), -- pending, triggered, completed, failed
    execution_error TEXT,

    -- Agent thread (if target_type = 'agent')
    thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
    agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,

    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_interface_id, created_at DESC);
CREATE INDEX idx_form_submissions_execution_id ON form_submissions(execution_id);
CREATE INDEX idx_form_submissions_thread_id ON form_submissions(thread_id);
```

---

## Shared Types

### File: `shared/src/types/form-interface.ts`

```typescript
// Target types
export type FormTargetType = "workflow" | "agent" | "none";

// Field types
export type FormFieldType =
    | "text"
    | "textarea"
    | "email"
    | "number"
    | "phone"
    | "date"
    | "select"
    | "multi_select"
    | "checkbox"
    | "file"
    | "heading"
    | "description"
    | "divider";

// Base field interface
interface FormFieldBase {
    id: string;
    type: FormFieldType;
    order: number;
}

// Input field (collects data)
export interface FormInputField extends FormFieldBase {
    type: "text" | "textarea" | "email" | "number" | "phone" | "date";
    label: string;
    placeholder?: string;
    helpText?: string;
    required: boolean;
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        patternMessage?: string;
        min?: number;
        max?: number;
    };
    defaultValue?: string | number;
    outputVariable: string; // Maps to workflow input or agent context
}

// Select field
export interface FormSelectField extends FormFieldBase {
    type: "select" | "multi_select";
    label: string;
    helpText?: string;
    required: boolean;
    options: Array<{ label: string; value: string }>;
    defaultValue?: string | string[];
    outputVariable: string;
}

// Checkbox field
export interface FormCheckboxField extends FormFieldBase {
    type: "checkbox";
    label: string;
    helpText?: string;
    required: boolean;
    defaultValue?: boolean;
    outputVariable: string;
}

// File upload field
export interface FormFileField extends FormFieldBase {
    type: "file";
    label: string;
    helpText?: string;
    required: boolean;
    allowedTypes?: string[]; // MIME types
    maxSize?: number; // bytes
    maxFiles?: number;
    outputVariable: string;
}

// Structure fields (display only)
export interface FormHeadingField extends FormFieldBase {
    type: "heading";
    text: string;
    level: 1 | 2 | 3;
}

export interface FormDescriptionField extends FormFieldBase {
    type: "description";
    text: string; // Supports markdown
}

export interface FormDividerField extends FormFieldBase {
    type: "divider";
}

// Union type
export type FormField =
    | FormInputField
    | FormSelectField
    | FormCheckboxField
    | FormFileField
    | FormHeadingField
    | FormDescriptionField
    | FormDividerField;

// Form settings
export interface FormSettings {
    submitButton: {
        text: string;
        loadingText: string;
    };
    successMessage: {
        title: string;
        description: string;
        showConfetti?: boolean;
    };
    afterSubmit: {
        action: "message" | "redirect" | "chat"; // chat = redirect to agent thread
        redirectUrl?: string;
    };
    rateLimitPerMinute: number;
}

// Form branding
export interface FormBranding {
    headerImage?: { url: string; alt?: string };
    icon?: { type: "image" | "emoji"; url?: string; emoji?: string };
    title: string;
    description?: string;
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    footer?: { text?: string; showPoweredBy?: boolean };
}

// Main interface
export interface FormInterface {
    id: string;
    userId: string;

    // Target
    targetType: FormTargetType;
    workflowId: string | null;
    agentId: string | null;

    // Identity
    name: string;
    slug: string;
    description: string | null;

    // Configuration
    fields: FormField[];
    settings: FormSettings;
    branding: FormBranding;

    // Agent-specific
    agentContextTemplate: string | null;

    // State
    status: "draft" | "published" | "archived";
    publishedAt: Date | null;

    // Tracking
    submissionCount: number;
    lastSubmissionAt: Date | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Submission
export interface FormSubmission {
    id: string;
    formInterfaceId: string;

    data: Record<string, unknown>;
    files: Array<{
        fieldId: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        gcsUri: string;
    }>;

    targetType: FormTargetType;

    // Workflow execution
    executionId: string | null;
    executionStatus: "pending" | "triggered" | "completed" | "failed" | null;
    executionError: string | null;

    // Agent thread
    threadId: string | null;
    agentExecutionId: string | null;

    // Metadata
    submittedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
}
```

---

## API Endpoints

### Authenticated Routes

```
# Form Interface CRUD
POST   /api/form-interfaces                    # Create form
GET    /api/form-interfaces                    # List forms
GET    /api/form-interfaces/:id                # Get form
PUT    /api/form-interfaces/:id                # Update form
DELETE /api/form-interfaces/:id                # Delete form
POST   /api/form-interfaces/:id/publish        # Publish form
POST   /api/form-interfaces/:id/unpublish      # Unpublish form
POST   /api/form-interfaces/:id/duplicate      # Duplicate form

# Assets
POST   /api/form-interfaces/:id/assets         # Upload asset (header, icon)
DELETE /api/form-interfaces/:id/assets/:assetId

# Submissions
GET    /api/form-interfaces/:id/submissions           # List submissions
GET    /api/form-interfaces/:id/submissions/:subId    # Get submission
GET    /api/form-interfaces/:id/submissions/export    # Export CSV
POST   /api/form-interfaces/:id/submissions/:subId/retry  # Retry failed
```

### Public Routes (No Auth, Rate Limited)

```
GET    /api/public/forms/:slug          # Get form schema
POST   /api/public/forms/:slug/submit   # Submit form (multipart)
```

---

## Implementation Phases

### Phase 1: Foundation

1. Database migration
2. Shared types in `@flowmaestro/shared`
3. `FormInterfaceRepository` and `FormSubmissionRepository`
4. CRUD API routes
5. `FormStorageService` for GCS uploads

### Phase 2: Form Builder UI

1. `/forms` list page
2. `formBuilderStore` (Zustand)
3. `FieldLibrary` with drag-and-drop
4. `FormCanvas` with drop zones
5. Basic field components (text, email, select, checkbox)

### Phase 3: Advanced Fields & Editing

1. File upload field with GCS
2. Date, textarea, multi-select, phone fields
3. Structure elements (heading, description, divider)
4. `FieldEditor` panel
5. `BrandingEditor` panel
6. `SettingsEditor` panel

### Phase 4: Publishing & Public Forms

1. Publish/unpublish endpoints
2. Public form routes (no auth)
3. Rate limiting middleware
4. `PublicForm` page at `/f/:slug`
5. `FormRenderer` component

### Phase 5: Workflow Integration

1. `FormWorkflowTriggerService`
2. Submission → workflow execution flow
3. Execution status tracking
4. `/forms/:id/submissions` page

### Phase 6: Agent Integration

1. `FormAgentTriggerService`
2. Agent context template system
3. Submission → agent thread creation
4. Post-submit redirect to chat
5. `request_form_input` function tool for agents

---

## Key Files to Create

```
# Backend
backend/migrations/1730000000020_create-form-interfaces.sql
backend/src/storage/models/FormInterface.ts
backend/src/storage/repositories/FormInterfaceRepository.ts
backend/src/storage/repositories/FormSubmissionRepository.ts
backend/src/api/routes/form-interfaces/index.ts
backend/src/api/routes/form-interfaces/*.ts (create, list, get, update, delete, publish)
backend/src/api/routes/form-interfaces/submissions/*.ts
backend/src/api/routes/public/forms.ts
backend/src/services/storage/FormStorageService.ts
backend/src/services/FormWorkflowTriggerService.ts
backend/src/services/FormAgentTriggerService.ts
backend/src/api/middleware/rateLimiter.ts

# Shared
shared/src/types/form-interface.ts

# Frontend
frontend/src/pages/Forms.tsx
frontend/src/pages/FormBuilder.tsx
frontend/src/pages/FormSubmissions.tsx
frontend/src/pages/PublicForm.tsx
frontend/src/stores/formBuilderStore.ts
frontend/src/components/form-builder/*.tsx
frontend/src/components/form-builder/fields/*.tsx
frontend/src/lib/formApi.ts
```

---

## Backend Services

### FormStorageService

Extends GCS patterns from `backend/src/services/storage/GCSStorageService.ts`:

```typescript
// backend/src/services/storage/FormStorageService.ts
export class FormStorageService {
    private gcsService: GCSStorageService;

    /**
     * Upload form submission file
     * Path: users/{userId}/forms/{formId}/submissions/{submissionId}/{timestamp}_{filename}
     */
    async uploadSubmissionFile(
        fileStream: Readable,
        userId: string,
        formId: string,
        submissionId: string,
        filename: string
    ): Promise<{ gcsUri: string; downloadUrl: string }> {
        const sanitizedFilename = this.sanitizeFilename(filename);
        const gcsPath = `${userId}/forms/${formId}/submissions/${submissionId}/${Date.now()}_${sanitizedFilename}`;

        const gcsUri = await this.gcsService.uploadToPath(fileStream, gcsPath);
        const downloadUrl = await this.gcsService.getSignedDownloadUrl(gcsUri, 3600);

        return { gcsUri, downloadUrl };
    }

    /**
     * Upload form asset (header image, icon)
     * Path: users/{userId}/forms/{formId}/assets/{assetType}_{timestamp}_{filename}
     */
    async uploadFormAsset(
        fileStream: Readable,
        userId: string,
        formId: string,
        assetType: "header" | "icon",
        filename: string
    ): Promise<string> {
        const gcsPath = `${userId}/forms/${formId}/assets/${assetType}_${Date.now()}_${filename}`;
        return this.gcsService.uploadToPath(fileStream, gcsPath);
    }

    /**
     * Delete all files for a submission
     */
    async deleteSubmissionFiles(gcsUris: string[]): Promise<void> {
        await Promise.all(gcsUris.map((uri) => this.gcsService.delete(uri)));
    }
}
```

### FormWorkflowTriggerService

```typescript
// backend/src/services/FormWorkflowTriggerService.ts
export class FormWorkflowTriggerService {
    private temporalClient: TemporalClient;
    private formRepo: FormInterfaceRepository;
    private submissionRepo: FormSubmissionRepository;

    async triggerFromSubmission(
        form: FormInterface,
        submission: FormSubmission
    ): Promise<{ workflowRunId: string; executionId: string }> {
        if (form.targetType !== "workflow" || !form.workflowId) {
            throw new AppError("Form is not linked to a workflow", 400);
        }

        // Map form data to workflow inputs
        const inputs = this.mapToWorkflowInputs(form, submission);

        // Start Temporal workflow
        const workflowId = `form-${form.id}-${submission.id}`;
        const handle = await this.temporalClient.workflow.start("formTriggeredWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId,
            args: [
                {
                    workflowId: form.workflowId,
                    formInterfaceId: form.id,
                    submissionId: submission.id,
                    inputs
                }
            ]
        });

        // Update submission with execution tracking
        await this.submissionRepo.update(submission.id, {
            executionStatus: "triggered"
        });

        return {
            workflowRunId: handle.workflowId,
            executionId: submission.id
        };
    }

    private mapToWorkflowInputs(
        form: FormInterface,
        submission: FormSubmission
    ): Record<string, unknown> {
        const inputs: Record<string, unknown> = {
            _formId: form.id,
            _formName: form.name,
            _submissionId: submission.id,
            _submittedAt: submission.submittedAt.toISOString()
        };

        // Map each field's outputVariable to submitted value
        for (const field of form.fields) {
            if ("outputVariable" in field && field.outputVariable) {
                const value = submission.data[field.id];

                // Handle file fields specially
                if (field.type === "file") {
                    const files = submission.files.filter((f) => f.fieldId === field.id);
                    inputs[field.outputVariable] = files.map((f) => ({
                        fileName: f.fileName,
                        fileSize: f.fileSize,
                        mimeType: f.mimeType,
                        downloadUrl: f.downloadUrl
                    }));
                } else {
                    inputs[field.outputVariable] = value;
                }
            }
        }

        return inputs;
    }
}
```

### FormAgentTriggerService

```typescript
// backend/src/services/FormAgentTriggerService.ts
export class FormAgentTriggerService {
    private agentService: AgentService;
    private threadRepo: ThreadRepository;

    async triggerFromSubmission(
        form: FormInterface,
        submission: FormSubmission
    ): Promise<{ threadId: string; executionId: string }> {
        if (form.targetType !== "agent" || !form.agentId) {
            throw new AppError("Form is not linked to an agent", 400);
        }

        // Create new thread for this submission
        const thread = await this.threadRepo.create({
            agentId: form.agentId,
            userId: form.userId,
            title: `Form: ${form.name} - ${new Date().toLocaleDateString()}`,
            metadata: {
                formSubmissionId: submission.id,
                formInterfaceId: form.id
            }
        });

        // Build context message from template or default
        const contextMessage = this.buildContextMessage(form, submission);

        // Start agent execution with form context
        const execution = await this.agentService.executeAgent({
            agentId: form.agentId,
            threadId: thread.id,
            message: contextMessage,
            userId: form.userId
        });

        return {
            threadId: thread.id,
            executionId: execution.id
        };
    }

    private buildContextMessage(form: FormInterface, submission: FormSubmission): string {
        // Use custom template if provided
        if (form.agentContextTemplate) {
            return this.renderTemplate(form.agentContextTemplate, form, submission);
        }

        // Default template
        let message = `New form submission received:\n\n`;

        for (const field of form.fields) {
            if ("outputVariable" in field && field.outputVariable) {
                const value = submission.data[field.id];
                if (value !== undefined && value !== null && value !== "") {
                    message += `**${field.label}**: ${this.formatValue(value)}\n`;
                }
            }
        }

        if (submission.files.length > 0) {
            message += `\n**Attachments**: ${submission.files.length} file(s) uploaded\n`;
        }

        message += `\nPlease assist based on this submission.`;
        return message;
    }

    private renderTemplate(
        template: string,
        form: FormInterface,
        submission: FormSubmission
    ): string {
        // Simple mustache-style template rendering
        let result = template;

        for (const field of form.fields) {
            if ("outputVariable" in field) {
                const value = submission.data[field.id];
                const placeholder = `{{${field.outputVariable}}}`;
                result = result.replace(new RegExp(placeholder, "g"), String(value ?? ""));
            }
        }

        return result;
    }
}
```

---

## Frontend Components

### Component Tree

```
frontend/src/
├── pages/
│   ├── Forms.tsx                      # List page with create button
│   ├── FormBuilder.tsx                # Main builder page
│   ├── FormSubmissions.tsx            # Submissions list
│   └── PublicForm.tsx                 # Public form at /f/:slug
│
├── components/form-builder/
│   ├── FormBuilderLayout.tsx          # 3-panel layout container
│   │
│   ├── FieldLibrary.tsx               # Left panel - draggable fields
│   │   └── FieldLibraryItem.tsx       # Individual draggable item
│   │
│   ├── FormCanvas.tsx                 # Center - form preview with drops
│   │   ├── CanvasHeader.tsx           # Header image, icon, title area
│   │   ├── CanvasDropZone.tsx         # Drop indicator between fields
│   │   └── CanvasField.tsx            # Rendered field with selection
│   │
│   ├── FieldEditor.tsx                # Right panel - edit selected field
│   │   ├── FieldBasicSettings.tsx     # Label, placeholder, required
│   │   ├── FieldValidation.tsx        # Validation rules
│   │   └── FieldAdvanced.tsx          # Output variable, default value
│   │
│   ├── BrandingEditor.tsx             # Branding settings panel
│   ├── SettingsEditor.tsx             # Form settings panel
│   ├── TargetSelector.tsx             # Workflow/Agent picker
│   ├── PublishDialog.tsx              # Publish confirmation
│   │
│   └── fields/                        # Field renderers (canvas + public)
│       ├── TextField.tsx
│       ├── TextareaField.tsx
│       ├── EmailField.tsx
│       ├── NumberField.tsx
│       ├── PhoneField.tsx
│       ├── DateField.tsx
│       ├── SelectField.tsx
│       ├── MultiSelectField.tsx
│       ├── CheckboxField.tsx
│       ├── FileUploadField.tsx
│       ├── HeadingField.tsx
│       ├── DescriptionField.tsx
│       └── DividerField.tsx
│
└── stores/
    └── formBuilderStore.ts            # Zustand store
```

### FormBuilderStore (Zustand)

```typescript
// frontend/src/stores/formBuilderStore.ts
interface FormBuilderStore {
    // State
    form: FormInterface | null;
    isDirty: boolean;
    isSaving: boolean;
    isPublishing: boolean;
    selectedFieldId: string | null;
    draggedFieldType: FormFieldType | null;
    previewMode: "desktop" | "mobile";
    activePanel: "field" | "branding" | "settings";

    // Form Actions
    setForm: (form: FormInterface) => void;
    updateFormMeta: (
        updates: Partial<Pick<FormInterface, "name" | "slug" | "description">>
    ) => void;
    reset: () => void;

    // Field Actions
    addField: (fieldType: FormFieldType, index?: number) => void;
    updateField: (fieldId: string, updates: Partial<FormField>) => void;
    removeField: (fieldId: string) => void;
    reorderFields: (fromIndex: number, toIndex: number) => void;
    duplicateField: (fieldId: string) => void;
    selectField: (fieldId: string | null) => void;

    // Branding/Settings Actions
    updateBranding: (updates: Partial<FormBranding>) => void;
    updateSettings: (updates: Partial<FormSettings>) => void;

    // Target Actions
    setTarget: (targetType: FormTargetType, targetId: string | null) => void;
    updateAgentContextTemplate: (template: string) => void;

    // Persistence
    save: () => Promise<void>;
    publish: () => Promise<void>;
    unpublish: () => Promise<void>;

    // Drag State
    setDraggedFieldType: (type: FormFieldType | null) => void;
}

export const useFormBuilderStore = create<FormBuilderStore>((set, get) => ({
    form: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    selectedFieldId: null,
    draggedFieldType: null,
    previewMode: "desktop",
    activePanel: "field",

    addField: (fieldType, index) => {
        const { form } = get();
        if (!form) return;

        const newField = createFieldFromType(fieldType, form.fields.length);
        const fields = [...form.fields];

        if (index !== undefined) {
            fields.splice(index, 0, newField);
        } else {
            fields.push(newField);
        }

        // Reorder
        fields.forEach((f, i) => {
            f.order = i;
        });

        set({
            form: { ...form, fields },
            isDirty: true,
            selectedFieldId: newField.id
        });
    },

    reorderFields: (fromIndex, toIndex) => {
        const { form } = get();
        if (!form) return;

        const fields = [...form.fields];
        const [removed] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, removed);
        fields.forEach((f, i) => {
            f.order = i;
        });

        set({ form: { ...form, fields }, isDirty: true });
    },

    save: async () => {
        const { form } = get();
        if (!form) return;

        set({ isSaving: true });
        try {
            await formApi.updateFormInterface(form.id, {
                name: form.name,
                slug: form.slug,
                description: form.description,
                fields: form.fields,
                settings: form.settings,
                branding: form.branding,
                targetType: form.targetType,
                workflowId: form.workflowId,
                agentId: form.agentId,
                agentContextTemplate: form.agentContextTemplate
            });
            set({ isDirty: false });
        } finally {
            set({ isSaving: false });
        }
    }

    // ... other implementations
}));

// Helper to create default field from type
function createFieldFromType(type: FormFieldType, order: number): FormField {
    const id = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (type) {
        case "text":
            return {
                id,
                type,
                order,
                label: "Text Field",
                placeholder: "",
                required: false,
                outputVariable: `text_${order}`
            };
        case "email":
            return {
                id,
                type,
                order,
                label: "Email",
                placeholder: "you@example.com",
                required: false,
                outputVariable: "email"
            };
        case "heading":
            return { id, type, order, text: "Section Title", level: 2 };
        case "divider":
            return { id, type, order };
        // ... other field types
    }
}
```

---

## Validation Strategy

### Client-Side Validation

```typescript
// frontend/src/lib/formValidation.ts
export function validateField(field: FormField, value: unknown): string | null {
    // Skip structure fields
    if (field.type === "heading" || field.type === "description" || field.type === "divider") {
        return null;
    }

    const inputField = field as
        | FormInputField
        | FormSelectField
        | FormCheckboxField
        | FormFileField;

    // Required check
    if (inputField.required) {
        if (value === undefined || value === null || value === "") {
            return `${inputField.label} is required`;
        }
        if (Array.isArray(value) && value.length === 0) {
            return `${inputField.label} is required`;
        }
    }

    // Type-specific validation
    if (value !== undefined && value !== null && value !== "") {
        switch (field.type) {
            case "email":
                if (!isValidEmail(String(value))) {
                    return "Please enter a valid email address";
                }
                break;
            case "phone":
                if (!isValidPhone(String(value))) {
                    return "Please enter a valid phone number";
                }
                break;
            case "number":
                const num = Number(value);
                const validation = (field as FormInputField).validation;
                if (validation?.min !== undefined && num < validation.min) {
                    return `Value must be at least ${validation.min}`;
                }
                if (validation?.max !== undefined && num > validation.max) {
                    return `Value must be at most ${validation.max}`;
                }
                break;
            case "text":
            case "textarea":
                const textValidation = (field as FormInputField).validation;
                const strValue = String(value);
                if (textValidation?.minLength && strValue.length < textValidation.minLength) {
                    return `Must be at least ${textValidation.minLength} characters`;
                }
                if (textValidation?.maxLength && strValue.length > textValidation.maxLength) {
                    return `Must be at most ${textValidation.maxLength} characters`;
                }
                if (textValidation?.pattern) {
                    const regex = new RegExp(textValidation.pattern);
                    if (!regex.test(strValue)) {
                        return textValidation.patternMessage || "Invalid format";
                    }
                }
                break;
            case "file":
                const fileField = field as FormFileField;
                const files = value as File[];
                if (fileField.maxFiles && files.length > fileField.maxFiles) {
                    return `Maximum ${fileField.maxFiles} files allowed`;
                }
                for (const file of files) {
                    if (fileField.maxSize && file.size > fileField.maxSize) {
                        return `File ${file.name} exceeds maximum size`;
                    }
                    if (
                        fileField.allowedTypes?.length &&
                        !fileField.allowedTypes.includes(file.type)
                    ) {
                        return `File type ${file.type} is not allowed`;
                    }
                }
                break;
        }
    }

    return null;
}

export function validateForm(
    form: FormInterface,
    data: Record<string, unknown>
): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const field of form.fields) {
        const error = validateField(field, data[field.id]);
        if (error) {
            errors[field.id] = error;
        }
    }

    return errors;
}
```

### Server-Side Validation

```typescript
// backend/src/api/routes/public/forms.ts
const submitFormSchema = z
    .object({
        // Data validated dynamically based on form fields
    })
    .passthrough();

async function validateSubmission(
    form: FormInterface,
    data: Record<string, unknown>,
    files: UploadedFile[]
): Promise<{ valid: boolean; errors: Record<string, string> }> {
    const errors: Record<string, string> = {};

    for (const field of form.fields) {
        if (!("outputVariable" in field)) continue;

        const value = data[field.id];

        // Required validation
        if (field.required && (value === undefined || value === null || value === "")) {
            errors[field.id] = `${field.label} is required`;
            continue;
        }

        // Type-specific validation (similar to client-side)
        // ... validation logic
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}
```

---

## Security Considerations

### Rate Limiting

```typescript
// backend/src/api/middleware/rateLimiter.ts
const formSubmissionLimits = new Map<string, { count: number; resetAt: number }>();

export function createFormRateLimiter(defaultLimit: number = 10) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const ip = request.ip;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute

        const entry = formSubmissionLimits.get(ip);

        if (entry && entry.resetAt > now) {
            if (entry.count >= defaultLimit) {
                reply.status(429).send({
                    success: false,
                    error: "Too many submissions. Please try again in a minute."
                });
                return;
            }
            entry.count++;
        } else {
            formSubmissionLimits.set(ip, {
                count: 1,
                resetAt: now + windowMs
            });
        }

        // Cleanup old entries periodically
        if (Math.random() < 0.01) {
            for (const [key, val] of formSubmissionLimits) {
                if (val.resetAt < now) {
                    formSubmissionLimits.delete(key);
                }
            }
        }
    };
}
```

### File Upload Security

```typescript
// Allowed MIME types for form file uploads
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv"
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB per submission
const MAX_FILES_PER_SUBMISSION = 10;
```

### Slug Validation

```typescript
// Prevent reserved slugs
const RESERVED_SLUGS = [
    "api",
    "admin",
    "forms",
    "login",
    "logout",
    "signup",
    "settings",
    "dashboard",
    "workflows",
    "agents",
    "help"
];

function validateSlug(slug: string): boolean {
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
        return false;
    }
    // Only allow alphanumeric, hyphens, max 100 chars
    return /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/.test(slug);
}
```

---

## Reference Files

These existing codebase files should be referenced during implementation:

| Pattern                   | Reference File                                                  |
| ------------------------- | --------------------------------------------------------------- |
| Model definitions         | `backend/src/storage/models/Trigger.ts`                         |
| Repository pattern        | `backend/src/storage/repositories/TriggerRepository.ts`         |
| API route structure       | `backend/src/api/routes/triggers/webhook.ts`                    |
| Public endpoint (no auth) | `backend/src/api/routes/triggers/webhook.ts`                    |
| GCS file uploads          | `backend/src/services/storage/GCSStorageService.ts`             |
| Drag-and-drop UI          | `frontend/src/canvas/panels/NodeLibrary.tsx`                    |
| Zustand store pattern     | `frontend/src/stores/workflowStore.ts`                          |
| Agent execution           | `backend/src/temporal/workflows/agent-orchestrator-workflow.ts` |
| Workflow execution        | `backend/src/temporal/workflows/orchestrator-workflow.ts`       |

---

## Key Design Decisions

1. **Unified Form Interface**: Single form entity can target workflow OR agent
2. **JSONB for Flexibility**: Fields, settings, branding stored as JSONB
3. **Path-Based URLs**: Public forms at `/f/{slug}`
4. **GCS for Files**: Reuse existing infrastructure
5. **Rate Limiting Only**: Simple IP-based, no CAPTCHA
6. **No Conditional Logic**: MVP simplicity
7. **Agent Context Templates**: Customizable how form data is presented to agents
8. **Post-Submit Chat**: Agent-linked forms can redirect to conversation
9. **Dual Entry Points**: Create from `/forms`, workflow editor, or agent builder
