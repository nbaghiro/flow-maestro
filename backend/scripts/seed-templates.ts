/**
 * Seed Script for Workflow Templates
 *
 * Populates the workflow_templates table with 24 pre-built templates
 * across 5 categories: marketing, sales, operations, engineering, support
 *
 * Run with: npx tsx backend/scripts/seed-templates.ts
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { Pool } from "pg";

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Template-specific node type (React Flow compatible)
interface TemplateNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

// Template-specific edge type
interface TemplateEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

// Template definition (stored as JSON, compatible with React Flow)
interface TemplateDefinition {
    name: string;
    nodes: TemplateNode[];
    edges: TemplateEdge[];
}

interface TemplateData {
    name: string;
    description: string;
    definition: TemplateDefinition;
    category: string;
    tags: string[];
    required_integrations: string[];
    featured?: boolean;
}

// Helper to create node positions in a flow layout
function createPosition(index: number, columns = 3): { x: number; y: number } {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return { x: 100 + col * 300, y: 100 + row * 180 };
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

const templates: TemplateData[] = [
    // ========================================================================
    // MARKETING (3 templates)
    // ========================================================================
    {
        name: "Social Media Mention → Lead Capture Pipeline",
        description:
            "Automatically capture leads from social mentions, analyze sentiment with AI, and route to appropriate teams. Positive mentions create HubSpot contacts, negative ones alert support.",
        category: "marketing",
        tags: ["social media", "lead generation", "sentiment analysis", "automation"],
        required_integrations: ["hubspot", "slack", "gmail", "google_sheets", "airtable"],
        featured: true,
        definition: {
            name: "Social Media Mention → Lead Capture Pipeline",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Webhook Input", outputVariable: "mention_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Analyze Sentiment",
                        prompt: "Analyze the following social media mention and extract: sentiment (positive/negative/neutral), intent (purchase_interest/complaint/question/other), key topics. Return as JSON.\n\nMention: {{mention_data.text}}",
                        outputVariable: "analysis"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(2),
                    data: {
                        label: "Route by Sentiment",
                        condition: "analysis.sentiment === 'positive'"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Create HubSpot Contact",
                        provider: "hubspot",
                        operation: "createContact"
                    }
                },
                {
                    id: "integration-slack-sales",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Notify Sales",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#sales-leads" }
                    }
                },
                {
                    id: "integration-slack-support",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Alert Support",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#support" }
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Log to Sheets",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "conditional-1" },
                {
                    id: "e3",
                    source: "conditional-1",
                    target: "integration-hubspot",
                    sourceHandle: "true"
                },
                { id: "e4", source: "integration-hubspot", target: "integration-slack-sales" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack-support",
                    sourceHandle: "false"
                },
                { id: "e6", source: "integration-slack-sales", target: "integration-sheets" },
                { id: "e7", source: "integration-slack-support", target: "integration-sheets" }
            ]
        }
    },
    {
        name: "Weekly Campaign Performance Report",
        description:
            "Automatically compile marketing metrics every Monday, generate AI-powered insights, and distribute formatted reports via email and Slack.",
        category: "marketing",
        tags: ["analytics", "reporting", "automation", "scheduled"],
        required_integrations: ["google_sheets", "gmail", "slack"],
        definition: {
            name: "Weekly Campaign Performance Report",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Schedule Trigger", outputVariable: "trigger_data" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(1),
                    data: {
                        label: "Fetch Analytics",
                        method: "GET",
                        outputVariable: "analytics_data"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Get Budget Data",
                        provider: "google_sheets",
                        operation: "getRows"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(3),
                    data: {
                        label: "Generate Summary",
                        prompt: "Create an executive summary of this marketing campaign data. Highlight key wins, areas of concern, and recommendations.\n\nAnalytics: {{analytics_data}}\nBudget: {{budget_data}}",
                        outputVariable: "summary"
                    }
                },
                {
                    id: "transform-1",
                    type: "transform",
                    position: createPosition(4),
                    data: { label: "Format Report", outputVariable: "report" }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(5),
                    data: { label: "Email Report", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Post Highlights",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#marketing" }
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "http-1" },
                { id: "e2", source: "http-1", target: "integration-sheets" },
                { id: "e3", source: "integration-sheets", target: "llm-1" },
                { id: "e4", source: "llm-1", target: "transform-1" },
                { id: "e5", source: "transform-1", target: "integration-gmail" },
                { id: "e6", source: "integration-gmail", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Content Calendar → Multi-Channel Distribution",
        description:
            "Automatically publish content from your Notion content calendar to multiple channels based on content type (blog, social, email).",
        category: "marketing",
        tags: ["content", "publishing", "notion", "multi-channel"],
        required_integrations: ["notion", "gmail", "slack"],
        definition: {
            name: "Content Calendar → Multi-Channel Distribution",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Schedule Trigger", outputVariable: "trigger_data" }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(1),
                    data: {
                        label: "Query Content DB",
                        provider: "notion",
                        operation: "queryDatabase"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(2),
                    data: { label: "For Each Content", iterateOver: "content_items" }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(3),
                    data: { label: "Check Type", condition: "item.type === 'blog'" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(4),
                    data: { label: "Publish to CMS", method: "POST" }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Create Email Draft",
                        provider: "gmail",
                        operation: "createDraft"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#content" }
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-notion" },
                { id: "e2", source: "integration-notion", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "conditional-1" },
                { id: "e4", source: "conditional-1", target: "http-1", sourceHandle: "true" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-gmail",
                    sourceHandle: "false"
                },
                { id: "e6", source: "http-1", target: "integration-slack" },
                { id: "e7", source: "integration-gmail", target: "integration-slack" }
            ]
        }
    },

    // ========================================================================
    // SALES (3 templates)
    // ========================================================================
    {
        name: "Inbound Lead Qualification & Routing",
        description:
            "AI-powered lead scoring and intelligent routing based on company size, role, and intent. High-value leads get immediate attention, others enter nurture sequences.",
        category: "sales",
        tags: ["lead scoring", "qualification", "routing", "AI"],
        required_integrations: ["hubspot", "slack", "google_calendar", "airtable", "gmail"],
        featured: true,
        definition: {
            name: "Inbound Lead Qualification & Routing",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "HubSpot Webhook", outputVariable: "lead_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Score Lead",
                        prompt: "Score this lead from 0-100 based on: company size, job title seniority, message intent. Return JSON with score and reasoning.\n\nLead: {{lead_data}}",
                        outputVariable: "lead_score"
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(2),
                    data: {
                        label: "Route by Score",
                        cases: [
                            { value: "high", condition: "lead_score.score >= 80" },
                            { value: "medium", condition: "lead_score.score >= 50" },
                            { value: "low", condition: "lead_score.score < 50" }
                        ]
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Alert Sales Team",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#sales-hot-leads" }
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Create Meeting Slot",
                        provider: "google_calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Add to Nurture",
                        provider: "hubspot",
                        operation: "enrollInWorkflow"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Log to Marketing List",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Send Acknowledgment",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "switch-1" },
                { id: "e3", source: "switch-1", target: "integration-slack", sourceHandle: "high" },
                { id: "e4", source: "integration-slack", target: "integration-calendar" },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-hubspot",
                    sourceHandle: "medium"
                },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-airtable",
                    sourceHandle: "low"
                },
                { id: "e7", source: "integration-calendar", target: "integration-gmail" },
                { id: "e8", source: "integration-hubspot", target: "integration-gmail" },
                { id: "e9", source: "integration-airtable", target: "integration-gmail" }
            ]
        }
    },
    {
        name: "Deal Stage Change → Team Notifications",
        description:
            "Automatically notify relevant teams and create tasks when deals progress through your pipeline. Keep sales, legal, finance, and customer success aligned.",
        category: "sales",
        tags: ["deal tracking", "notifications", "CRM", "collaboration"],
        required_integrations: ["linear", "slack", "gmail", "notion", "airtable", "google_sheets"],
        definition: {
            name: "Deal Stage Change → Team Notifications",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Deal Update Webhook", outputVariable: "deal_data" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(1),
                    data: {
                        label: "Route by Stage",
                        cases: [
                            { value: "proposal", condition: "deal_data.stage === 'proposal_sent'" },
                            {
                                value: "negotiation",
                                condition: "deal_data.stage === 'negotiation'"
                            },
                            { value: "closed_won", condition: "deal_data.stage === 'closed_won'" },
                            { value: "closed_lost", condition: "deal_data.stage === 'closed_lost'" }
                        ]
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Create Legal Review Task",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-slack-finance",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Notify Finance",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#finance" }
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Email Customer Success",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Create Onboarding Doc",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Log Loss Reason",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Update Pipeline Tracker",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "switch-1" },
                {
                    id: "e2",
                    source: "switch-1",
                    target: "integration-linear",
                    sourceHandle: "proposal"
                },
                {
                    id: "e3",
                    source: "switch-1",
                    target: "integration-slack-finance",
                    sourceHandle: "negotiation"
                },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-gmail",
                    sourceHandle: "closed_won"
                },
                { id: "e5", source: "integration-gmail", target: "integration-notion" },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-airtable",
                    sourceHandle: "closed_lost"
                },
                { id: "e7", source: "integration-linear", target: "integration-sheets" },
                { id: "e8", source: "integration-slack-finance", target: "integration-sheets" },
                { id: "e9", source: "integration-notion", target: "integration-sheets" },
                { id: "e10", source: "integration-airtable", target: "integration-sheets" }
            ]
        }
    },
    {
        name: "Meeting No-Show Recovery",
        description:
            "Automatically detect missed meetings and send timely follow-ups to reschedule. Includes wait delays and rep notifications.",
        category: "sales",
        tags: ["meetings", "follow-up", "recovery", "automation"],
        required_integrations: ["google_calendar", "hubspot", "gmail", "slack"],
        definition: {
            name: "Meeting No-Show Recovery",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Schedule Trigger", outputVariable: "trigger_data" }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(1),
                    data: {
                        label: "Get Past Meetings",
                        provider: "google_calendar",
                        operation: "getEvents"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Check Meeting Logged",
                        provider: "hubspot",
                        operation: "getEngagements"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(3),
                    data: { label: "Meeting Occurred?", condition: "meeting_logged === false" }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: createPosition(4),
                    data: { label: "Wait 15 min", duration: 15, unit: "minutes" }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Send Reschedule Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-hubspot-note",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Add No-Show Note",
                        provider: "hubspot",
                        operation: "createNote"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(7),
                    data: { label: "Notify Rep", provider: "slack", operation: "sendDirectMessage" }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-calendar" },
                { id: "e2", source: "integration-calendar", target: "integration-hubspot" },
                { id: "e3", source: "integration-hubspot", target: "conditional-1" },
                { id: "e4", source: "conditional-1", target: "wait-1", sourceHandle: "true" },
                { id: "e5", source: "wait-1", target: "integration-gmail" },
                { id: "e6", source: "integration-gmail", target: "integration-hubspot-note" },
                { id: "e7", source: "integration-hubspot-note", target: "integration-slack" }
            ]
        }
    },

    // ========================================================================
    // OPERATIONS (3 templates)
    // ========================================================================
    {
        name: "Vendor Invoice Processing",
        description:
            "AI-powered invoice data extraction with automatic approval routing based on amount thresholds and PO matching.",
        category: "operations",
        tags: ["invoices", "approval", "AI", "finance"],
        required_integrations: ["gmail", "airtable", "slack", "google_sheets"],
        definition: {
            name: "Vendor Invoice Processing",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Invoice Email", outputVariable: "email_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Extract Invoice Data",
                        prompt: "Extract from this invoice: vendor name, amount, due date, line items, PO number if present. Return as JSON.\n\nInvoice: {{email_data.body}}",
                        outputVariable: "invoice_data"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Match to Vendor/PO",
                        provider: "airtable",
                        operation: "findRecords"
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(3),
                    data: {
                        label: "Route by Amount",
                        cases: [
                            {
                                value: "auto",
                                condition: "invoice_data.amount < 1000 && po_matched"
                            },
                            {
                                value: "manager",
                                condition:
                                    "invoice_data.amount >= 1000 && invoice_data.amount < 10000"
                            },
                            {
                                value: "director",
                                condition: "invoice_data.amount >= 10000 || !po_matched"
                            }
                        ]
                    }
                },
                {
                    id: "integration-sheets-auto",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Auto-Approve & Log",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "integration-slack-manager",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Request Manager Approval",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#approvals" }
                    }
                },
                {
                    id: "integration-slack-director",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Escalate to Director",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#finance-urgent" }
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(7),
                    data: { label: "Confirm to Vendor", provider: "gmail", operation: "sendEmail" }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "integration-airtable" },
                { id: "e3", source: "integration-airtable", target: "switch-1" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-sheets-auto",
                    sourceHandle: "auto"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-slack-manager",
                    sourceHandle: "manager"
                },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-slack-director",
                    sourceHandle: "director"
                },
                { id: "e7", source: "integration-sheets-auto", target: "integration-gmail" }
            ]
        }
    },
    {
        name: "Employee Onboarding Automation",
        description:
            "Streamline new hire onboarding with automatic account creation, welcome messages, and task setup across all your tools.",
        category: "operations",
        tags: ["HR", "onboarding", "automation", "new hire"],
        required_integrations: [
            "slack",
            "google_calendar",
            "notion",
            "linear",
            "gmail",
            "airtable"
        ],
        featured: true,
        definition: {
            name: "Employee Onboarding Automation",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "New Employee Webhook", outputVariable: "employee_data" }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(1),
                    data: { label: "Setup Tasks", iterateOver: "onboarding_tasks" }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(2),
                    data: { label: "Invite to Slack", provider: "slack", operation: "inviteUser" }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Create Onboarding Meetings",
                        provider: "google_calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Create Employee Page",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Create Task List",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(6),
                    data: { label: "Send Welcome Email", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Add to Directory",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-slack-notify",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Notify Manager",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "loop-1" },
                { id: "e2", source: "loop-1", target: "integration-slack" },
                { id: "e3", source: "integration-slack", target: "integration-calendar" },
                { id: "e4", source: "integration-calendar", target: "integration-notion" },
                { id: "e5", source: "integration-notion", target: "integration-linear" },
                { id: "e6", source: "integration-linear", target: "integration-gmail" },
                { id: "e7", source: "integration-gmail", target: "integration-airtable" },
                { id: "e8", source: "integration-airtable", target: "integration-slack-notify" }
            ]
        }
    },
    {
        name: "Inventory Alert & Reorder System",
        description:
            "Daily inventory monitoring with automatic alerts for low stock, reorder queue management, and weekly trend analysis.",
        category: "operations",
        tags: ["inventory", "alerts", "supply chain", "automation"],
        required_integrations: ["slack", "gmail", "airtable", "google_sheets"],
        definition: {
            name: "Inventory Alert & Reorder System",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Daily Schedule", outputVariable: "trigger_data" }
                },
                {
                    id: "database-1",
                    type: "database",
                    position: createPosition(1),
                    data: { label: "Query Low Stock", outputVariable: "low_stock_items" }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(2),
                    data: { label: "For Each Item", iterateOver: "low_stock_items" }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(3),
                    data: { label: "Check Criticality", condition: "item.criticality === 'high'" }
                },
                {
                    id: "integration-slack-urgent",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Urgent Alert",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#operations-urgent" }
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(5),
                    data: { label: "Email Supplier", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Add to Reorder Queue",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Update Inventory Report",
                        provider: "google_sheets",
                        operation: "updateRow"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(8),
                    data: {
                        label: "Generate Trend Analysis",
                        prompt: "Analyze inventory trends and provide recommendations: {{inventory_data}}",
                        outputVariable: "analysis"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "database-1" },
                { id: "e2", source: "database-1", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "conditional-1" },
                {
                    id: "e4",
                    source: "conditional-1",
                    target: "integration-slack-urgent",
                    sourceHandle: "true"
                },
                { id: "e5", source: "integration-slack-urgent", target: "integration-gmail" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-airtable",
                    sourceHandle: "false"
                },
                { id: "e7", source: "integration-gmail", target: "integration-sheets" },
                { id: "e8", source: "integration-airtable", target: "integration-sheets" },
                { id: "e9", source: "integration-sheets", target: "llm-1" }
            ]
        }
    },

    // ========================================================================
    // ENGINEERING (3 templates)
    // ========================================================================
    {
        name: "PR Review & Deployment Notifications",
        description:
            "Keep your engineering team informed about PR status, reviews, and deployments with smart notifications and issue linking.",
        category: "engineering",
        tags: ["GitHub", "CI/CD", "notifications", "DevOps"],
        required_integrations: ["github", "slack", "linear", "airtable"],
        featured: true,
        definition: {
            name: "PR Review & Deployment Notifications",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "GitHub Webhook", outputVariable: "github_event" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(1),
                    data: {
                        label: "Route by Event",
                        cases: [
                            { value: "pr_opened", condition: "github_event.action === 'opened'" },
                            {
                                value: "review_requested",
                                condition: "github_event.action === 'review_requested'"
                            },
                            {
                                value: "merged",
                                condition: "github_event.action === 'closed' && merged"
                            },
                            {
                                value: "deploy_failed",
                                condition: "github_event.deployment_status === 'failure'"
                            }
                        ]
                    }
                },
                {
                    id: "integration-slack-team",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Notify Team",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#engineering" }
                    }
                },
                {
                    id: "integration-linear-link",
                    type: "integration",
                    position: createPosition(3),
                    data: { label: "Link to Issue", provider: "linear", operation: "updateIssue" }
                },
                {
                    id: "integration-slack-dm",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "DM Reviewer",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-linear-status",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Update Issue Status",
                        provider: "linear",
                        operation: "updateIssue"
                    }
                },
                {
                    id: "integration-slack-urgent",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Alert - Deploy Failed",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#deployments" }
                    }
                },
                {
                    id: "integration-linear-bug",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Create Bug Issue",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(8),
                    data: { label: "Log Event", provider: "airtable", operation: "createRecord" }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "switch-1" },
                {
                    id: "e2",
                    source: "switch-1",
                    target: "integration-slack-team",
                    sourceHandle: "pr_opened"
                },
                { id: "e3", source: "integration-slack-team", target: "integration-linear-link" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-slack-dm",
                    sourceHandle: "review_requested"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-linear-status",
                    sourceHandle: "merged"
                },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-slack-urgent",
                    sourceHandle: "deploy_failed"
                },
                { id: "e7", source: "integration-slack-urgent", target: "integration-linear-bug" },
                { id: "e8", source: "integration-linear-link", target: "integration-airtable" },
                { id: "e9", source: "integration-slack-dm", target: "integration-airtable" },
                { id: "e10", source: "integration-linear-status", target: "integration-airtable" },
                { id: "e11", source: "integration-linear-bug", target: "integration-airtable" }
            ]
        }
    },
    {
        name: "On-Call Incident Response Automation",
        description:
            "Automated incident triage with AI severity classification, incident channel creation, and stakeholder notifications.",
        category: "engineering",
        tags: ["incident response", "on-call", "alerts", "DevOps"],
        required_integrations: ["slack", "linear", "notion", "google_calendar"],
        definition: {
            name: "On-Call Incident Response Automation",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Alert Webhook", outputVariable: "alert_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Classify Severity",
                        prompt: "Classify this alert: severity (critical/high/medium/low), affected systems, potential impact. Return as JSON.\n\nAlert: {{alert_data}}",
                        outputVariable: "classification"
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(2),
                    data: {
                        label: "Route by Severity",
                        cases: [
                            {
                                value: "critical",
                                condition: "classification.severity === 'critical'"
                            },
                            { value: "high", condition: "classification.severity === 'high'" },
                            { value: "medium", condition: "classification.severity === 'medium'" }
                        ]
                    }
                },
                {
                    id: "integration-slack-channel",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Create Incident Channel",
                        provider: "slack",
                        operation: "createChannel"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Schedule War Room",
                        provider: "google_calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "integration-slack-oncall",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Alert On-Call",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#oncall" }
                    }
                },
                {
                    id: "integration-linear-p1",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Create P1 Issue",
                        provider: "linear",
                        operation: "createIssue",
                        parameters: { priority: 1 }
                    }
                },
                {
                    id: "integration-linear-p2",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Create P2 Issue",
                        provider: "linear",
                        operation: "createIssue",
                        parameters: { priority: 2 }
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Create Incident Page",
                        provider: "notion",
                        operation: "createPage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "switch-1" },
                {
                    id: "e3",
                    source: "switch-1",
                    target: "integration-slack-channel",
                    sourceHandle: "critical"
                },
                { id: "e4", source: "integration-slack-channel", target: "integration-calendar" },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-slack-oncall",
                    sourceHandle: "high"
                },
                { id: "e6", source: "integration-slack-oncall", target: "integration-linear-p1" },
                {
                    id: "e7",
                    source: "switch-1",
                    target: "integration-linear-p2",
                    sourceHandle: "medium"
                },
                { id: "e8", source: "integration-calendar", target: "integration-notion" },
                { id: "e9", source: "integration-linear-p1", target: "integration-notion" },
                { id: "e10", source: "integration-linear-p2", target: "integration-notion" }
            ]
        }
    },
    {
        name: "Security Vulnerability Triage",
        description:
            "Automated security vulnerability assessment with AI-powered exploitability analysis and priority-based issue creation.",
        category: "engineering",
        tags: ["security", "vulnerabilities", "triage", "DevSecOps"],
        required_integrations: ["github", "linear", "slack", "airtable", "google_sheets"],
        definition: {
            name: "Security Vulnerability Triage",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Vulnerability Report", outputVariable: "vuln_data" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(1),
                    data: {
                        label: "Fetch Full Report",
                        method: "GET",
                        outputVariable: "full_report"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(2),
                    data: {
                        label: "Assess Exploitability",
                        prompt: "Assess this vulnerability: exploitability (high/medium/low), attack vector, affected components, recommended fix priority. Return as JSON.\n\nVulnerability: {{vuln_data}}",
                        outputVariable: "assessment"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(3),
                    data: { label: "For Each Vuln", iterateOver: "vulnerabilities" }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(4),
                    data: {
                        label: "Critical + Exploitable?",
                        condition:
                            "(assessment.severity === 'critical' || assessment.severity === 'high') && assessment.exploitability === 'high'"
                    }
                },
                {
                    id: "integration-linear-p0",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Create P0 Issue",
                        provider: "linear",
                        operation: "createIssue",
                        parameters: { priority: 0 }
                    }
                },
                {
                    id: "integration-slack-security",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Alert Security Team",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#security" }
                    }
                },
                {
                    id: "integration-linear-p2",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Create P2 Issue",
                        provider: "linear",
                        operation: "createIssue",
                        parameters: { priority: 2 }
                    }
                },
                {
                    id: "integration-github",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Create GitHub Issue",
                        provider: "github",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Update Dashboard",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "http-1" },
                { id: "e2", source: "http-1", target: "llm-1" },
                { id: "e3", source: "llm-1", target: "loop-1" },
                { id: "e4", source: "loop-1", target: "conditional-1" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-linear-p0",
                    sourceHandle: "true"
                },
                { id: "e6", source: "integration-linear-p0", target: "integration-slack-security" },
                {
                    id: "e7",
                    source: "conditional-1",
                    target: "integration-linear-p2",
                    sourceHandle: "false"
                },
                { id: "e8", source: "integration-slack-security", target: "integration-github" },
                { id: "e9", source: "integration-linear-p2", target: "integration-github" },
                { id: "e10", source: "integration-github", target: "integration-sheets" }
            ]
        }
    },

    // ========================================================================
    // SUPPORT (3 templates)
    // ========================================================================
    {
        name: "Smart Ticket Routing & Escalation",
        description:
            "AI-powered ticket classification with intelligent routing based on category, sentiment, urgency, and customer tier.",
        category: "support",
        tags: ["ticketing", "routing", "AI", "customer service"],
        required_integrations: ["hubspot", "slack", "linear", "gmail", "airtable", "notion"],
        featured: true,
        definition: {
            name: "Smart Ticket Routing & Escalation",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Support Ticket", outputVariable: "ticket_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Classify Ticket",
                        prompt: "Classify this support ticket: category (technical/billing/general), sentiment (positive/negative/neutral), urgency (high/medium/low), expertise_needed (engineering/finance/support). Return as JSON.\n\nTicket: {{ticket_data}}",
                        outputVariable: "classification"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Get Customer Tier",
                        provider: "hubspot",
                        operation: "getContact"
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(3),
                    data: {
                        label: "Route by Classification",
                        cases: [
                            {
                                value: "enterprise_urgent",
                                condition:
                                    "customer_tier === 'enterprise' && classification.urgency === 'high'"
                            },
                            {
                                value: "technical",
                                condition: "classification.category === 'technical'"
                            },
                            {
                                value: "billing",
                                condition: "classification.category === 'billing'"
                            },
                            { value: "general", condition: "true" }
                        ]
                    }
                },
                {
                    id: "integration-slack-senior",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "DM Senior Agent",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Create Eng Issue",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-slack-eng",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Notify Eng Support",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#eng-support" }
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(7),
                    data: { label: "Forward to Finance", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(8),
                    data: { label: "Add to Queue", provider: "airtable", operation: "createRecord" }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Update Customer Context",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-gmail-ack",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Send Acknowledgment",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "integration-hubspot" },
                { id: "e3", source: "integration-hubspot", target: "switch-1" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-slack-senior",
                    sourceHandle: "enterprise_urgent"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-linear",
                    sourceHandle: "technical"
                },
                { id: "e6", source: "integration-linear", target: "integration-slack-eng" },
                {
                    id: "e7",
                    source: "switch-1",
                    target: "integration-gmail",
                    sourceHandle: "billing"
                },
                {
                    id: "e8",
                    source: "switch-1",
                    target: "integration-airtable",
                    sourceHandle: "general"
                },
                { id: "e9", source: "integration-slack-senior", target: "integration-notion" },
                { id: "e10", source: "integration-slack-eng", target: "integration-notion" },
                { id: "e11", source: "integration-gmail", target: "integration-notion" },
                { id: "e12", source: "integration-airtable", target: "integration-notion" },
                { id: "e13", source: "integration-notion", target: "integration-gmail-ack" }
            ]
        }
    },
    {
        name: "Customer Churn Risk Detection",
        description:
            "Daily analysis of customer health signals with AI-powered churn scoring and proactive retention workflows.",
        category: "support",
        tags: ["churn", "retention", "AI", "customer success"],
        required_integrations: ["hubspot", "slack", "gmail", "linear", "airtable", "google_sheets"],
        definition: {
            name: "Customer Churn Risk Detection",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Daily Schedule", outputVariable: "trigger_data" }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(1),
                    data: {
                        label: "Get Active Customers",
                        provider: "hubspot",
                        operation: "getCompanies"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(2),
                    data: { label: "For Each Customer", iterateOver: "customers" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(3),
                    data: { label: "Fetch Usage Data", method: "GET", outputVariable: "usage_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(4),
                    data: {
                        label: "Calculate Churn Risk",
                        prompt: "Calculate churn risk score (0-100) based on: usage decline, support ticket sentiment, payment issues. Explain the main risk factors. Return as JSON.\n\nUsage: {{usage_data}}\nCustomer: {{customer}}",
                        outputVariable: "churn_score"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(5),
                    data: { label: "High Risk?", condition: "churn_score.score >= 70" }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Alert CS Team",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#customer-success" }
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Email Account Manager",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Create Retention Task",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Add to Watch List",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Update Dashboard",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-hubspot" },
                { id: "e2", source: "integration-hubspot", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "http-1" },
                { id: "e4", source: "http-1", target: "llm-1" },
                { id: "e5", source: "llm-1", target: "conditional-1" },
                {
                    id: "e6",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e7", source: "integration-slack", target: "integration-gmail" },
                { id: "e8", source: "integration-gmail", target: "integration-linear" },
                {
                    id: "e9",
                    source: "conditional-1",
                    target: "integration-airtable",
                    sourceHandle: "false"
                },
                { id: "e10", source: "integration-linear", target: "integration-sheets" },
                { id: "e11", source: "integration-airtable", target: "integration-sheets" }
            ]
        }
    },
    {
        name: "Customer Feedback Loop to Product",
        description:
            "Automatically extract insights from customer feedback, route to appropriate teams, and create actionable items.",
        category: "support",
        tags: ["feedback", "product", "insights", "automation"],
        required_integrations: ["gmail", "linear", "notion", "slack", "hubspot", "airtable"],
        definition: {
            name: "Customer Feedback Loop to Product",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Feedback Input", outputVariable: "feedback_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Extract Insights",
                        prompt: "Extract from this feedback: themes, feature_requests, pain_points, sentiment, feedback_type (bug/feature/praise/complaint). Return as JSON.\n\nFeedback: {{feedback_data}}",
                        outputVariable: "insights"
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(2),
                    data: {
                        label: "Route by Type",
                        cases: [
                            { value: "bug", condition: "insights.feedback_type === 'bug'" },
                            { value: "feature", condition: "insights.feedback_type === 'feature'" },
                            { value: "praise", condition: "insights.feedback_type === 'praise'" },
                            {
                                value: "complaint",
                                condition: "insights.feedback_type === 'complaint'"
                            }
                        ]
                    }
                },
                {
                    id: "integration-linear",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Create Bug Issue",
                        provider: "linear",
                        operation: "createIssue"
                    }
                },
                {
                    id: "integration-slack-bugs",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Notify #bugs",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#bugs" }
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Add to Feature DB",
                        provider: "notion",
                        operation: "createPage"
                    }
                },
                {
                    id: "integration-slack-wins",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Share in #wins",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#wins" }
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Add Testimonial Tag",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "integration-slack-cs",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Alert CS",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#customer-success" }
                    }
                },
                {
                    id: "integration-gmail",
                    type: "integration",
                    position: createPosition(9),
                    data: { label: "Send Follow-up", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(10),
                    data: { label: "Log Feedback", provider: "airtable", operation: "createRecord" }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "switch-1" },
                { id: "e3", source: "switch-1", target: "integration-linear", sourceHandle: "bug" },
                { id: "e4", source: "integration-linear", target: "integration-slack-bugs" },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-notion",
                    sourceHandle: "feature"
                },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-slack-wins",
                    sourceHandle: "praise"
                },
                { id: "e7", source: "integration-slack-wins", target: "integration-hubspot" },
                {
                    id: "e8",
                    source: "switch-1",
                    target: "integration-slack-cs",
                    sourceHandle: "complaint"
                },
                { id: "e9", source: "integration-slack-cs", target: "integration-gmail" },
                { id: "e10", source: "integration-slack-bugs", target: "integration-airtable" },
                { id: "e11", source: "integration-notion", target: "integration-airtable" },
                { id: "e12", source: "integration-hubspot", target: "integration-airtable" },
                { id: "e13", source: "integration-gmail", target: "integration-airtable" }
            ]
        }
    },

    // ========================================================================
    // SALES - Additional (3 templates, formerly E-Commerce)
    // ========================================================================
    {
        name: "Order Fulfillment & Status Notifications",
        description:
            "Keep customers informed throughout the order lifecycle with automatic status notifications and CRM updates.",
        category: "sales",
        tags: ["orders", "fulfillment", "notifications", "customer experience"],
        required_integrations: ["gmail", "google_sheets", "slack", "airtable", "hubspot"],
        definition: {
            name: "Order Fulfillment & Status Notifications",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Order Status Webhook", outputVariable: "order_data" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(1),
                    data: {
                        label: "Route by Status",
                        cases: [
                            { value: "placed", condition: "order_data.status === 'placed'" },
                            { value: "shipped", condition: "order_data.status === 'shipped'" },
                            { value: "delivered", condition: "order_data.status === 'delivered'" },
                            { value: "returned", condition: "order_data.status === 'returned'" }
                        ]
                    }
                },
                {
                    id: "integration-gmail-confirm",
                    type: "integration",
                    position: createPosition(2),
                    data: { label: "Order Confirmation", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Log to Orders Sheet",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "integration-gmail-shipped",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Shipping Notification",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Notify Fulfillment",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#fulfillment" }
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: createPosition(6),
                    data: { label: "Wait 3 Days", duration: 3, unit: "days" }
                },
                {
                    id: "integration-gmail-review",
                    type: "integration",
                    position: createPosition(7),
                    data: { label: "Request Review", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(8),
                    data: { label: "Log Return", provider: "airtable", operation: "createRecord" }
                },
                {
                    id: "integration-slack-cs",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Alert CS",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#customer-success" }
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Update Customer Stage",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "switch-1" },
                {
                    id: "e2",
                    source: "switch-1",
                    target: "integration-gmail-confirm",
                    sourceHandle: "placed"
                },
                { id: "e3", source: "integration-gmail-confirm", target: "integration-sheets" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-gmail-shipped",
                    sourceHandle: "shipped"
                },
                { id: "e5", source: "integration-gmail-shipped", target: "integration-slack" },
                { id: "e6", source: "switch-1", target: "wait-1", sourceHandle: "delivered" },
                { id: "e7", source: "wait-1", target: "integration-gmail-review" },
                {
                    id: "e8",
                    source: "switch-1",
                    target: "integration-airtable",
                    sourceHandle: "returned"
                },
                { id: "e9", source: "integration-airtable", target: "integration-slack-cs" },
                { id: "e10", source: "integration-sheets", target: "integration-hubspot" },
                { id: "e11", source: "integration-slack", target: "integration-hubspot" },
                { id: "e12", source: "integration-gmail-review", target: "integration-hubspot" },
                { id: "e13", source: "integration-slack-cs", target: "integration-hubspot" }
            ]
        }
    },
    {
        name: "Abandoned Cart Recovery Sequence",
        description:
            "Multi-step email sequence to recover abandoned carts with timed delays, cart status checks, and conversion tracking.",
        category: "sales",
        tags: ["abandoned cart", "email marketing", "recovery", "automation"],
        required_integrations: ["gmail", "airtable", "hubspot"],
        definition: {
            name: "Abandoned Cart Recovery Sequence",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Cart Abandoned", outputVariable: "cart_data" }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: createPosition(1),
                    data: { label: "Wait 1 Hour", duration: 1, unit: "hours" }
                },
                {
                    id: "http-check",
                    type: "http",
                    position: createPosition(2),
                    data: {
                        label: "Check Cart Status",
                        method: "GET",
                        outputVariable: "cart_status"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(3),
                    data: {
                        label: "Still Abandoned?",
                        condition: "cart_status.completed === false"
                    }
                },
                {
                    id: "integration-gmail-1",
                    type: "integration",
                    position: createPosition(4),
                    data: { label: "First Reminder", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "wait-2",
                    type: "wait",
                    position: createPosition(5),
                    data: { label: "Wait 24 Hours", duration: 24, unit: "hours" }
                },
                {
                    id: "integration-gmail-2",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Second Email + Discount",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "wait-3",
                    type: "wait",
                    position: createPosition(7),
                    data: { label: "Wait 48 Hours", duration: 48, unit: "hours" }
                },
                {
                    id: "integration-gmail-3",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Final Urgency Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Track Recovery",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Tag Contact",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "wait-1" },
                { id: "e2", source: "wait-1", target: "http-check" },
                { id: "e3", source: "http-check", target: "conditional-1" },
                {
                    id: "e4",
                    source: "conditional-1",
                    target: "integration-gmail-1",
                    sourceHandle: "true"
                },
                { id: "e5", source: "integration-gmail-1", target: "wait-2" },
                { id: "e6", source: "wait-2", target: "integration-gmail-2" },
                { id: "e7", source: "integration-gmail-2", target: "wait-3" },
                { id: "e8", source: "wait-3", target: "integration-gmail-3" },
                { id: "e9", source: "integration-gmail-3", target: "integration-airtable" },
                { id: "e10", source: "integration-airtable", target: "integration-hubspot" }
            ]
        }
    },
    {
        name: "Inventory Sync Across Channels",
        description:
            "Keep inventory synchronized across multiple sales channels with automatic updates and low-stock alerts.",
        category: "sales",
        tags: ["inventory", "multi-channel", "sync", "automation"],
        required_integrations: ["slack", "google_sheets"],
        definition: {
            name: "Inventory Sync Across Channels",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "15min Schedule", outputVariable: "trigger_data" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(1),
                    data: {
                        label: "Fetch Primary Inventory",
                        method: "GET",
                        outputVariable: "inventory"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(2),
                    data: { label: "For Each SKU", iterateOver: "inventory.items" }
                },
                {
                    id: "conditional-change",
                    type: "conditional",
                    position: createPosition(3),
                    data: {
                        label: "Quantity Changed?",
                        condition: "item.quantity !== item.previous_quantity"
                    }
                },
                {
                    id: "http-update",
                    type: "http",
                    position: createPosition(4),
                    data: { label: "Update Secondary Channels", method: "POST" }
                },
                {
                    id: "conditional-low",
                    type: "conditional",
                    position: createPosition(5),
                    data: { label: "Low Stock?", condition: "item.quantity <= item.reorder_point" }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Alert Purchasing",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#purchasing" }
                    }
                },
                {
                    id: "conditional-zero",
                    type: "conditional",
                    position: createPosition(7),
                    data: { label: "Out of Stock?", condition: "item.quantity === 0" }
                },
                {
                    id: "http-oos",
                    type: "http",
                    position: createPosition(8),
                    data: { label: "Mark Out-of-Stock", method: "POST" }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Log Sync Events",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "database-1",
                    type: "database",
                    position: createPosition(10),
                    data: { label: "Store History", operation: "insert" }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "http-1" },
                { id: "e2", source: "http-1", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "conditional-change" },
                {
                    id: "e4",
                    source: "conditional-change",
                    target: "http-update",
                    sourceHandle: "true"
                },
                { id: "e5", source: "http-update", target: "conditional-low" },
                {
                    id: "e6",
                    source: "conditional-low",
                    target: "integration-slack",
                    sourceHandle: "true"
                },
                { id: "e7", source: "integration-slack", target: "conditional-zero" },
                {
                    id: "e8",
                    source: "conditional-low",
                    target: "conditional-zero",
                    sourceHandle: "false"
                },
                { id: "e9", source: "conditional-zero", target: "http-oos", sourceHandle: "true" },
                { id: "e10", source: "http-oos", target: "integration-sheets" },
                {
                    id: "e11",
                    source: "conditional-zero",
                    target: "integration-sheets",
                    sourceHandle: "false"
                },
                { id: "e12", source: "integration-sheets", target: "database-1" }
            ]
        }
    },

    // ========================================================================
    // ENGINEERING - Additional (3 templates, formerly SaaS)
    // ========================================================================
    {
        name: "Trial-to-Paid Conversion Nurture",
        description:
            "Intelligent engagement-based nurturing for trial users with AI-powered scoring and personalized outreach.",
        category: "engineering",
        tags: ["trial", "conversion", "onboarding", "SaaS"],
        required_integrations: ["gmail", "slack", "hubspot", "notion"],
        definition: {
            name: "Trial-to-Paid Conversion Nurture",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Trial Started", outputVariable: "user_data" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(1),
                    data: {
                        label: "Fetch Activity Data",
                        method: "GET",
                        outputVariable: "activity"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(2),
                    data: {
                        label: "Score Engagement",
                        prompt: "Score this trial user's engagement (0-100) and identify any blockers. Return JSON with score, blockers, and recommended_action.\n\nActivity: {{activity}}\nUser: {{user_data}}",
                        outputVariable: "engagement"
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(3),
                    data: {
                        label: "Route by Score",
                        cases: [
                            {
                                value: "high_day7",
                                condition: "engagement.score >= 70 && days_remaining <= 7"
                            },
                            {
                                value: "low_day3",
                                condition: "engagement.score < 40 && days_remaining <= 11"
                            },
                            {
                                value: "inactive",
                                condition: "engagement.score === 0 && days_remaining <= 9"
                            },
                            { value: "trial_ending", condition: "days_remaining <= 2" }
                        ]
                    }
                },
                {
                    id: "integration-gmail-upgrade",
                    type: "integration",
                    position: createPosition(4),
                    data: { label: "Upgrade Incentive", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-gmail-help",
                    type: "integration",
                    position: createPosition(5),
                    data: { label: "Feature Highlight", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Alert CS for Outreach",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#customer-success" }
                    }
                },
                {
                    id: "integration-gmail-urgency",
                    type: "integration",
                    position: createPosition(7),
                    data: { label: "Urgency + Offer", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Update Lead Score",
                        provider: "hubspot",
                        operation: "updateContact"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Log Conversion Insights",
                        provider: "notion",
                        operation: "createPage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "http-1" },
                { id: "e2", source: "http-1", target: "llm-1" },
                { id: "e3", source: "llm-1", target: "switch-1" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-gmail-upgrade",
                    sourceHandle: "high_day7"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-gmail-help",
                    sourceHandle: "low_day3"
                },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-slack",
                    sourceHandle: "inactive"
                },
                {
                    id: "e7",
                    source: "switch-1",
                    target: "integration-gmail-urgency",
                    sourceHandle: "trial_ending"
                },
                { id: "e8", source: "integration-gmail-upgrade", target: "integration-hubspot" },
                { id: "e9", source: "integration-gmail-help", target: "integration-hubspot" },
                { id: "e10", source: "integration-slack", target: "integration-hubspot" },
                { id: "e11", source: "integration-gmail-urgency", target: "integration-hubspot" },
                { id: "e12", source: "integration-hubspot", target: "integration-notion" }
            ]
        }
    },
    {
        name: "Usage-Based Upsell Detection",
        description:
            "Monitor customer usage against plan limits and trigger personalized upgrade conversations at the right time.",
        category: "engineering",
        tags: ["upsell", "usage", "growth", "SaaS"],
        required_integrations: ["gmail", "slack", "hubspot", "google_sheets"],
        definition: {
            name: "Usage-Based Upsell Detection",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Daily Schedule", outputVariable: "trigger_data" }
                },
                {
                    id: "database-1",
                    type: "database",
                    position: createPosition(1),
                    data: { label: "Query Usage Metrics", outputVariable: "usage_data" }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(2),
                    data: { label: "For Each Customer", iterateOver: "usage_data.customers" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(3),
                    data: {
                        label: "Check Usage Level",
                        cases: [
                            {
                                value: "over80",
                                condition: "usage_percent >= 80 && usage_percent < 95"
                            },
                            {
                                value: "over95",
                                condition: "usage_percent >= 95 && usage_percent < 100"
                            },
                            { value: "at_limit", condition: "usage_percent >= 100" }
                        ]
                    }
                },
                {
                    id: "integration-gmail-soft",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Soft Upgrade Suggest",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Alert Account Manager",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-gmail-urgent",
                    type: "integration",
                    position: createPosition(6),
                    data: {
                        label: "Urgent Upgrade Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-gmail-limit",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "At Limit - Upgrade Now",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-slack-cs",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Notify CS",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#customer-success" }
                    }
                },
                {
                    id: "integration-hubspot",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Create Upsell Opportunity",
                        provider: "hubspot",
                        operation: "createDeal"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Track Upsell Pipeline",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(11),
                    data: {
                        label: "Personalize Message",
                        prompt: "Create personalized upgrade message based on usage: {{usage_pattern}}",
                        outputVariable: "message"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "database-1" },
                { id: "e2", source: "database-1", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "switch-1" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-gmail-soft",
                    sourceHandle: "over80"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-slack",
                    sourceHandle: "over95"
                },
                { id: "e6", source: "integration-slack", target: "integration-gmail-urgent" },
                {
                    id: "e7",
                    source: "switch-1",
                    target: "integration-gmail-limit",
                    sourceHandle: "at_limit"
                },
                { id: "e8", source: "integration-gmail-limit", target: "integration-slack-cs" },
                { id: "e9", source: "integration-gmail-soft", target: "integration-hubspot" },
                { id: "e10", source: "integration-gmail-urgent", target: "integration-hubspot" },
                { id: "e11", source: "integration-slack-cs", target: "integration-hubspot" },
                { id: "e12", source: "integration-hubspot", target: "integration-sheets" },
                { id: "e13", source: "integration-sheets", target: "llm-1" }
            ]
        }
    },
    {
        name: "Feature Adoption Campaign",
        description:
            "Drive adoption of new features by identifying target users and delivering personalized announcements across channels.",
        category: "engineering",
        tags: ["feature launch", "adoption", "product marketing", "SaaS"],
        required_integrations: ["gmail", "notion", "slack"],
        definition: {
            name: "Feature Adoption Campaign",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Feature Launch Trigger", outputVariable: "feature_data" }
                },
                {
                    id: "database-1",
                    type: "database",
                    position: createPosition(1),
                    data: { label: "Find Target Users", outputVariable: "target_users" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(2),
                    data: {
                        label: "Check Feature Usage",
                        method: "GET",
                        outputVariable: "adoption"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(3),
                    data: { label: "For Non-Adopters", iterateOver: "non_adopters" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(4),
                    data: {
                        label: "Route by Tier",
                        cases: [
                            { value: "enterprise", condition: "user.tier === 'enterprise'" },
                            { value: "pro", condition: "user.tier === 'pro'" },
                            { value: "free", condition: "user.tier === 'free'" }
                        ]
                    }
                },
                {
                    id: "integration-slack-csm",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Message CSM",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                },
                {
                    id: "integration-gmail-demo",
                    type: "integration",
                    position: createPosition(6),
                    data: { label: "Offer Demo", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-gmail-announce",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Feature Announcement",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Update Adoption Metrics",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack-product",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Weekly Report to #product",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#product" }
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "database-1" },
                { id: "e2", source: "database-1", target: "http-1" },
                { id: "e3", source: "http-1", target: "loop-1" },
                { id: "e4", source: "loop-1", target: "switch-1" },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-slack-csm",
                    sourceHandle: "enterprise"
                },
                { id: "e6", source: "integration-slack-csm", target: "integration-gmail-demo" },
                {
                    id: "e7",
                    source: "switch-1",
                    target: "integration-gmail-announce",
                    sourceHandle: "pro"
                },
                { id: "e8", source: "integration-gmail-demo", target: "integration-notion" },
                { id: "e9", source: "integration-gmail-announce", target: "integration-notion" },
                { id: "e10", source: "integration-notion", target: "integration-slack-product" }
            ]
        }
    },

    // ========================================================================
    // OPERATIONS - Additional (3 templates, formerly Healthcare)
    // ========================================================================
    {
        name: "Appointment Reminder & Confirmation",
        description:
            "Reduce no-shows with automated appointment reminders, confirmation requests, and staff notifications for unconfirmed appointments.",
        category: "operations",
        tags: ["appointments", "reminders", "healthcare", "scheduling"],
        required_integrations: ["google_calendar", "gmail", "slack", "airtable", "google_sheets"],
        definition: {
            name: "Appointment Reminder & Confirmation",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Daily Schedule (6 AM)", outputVariable: "trigger_data" }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(1),
                    data: {
                        label: "Get Upcoming Appointments",
                        provider: "google_calendar",
                        operation: "getEvents"
                    }
                },
                {
                    id: "loop-1",
                    type: "loop",
                    position: createPosition(2),
                    data: { label: "For Each Appointment", iterateOver: "appointments" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(3),
                    data: {
                        label: "Route by Timing",
                        cases: [
                            { value: "48h", condition: "hours_until === 48" },
                            { value: "24h", condition: "hours_until === 24" }
                        ]
                    }
                },
                {
                    id: "integration-gmail-48",
                    type: "integration",
                    position: createPosition(4),
                    data: { label: "First Reminder", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-gmail-24",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Confirmation Request",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "wait-1",
                    type: "wait",
                    position: createPosition(6),
                    data: { label: "Wait for Response", duration: 4, unit: "hours" }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(7),
                    data: { label: "Confirmed?", condition: "confirmation_received === true" }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Alert Front Desk",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#front-desk" }
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Log Confirmation Status",
                        provider: "airtable",
                        operation: "updateRecord"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Track No-Show Rate",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "integration-calendar" },
                { id: "e2", source: "integration-calendar", target: "loop-1" },
                { id: "e3", source: "loop-1", target: "switch-1" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-gmail-48",
                    sourceHandle: "48h"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-gmail-24",
                    sourceHandle: "24h"
                },
                { id: "e6", source: "integration-gmail-24", target: "wait-1" },
                { id: "e7", source: "wait-1", target: "conditional-1" },
                {
                    id: "e8",
                    source: "conditional-1",
                    target: "integration-slack",
                    sourceHandle: "false"
                },
                {
                    id: "e9",
                    source: "conditional-1",
                    target: "integration-airtable",
                    sourceHandle: "true"
                },
                { id: "e10", source: "integration-slack", target: "integration-airtable" },
                { id: "e11", source: "integration-airtable", target: "integration-sheets" }
            ]
        }
    },
    {
        name: "Patient Follow-Up Care Coordination",
        description:
            "Automate post-visit follow-up with personalized care instructions, medication reminders, and care team coordination.",
        category: "operations",
        tags: ["patient care", "follow-up", "healthcare", "coordination"],
        required_integrations: ["gmail", "google_calendar", "airtable", "notion", "slack"],
        definition: {
            name: "Patient Follow-Up Care Coordination",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Visit Completed", outputVariable: "visit_data" }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(1),
                    data: {
                        label: "Route by Visit Type",
                        cases: [
                            { value: "surgery", condition: "visit_data.type === 'post_surgery'" },
                            { value: "chronic", condition: "visit_data.type === 'chronic_care'" },
                            {
                                value: "prescription",
                                condition: "visit_data.type === 'prescription'"
                            },
                            { value: "referral", condition: "visit_data.type === 'referral'" }
                        ]
                    }
                },
                {
                    id: "integration-gmail-surgery",
                    type: "integration",
                    position: createPosition(2),
                    data: {
                        label: "Care Instructions",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(3),
                    data: {
                        label: "Schedule Follow-Up Calls",
                        provider: "google_calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(4),
                    data: {
                        label: "Add to Monitoring List",
                        provider: "airtable",
                        operation: "createRecord"
                    }
                },
                {
                    id: "integration-gmail-meds",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Medication Reminders",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-gmail-referral",
                    type: "integration",
                    position: createPosition(6),
                    data: { label: "Specialist Info", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-calendar-referral",
                    type: "integration",
                    position: createPosition(7),
                    data: {
                        label: "Scheduling Link",
                        provider: "google_calendar",
                        operation: "createEvent"
                    }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(8),
                    data: {
                        label: "Personalize Follow-Up",
                        prompt: "Create personalized follow-up message based on visit notes (keep it simple and patient-friendly): {{visit_data.notes}}",
                        outputVariable: "personalized_message"
                    }
                },
                {
                    id: "integration-notion",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Update Care Plan",
                        provider: "notion",
                        operation: "updatePage"
                    }
                },
                {
                    id: "integration-slack",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Alert Coordinator (High Risk)",
                        provider: "slack",
                        operation: "sendDirectMessage"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "switch-1" },
                {
                    id: "e2",
                    source: "switch-1",
                    target: "integration-gmail-surgery",
                    sourceHandle: "surgery"
                },
                { id: "e3", source: "integration-gmail-surgery", target: "integration-calendar" },
                {
                    id: "e4",
                    source: "switch-1",
                    target: "integration-airtable",
                    sourceHandle: "chronic"
                },
                {
                    id: "e5",
                    source: "switch-1",
                    target: "integration-gmail-meds",
                    sourceHandle: "prescription"
                },
                {
                    id: "e6",
                    source: "switch-1",
                    target: "integration-gmail-referral",
                    sourceHandle: "referral"
                },
                {
                    id: "e7",
                    source: "integration-gmail-referral",
                    target: "integration-calendar-referral"
                },
                { id: "e8", source: "integration-calendar", target: "llm-1" },
                { id: "e9", source: "integration-airtable", target: "llm-1" },
                { id: "e10", source: "integration-gmail-meds", target: "llm-1" },
                { id: "e11", source: "integration-calendar-referral", target: "llm-1" },
                { id: "e12", source: "llm-1", target: "integration-notion" },
                { id: "e13", source: "integration-notion", target: "integration-slack" }
            ]
        }
    },
    {
        name: "Insurance Pre-Authorization Workflow",
        description:
            "Streamline insurance pre-auth with automated submission tracking, status monitoring, and escalation management.",
        category: "operations",
        tags: ["insurance", "pre-authorization", "healthcare", "billing"],
        required_integrations: ["airtable", "slack", "gmail", "google_calendar", "google_sheets"],
        definition: {
            name: "Insurance Pre-Authorization Workflow",
            nodes: [
                {
                    id: "input-1",
                    type: "input",
                    position: createPosition(0),
                    data: { label: "Pre-Auth Request", outputVariable: "auth_data" }
                },
                {
                    id: "llm-1",
                    type: "llm",
                    position: createPosition(1),
                    data: {
                        label: "Check Completeness",
                        prompt: "Review this pre-authorization request and identify: is_complete (boolean), missing_items (array), priority (routine/urgent). Return as JSON.\n\nRequest: {{auth_data}}",
                        outputVariable: "review"
                    }
                },
                {
                    id: "conditional-1",
                    type: "conditional",
                    position: createPosition(2),
                    data: { label: "Complete?", condition: "review.is_complete === true" }
                },
                {
                    id: "http-1",
                    type: "http",
                    position: createPosition(3),
                    data: { label: "Submit to Payer Portal", method: "POST" }
                },
                {
                    id: "integration-airtable",
                    type: "integration",
                    position: createPosition(4),
                    data: { label: "Track Status", provider: "airtable", operation: "createRecord" }
                },
                {
                    id: "integration-slack-missing",
                    type: "integration",
                    position: createPosition(5),
                    data: {
                        label: "Alert Staff - Missing Items",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#billing" }
                    }
                },
                {
                    id: "switch-1",
                    type: "switch",
                    position: createPosition(6),
                    data: {
                        label: "Route by Response",
                        cases: [
                            { value: "approved", condition: "status === 'approved'" },
                            { value: "denied", condition: "status === 'denied'" },
                            { value: "pending", condition: "status === 'pending'" }
                        ]
                    }
                },
                {
                    id: "integration-gmail-approved",
                    type: "integration",
                    position: createPosition(7),
                    data: { label: "Notify Patient", provider: "gmail", operation: "sendEmail" }
                },
                {
                    id: "integration-calendar",
                    type: "integration",
                    position: createPosition(8),
                    data: {
                        label: "Update Procedure Calendar",
                        provider: "google_calendar",
                        operation: "updateEvent"
                    }
                },
                {
                    id: "integration-slack-denied",
                    type: "integration",
                    position: createPosition(9),
                    data: {
                        label: "Escalate Denial",
                        provider: "slack",
                        operation: "sendMessage",
                        parameters: { channel: "#billing-urgent" }
                    }
                },
                {
                    id: "integration-gmail-denied",
                    type: "integration",
                    position: createPosition(10),
                    data: {
                        label: "Patient Options Email",
                        provider: "gmail",
                        operation: "sendEmail"
                    }
                },
                {
                    id: "integration-sheets",
                    type: "integration",
                    position: createPosition(11),
                    data: {
                        label: "Update Tracking Dashboard",
                        provider: "google_sheets",
                        operation: "appendRow"
                    }
                }
            ],
            edges: [
                { id: "e1", source: "input-1", target: "llm-1" },
                { id: "e2", source: "llm-1", target: "conditional-1" },
                { id: "e3", source: "conditional-1", target: "http-1", sourceHandle: "true" },
                { id: "e4", source: "http-1", target: "integration-airtable" },
                {
                    id: "e5",
                    source: "conditional-1",
                    target: "integration-slack-missing",
                    sourceHandle: "false"
                },
                { id: "e6", source: "integration-airtable", target: "switch-1" },
                {
                    id: "e7",
                    source: "switch-1",
                    target: "integration-gmail-approved",
                    sourceHandle: "approved"
                },
                { id: "e8", source: "integration-gmail-approved", target: "integration-calendar" },
                {
                    id: "e9",
                    source: "switch-1",
                    target: "integration-slack-denied",
                    sourceHandle: "denied"
                },
                {
                    id: "e10",
                    source: "integration-slack-denied",
                    target: "integration-gmail-denied"
                },
                { id: "e11", source: "integration-calendar", target: "integration-sheets" },
                { id: "e12", source: "integration-gmail-denied", target: "integration-sheets" },
                { id: "e13", source: "integration-slack-missing", target: "integration-sheets" }
            ]
        }
    }
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedTemplates() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        database: process.env.POSTGRES_DB || "flowmaestro",
        user: process.env.POSTGRES_USER || "flowmaestro",
        password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
    });

    console.log("Starting template seed...\n");

    try {
        // Check if templates already exist
        const existingResult = await pool.query("SELECT COUNT(*) FROM workflow_templates");
        const existingCount = parseInt(existingResult.rows[0].count);

        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing templates.`);
            console.log("Clearing existing templates before seeding...\n");
            await pool.query("DELETE FROM workflow_templates");
        }

        // Insert all templates
        let successCount = 0;
        let errorCount = 0;

        for (const template of templates) {
            try {
                await pool.query(
                    `INSERT INTO workflow_templates (
                        name, description, definition, category, tags,
                        required_integrations, featured, version, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        template.name,
                        template.description,
                        JSON.stringify(template.definition),
                        template.category,
                        template.tags,
                        template.required_integrations,
                        template.featured || false,
                        "1.0.0",
                        "active"
                    ]
                );
                console.log(`✓ Seeded: ${template.name}`);
                successCount++;
            } catch (error) {
                console.error(`✗ Failed: ${template.name}`);
                console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
                errorCount++;
            }
        }

        console.log("\n========================================");
        console.log("Seed complete!");
        console.log(`  Successful: ${successCount}`);
        console.log(`  Failed: ${errorCount}`);
        console.log(`  Total templates: ${templates.length}`);
        console.log("========================================\n");

        // Show category breakdown
        const categoryResult = await pool.query(
            "SELECT category, COUNT(*) as count FROM workflow_templates GROUP BY category ORDER BY count DESC"
        );
        console.log("Templates by category:");
        for (const row of categoryResult.rows) {
            console.log(`  ${row.category}: ${row.count}`);
        }
    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the seed
seedTemplates();
