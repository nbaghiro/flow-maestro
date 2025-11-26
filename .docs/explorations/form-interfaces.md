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
