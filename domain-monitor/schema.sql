-- Domain Monitor D1 Database Schema

-- Monitoring records for each domain
CREATE TABLE IF NOT EXISTS monitoring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  registrar TEXT NOT NULL,
  expirationDate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  lastChecked TEXT,
  nextCheck TEXT,
  monitoringEnabled INTEGER NOT NULL DEFAULT 1,
  alertsEnabled INTEGER NOT NULL DEFAULT 1,
  screenshotEnabled INTEGER NOT NULL DEFAULT 0,
  healthCheckEnabled INTEGER NOT NULL DEFAULT 1,
  metadata TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Health check results
CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  overall TEXT NOT NULL,
  checks TEXT NOT NULL,
  issues TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain) REFERENCES monitoring(domain)
);

-- Screenshot history
CREATE TABLE IF NOT EXISTS screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  success INTEGER NOT NULL,
  screenshotUrl TEXT,
  error TEXT,
  compareHash TEXT,
  changeDetected INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain) REFERENCES monitoring(domain)
);

-- Alerts sent
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  sentAt TEXT,
  channel TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain) REFERENCES monitoring(domain)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_next_check ON monitoring(nextCheck);
CREATE INDEX IF NOT EXISTS idx_monitoring_expiration ON monitoring(expirationDate);
CREATE INDEX IF NOT EXISTS idx_health_checks_domain ON health_checks(domain, timestamp);
CREATE INDEX IF NOT EXISTS idx_screenshots_domain ON screenshots(domain, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_domain ON alerts(domain, timestamp);
