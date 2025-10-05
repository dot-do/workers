-- Content Supply Chain Database Schema
-- Tracks digital content lifecycle from creation to consumption

-- Content metadata and current state
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- article, video, image, code, document
  title TEXT NOT NULL,
  status TEXT NOT NULL, -- draft, review, approved, published, archived
  creator_id TEXT NOT NULL,
  creator_type TEXT NOT NULL, -- human, ai, hybrid
  ai_model TEXT, -- if AI-generated or AI-assisted
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  archived_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  metadata TEXT, -- JSON: tags, categories, SEO, etc.
  license TEXT, -- CC-BY, proprietary, etc.
  source_content_id TEXT, -- if derived from another piece
  FOREIGN KEY (source_content_id) REFERENCES content(id)
);

CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_creator ON content(creator_id);
CREATE INDEX idx_content_published ON content(published_at);

-- Content lifecycle events (EPCIS-inspired)
CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- creation, edit, approval, publish, distribution, consumption
  content_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  actor_id TEXT NOT NULL, -- user or system that triggered event
  actor_type TEXT NOT NULL, -- human, ai, system

  -- EPCIS-inspired fields
  action TEXT NOT NULL, -- observe, add, delete, modify
  biz_step TEXT, -- accepting, inspecting, shipping (adapted for content)
  disposition TEXT, -- in_progress, active, inactive

  -- Location context (channel/platform)
  read_point TEXT, -- where event occurred: cms, api, website
  biz_location TEXT, -- organizational unit: editorial, marketing, engineering

  -- Content-specific fields
  version INTEGER,
  changes TEXT, -- JSON: what changed
  metadata TEXT, -- JSON: event-specific metadata

  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE INDEX idx_events_content ON content_events(content_id);
CREATE INDEX idx_events_timestamp ON content_events(timestamp);
CREATE INDEX idx_events_type ON content_events(event_type);
CREATE INDEX idx_events_actor ON content_events(actor_id);

-- Content provenance (creator chain)
CREATE TABLE IF NOT EXISTS content_provenance (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  creator_type TEXT NOT NULL, -- human, ai_model, ai_tool
  creator_name TEXT,
  role TEXT NOT NULL, -- author, editor, contributor, ai_assistant
  contribution_type TEXT, -- original, edit, translation, enhancement
  timestamp INTEGER NOT NULL,
  metadata TEXT, -- JSON: AI model details, prompts, etc.

  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE INDEX idx_provenance_content ON content_provenance(content_id);
CREATE INDEX idx_provenance_creator ON content_provenance(creator_id);

-- Distribution channels
CREATE TABLE IF NOT EXISTS distribution_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- website, mobile_app, api, social, email
  platform TEXT, -- specific platform: twitter, linkedin, newsletter
  config TEXT, -- JSON: channel-specific configuration
  created_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_channels_type ON distribution_channels(type);

-- Content distribution (publishing to channels)
CREATE TABLE IF NOT EXISTS content_distributions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL, -- scheduled, published, failed, retracted
  scheduled_at INTEGER,
  published_at INTEGER,
  retracted_at INTEGER,
  distribution_url TEXT,
  metadata TEXT, -- JSON: channel-specific metadata

  FOREIGN KEY (content_id) REFERENCES content(id),
  FOREIGN KEY (channel_id) REFERENCES distribution_channels(id)
);

CREATE INDEX idx_distributions_content ON content_distributions(content_id);
CREATE INDEX idx_distributions_channel ON content_distributions(channel_id);
CREATE INDEX idx_distributions_status ON content_distributions(status);

-- Consumption analytics (aggregated from Analytics Engine)
CREATE TABLE IF NOT EXISTS content_consumption (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  channel_id TEXT,
  date TEXT NOT NULL, -- YYYY-MM-DD
  views INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0,
  time_spent INTEGER NOT NULL DEFAULT 0, -- seconds
  interactions INTEGER NOT NULL DEFAULT 0, -- clicks, shares, etc.
  completions INTEGER NOT NULL DEFAULT 0, -- read to end, watched fully
  metadata TEXT, -- JSON: additional metrics

  FOREIGN KEY (content_id) REFERENCES content(id),
  FOREIGN KEY (channel_id) REFERENCES distribution_channels(id),
  UNIQUE(content_id, channel_id, date)
);

CREATE INDEX idx_consumption_content ON content_consumption(content_id);
CREATE INDEX idx_consumption_date ON content_consumption(date);
CREATE INDEX idx_consumption_channel ON content_consumption(channel_id);

-- Content relationships (graph)
CREATE TABLE IF NOT EXISTS content_relationships (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- references, derived_from, translates, updates
  strength REAL, -- 0.0-1.0 relationship strength
  created_at INTEGER NOT NULL,
  metadata TEXT, -- JSON: relationship metadata

  FOREIGN KEY (source_id) REFERENCES content(id),
  FOREIGN KEY (target_id) REFERENCES content(id),
  UNIQUE(source_id, target_id, relationship_type)
);

CREATE INDEX idx_relationships_source ON content_relationships(source_id);
CREATE INDEX idx_relationships_target ON content_relationships(target_id);
CREATE INDEX idx_relationships_type ON content_relationships(relationship_type);

-- Approval workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- editorial, legal, compliance
  status TEXT NOT NULL, -- pending, approved, rejected, cancelled
  required_approvers TEXT NOT NULL, -- JSON: list of approver IDs
  approvals TEXT, -- JSON: list of approvals received
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  metadata TEXT, -- JSON: workflow-specific data

  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE INDEX idx_workflows_content ON approval_workflows(content_id);
CREATE INDEX idx_workflows_status ON approval_workflows(status);

-- License propagation tracking
CREATE TABLE IF NOT EXISTS license_propagation (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  license TEXT NOT NULL,
  source_license TEXT, -- if inherited
  effective_date INTEGER NOT NULL,
  expiration_date INTEGER,
  constraints TEXT, -- JSON: usage constraints
  attributions TEXT, -- JSON: required attributions

  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE INDEX idx_license_content ON license_propagation(content_id);

-- AI disclosure (GDPR/AI Act compliance)
CREATE TABLE IF NOT EXISTS ai_disclosure (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  ai_generated INTEGER NOT NULL DEFAULT 0, -- boolean
  ai_assisted INTEGER NOT NULL DEFAULT 0, -- boolean
  ai_models TEXT, -- JSON: list of AI models used
  human_review INTEGER NOT NULL DEFAULT 0, -- boolean
  disclosure_text TEXT, -- human-readable disclosure
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT, -- JSON: additional compliance data

  FOREIGN KEY (content_id) REFERENCES content(id),
  UNIQUE(content_id)
);

CREATE INDEX idx_disclosure_content ON ai_disclosure(content_id);
CREATE INDEX idx_disclosure_ai_generated ON ai_disclosure(ai_generated);
