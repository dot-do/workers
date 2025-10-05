-- ML Model Registry Graph Database Schema
-- Things + Relationships pattern

-- Core Things table (entities in the graph)
CREATE TABLE IF NOT EXISTS things (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- model, dataset, experiment, deployment, user, organization
    name TEXT NOT NULL,
    description TEXT,
    metadata TEXT, -- JSON blob for type-specific data
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by TEXT,
    status TEXT DEFAULT 'active', -- active, archived, deprecated
    version TEXT,
    tags TEXT -- JSON array
);

CREATE INDEX IF NOT EXISTS idx_things_type ON things(type);
CREATE INDEX IF NOT EXISTS idx_things_status ON things(status);
CREATE INDEX IF NOT EXISTS idx_things_created_at ON things(created_at);

-- Relationships table (edges in the graph)
CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL, -- trainedOn, derivedFrom, deployedTo, replacedBy, evaluatedOn, approvedBy
    properties TEXT, -- JSON blob for relationship-specific data
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by TEXT,
    FOREIGN KEY (source_id) REFERENCES things(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES things(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type);
CREATE INDEX IF NOT EXISTS idx_relationships_created_at ON relationships(created_at);

-- Model versions (optimized for quick lookup)
CREATE TABLE IF NOT EXISTS model_versions (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    version TEXT NOT NULL,
    thing_id TEXT NOT NULL,
    is_latest INTEGER DEFAULT 0,
    is_production INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (model_id) REFERENCES things(id) ON DELETE CASCADE,
    FOREIGN KEY (thing_id) REFERENCES things(id) ON DELETE CASCADE,
    UNIQUE(model_id, version)
);

CREATE INDEX IF NOT EXISTS idx_model_versions_model ON model_versions(model_id);
CREATE INDEX IF NOT EXISTS idx_model_versions_latest ON model_versions(is_latest);
CREATE INDEX IF NOT EXISTS idx_model_versions_production ON model_versions(is_production);

-- Performance metrics (time-series data)
CREATE TABLE IF NOT EXISTS model_metrics (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- accuracy, latency, cost, quality_score
    metric_value REAL NOT NULL,
    context TEXT, -- JSON blob with additional context
    recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (model_id) REFERENCES things(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metrics_model ON model_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON model_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON model_metrics(recorded_at);

-- Governance events (audit trail)
CREATE TABLE IF NOT EXISTS governance_events (
    id TEXT PRIMARY KEY,
    thing_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- approval_requested, approved, rejected, compliance_check, fairness_test
    event_data TEXT, -- JSON blob
    user_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (thing_id) REFERENCES things(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_governance_thing ON governance_events(thing_id);
CREATE INDEX IF NOT EXISTS idx_governance_type ON governance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_governance_created_at ON governance_events(created_at);

-- Approval workflows
CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    requested_by TEXT NOT NULL,
    reviewed_by TEXT,
    review_notes TEXT,
    compliance_checks TEXT, -- JSON array of check results
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    reviewed_at INTEGER,
    FOREIGN KEY (model_id) REFERENCES things(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approvals_model ON approvals(model_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- Cost tracking (vibe coding platform integration)
CREATE TABLE IF NOT EXISTS model_costs (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- openai, anthropic, cloudflare, etc.
    cost_type TEXT NOT NULL, -- inference, training, storage
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    usage_data TEXT, -- JSON blob with token counts, etc.
    recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (model_id) REFERENCES things(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_costs_model ON model_costs(model_id);
CREATE INDEX IF NOT EXISTS idx_costs_provider ON model_costs(provider);
CREATE INDEX IF NOT EXISTS idx_costs_recorded_at ON model_costs(recorded_at);
