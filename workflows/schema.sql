-- Event-Driven Automation Platform Database Schema
-- Cloudflare D1 (SQLite)

-- ============================================================================
-- Workflows Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1, -- 1 = true, 0 = false
  accountId TEXT NOT NULL,

  -- Workflow definition (JSON)
  steps TEXT NOT NULL, -- JSON array of WorkflowStep objects
  startStep TEXT NOT NULL, -- ID of the first step
  config TEXT, -- JSON configuration object

  -- Metadata
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  executionCount INTEGER NOT NULL DEFAULT 0,
  lastExecuted TEXT,
  tags TEXT -- JSON array of strings
);

CREATE INDEX IF NOT EXISTS idx_workflows_accountId ON workflows(accountId);
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows(enabled);

-- ============================================================================
-- Patterns Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  accountId TEXT NOT NULL,

  -- Pattern definition (JSON)
  pattern TEXT NOT NULL, -- JSON pattern configuration
  workflowId TEXT NOT NULL, -- Workflow to trigger

  -- Statistics
  triggeredCount INTEGER NOT NULL DEFAULT 0,
  lastTriggered TEXT,

  -- Metadata
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,

  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patterns_accountId ON patterns(accountId);
CREATE INDEX IF NOT EXISTS idx_patterns_workflowId ON patterns(workflowId);
CREATE INDEX IF NOT EXISTS idx_patterns_enabled ON patterns(enabled);

-- ============================================================================
-- Workflow Executions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY,
  workflowId TEXT NOT NULL,
  accountId TEXT NOT NULL,

  -- Trigger information (JSON)
  triggeredBy TEXT NOT NULL, -- { type, id?, event? }

  -- Execution state
  status TEXT NOT NULL, -- pending, running, completed, failed, cancelled
  currentStep TEXT,
  completedSteps TEXT NOT NULL DEFAULT '[]', -- JSON array of step IDs

  -- Execution data (JSON)
  input TEXT NOT NULL, -- Input data
  output TEXT, -- Output data (when completed)
  context TEXT NOT NULL DEFAULT '{}', -- Execution context

  -- Error information (JSON)
  error TEXT, -- { step, message, stack, timestamp }

  -- Timing
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  duration INTEGER, -- milliseconds

  FOREIGN KEY (workflowId) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_executions_workflowId ON workflow_executions(workflowId);
CREATE INDEX IF NOT EXISTS idx_executions_accountId ON workflow_executions(accountId);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_startedAt ON workflow_executions(startedAt);

-- ============================================================================
-- Integrations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- webhook, database, api, etc.
  accountId TEXT NOT NULL,

  -- Configuration (JSON)
  config TEXT NOT NULL, -- { endpoint?, auth?, headers?, settings? }

  -- Webhook configuration (JSON)
  webhook TEXT, -- { url, events[], secret?, enabled }

  -- Status
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, error
  lastSync TEXT,

  -- Metadata
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrations_accountId ON integrations(accountId);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);

-- ============================================================================
-- Action Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS action_audit_log (
  id TEXT PRIMARY KEY,
  executionId TEXT NOT NULL,
  workflowId TEXT NOT NULL,
  accountId TEXT NOT NULL,

  -- Action details
  stepId TEXT NOT NULL,
  actionType TEXT NOT NULL,
  actionConfig TEXT NOT NULL, -- JSON configuration

  -- Result
  status TEXT NOT NULL, -- success, failure, retry
  result TEXT, -- JSON result data
  error TEXT, -- Error message if failed

  -- Timing
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  duration INTEGER, -- milliseconds

  FOREIGN KEY (executionId) REFERENCES workflow_executions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_executionId ON action_audit_log(executionId);
CREATE INDEX IF NOT EXISTS idx_audit_workflowId ON action_audit_log(workflowId);
CREATE INDEX IF NOT EXISTS idx_audit_accountId ON action_audit_log(accountId);
CREATE INDEX IF NOT EXISTS idx_audit_actionType ON action_audit_log(actionType);

-- ============================================================================
-- Accounts Table (for multi-tenancy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,

  -- Plan
  plan TEXT NOT NULL DEFAULT 'free', -- free, starter, pro, enterprise

  -- Quotas
  maxWorkflows INTEGER NOT NULL DEFAULT 10,
  maxExecutionsPerMonth INTEGER NOT NULL DEFAULT 1000,
  maxEventsPerMonth INTEGER NOT NULL DEFAULT 10000,

  -- Usage (current month)
  currentWorkflows INTEGER NOT NULL DEFAULT 0,
  currentExecutions INTEGER NOT NULL DEFAULT 0,
  currentEvents INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastActivity TEXT
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- ============================================================================
-- API Keys Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Key (hashed)
  keyHash TEXT NOT NULL UNIQUE,
  keyPrefix TEXT NOT NULL, -- First 8 chars for identification

  -- Permissions
  permissions TEXT NOT NULL, -- JSON array of permissions

  -- Status
  enabled INTEGER NOT NULL DEFAULT 1,
  lastUsed TEXT,

  -- Metadata
  createdAt TEXT NOT NULL,
  expiresAt TEXT,

  FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_apikeys_accountId ON api_keys(accountId);
CREATE INDEX IF NOT EXISTS idx_apikeys_keyHash ON api_keys(keyHash);

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Sample Account
INSERT OR IGNORE INTO accounts (id, name, email, plan, createdAt, updatedAt)
VALUES (
  'acc_sample',
  'Sample Account',
  'demo@example.com',
  'pro',
  datetime('now'),
  datetime('now')
);

-- Sample Workflow: High-Value Signup Onboarding
INSERT OR IGNORE INTO workflows (id, name, description, enabled, accountId, steps, startStep, config, createdAt, updatedAt)
VALUES (
  'wf_onboarding',
  'High-Value Signup Onboarding',
  'Automated onboarding workflow for enterprise signups',
  1,
  'acc_sample',
  json('[
    {
      "id": "step_1",
      "name": "Send Welcome Email",
      "type": "action",
      "action": {
        "type": "send_email",
        "config": {
          "to": "{{event.data.email}}",
          "subject": "Welcome to Our Platform!",
          "body": "Thank you for signing up for our Enterprise plan!"
        }
      },
      "next": "step_2"
    },
    {
      "id": "step_2",
      "name": "Notify Sales Team",
      "type": "action",
      "action": {
        "type": "send_slack_message",
        "config": {
          "channel": "#sales",
          "text": "New enterprise signup: {{event.data.email}}"
        }
      },
      "next": "step_3"
    },
    {
      "id": "step_3",
      "name": "Create CRM Record",
      "type": "action",
      "action": {
        "type": "create_crm_record",
        "config": {
          "type": "contacts",
          "data": {
            "email": "{{event.data.email}}",
            "firstname": "{{event.data.firstName}}",
            "lastname": "{{event.data.lastName}}",
            "company": "{{event.data.company}}"
          }
        }
      },
      "next": "step_4"
    },
    {
      "id": "step_4",
      "name": "Schedule Follow-up",
      "type": "delay",
      "delay": {
        "duration": "24h"
      },
      "next": "step_5"
    },
    {
      "id": "step_5",
      "name": "Send Follow-up Email",
      "type": "action",
      "action": {
        "type": "send_email",
        "config": {
          "to": "{{event.data.email}}",
          "subject": "Getting Started Guide",
          "body": "Here are some tips to help you get started..."
        }
      }
    }
  ]'),
  'step_1',
  json('{"maxExecutionTime": "1h", "maxSteps": 10}'),
  datetime('now'),
  datetime('now')
);

-- Sample Pattern: Detect High-Value Signups
INSERT OR IGNORE INTO patterns (id, name, description, enabled, accountId, pattern, workflowId, createdAt, updatedAt)
VALUES (
  'pat_high_value',
  'High-Value Signup',
  'Trigger workflow for enterprise plan signups',
  1,
  'acc_sample',
  json('{
    "type": "event",
    "eventType": "user.signup",
    "conditions": {
      "plan": "enterprise"
    }
  }'),
  'wf_onboarding',
  datetime('now'),
  datetime('now')
);
