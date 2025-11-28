# FlowMaestro Workflow Templates - Industry Solutions

## Overview

This document outlines practical, real-world workflow templates across 8 key industries/departments. Each workflow leverages the existing FlowMaestro integrations and solves genuine business problems.

### Available Integrations Used

- **Communication**: Slack, Microsoft Teams, Gmail
- **Productivity**: Google Sheets, Google Calendar, Notion, Airtable
- **Project Management**: Linear, GitHub
- **CRM**: HubSpot
- **Databases**: PostgreSQL, MongoDB
- **AI/ML**: LLM Node for intelligent processing

---

## 1. MARKETING WORKFLOWS

### 1.1 Social Media Mention → Lead Capture Pipeline

**Problem**: Marketing teams miss potential leads from social mentions and can't track campaign engagement effectively.

**Trigger**: Webhook (from social listening tool like Mention or Brand24)

**Flow**:

1. Receive webhook with social mention data
2. **LLM Node**: Analyze sentiment and extract intent (purchase interest, complaint, question)
3. **Conditional**: Branch based on sentiment/intent
    - Positive/Purchase Intent → Create HubSpot contact + Slack notification to sales
    - Negative → Slack alert to support team + log to Airtable
    - Question → Auto-draft Gmail response for review
4. **Google Sheets**: Log all mentions for reporting

**Integrations**: Webhook, LLM, HubSpot, Slack, Gmail, Google Sheets, Airtable

---

### 1.2 Weekly Campaign Performance Report

**Problem**: Manually compiling marketing metrics from multiple sources is time-consuming.

**Trigger**: Schedule (Every Monday 9 AM)

**Flow**:

1. **HTTP Node**: Fetch analytics from marketing platforms (via their APIs)
2. **Google Sheets**: Pull campaign budget data
3. **LLM Node**: Generate executive summary with insights
4. **Transform**: Format data into report structure
5. **Gmail**: Send formatted report to marketing team
6. **Slack**: Post highlights to #marketing channel

**Integrations**: HTTP, Google Sheets, LLM, Gmail, Slack

---

### 1.3 Content Calendar → Multi-Channel Distribution

**Problem**: Publishing content across multiple channels requires repetitive manual work.

**Trigger**: Schedule (Check Notion every hour)

**Flow**:

1. **Notion**: Query content database for items scheduled today
2. **Loop**: For each content piece ready to publish
3. **Conditional**: Check content type (blog, social, email)
    - Blog → HTTP call to CMS API
    - Social → Transform for each platform format
    - Email → Create draft in Gmail
4. **Slack**: Notify team of published content
5. **Notion**: Update status to "Published"

**Integrations**: Notion, Loop, Conditional, HTTP, Gmail, Slack

---

## 2. SALES WORKFLOWS

### 2.1 Inbound Lead Qualification & Routing

**Problem**: Sales teams waste time on unqualified leads; hot leads get cold waiting for response.

**Trigger**: Webhook (HubSpot form submission)

**Flow**:

1. Receive lead data from HubSpot webhook
2. **LLM Node**: Score lead based on company size, role, message intent
3. **Conditional**: Route based on score
    - High (80+) → Immediate Slack alert to sales + Calendar invite creation
    - Medium (50-79) → Add to nurture sequence in HubSpot
    - Low (<50) → Add to Airtable for marketing nurture
4. **HubSpot**: Update contact with lead score and routing decision
5. **Gmail**: Send personalized acknowledgment based on score tier

**Integrations**: Webhook, LLM, Conditional, Slack, Google Calendar, HubSpot, Airtable, Gmail

---

### 2.2 Deal Stage Change → Team Notification & Task Creation

**Problem**: Deal progression requires coordinated team actions that often get missed.

**Trigger**: Webhook (HubSpot deal stage change)

**Flow**:

1. Receive deal update webhook
2. **Conditional/Switch**: Branch by new stage
    - "Proposal Sent" → Create Linear task for legal review
    - "Negotiation" → Slack notify finance team
    - "Closed Won" → Gmail to customer success + Notion onboarding doc
    - "Closed Lost" → Airtable log for loss analysis
3. **Google Sheets**: Update sales pipeline tracker
4. **Slack**: Post to #sales-wins or #deals-updates

**Integrations**: Webhook, Conditional, Linear, Slack, Gmail, Notion, Airtable, Google Sheets

---

### 2.3 Meeting No-Show Recovery

**Problem**: Prospects who miss meetings rarely get timely follow-up.

**Trigger**: Schedule (Every 30 minutes during business hours)

**Flow**:

1. **Google Calendar**: Get meetings from past hour
2. **HubSpot**: Check if meeting was logged (via meeting link or notes)
3. **Conditional**: If no meeting activity logged
    - **Wait Node**: Wait 15 minutes
    - **Gmail**: Send friendly reschedule email with calendar link
    - **HubSpot**: Add note about no-show
    - **Slack**: Notify rep of no-show and auto-email sent

**Integrations**: Schedule, Google Calendar, HubSpot, Conditional, Wait, Gmail, Slack

---

## 3. OPERATIONS WORKFLOWS

### 3.1 Vendor Invoice Processing

**Problem**: Invoice approval is slow and manual, causing payment delays and vendor frustration.

**Trigger**: Gmail (new email with attachment to invoices@company.com)

**Flow**:

1. **Gmail**: Detect new invoice email
2. **LLM Node (Vision)**: Extract invoice data (vendor, amount, due date, line items)
3. **Airtable**: Match to approved vendors/POs
4. **Conditional**: Based on amount and PO match
    - <$1,000 + PO match → Auto-approve, log to Google Sheets
    - $1,000-$10,000 → Slack approval request to manager
    - > $10,000 or no PO → Slack escalate to finance director
5. **Google Sheets**: Log invoice for accounting
6. **Gmail**: Send confirmation to vendor

**Integrations**: Gmail, LLM (Vision), Airtable, Conditional, Slack, Google Sheets

---

### 3.2 Employee Onboarding Automation

**Problem**: New hire onboarding involves dozens of manual tasks across multiple systems.

**Trigger**: Webhook (HRIS new employee event)

**Flow**:

1. Receive new hire data
2. **Loop**: Create accounts/access (parallel where possible)
    - **Slack**: Invite to workspace + add to department channels
    - **Google Calendar**: Create onboarding meeting series
    - **Notion**: Create employee page from template
    - **Linear**: Create onboarding task list
3. **Gmail**: Send welcome email with first-day instructions
4. **Airtable**: Add to employee directory
5. **Slack**: Notify manager and buddy of start date

**Integrations**: Webhook, Loop, Slack, Google Calendar, Notion, Linear, Gmail, Airtable

---

### 3.3 Inventory Alert & Reorder System

**Problem**: Stockouts happen because inventory isn't monitored proactively.

**Trigger**: Schedule (Daily at 6 AM)

**Flow**:

1. **PostgreSQL**: Query inventory levels below reorder point
2. **Loop**: For each low-stock item
3. **Conditional**: Check criticality level
    - Critical → Slack urgent alert + Gmail to supplier
    - Standard → Add to Airtable reorder queue
4. **Google Sheets**: Update inventory report
5. **Slack**: Daily summary to #operations channel
6. **LLM Node**: Generate weekly trend analysis

**Integrations**: Schedule, PostgreSQL, Loop, Conditional, Slack, Gmail, Airtable, Google Sheets, LLM

---

## 4. ENGINEERING WORKFLOWS

### 4.1 PR Review & Deployment Pipeline Notifications

**Problem**: Developers miss PR reviews, and deployment status isn't communicated effectively.

**Trigger**: Webhook (GitHub PR/deployment events)

**Flow**:

1. Receive GitHub webhook
2. **Conditional/Switch**: By event type
    - PR Opened → Slack notify team + Linear link PR to issue
    - PR Review Requested → Slack DM to reviewer
    - PR Merged → Update Linear issue status
    - Deployment Started → Slack #deployments channel
    - Deployment Failed → Slack urgent alert + Linear create bug issue
3. **Airtable**: Log all deployment events for metrics
4. **LLM Node**: For failures, analyze error logs and suggest fixes

**Integrations**: Webhook (GitHub), Conditional, Slack, Linear, Airtable, LLM

---

### 4.2 On-Call Incident Response Automation

**Problem**: Incidents require manual triage and communication during high-stress moments.

**Trigger**: Webhook (monitoring alert from Datadog/PagerDuty)

**Flow**:

1. Receive alert webhook
2. **LLM Node**: Classify severity and affected systems
3. **Conditional**: Based on severity
    - Critical → Slack create incident channel + Teams notify stakeholders
    - High → Slack alert on-call + Linear create P1 issue
    - Medium → Linear create P2 issue + Slack notify team
4. **Notion**: Create incident page from template
5. **Google Calendar**: For critical, schedule war room
6. **PostgreSQL**: Log incident for postmortem analysis

**Integrations**: Webhook, LLM, Conditional, Slack, Teams, Linear, Notion, Google Calendar, PostgreSQL

---

### 4.3 Security Vulnerability Triage

**Problem**: Security alerts from dependency scanners pile up without proper triage.

**Trigger**: Schedule (Daily) or Webhook (from Snyk/Dependabot)

**Flow**:

1. **HTTP**: Fetch vulnerability report from scanner API
2. **LLM Node**: Assess exploitability and impact
3. **Loop**: For each vulnerability
4. **Conditional**: By severity + exploitability
    - Critical/High + Exploitable → Linear P0 issue + Slack security channel
    - Medium → Linear P2 issue + assign to team rotation
    - Low → Airtable backlog for quarterly review
5. **GitHub**: Create issue in affected repo (if not exists)
6. **Google Sheets**: Weekly vulnerability dashboard update

**Integrations**: HTTP, LLM, Loop, Conditional, Linear, Slack, GitHub, Airtable, Google Sheets

---

## 5. SUPPORT WORKFLOWS

### 5.1 Smart Ticket Routing & Escalation

**Problem**: Support tickets are misrouted, causing slow resolution and frustrated customers.

**Trigger**: Webhook (from Zendesk/Intercom or email)

**Flow**:

1. Receive new ticket/email
2. **LLM Node**: Classify category, sentiment, urgency, and required expertise
3. **HubSpot**: Look up customer tier (Enterprise, Pro, Free)
4. **Conditional**: Route based on classification + tier
    - Enterprise + Urgent → Slack DM senior agent + Teams notify account manager
    - Technical → Linear create linked issue + Slack #eng-support
    - Billing → Gmail forward to finance
    - General → Add to standard queue in Airtable
5. **Notion**: Create/update customer context doc
6. **Gmail**: Send acknowledgment with SLA expectations

**Integrations**: Webhook, LLM, HubSpot, Conditional, Slack, Teams, Linear, Gmail, Airtable, Notion

---

### 5.2 Customer Churn Risk Detection

**Problem**: Customers churn without warning because signals are missed across multiple systems.

**Trigger**: Schedule (Daily at 7 AM)

**Flow**:

1. **HubSpot**: Get all active customers
2. **Loop**: For each customer
3. **HTTP**: Fetch product usage data from analytics API
4. **LLM Node**: Calculate churn risk score based on:
    - Usage decline, Support ticket sentiment, Payment issues
5. **Conditional**: Based on risk score
    - High Risk → Slack alert to CS + Gmail to account manager + Linear retention task
    - Medium Risk → Add to Airtable watch list
6. **Google Sheets**: Update churn dashboard
7. **Slack**: Daily summary to #customer-success

**Integrations**: Schedule, HubSpot, Loop, HTTP, LLM, Conditional, Slack, Gmail, Linear, Airtable, Google Sheets

---

### 5.3 Customer Feedback Loop to Product

**Problem**: Customer feedback never reaches product team in actionable form.

**Trigger**: Webhook (from feedback tool) or Gmail (feedback@ emails)

**Flow**:

1. Receive feedback data
2. **LLM Node**: Extract themes, feature requests, pain points, sentiment
3. **Conditional**: By feedback type
    - Bug Report → Linear create bug issue + Slack #bugs
    - Feature Request → Notion add to feature request database + upvote if exists
    - Praise → Slack #wins channel + HubSpot add testimonial tag
    - Complaint → Slack alert to CS + Gmail follow-up template
4. **Airtable**: Log all feedback with tags for analysis
5. **Schedule (Weekly)**: LLM summarize trends → Gmail to product team

**Integrations**: Webhook, Gmail, LLM, Conditional, Linear, Notion, Slack, HubSpot, Airtable

---

## 6. E-COMMERCE WORKFLOWS

### 6.1 Order Fulfillment & Status Notifications

**Problem**: Customers are left in the dark about order status; support gets flooded with "where's my order" tickets.

**Trigger**: Webhook (from Shopify/WooCommerce - via HTTP node until native integration)

**Flow**:

1. Receive order status change webhook
2. **Conditional/Switch**: By status
    - Order Placed → Gmail confirmation + Google Sheets log
    - Shipped → Gmail with tracking + Slack notify fulfillment team
    - Delivered → Gmail review request after 3-day wait
    - Returned → Airtable log + Slack alert to CS
3. **HubSpot**: Update customer lifecycle stage
4. **MongoDB**: Store order event for analytics

**Integrations**: Webhook, Conditional, Gmail, Google Sheets, Slack, Airtable, HubSpot, MongoDB

**Gap**: Native Shopify/WooCommerce integration would eliminate HTTP workarounds

---

### 6.2 Abandoned Cart Recovery Sequence

**Problem**: 70% of carts are abandoned; manual follow-up is impossible at scale.

**Trigger**: Webhook (cart abandonment event) + Schedule (batch processing)

**Flow**:

1. Receive abandoned cart data
2. **Wait Node**: 1 hour delay
3. **HTTP**: Check if cart was completed (prevents awkward emails)
4. **Conditional**: If still abandoned
    - First email → Gmail personalized reminder
    - **Wait**: 24 hours
    - Second email → Gmail with discount code
    - **Wait**: 48 hours
    - Final email → Gmail urgency message
5. **Airtable**: Track recovery attempts and conversions
6. **HubSpot**: Tag contact with abandonment data

**Integrations**: Webhook, Wait, HTTP, Conditional, Gmail, Airtable, HubSpot

**Gap**: Stripe/payment integration would enable discount code automation

---

### 6.3 Inventory Sync Across Channels

**Problem**: Selling on multiple channels leads to overselling when inventory isn't synchronized.

**Trigger**: Schedule (Every 15 minutes)

**Flow**:

1. **HTTP**: Fetch inventory from primary source (Shopify API)
2. **Loop**: For each SKU
3. **Conditional**: Check if quantity changed
    - If changed → HTTP update to secondary channels
    - If low stock → Slack alert to purchasing
    - If zero → Mark out-of-stock across all channels
4. **Google Sheets**: Log sync events
5. **PostgreSQL**: Store inventory history

**Integrations**: Schedule, HTTP, Loop, Conditional, Slack, Google Sheets, PostgreSQL

**Gap**: Native Shopify, Amazon, eBay integrations critical for e-commerce

---

## 7. SAAS / TECH WORKFLOWS

### 7.1 Trial-to-Paid Conversion Nurture

**Problem**: Free trial users don't convert because they're not engaged at the right moments.

**Trigger**: Webhook (trial started) + Schedule (daily check)

**Flow**:

1. **HTTP**: Fetch user activity data from product analytics
2. **LLM Node**: Score engagement level and identify blockers
3. **Conditional**: Based on engagement + days remaining
    - High engagement, Day 7 → Gmail upgrade incentive
    - Low engagement, Day 3 → Gmail feature highlight + offer help
    - No activity, Day 5 → Slack alert to CS for personal outreach
    - Trial ending, Day 12 → Gmail urgency + special offer
4. **HubSpot**: Update lead score and lifecycle stage
5. **Notion**: Log conversion insights for product team

**Integrations**: Webhook, Schedule, HTTP, LLM, Conditional, Gmail, Slack, HubSpot, Notion

**Gap**: Segment/Mixpanel/Amplitude integration would provide rich user data

---

### 7.2 Usage-Based Upsell Detection

**Problem**: Customers hitting limits aren't proactively offered upgrades, leading to churn.

**Trigger**: Schedule (Daily) or Webhook (limit approached event)

**Flow**:

1. **PostgreSQL/MongoDB**: Query usage metrics by customer
2. **Loop**: For each customer
3. **Conditional**: Check against plan limits
    - > 80% of limit → Gmail soft upgrade suggestion
    - > 95% of limit → Slack alert to account manager + Gmail upgrade offer
    - At limit → Gmail urgent upgrade + Slack CS notification
4. **HubSpot**: Create upsell opportunity
5. **Google Sheets**: Track upsell pipeline
6. **LLM Node**: Personalize messaging based on usage pattern

**Integrations**: Schedule, PostgreSQL, MongoDB, Loop, Conditional, Gmail, Slack, HubSpot, Google Sheets, LLM

**Gap**: Stripe/billing integration for plan limit data

---

### 7.3 Feature Adoption Campaign

**Problem**: New features ship but users don't discover them, reducing product stickiness.

**Trigger**: Manual (feature launch) or Schedule (ongoing adoption tracking)

**Flow**:

1. **PostgreSQL**: Identify users who would benefit from feature (based on behavior)
2. **HTTP**: Check feature usage from analytics
3. **Loop**: For each non-adopting user
4. **Conditional**: Segment by user tier
    - Enterprise → Teams message to CSM + personalized demo offer
    - Pro → Gmail feature announcement with video
    - Free → In-app only (skip email)
5. **Notion**: Update feature adoption metrics
6. **Slack**: Weekly adoption report to #product

**Integrations**: Manual, Schedule, PostgreSQL, HTTP, Loop, Conditional, Teams, Gmail, Notion, Slack

**Gap**: In-app messaging integration (Intercom, Pendo) for contextual prompts

---

## 8. HEALTHCARE WORKFLOWS

### 8.1 Appointment Reminder & Confirmation

**Problem**: No-shows cost healthcare practices revenue and block access for other patients.

**Trigger**: Schedule (Daily at 6 AM)

**Flow**:

1. **Google Calendar**: Get appointments for next 24-48 hours
2. **Loop**: For each appointment
3. **Conditional**: Based on appointment type and timing
    - 48 hours out → Gmail first reminder
    - 24 hours out → Gmail + request confirmation
    - **Wait**: Check for response
    - No response → Slack alert to front desk for phone call
4. **Airtable**: Log confirmation status
5. **Google Sheets**: No-show rate tracking

**Integrations**: Schedule, Google Calendar, Loop, Conditional, Gmail, Wait, Slack, Airtable, Google Sheets

**Gap**: SMS/Twilio integration critical for healthcare (email less effective)

---

### 8.2 Patient Follow-Up Care Coordination

**Problem**: Post-visit follow-up falls through cracks, affecting outcomes and satisfaction.

**Trigger**: Webhook (visit completed in EHR - via HTTP) or Schedule

**Flow**:

1. Receive visit completion data
2. **Conditional**: By visit type
    - Post-surgery → Gmail care instructions + Schedule follow-up calls
    - Chronic care → Airtable add to monitoring list
    - Prescription → Gmail medication reminders sequence
    - Referral → Gmail specialist info + Google Calendar scheduling link
3. **LLM Node**: Personalize follow-up based on visit notes (HIPAA-compliant)
4. **Notion**: Update patient care plan
5. **Slack**: Alert care coordinator if high-risk patient

**Integrations**: Webhook, Conditional, Gmail, Google Calendar, Airtable, LLM, Notion, Slack

**Gap**: EHR integration (Epic, Cerner) + HIPAA-compliant messaging

---

### 8.3 Insurance Pre-Authorization Workflow

**Problem**: Pre-auth delays treatment and requires manual follow-up across multiple parties.

**Trigger**: Manual (staff initiates) or Webhook (procedure scheduled)

**Flow**:

1. Receive pre-auth request data
2. **LLM Node**: Extract required info and check completeness
3. **Conditional**: If complete
    - Yes → HTTP submit to payer portal + Airtable track status
    - No → Slack alert to staff with missing items
4. **Schedule**: Check status daily
5. **Conditional**: Based on response
    - Approved → Gmail notify patient + update Google Calendar
    - Denied → Slack escalate + Gmail patient with options
    - Pending → Continue monitoring
6. **Google Sheets**: Authorization tracking dashboard

**Integrations**: Manual, Webhook, LLM, Conditional, HTTP, Airtable, Slack, Gmail, Google Calendar, Google Sheets

**Gap**: Insurance payer API integrations, fax/document handling

---

## INTEGRATION GAP ANALYSIS

### Critical Missing Integrations (High Impact)

| Integration    | Use Cases Enabled                                                        | Priority |
| -------------- | ------------------------------------------------------------------------ | -------- |
| **Stripe**     | Payment processing, subscription management, invoice automation, refunds | Critical |
| **Shopify**    | Order management, inventory, customer data, abandoned carts              | Critical |
| **Twilio/SMS** | Appointment reminders, 2FA, delivery notifications, alerts               | Critical |
| **Zendesk**    | Ticket management, customer support automation                           | High     |
| **Intercom**   | In-app messaging, user engagement, support chat                          | High     |
| **Salesforce** | Enterprise CRM workflows, complex sales processes                        | High     |

### Valuable Missing Integrations (Medium Impact)

| Integration            | Use Cases Enabled                              | Priority |
| ---------------------- | ---------------------------------------------- | -------- |
| **Segment**            | User analytics, event tracking, data routing   | Medium   |
| **Mixpanel/Amplitude** | Product analytics, user behavior tracking      | Medium   |
| **Mailchimp/SendGrid** | Email marketing campaigns, transactional email | Medium   |
| **Jira**               | Issue tracking, sprint management, DevOps      | Medium   |
| **Calendly**           | Meeting scheduling automation                  | Medium   |
| **DocuSign**           | Contract and document signing workflows        | Medium   |

### Nice-to-Have Integrations (Lower Priority)

| Integration               | Use Cases Enabled               | Priority |
| ------------------------- | ------------------------------- | -------- |
| **Asana/Trello**          | Project management alternatives | Lower    |
| **Dropbox**               | File storage alternative        | Lower    |
| **Discord**               | Community management            | Lower    |
| **Typeform/Google Forms** | Survey and form automation      | Lower    |
| **Zapier Webhook**        | Bridge to 5000+ apps            | Lower    |

### Integration Recommendations

1. **Immediate Priority**: Stripe + Twilio would unlock 80% of e-commerce and healthcare workflows
2. **Quick Win**: Zendesk would complete the support workflow story
3. **Enterprise Play**: Salesforce integration opens enterprise market
4. **Developer Appeal**: Jira + better GitHub features for engineering workflows

---

## TEMPLATE PRIORITY RECOMMENDATION

Based on universal applicability and integration coverage, recommended implementation order:

### Tier 1 (High Impact, Broad Appeal)

1. **Inbound Lead Qualification & Routing** (Sales) - Universal need
2. **Smart Ticket Routing & Escalation** (Support) - Immediate ROI
3. **PR Review & Deployment Notifications** (Engineering) - Dev favorite

### Tier 2 (High Impact, Specific Use Cases)

4. **Employee Onboarding Automation** (Operations) - Every company needs
5. **Weekly Campaign Performance Report** (Marketing) - Time saver
6. **Customer Churn Risk Detection** (Support) - Revenue protection

### Tier 3 (Valuable, More Specialized)

7. **Deal Stage Change → Team Notification** (Sales)
8. **Vendor Invoice Processing** (Operations)
9. **Security Vulnerability Triage** (Engineering)

---

## FINAL TEMPLATE SUMMARY

### Complete Template Count: 24 Workflows

| Category    | Count | Templates                                                          |
| ----------- | ----- | ------------------------------------------------------------------ |
| Marketing   | 3     | Social Mention Lead Capture, Campaign Report, Content Distribution |
| Sales       | 3     | Lead Qualification, Deal Stage Notifications, No-Show Recovery     |
| Operations  | 3     | Invoice Processing, Employee Onboarding, Inventory Alerts          |
| Engineering | 3     | PR/Deploy Notifications, Incident Response, Security Triage        |
| Support     | 3     | Ticket Routing, Churn Detection, Feedback Loop                     |
| E-commerce  | 3     | Order Status, Abandoned Cart, Inventory Sync                       |
| SaaS/Tech   | 3     | Trial Conversion, Usage Upsell, Feature Adoption                   |
| Healthcare  | 3     | Appointment Reminders, Follow-Up Care, Pre-Authorization           |

### Implementation Approach

Each template will be:

1. **Complete & Ready-to-Use**: Fully functional with sensible defaults
2. **Well-Documented**: Clear descriptions of what each node does
3. **Configurable**: Key variables exposed for customization (email templates, thresholds, channel names)
4. **Integration-Aware**: Graceful handling when optional integrations aren't connected
