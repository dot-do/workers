# salesforce.do

<p align="center">
  <strong>The $300B CRM. Reimagined. Open Source. AI-Native.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/salesforce.do"><img src="https://img.shields.io/npm/v/salesforce.do.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/salesforce.do"><img src="https://img.shields.io/npm/dm/salesforce.do.svg" alt="npm downloads" /></a>
  <a href="https://github.com/drivly/salesforce.do/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/salesforce.do.svg" alt="license" /></a>
</p>

---

Salesforce is the world's largest enterprise software company. They charge $25-330 per user per month. Einstein AI costs extra. Implementation takes months. Apex is proprietary. SOQL is locked in. Your customer data lives on their servers.

**salesforce.do** is the open-source alternative. Deploy your own Salesforce org in one click. SOQL-compatible. Apex-compatible. AI agents are first-class citizens. Your data, your infrastructure, your rules.

## The Problem

Salesforce built a $300B empire on a simple model: charge per seat, forever.

| What Salesforce Charges | The Real Cost |
|------------------------|---------------|
| **Essentials** | $25/user/month (stripped down) |
| **Professional** | $80/user/month (no customization) |
| **Enterprise** | $165/user/month (most popular) |
| **Unlimited** | $330/user/month (everything) |
| **Einstein AI** | +$50-150/user/month on top |
| **Implementation** | $50k-500k+ (consultants) |
| **Annual commitment** | Required (no monthly) |

**A 100-person sales team on Enterprise with Einstein: $315,000/year.**

And you still don't own your data. You can't run it yourself. You're locked into Apex, SOQL, and their ecosystem. Leaving means rewriting everything.

### The Einstein Tax

Salesforce's AI strategy is pure extraction:

- Einstein Activity Capture: +$50/user/month
- Einstein Opportunity Scoring: +$75/user/month
- Einstein Lead Scoring: +$75/user/month
- Einstein Forecasting: +$75/user/month
- Einstein GPT: +$50+/user/month

Want AI features? Double your bill.

### The Implementation Nightmare

Average Salesforce implementation:
- **Timeline**: 3-18 months
- **Consulting fees**: $50k-500k+
- **Admin salary**: $80k-150k/year (you need a full-time admin)
- **Developer costs**: $120k-200k/year (for Apex customization)

Total first-year cost for a mid-market company: **$500k-1M+**

## The Solution

**salesforce.do** reimagines CRM for the AI era:

```
Traditional Salesforce          salesforce.do
-----------------------------------------------------------------
$25-330/user/month              $0 - run your own
Einstein AI premium             AI-native from day one
Vendor lock-in                  Open source, MIT licensed
Their servers                   Your Cloudflare account
Apex proprietary                TypeScript (Apex compatible)
SOQL queries                    SOQL queries (100% compatible)
Custom Objects                  Custom Objects (100% compatible)
Triggers                        Triggers (TypeScript)
Flows                           Workflows (code-first)
18-month implementation         60-second deployment
$150k/year admin                Self-managing with AI
```

---

## One-Click Deploy

```bash
npx create-dotdo salesforce
```

That's it. Your own Salesforce org. Running on Cloudflare's global edge network.

```typescript
import { Salesforce } from 'salesforce.do'

export default Salesforce({
  name: 'my-org',
  domain: 'crm.my-company.com',
  edition: 'unlimited', // All features, always
})
```

Or deploy manually:

```bash
git clone https://github.com/dotdo/salesforce.do
cd salesforce.do
npm install
npm run deploy
```

Your own Salesforce. In 60 seconds. Forever.

---

## Features

### Sales Cloud

Everything you need to manage your sales pipeline:

#### Accounts & Contacts

```typescript
import { sf } from 'salesforce.do'

// Create an account
const account = await sf.Account.create({
  Name: 'Acme Corporation',
  Industry: 'Technology',
  AnnualRevenue: 5000000,
  Website: 'https://acme.com',
  BillingCity: 'San Francisco',
  BillingState: 'CA',
})

// Create contacts at that account
await sf.Contact.create({
  FirstName: 'Alice',
  LastName: 'Chen',
  Email: 'alice@acme.com',
  Title: 'VP of Engineering',
  AccountId: account.Id,
})

// Relationship queries
const accountWithContacts = await sf.query(`
  SELECT Id, Name,
    (SELECT Id, Name, Email, Title FROM Contacts)
  FROM Account
  WHERE Id = '${account.Id}'
`)
```

#### Leads & Lead Conversion

```typescript
// Create a lead
const lead = await sf.Lead.create({
  FirstName: 'Bob',
  LastName: 'Smith',
  Company: 'StartupXYZ',
  Email: 'bob@startupxyz.com',
  LeadSource: 'Web',
  Status: 'Open',
})

// AI-powered lead scoring (built in, no extra charge)
const score = await sf.einstein.scoreLead(lead.Id)
// { score: 87, factors: ['Title match', 'Company size', 'Engagement'] }

// Convert lead to account/contact/opportunity
const conversion = await sf.Lead.convert(lead.Id, {
  createOpportunity: true,
  opportunityName: 'StartupXYZ - Enterprise Deal',
})
```

#### Opportunities & Pipeline

```typescript
// Create an opportunity
const opp = await sf.Opportunity.create({
  Name: 'Acme Corp - Enterprise License',
  AccountId: account.Id,
  Amount: 150000,
  CloseDate: '2025-03-31',
  StageName: 'Qualification',
  Probability: 20,
})

// Move through stages
await sf.Opportunity.update(opp.Id, {
  StageName: 'Proposal/Price Quote',
  Probability: 60,
})

// AI-powered forecasting (built in)
const forecast = await sf.einstein.forecastOpportunity(opp.Id)
// { predictedClose: '2025-03-15', confidence: 0.78, risk: 'medium' }

// Pipeline analytics
const pipeline = await sf.query(`
  SELECT StageName, SUM(Amount), COUNT(Id)
  FROM Opportunity
  WHERE IsClosed = false
  GROUP BY StageName
`)
```

#### Activities & Tasks

```typescript
// Log a call
await sf.Task.create({
  Subject: 'Discovery Call with Alice',
  WhoId: contact.Id,
  WhatId: opp.Id,
  Type: 'Call',
  Status: 'Completed',
  Description: 'Discussed technical requirements...',
  ActivityDate: new Date(),
})

// Schedule follow-up
await sf.Task.create({
  Subject: 'Send proposal',
  WhoId: contact.Id,
  WhatId: opp.Id,
  OwnerId: currentUser.Id,
  ActivityDate: nextWeek,
  Priority: 'High',
})

// AI generates activity summary
const summary = await sf.einstein.summarizeActivities(opp.Id)
```

### Service Cloud

Full customer support platform:

#### Cases

```typescript
// Create a case
const supportCase = await sf.Case.create({
  Subject: 'Cannot login to dashboard',
  Description: 'Getting 403 error when trying to access...',
  ContactId: contact.Id,
  AccountId: account.Id,
  Priority: 'High',
  Origin: 'Email',
  Status: 'New',
})

// AI auto-classifies and routes
await sf.einstein.classifyCase(supportCase.Id)
// Automatically sets: Type, Category, Assignment, Priority

// Escalation rules
await sf.Case.escalate(supportCase.Id, {
  reason: 'SLA breach imminent',
  escalateTo: 'Tier 2 Support',
})
```

#### Knowledge Base

```typescript
// Create knowledge article
await sf.Knowledge__kav.create({
  Title: 'How to reset your password',
  UrlName: 'reset-password',
  Summary: 'Step-by-step guide to resetting...',
  ArticleBody__c: '1. Click "Forgot Password"...',
  IsPublished: true,
})

// AI-powered article suggestions for cases
const suggestions = await sf.einstein.suggestArticles(supportCase.Id)

// Attach article to case
await sf.CaseArticle.create({
  CaseId: supportCase.Id,
  KnowledgeArticleId: suggestions[0].Id,
})
```

#### Entitlements & SLAs

```typescript
// Define SLA
const sla = await sf.Entitlement.create({
  Name: 'Premium Support',
  AccountId: account.Id,
  StartDate: '2025-01-01',
  EndDate: '2025-12-31',
  SlaProcessId: premiumSlaProcess.Id,
})

// SLA milestones tracked automatically
const milestones = await sf.query(`
  SELECT Id, Name, TargetDate, CompletionDate, IsViolated
  FROM CaseMilestone
  WHERE CaseId = '${supportCase.Id}'
`)
```

### Marketing Cloud (Built In)

No separate product, no separate licensing:

#### Campaigns

```typescript
// Create campaign
const campaign = await sf.Campaign.create({
  Name: 'Q1 Product Launch',
  Type: 'Email',
  Status: 'Planned',
  StartDate: '2025-01-15',
  EndDate: '2025-02-15',
  BudgetedCost: 50000,
})

// Add members
await sf.CampaignMember.create({
  CampaignId: campaign.Id,
  LeadId: lead.Id,
  Status: 'Sent',
})

// Track responses
await sf.CampaignMember.update(member.Id, {
  Status: 'Responded',
  FirstRespondedDate: new Date(),
})

// ROI tracking
const roi = await sf.query(`
  SELECT Id, Name, NumberOfLeads, NumberOfConvertedLeads,
         AmountWonOpportunities, ActualCost
  FROM Campaign
  WHERE Id = '${campaign.Id}'
`)
```

#### Email Automation

```typescript
// Define email template
const template = await sf.EmailTemplate.create({
  Name: 'Welcome Email',
  Subject: 'Welcome to {!Account.Name}',
  Body: 'Hi {!Contact.FirstName}...',
  FolderId: marketingFolder.Id,
})

// Send via workflow
await sf.workflows.trigger('send-welcome-email', {
  contactId: contact.Id,
  templateId: template.Id,
})
```

### Custom Objects

Define your own objects with full metadata support:

```typescript
import { SObject } from 'salesforce.do'

// Define custom object
export const Invoice__c = SObject({
  name: 'Invoice__c',
  label: 'Invoice',
  pluralLabel: 'Invoices',
  description: 'Customer invoices',

  fields: {
    InvoiceNumber__c: {
      type: 'AutoNumber',
      format: 'INV-{0000}',
    },
    Amount__c: {
      type: 'Currency',
      required: true,
      precision: 16,
      scale: 2,
    },
    Status__c: {
      type: 'Picklist',
      values: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
    },
    Account__c: {
      type: 'Lookup',
      referenceTo: 'Account',
      relationshipName: 'Invoices',
    },
    DueDate__c: {
      type: 'Date',
    },
    LineItems__c: {
      type: 'MasterDetail',
      referenceTo: 'InvoiceLineItem__c',
    },
  },

  validationRules: [
    {
      name: 'Amount_Must_Be_Positive',
      condition: 'Amount__c <= 0',
      errorMessage: 'Invoice amount must be greater than zero',
    },
  ],

  triggers: {
    afterInsert: async (records, context) => {
      // Auto-notify accounting
      for (const invoice of records) {
        await context.notify('accounting@company.com', {
          subject: `New Invoice: ${invoice.InvoiceNumber__c}`,
          body: `Amount: $${invoice.Amount__c}`,
        })
      }
    },
    beforeUpdate: async (newRecords, oldRecords, context) => {
      for (const [invoice, oldInvoice] of zip(newRecords, oldRecords)) {
        if (invoice.Status__c === 'Sent' && oldInvoice.Status__c === 'Draft') {
          invoice.SentDate__c = new Date()
        }
      }
    },
  },
})
```

### Apex-Compatible Triggers

Write triggers in TypeScript with Salesforce semantics:

```typescript
import { Trigger } from 'salesforce.do'

export const OpportunityTrigger = Trigger('Opportunity', {
  // Before triggers - modify records before save
  beforeInsert: async (newRecords, context) => {
    for (const opp of newRecords) {
      // Auto-set probability based on stage
      opp.Probability = context.getStageDefaultProbability(opp.StageName)
    }
  },

  beforeUpdate: async (newRecords, oldRecords, context) => {
    for (const [opp, oldOpp] of zip(newRecords, oldRecords)) {
      // Validate stage transitions
      if (!isValidStageTransition(oldOpp.StageName, opp.StageName)) {
        throw new TriggerError(`Invalid stage transition: ${oldOpp.StageName} -> ${opp.StageName}`)
      }
    }
  },

  // After triggers - perform related operations
  afterUpdate: async (newRecords, oldRecords, context) => {
    const closedWon = []

    for (const [opp, oldOpp] of zip(newRecords, oldRecords)) {
      // Opportunity just closed won
      if (opp.StageName === 'Closed Won' && oldOpp.StageName !== 'Closed Won') {
        closedWon.push(opp)
      }
    }

    if (closedWon.length > 0) {
      // Bulk insert tasks
      await context.insert('Task', closedWon.map(opp => ({
        Subject: `Onboard ${opp.Name}`,
        WhatId: opp.Id,
        OwnerId: opp.OwnerId,
        ActivityDate: addDays(new Date(), 7),
        Priority: 'High',
      })))

      // Notify sales manager
      await context.notify('sales-manager', {
        type: 'deal_closed',
        opportunities: closedWon,
      })
    }
  },

  afterDelete: async (oldRecords, context) => {
    // Log deletions for compliance
    await context.insert('AuditLog__c', oldRecords.map(opp => ({
      ObjectType__c: 'Opportunity',
      RecordId__c: opp.Id,
      Action__c: 'Delete',
      DeletedBy__c: context.userId,
      DeletedAt__c: new Date(),
    })))
  },
})
```

### Flows (Process Automation)

Visual workflow builder with code-first option:

```typescript
import { Flow } from 'salesforce.do'

export const LeadNurture = Flow({
  name: 'Lead Nurture Sequence',
  description: 'Automated lead nurturing workflow',

  trigger: {
    type: 'record',
    object: 'Lead',
    when: 'Created',
    condition: 'LeadSource = "Web"',
  },

  variables: {
    emailsSent: { type: 'Number', default: 0 },
    lastEmailDate: { type: 'Date' },
  },

  steps: [
    // Immediate welcome email
    {
      id: 'welcome',
      type: 'sendEmail',
      template: 'Welcome_Lead',
      to: '{!$Record.Email}',
      then: 'wait1',
    },

    // Wait 3 days
    {
      id: 'wait1',
      type: 'wait',
      duration: '3d',
      then: 'checkEngagement',
    },

    // Check if they've engaged
    {
      id: 'checkEngagement',
      type: 'decision',
      conditions: [
        {
          name: 'Engaged',
          condition: '{!$Record.HasOpened__c} = true',
          then: 'sendCaseStudy',
        },
        {
          name: 'Not Engaged',
          then: 'sendFollowUp',
        },
      ],
    },

    // Branch: engaged leads get case study
    {
      id: 'sendCaseStudy',
      type: 'sendEmail',
      template: 'Case_Study',
      then: 'assignToSdr',
    },

    // Branch: not engaged get follow-up
    {
      id: 'sendFollowUp',
      type: 'sendEmail',
      template: 'Follow_Up_1',
      then: 'wait2',
    },

    // Another wait
    {
      id: 'wait2',
      type: 'wait',
      duration: '5d',
      then: 'checkAgain',
    },

    // Final check
    {
      id: 'checkAgain',
      type: 'decision',
      conditions: [
        {
          name: 'Still No Engagement',
          condition: '{!$Record.HasOpened__c} = false AND {!$Record.HasClicked__c} = false',
          then: 'markCold',
        },
        { name: 'Default', then: 'assignToSdr' },
      ],
    },

    // Mark as cold
    {
      id: 'markCold',
      type: 'updateRecord',
      record: '{!$Record}',
      values: { Status: 'Cold', Rating: 'Cold' },
    },

    // Assign to SDR
    {
      id: 'assignToSdr',
      type: 'assignRecord',
      record: '{!$Record}',
      assignmentRules: 'SDR_Round_Robin',
      then: 'createTask',
    },

    // Create follow-up task
    {
      id: 'createTask',
      type: 'createRecord',
      object: 'Task',
      values: {
        Subject: 'Follow up with {!$Record.Name}',
        WhoId: '{!$Record.Id}',
        OwnerId: '{!$Record.OwnerId}',
        ActivityDate: '{!$Flow.CurrentDate + 1}',
        Priority: 'High',
      },
    },
  ],
})
```

---

## SOQL Compatible

Write SOQL queries exactly like Salesforce:

```sql
-- Basic query
SELECT Id, Name, Amount, StageName, CloseDate
FROM Opportunity
WHERE StageName != 'Closed Lost'
  AND Amount > 50000
  AND CloseDate = THIS_QUARTER
ORDER BY Amount DESC
LIMIT 10

-- Relationship query (parent)
SELECT Id, Name, Account.Name, Account.Industry
FROM Contact
WHERE Account.AnnualRevenue > 1000000

-- Relationship query (child)
SELECT Id, Name,
  (SELECT Id, LastName, Email FROM Contacts),
  (SELECT Id, Amount, StageName FROM Opportunities WHERE IsClosed = false)
FROM Account
WHERE Industry = 'Technology'

-- Aggregate query
SELECT StageName, SUM(Amount) totalAmount, COUNT(Id) dealCount
FROM Opportunity
WHERE CloseDate = THIS_YEAR
GROUP BY StageName
HAVING SUM(Amount) > 100000
ORDER BY SUM(Amount) DESC

-- Date functions
SELECT Id, Name
FROM Lead
WHERE CreatedDate = LAST_N_DAYS:30
  AND ConvertedDate = null

-- TYPEOF for polymorphic relationships
SELECT Id, Subject,
  TYPEOF What
    WHEN Account THEN Name, Industry
    WHEN Opportunity THEN Amount, StageName
  END
FROM Task
WHERE Status = 'Completed'
```

The SOQL parser compiles to SQLite with full optimization:

```typescript
import { sf } from 'salesforce.do'

// Direct SOQL
const opps = await sf.query(`
  SELECT Id, Name, Amount
  FROM Opportunity
  WHERE Amount > 100000
`)

// Query builder (type-safe)
const opps = await sf.Opportunity
  .select('Id', 'Name', 'Amount')
  .where('Amount', '>', 100000)
  .orderBy('Amount', 'desc')
  .limit(10)
  .execute()
```

---

## AI-Native CRM

### AI SDR (Sales Development Representative)

Your AI SDR qualifies leads 24/7:

```typescript
import { sally } from 'agents.do'
import { sf } from 'salesforce.do'

// Sally is your AI SDR
await sally`
  Review all new leads from yesterday.
  Score them based on our ICP criteria.
  Send personalized outreach to hot leads.
  Schedule discovery calls for engaged prospects.
`

// She updates Salesforce directly
// - Lead.Status updated to 'Working'
// - Lead.Rating set based on analysis
// - Tasks created for follow-ups
// - Emails sent via connected inbox
// - Meetings scheduled via calendar
```

### AI Pipeline Manager

AI keeps your pipeline healthy:

```typescript
import { priya } from 'agents.do'
import { sf } from 'salesforce.do'

// Priya manages pipeline hygiene
await priya`
  Find all opportunities with no activity in 14+ days.
  Analyze each one for risk factors.
  Create tasks for the opportunity owners.
  Flag deals that should be moved to "At Risk".
`

// AI forecasting (no Einstein tax)
const forecast = await sf.einstein.forecast({
  period: 'Q1',
  team: 'North America',
})

console.log(forecast)
// {
//   committed: 2_450_000,
//   bestCase: 3_200_000,
//   pipeline: 5_800_000,
//   atRisk: [{ oppId: '...', reason: 'Champion left company' }],
//   recommendations: ['Accelerate Acme deal', 'Add multi-thread at BigCorp']
// }
```

### AI Case Resolution

AI handles tier-1 support automatically:

```typescript
import { quinn } from 'agents.do'
import { sf } from 'salesforce.do'

// Quinn handles incoming cases
sf.Case.on('created', async (caseRecord) => {
  // AI analyzes the case
  const analysis = await quinn`
    Analyze this support case:
    Subject: ${caseRecord.Subject}
    Description: ${caseRecord.Description}

    1. Classify the issue type
    2. Search knowledge base for solutions
    3. Determine if AI can resolve or needs human
  `

  if (analysis.canResolve) {
    // AI sends response
    await sf.CaseComment.create({
      ParentId: caseRecord.Id,
      Body: analysis.response,
      IsPublished: true,
    })

    // Close if customer confirms
    await sf.Case.update(caseRecord.Id, {
      Status: 'Awaiting Customer Response',
      AI_Resolved__c: true,
    })
  } else {
    // Route to human with context
    await sf.Case.update(caseRecord.Id, {
      OwnerId: analysis.suggestedQueue,
      AI_Summary__c: analysis.summary,
      AI_Suggested_Solution__c: analysis.suggestedSolution,
    })
  }
})
```

### Natural Language Queries

Skip SOQL entirely:

```typescript
import { sf } from 'salesforce.do'

// Natural language to results
const deals = await sf`show me all deals over $100k closing this month`
const contacts = await sf`who are the VPs at our top 10 accounts by revenue?`
const atRisk = await sf`which opportunities are at risk of slipping?`

// AI-powered insights
const insights = await sf`what should I focus on today?`
// "You have 3 opportunities with meetings today totaling $450k.
//  The Acme deal ($150k) has gone quiet - consider a check-in.
//  Two new leads match your ideal customer profile and should be prioritized."
```

### MCP Tools for Every Object

Every SObject exposes MCP tools for AI agents:

```typescript
import { sfTools } from 'salesforce.do/mcp'

// All standard and custom objects have CRUD tools
console.log(sfTools.map(t => t.name))
// [
//   'Account_create', 'Account_read', 'Account_update', 'Account_delete', 'Account_query',
//   'Contact_create', 'Contact_read', 'Contact_update', 'Contact_delete', 'Contact_query',
//   'Opportunity_create', 'Opportunity_read', 'Opportunity_update', 'Opportunity_delete', 'Opportunity_query',
//   'Lead_create', 'Lead_read', 'Lead_update', 'Lead_delete', 'Lead_query', 'Lead_convert',
//   'Case_create', 'Case_read', 'Case_update', 'Case_delete', 'Case_query', 'Case_escalate',
//   'Task_create', 'Task_read', 'Task_update', 'Task_delete', 'Task_query',
//   'Invoice__c_create', 'Invoice__c_read', ...  // Custom objects too!
// ]

// AI agents invoke directly
await invokeTool('Opportunity_create', {
  Name: 'New Deal from AI SDR',
  AccountId: '001...',
  Amount: 75000,
  StageName: 'Qualification',
  CloseDate: '2025-06-30',
})
```

---

## jsforce Compatible

Your existing jsforce integrations work unchanged:

```typescript
import jsforce from 'jsforce'

// Point at your salesforce.do instance
const conn = new jsforce.Connection({
  loginUrl: 'https://your-org.salesforce.do',
})

await conn.login('user@example.com', 'password')

// All jsforce APIs work
const accounts = await conn.query('SELECT Id, Name FROM Account LIMIT 10')

const result = await conn.sobject('Lead').create({
  FirstName: 'New',
  LastName: 'Lead',
  Company: 'Test Corp',
})

await conn.sobject('Opportunity').update({
  Id: '006...',
  StageName: 'Proposal/Price Quote',
})

// Bulk operations
const bulkResult = await conn.sobject('Contact')
  .insertBulk(contactsToInsert)

// Streaming API
conn.streaming.topic('/topic/NewLeads').subscribe((message) => {
  console.log('New lead:', message.sobject)
})
```

### Migration from Salesforce

One-command migration:

```bash
npx salesforce.do migrate --from=production

# Migrates:
# - All standard objects
# - Custom objects and fields
# - Record data
# - Relationships
# - Users and permissions
# - Reports and dashboards
# - Workflows and flows
# - Apex triggers (converted to TypeScript)
```

---

## Architecture

### Durable Object per Org

Each Salesforce org runs in a dedicated Durable Object:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       salesforce.do Worker                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      OrgDO (per customer)                       ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │                                                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             ││
│  │  │  Metadata   │  │   Schema    │  │   Users &   │             ││
│  │  │   Engine    │  │   Cache     │  │   Perms     │             ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘             ││
│  │                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │                    SOQL Query Engine                        │││
│  │  │  ┌─────────┐  ┌─────────────┐  ┌────────────────┐          │││
│  │  │  │ Parser  │─▶│  Optimizer  │─▶│ SQLite Compiler│          │││
│  │  │  └─────────┘  └─────────────┘  └────────────────┘          │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │                    Trigger Framework                        │││
│  │  │  before/after × insert/update/delete/undelete              │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  SQLite (hot data)  │  R2 (attachments)  │  Vectorize (AI search)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Dynamic Metadata Engine

Custom objects and fields are managed at runtime:

```typescript
// Create custom object at runtime
await sf.describe.createSObject({
  fullName: 'Project__c',
  label: 'Project',
  fields: [
    { fullName: 'Status__c', type: 'Picklist', values: ['New', 'Active', 'Complete'] },
    { fullName: 'Budget__c', type: 'Currency' },
  ],
})

// Schema is immediately queryable
const projects = await sf.query('SELECT Id, Name, Status__c FROM Project__c')
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active records (< 2 years) | <10ms |
| **Warm** | R2 + SQLite | Historical data (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

### Multi-Tenancy

```
acme.salesforce.do          <- Acme Corp's org
bigcorp.salesforce.do       <- BigCorp's org
startup.salesforce.do       <- Startup's org
```

Each org is completely isolated:
- Separate Durable Object
- Separate SQLite database
- Separate R2 bucket
- No data mixing, ever

---

## Pricing Comparison

### Salesforce Pricing (2025)

| Edition | Per User/Month | 100 Users/Year |
|---------|---------------|----------------|
| Essentials | $25 | $30,000 |
| Professional | $80 | $96,000 |
| Enterprise | $165 | $198,000 |
| Unlimited | $330 | $396,000 |
| + Einstein AI | +$50-150 | +$60,000-180,000 |

**Plus**: Implementation ($50k-500k), Admin salary ($100k+), Developer costs ($150k+)

### salesforce.do Pricing

| Resource | Cost | Notes |
|----------|------|-------|
| Durable Object | $0.15/million requests | Your org |
| SQLite Storage | $0.20/GB/month | All your data |
| R2 Storage | $0.015/GB/month | Attachments |
| Workers | Free tier: 100k/day | API requests |
| AI (optional) | ~$0.01/query | Via llm.do |

**Example: 100 users, 50,000 records, 100k API calls/month**

| | Salesforce Enterprise | salesforce.do |
|-|----------------------|---------------|
| Software | $198,000/year | ~$20/month |
| AI features | +$120,000/year | ~$10/month |
| Implementation | $100,000 | $0 |
| Admin | $120,000/year | AI-managed |
| **Total Year 1** | **$538,000** | **~$360** |

**Savings: 99.93%**

---

## Roadmap

### Completed

- [x] Standard Objects (Account, Contact, Lead, Opportunity, Case, Task, Event)
- [x] Custom Objects with full metadata
- [x] SOQL parser and query engine
- [x] Relationship queries (parent and child)
- [x] Aggregate functions
- [x] Triggers (all 8 contexts)
- [x] jsforce compatibility layer
- [x] AI-native querying
- [x] MCP tools for all objects
- [x] Lead conversion
- [x] Case management

### In Progress

- [ ] Process Builder / Flows (visual + code)
- [ ] Reports and Dashboards
- [ ] Approval Processes
- [ ] Permission Sets and Profiles
- [ ] Field-Level Security
- [ ] Sharing Rules

### Planned

- [ ] Lightning Web Components runtime
- [ ] Apex runtime (TypeScript-compatible subset)
- [ ] Data Loader compatibility
- [ ] Salesforce DX compatibility
- [ ] CPQ (Configure, Price, Quote)
- [ ] Field Service

---

## Contributing

salesforce.do is open source under the MIT license. Contributions welcome.

```bash
git clone https://github.com/dotdo/salesforce.do
cd salesforce.do
pnpm install
pnpm test
pnpm dev
```

Key contribution areas:
- SOQL parser extensions
- Standard object implementations
- jsforce compatibility
- AI/MCP integrations
- Documentation

---

## License

MIT License - Use it however you want.

---

<p align="center">
  <strong>The $300B CRM monopoly ends here.</strong>
  <br />
  Your data. Your infrastructure. Your AI. Your CRM.
  <br /><br />
  <a href="https://salesforce.do">Website</a> |
  <a href="https://docs.salesforce.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/salesforce.do">GitHub</a>
</p>
