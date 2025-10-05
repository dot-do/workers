-- Full APM Suite Database Schema
-- Extends POC #7 observability schema with RUM, synthetic, logs, and cost tables

-- ============================================================================
-- Services (from POC #7)
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_environment ON services(environment);

-- ============================================================================
-- Service Dependencies (from POC #7)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_dependencies (
  source_service_id TEXT NOT NULL,
  target_service_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL, -- 'rpc', 'http', 'queue', 'db'
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  total_duration_ms REAL DEFAULT 0,
  PRIMARY KEY (source_service_id, target_service_id, dependency_type),
  FOREIGN KEY (source_service_id) REFERENCES services(id),
  FOREIGN KEY (target_service_id) REFERENCES services(id)
);

-- ============================================================================
-- Trace Metadata (from POC #7)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trace_metadata (
  trace_id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  duration_ms REAL NOT NULL,
  status TEXT NOT NULL, -- 'ok' or 'error'
  error_message TEXT,
  span_count INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  labels TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_trace_service ON trace_metadata(service_name);
CREATE INDEX IF NOT EXISTS idx_trace_timestamp ON trace_metadata(timestamp);
CREATE INDEX IF NOT EXISTS idx_trace_status ON trace_metadata(status);

-- ============================================================================
-- Alert Configurations (from POC #7)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  datasource TEXT NOT NULL, -- 'metrics', 'traces', 'logs', 'rum'
  query TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'gt', 'lt', 'eq', 'ne', 'range'
  threshold REAL NOT NULL,
  window_seconds INTEGER NOT NULL,
  evaluation_interval INTEGER NOT NULL,
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  channels TEXT NOT NULL, -- JSON array
  suppression_window INTEGER,
  labels TEXT -- JSON
);

-- ============================================================================
-- Alert Incidents (from POC #7)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_incidents (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  state TEXT NOT NULL, -- 'firing', 'resolved', 'acknowledged'
  severity TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  value REAL NOT NULL,
  message TEXT NOT NULL,
  labels TEXT, -- JSON
  acknowledged_by TEXT,
  acknowledged_at INTEGER,
  resolved_at INTEGER,
  FOREIGN KEY (alert_id) REFERENCES alert_configs(id)
);

CREATE INDEX IF NOT EXISTS idx_incidents_state ON alert_incidents(state);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON alert_incidents(timestamp);

-- ============================================================================
-- RUM Critical Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS rum_critical_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'error', 'webvital'
  session_id TEXT NOT NULL,
  view_id TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  data TEXT NOT NULL -- JSON
);

CREATE INDEX IF NOT EXISTS idx_rum_app ON rum_critical_events(application_id);
CREATE INDEX IF NOT EXISTS idx_rum_session ON rum_critical_events(session_id);
CREATE INDEX IF NOT EXISTS idx_rum_timestamp ON rum_critical_events(timestamp);

-- ============================================================================
-- Synthetic Checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS synthetic_checks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'http', 'ping', 'tcp', 'dns', 'ssl', 'playwright'
  interval INTEGER NOT NULL, -- seconds
  timeout INTEGER NOT NULL, -- milliseconds
  locations TEXT NOT NULL, -- JSON array
  enabled INTEGER DEFAULT 1,

  -- HTTP-specific
  url TEXT,
  method TEXT,
  headers TEXT, -- JSON
  body TEXT,
  expected_status INTEGER,
  expected_body TEXT,

  -- Playwright-specific
  script TEXT,

  -- Alerting
  alert_on_failure INTEGER DEFAULT 1,
  alert_threshold INTEGER DEFAULT 3, -- consecutive failures
  alert_channels TEXT NOT NULL -- JSON array
);

CREATE INDEX IF NOT EXISTS idx_synthetic_enabled ON synthetic_checks(enabled);

-- ============================================================================
-- Synthetic Results
-- ============================================================================

CREATE TABLE IF NOT EXISTS synthetic_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  location TEXT NOT NULL,
  success INTEGER NOT NULL, -- 0 or 1
  duration REAL NOT NULL, -- milliseconds
  status_code INTEGER,
  error_message TEXT,
  FOREIGN KEY (check_id) REFERENCES synthetic_checks(id)
);

CREATE INDEX IF NOT EXISTS idx_synthetic_check ON synthetic_results(check_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_timestamp ON synthetic_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_synthetic_success ON synthetic_results(success);

-- ============================================================================
-- Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  level TEXT NOT NULL, -- 'debug', 'info', 'warn', 'error', 'fatal'
  service TEXT NOT NULL,
  environment TEXT NOT NULL,
  message TEXT NOT NULL,
  trace_id TEXT,
  span_id TEXT,
  user_id TEXT,
  request_id TEXT,
  fields TEXT, -- JSON
  stack TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_trace ON logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_request ON logs(request_id);

-- Full-text search on message (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(message, content=logs, content_rowid=id);

-- Triggers to keep FTS index up to date
CREATE TRIGGER IF NOT EXISTS logs_ai AFTER INSERT ON logs BEGIN
  INSERT INTO logs_fts(rowid, message) VALUES (new.id, new.message);
END;

CREATE TRIGGER IF NOT EXISTS logs_ad AFTER DELETE ON logs BEGIN
  DELETE FROM logs_fts WHERE rowid = old.id;
END;

-- ============================================================================
-- Anomaly Detection Configs
-- ============================================================================

CREATE TABLE IF NOT EXISTS anomaly_detection_configs (
  id TEXT PRIMARY KEY,
  metric_name TEXT NOT NULL,
  algorithm TEXT NOT NULL, -- 'zscore', 'mad', 'isolation-forest', 'prophet', 'lstm'
  sensitivity TEXT NOT NULL, -- 'low', 'medium', 'high'
  seasonality TEXT, -- 'hourly', 'daily', 'weekly'
  min_data_points INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1
);

-- ============================================================================
-- Cost Attribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_attribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  customer TEXT,
  resource_type TEXT NOT NULL, -- 'requests', 'cpu', 'memory', 'egress', 'storage'
  usage REAL NOT NULL,
  cost REAL NOT NULL, -- USD
  timestamp INTEGER NOT NULL,
  labels TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_cost_service ON cost_attribution(service);
CREATE INDEX IF NOT EXISTS idx_cost_customer ON cost_attribution(customer);
CREATE INDEX IF NOT EXISTS idx_cost_resource ON cost_attribution(resource_type);
CREATE INDEX IF NOT EXISTS idx_cost_timestamp ON cost_attribution(timestamp);

-- ============================================================================
-- Dashboards
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  tags TEXT -- JSON array
);

-- ============================================================================
-- Usage Analytics (for cost projections)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  requests INTEGER DEFAULT 0,
  cpu_ms REAL DEFAULT 0,
  kv_reads INTEGER DEFAULT 0,
  kv_writes INTEGER DEFAULT 0,
  d1_reads INTEGER DEFAULT 0,
  d1_writes INTEGER DEFAULT 0,
  r2_reads INTEGER DEFAULT 0,
  r2_writes INTEGER DEFAULT 0,
  r2_egress REAL DEFAULT 0,
  analytics_events INTEGER DEFAULT 0,
  do_requests INTEGER DEFAULT 0,
  do_duration REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_analytics(timestamp);

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Example anomaly detection config
INSERT OR IGNORE INTO anomaly_detection_configs VALUES (
  'default-response-time',
  'http_request_duration_ms',
  'zscore',
  'medium',
  'hourly',
  50,
  1
);

-- Example synthetic check
INSERT OR IGNORE INTO synthetic_checks VALUES (
  'health-check-1',
  'API Health Check',
  'http',
  60, -- every 1 minute
  5000, -- 5 second timeout
  '["SJC", "EWR", "LHR", "SIN"]',
  1,
  'https://api.example.com/health',
  'GET',
  NULL,
  NULL,
  200,
  NULL,
  NULL,
  1,
  3,
  '["#incidents"]'
);
