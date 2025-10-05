-- Policy Engine Database Schema (D1)
-- Stores policy definitions and audit logs

-- ===== Policies Table =====

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- access-control, rate-limit, data-masking, content-filter, fraud-prevention, compliance
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, archived
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  version INTEGER NOT NULL DEFAULT 1,
  rules TEXT NOT NULL, -- JSON blob of policy rules
  tags TEXT, -- JSON array of tags
  metadata TEXT, -- JSON blob of metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(type);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority);
CREATE INDEX IF NOT EXISTS idx_policies_created_at ON policies(created_at);

-- ===== Audit Logs Table =====

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  decision TEXT NOT NULL, -- allow, deny, challenge
  reason TEXT,
  subject_id TEXT,
  resource_name TEXT,
  action TEXT,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  metadata TEXT, -- JSON blob of additional context
  FOREIGN KEY (policy_id) REFERENCES policies(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_policy_id ON audit_logs(policy_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision ON audit_logs(decision);
CREATE INDEX IF NOT EXISTS idx_audit_logs_subject_id ON audit_logs(subject_id);

-- ===== Policy Templates Table =====

CREATE TABLE IF NOT EXISTS policy_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  template TEXT NOT NULL, -- JSON blob of policy template
  variables TEXT NOT NULL, -- JSON array of variable definitions
  examples TEXT, -- JSON array of example variable sets
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_policy_templates_type ON policy_templates(type);
CREATE INDEX IF NOT EXISTS idx_policy_templates_category ON policy_templates(category);

-- ===== Policy Approvals Table (for workflow) =====

CREATE TABLE IF NOT EXISTS policy_approvals (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  comments TEXT,
  FOREIGN KEY (policy_id) REFERENCES policies(id)
);

CREATE INDEX IF NOT EXISTS idx_policy_approvals_policy_id ON policy_approvals(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_approvals_status ON policy_approvals(status);

-- ===== Policy Tags Table (for categorization) =====

CREATE TABLE IF NOT EXISTS policy_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (policy_id) REFERENCES policies(id)
);

CREATE INDEX IF NOT EXISTS idx_policy_tags_policy_id ON policy_tags(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_tags_tag ON policy_tags(tag);

-- ===== Compliance Frameworks Table =====

CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  requirements TEXT NOT NULL, -- JSON array of compliance requirements
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ===== Sample Data =====

-- Insert compliance frameworks
INSERT OR IGNORE INTO compliance_frameworks (id, name, description, requirements, created_at, updated_at) VALUES
  ('gdpr', 'GDPR', 'General Data Protection Regulation (EU)', '[]', datetime('now'), datetime('now')),
  ('hipaa', 'HIPAA', 'Health Insurance Portability and Accountability Act (US)', '[]', datetime('now'), datetime('now')),
  ('pci-dss', 'PCI-DSS', 'Payment Card Industry Data Security Standard', '[]', datetime('now'), datetime('now')),
  ('soc2', 'SOC2', 'Service Organization Control 2', '[]', datetime('now'), datetime('now')),
  ('iso27001', 'ISO 27001', 'Information Security Management', '[]', datetime('now'), datetime('now')),
  ('ccpa', 'CCPA', 'California Consumer Privacy Act', '[]', datetime('now'), datetime('now'));
