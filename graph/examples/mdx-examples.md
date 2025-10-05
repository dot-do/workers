# MDX Integration Examples

This document shows how MDX files from the 10 content repositories sync with the graph database.

## Apps Repository Example

**File:** `apps/task-manager.mdx`

```mdx
---
title: Task Manager Pro
description: Professional task management application for teams
platform: web
url: https://tasks.acme.com
type: SaaS
techStack:
  - React
  - TypeScript
  - PostgreSQL
  - Cloudflare Workers
features:
  - Real-time collaboration
  - Task assignments
  - Due dates and reminders
  - Team workspaces
metadata:
  ns: app
  visibility: public
tags:
  - productivity
  - collaboration
  - project-management
author: https://schema.org/Person/john-doe
worksFor: https://schema.org/Organization/acme-corp
---

# Task Manager Pro

A modern, collaborative task management application built for teams.

## Features

### Real-time Collaboration
Work together with your team in real-time with instant updates.

### Task Organization
Organize tasks into projects, set priorities, and track progress.

### Team Workspaces
Create dedicated workspaces for different teams and projects.
```

**Syncs to Database:**

**Thing:**
```json
{
  "id": "https://schema.org/SoftwareApplication/task-manager",
  "type": "SoftwareApplication",
  "properties": {
    "name": "Task Manager Pro",
    "description": "Professional task management application for teams",
    "operatingSystem": "web",
    "url": "https://tasks.acme.com",
    "applicationCategory": "SaaS",
    "programmingLanguage": ["React", "TypeScript", "PostgreSQL", "Cloudflare Workers"],
    "featureList": [
      "Real-time collaboration",
      "Task assignments",
      "Due dates and reminders",
      "Team workspaces"
    ],
    "text": "# Task Manager Pro\n\nA modern, collaborative task management application..."
  },
  "source": "apps",
  "namespace": "mdx"
}
```

**Relationships:**
```json
[
  {
    "subject": "https://schema.org/SoftwareApplication/task-manager",
    "predicate": "https://schema.org/author",
    "object": "https://schema.org/Person/john-doe",
    "namespace": "mdx"
  }
]
```

## Brands Repository Example

**File:** `brands/acme-corp.mdx`

```mdx
---
title: ACME Corporation
description: Leading provider of innovative SaaS solutions
url: https://acme.com
foundingDate: 2020-01-01
logo: https://acme.com/logo.png
location: San Francisco, CA
numberOfEmployees: 50
industries:
  - Software
  - SaaS
  - Productivity Tools
parentOrganization: https://schema.org/Organization/acme-holdings
---

# ACME Corporation

Leading provider of innovative SaaS solutions for modern teams.

## About

Founded in 2020, ACME Corporation has grown to 50 employees and serves
thousands of customers worldwide.

## Products

- Task Manager Pro
- Time Tracker
- Team Collaboration Suite
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/Organization/acme-corp",
  "type": "Organization",
  "properties": {
    "name": "ACME Corporation",
    "description": "Leading provider of innovative SaaS solutions",
    "url": "https://acme.com",
    "foundingDate": "2020-01-01",
    "logo": "https://acme.com/logo.png",
    "location": "San Francisco, CA",
    "numberOfEmployees": 50,
    "text": "# ACME Corporation\n\nLeading provider..."
  },
  "source": "brands",
  "namespace": "mdx"
}
```

## Functions Repository Example

**File:** `functions/calculate-score.mdx`

```mdx
---
title: calculateScore
description: Calculate engagement score based on user activity
language: TypeScript
parameters:
  - name: userId
    type: string
  - name: timeRange
    type: number
returns:
  type: number
  description: Engagement score between 0-100
author: https://schema.org/Person/john-doe
relatedTo:
  - https://schema.org/SoftwareSourceCode/analytics-engine
  - https://schema.org/SoftwareSourceCode/user-metrics
---

# calculateScore

Calculates an engagement score for a user based on their activity.

## Parameters

- **userId**: The user's unique identifier
- **timeRange**: Time range in days to analyze

## Returns

Engagement score between 0-100

## Example

\`\`\`typescript
const score = await calculateScore('user-123', 30)
console.log(score) // 85
\`\`\`
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/SoftwareSourceCode/calculate-score",
  "type": "SoftwareSourceCode",
  "properties": {
    "name": "calculateScore",
    "description": "Calculate engagement score based on user activity",
    "programmingLanguage": "TypeScript",
    "parameters": [
      { "name": "userId", "type": "string" },
      { "name": "timeRange", "type": "number" }
    ],
    "returnType": {
      "type": "number",
      "description": "Engagement score between 0-100"
    }
  },
  "source": "functions",
  "namespace": "mdx"
}
```

## Integrations Repository Example

**File:** `integrations/github-api.mdx`

```mdx
---
title: GitHub API Integration
description: Integration with GitHub REST API v3
apiUrl: https://api.github.com
authentication: OAuth2
rateLimit: 5000
endpoints:
  - /repos
  - /issues
  - /pull-requests
provider: https://schema.org/Organization/github
relatedTo:
  - https://schema.org/SoftwareApplication/code-review-tool
---

# GitHub API Integration

Integration with GitHub's REST API for managing repositories and issues.

## Authentication

Uses OAuth2 with required scopes:
- `repo`
- `read:user`

## Rate Limiting

5,000 requests per hour for authenticated requests.
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/WebAPI/github-api",
  "type": "WebAPI",
  "properties": {
    "name": "GitHub API Integration",
    "description": "Integration with GitHub REST API v3",
    "url": "https://api.github.com",
    "authenticationMethod": "OAuth2",
    "rateLimit": 5000
  },
  "source": "integrations",
  "namespace": "mdx"
}
```

## Services Repository Example

**File:** `services/email-service.mdx`

```mdx
---
title: Email Service
description: Transactional email delivery service
serviceType: EmailDelivery
provider: https://schema.org/Organization/sendgrid
endpoint: https://api.sendgrid.com/v3
features:
  - Transactional emails
  - Template support
  - Webhooks
  - Analytics
relatedTo:
  - https://schema.org/SoftwareApplication/notification-system
---

# Email Service

Transactional email delivery service powered by SendGrid.

## Features

- Template-based emails
- Real-time webhooks
- Delivery analytics
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/Service/email-service",
  "type": "Service",
  "properties": {
    "name": "Email Service",
    "description": "Transactional email delivery service",
    "serviceType": "EmailDelivery",
    "provider": "https://schema.org/Organization/sendgrid",
    "url": "https://api.sendgrid.com/v3"
  },
  "source": "services",
  "namespace": "mdx"
}
```

## Workflows Repository Example

**File:** `workflows/onboarding-flow.mdx`

```mdx
---
title: User Onboarding Workflow
description: Complete user onboarding process
steps:
  - Create account
  - Email verification
  - Profile setup
  - Team invitation
  - First task creation
triggers:
  - UserSignup
actions:
  - SendEmail
  - CreateProfile
  - InviteTeam
relatedTo:
  - https://schema.org/SoftwareApplication/task-manager
---

# User Onboarding Workflow

Complete workflow for onboarding new users to the platform.

## Steps

1. User signs up
2. Email verification sent
3. Profile setup wizard
4. Team invitation (optional)
5. First task creation tutorial
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/Action/onboarding-flow",
  "type": "Action",
  "properties": {
    "name": "User Onboarding Workflow",
    "description": "Complete user onboarding process",
    "steps": [
      "Create account",
      "Email verification",
      "Profile setup",
      "Team invitation",
      "First task creation"
    ]
  },
  "source": "workflows",
  "namespace": "mdx"
}
```

## Agents Repository Example

**File:** `agents/code-reviewer.mdx`

```mdx
---
title: Code Review Agent
description: AI agent for automated code review
model: claude-3-5-sonnet
capabilities:
  - Code analysis
  - Security scanning
  - Best practices checking
  - Performance optimization suggestions
integrations:
  - https://schema.org/WebAPI/github-api
  - https://schema.org/WebAPI/anthropic-api
author: https://schema.org/Person/john-doe
---

# Code Review Agent

AI-powered agent for automated code review using Claude 3.5 Sonnet.

## Capabilities

- Analyzes code quality
- Identifies security issues
- Suggests optimizations
- Checks best practices
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/SoftwareAgent/code-reviewer",
  "type": "SoftwareAgent",
  "properties": {
    "name": "Code Review Agent",
    "description": "AI agent for automated code review",
    "model": "claude-3-5-sonnet",
    "capabilities": [
      "Code analysis",
      "Security scanning",
      "Best practices checking",
      "Performance optimization suggestions"
    ]
  },
  "source": "agents",
  "namespace": "mdx"
}
```

## Business Repository Example

**File:** `business/engineering-team.mdx`

```mdx
---
title: Engineering Team
description: Product engineering department
parentOrganization: https://schema.org/Organization/acme-corp
department: Engineering
members:
  - https://schema.org/Person/john-doe
  - https://schema.org/Person/alice-wilson
numberOfEmployees: 15
---

# Engineering Team

The engineering department at ACME Corporation.

## Team Structure

- Frontend Team (5 engineers)
- Backend Team (7 engineers)
- DevOps Team (3 engineers)
```

**Syncs to Database:**

```json
{
  "id": "https://schema.org/Organization/engineering-team",
  "type": "Organization",
  "properties": {
    "name": "Engineering Team",
    "description": "Product engineering department",
    "department": "Engineering",
    "numberOfEmployees": 15
  },
  "source": "business",
  "namespace": "mdx"
}
```

## Webhook Payload Example

When you push to an MDX repository, the webhook sends:

```json
{
  "repository": "apps",
  "files": [
    {
      "slug": "task-manager",
      "frontmatter": {
        "title": "Task Manager Pro",
        "description": "Professional task management application",
        "platform": "web",
        "url": "https://tasks.acme.com",
        "author": "https://schema.org/Person/john-doe"
      },
      "content": "# Task Manager Pro\n\nA modern, collaborative..."
    }
  ]
}
```

The API processes this and creates:
1. Thing entity with Schema.org properties
2. Relationships extracted from frontmatter references

## Querying Synced Data

### Find All Apps

```bash
curl "http://localhost:8787/things?source=apps&type=SoftwareApplication"
```

### Find All Products from ACME Corp

```bash
curl "http://localhost:8787/relationships/incoming/https%3A%2F%2Fschema.org%2FOrganization%2Facme-corp?predicate=https%3A%2F%2Fschema.org%2Fmaker"
```

### Export Apps Back to MDX

```bash
curl "http://localhost:8787/mdx/export/apps"
```

Returns a JSON object with slug → MDX content mappings.

### Generate MDX for a Thing

```bash
curl "http://localhost:8787/mdx/generate/https%3A%2F%2Fschema.org%2FSoftwareApplication%2Ftask-manager"
```

Returns the MDX file content that can be saved back to the repository.

## Sync Workflow

### GitHub → Database (Automatic)

1. Developer commits MDX file to `apps/` repository
2. GitHub webhook fires on push event
3. API receives webhook at `/mdx/webhook`
4. MDX parser extracts frontmatter and content
5. Validator checks against Schema.org type
6. Thing and relationships upserted to database
7. Response includes sync status and errors

### Database → GitHub (Manual PR)

1. Developer updates entity via API
2. Admin triggers export: `GET /mdx/export/apps`
3. Script creates branch in `apps/` repository
4. Commits generated MDX files
5. Opens pull request for review
6. Team reviews and merges

This bidirectional sync ensures:
- ✅ Version control for all entities
- ✅ Human-readable content
- ✅ Type validation
- ✅ Automatic relationship extraction
- ✅ Git-based collaboration
