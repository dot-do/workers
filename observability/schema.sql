-- Service Registry
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  version TEXT,
  environment TEXT DEFAULT 'production',
  worker_name TEXT,
  description TEXT,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  last_seen_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_environment ON services(environment);
CREATE INDEX idx_services_last_seen ON services(last_seen_at);

-- Service Dependencies (for service map)
CREATE TABLE IF NOT EXISTS service_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_service_id TEXT NOT NULL,
  target_service_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL, -- 'rpc', 'http', 'queue', 'db'
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_latency_ms REAL DEFAULT 0,
  last_seen_at INTEGER DEFAULT (unixepoch()),
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (source_service_id) REFERENCES services(id),
  FOREIGN KEY (target_service_id) REFERENCES services(id),
  UNIQUE(source_service_id, target_service_id, dependency_type)
);

CREATE INDEX idx_dependencies_source ON service_dependencies(source_service_id);
CREATE INDEX idx_dependencies_target ON service_dependencies(target_service_id);
CREATE INDEX idx_dependencies_last_seen ON service_dependencies(last_seen_at);

-- Alert Configurations
CREATE TABLE IF NOT EXISTS alert_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  service_id TEXT,
  metric_name TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'gt', 'lt', 'gte', 'lte', 'eq'
  threshold REAL NOT NULL,
  window_seconds INTEGER DEFAULT 300, -- 5 minutes
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  enabled INTEGER DEFAULT 1,
  labels TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE INDEX idx_alerts_service ON alert_configs(service_id);
CREATE INDEX idx_alerts_enabled ON alert_configs(enabled);
CREATE INDEX idx_alerts_severity ON alert_configs(severity);

-- Alert Incidents (triggered alerts)
CREATE TABLE IF NOT EXISTS alert_incidents (
  id TEXT PRIMARY KEY,
  alert_config_id TEXT NOT NULL,
  service_id TEXT,
  state TEXT DEFAULT 'firing', -- 'firing', 'resolved'
  value REAL NOT NULL,
  threshold REAL NOT NULL,
  message TEXT,
  labels TEXT, -- JSON
  fired_at INTEGER DEFAULT (unixepoch()),
  resolved_at INTEGER,
  acknowledged_at INTEGER,
  acknowledged_by TEXT,
  FOREIGN KEY (alert_config_id) REFERENCES alert_configs(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE INDEX idx_incidents_alert ON alert_incidents(alert_config_id);
CREATE INDEX idx_incidents_service ON alert_incidents(service_id);
CREATE INDEX idx_incidents_state ON alert_incidents(state);
CREATE INDEX idx_incidents_fired ON alert_incidents(fired_at);

-- Trace Metadata (for trace search)
CREATE TABLE IF NOT EXISTS trace_metadata (
  trace_id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  duration_ms REAL NOT NULL,
  status TEXT, -- 'ok', 'error'
  error_message TEXT,
  span_count INTEGER DEFAULT 1,
  timestamp INTEGER DEFAULT (unixepoch()),
  labels TEXT -- JSON
);

CREATE INDEX idx_traces_service ON trace_metadata(service_name);
CREATE INDEX idx_traces_operation ON trace_metadata(operation_name);
CREATE INDEX idx_traces_timestamp ON trace_metadata(timestamp);
CREATE INDEX idx_traces_status ON trace_metadata(status);
CREATE INDEX idx_traces_duration ON trace_metadata(duration_ms);
