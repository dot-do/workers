-- Ads Worker Database Schema
-- For PostgreSQL / Neon (via db worker) and D1 (local)

-- Ads table
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'
  targeting TEXT, -- JSON blob with targeting configuration
  bid REAL NOT NULL, -- CPM or CPC bid
  daily_budget REAL,
  total_budget REAL,
  spent REAL NOT NULL DEFAULT 0,
  quality_score REAL NOT NULL DEFAULT 5, -- 0-10
  metrics TEXT NOT NULL, -- JSON blob with performance metrics
  config TEXT NOT NULL, -- JSON blob with additional configuration
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_campaign ON ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_creative ON ads(creative_id);

-- Ad impressions
CREATE TABLE IF NOT EXISTS ad_impressions (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  experiment_id TEXT, -- Reference to experiment (if part of experiment)
  assignment_id TEXT, -- Reference to experiment assignment
  context TEXT NOT NULL, -- JSON blob with request context
  viewability REAL, -- 0-1, measured after ad is shown
  position INTEGER, -- Ad position on page
  timestamp TEXT NOT NULL,
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_impressions_ad ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_impressions_user ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_impressions_session ON ad_impressions(session_id);
CREATE INDEX IF NOT EXISTS idx_impressions_experiment ON ad_impressions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON ad_impressions(timestamp);

-- Ad clicks
CREATE TABLE IF NOT EXISTS ad_clicks (
  id TEXT PRIMARY KEY,
  impression_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (impression_id) REFERENCES ad_impressions(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clicks_impression ON ad_clicks(impression_id);
CREATE INDEX IF NOT EXISTS idx_clicks_ad ON ad_clicks(ad_id);
CREATE INDEX IF NOT EXISTS idx_clicks_user ON ad_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON ad_clicks(timestamp);

-- Ad conversions
CREATE TABLE IF NOT EXISTS ad_conversions (
  id TEXT PRIMARY KEY,
  impression_id TEXT NOT NULL,
  click_id TEXT, -- Optional, conversion may happen without click (view-through)
  ad_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value REAL NOT NULL, -- Revenue value
  timestamp TEXT NOT NULL,
  FOREIGN KEY (impression_id) REFERENCES ad_impressions(id) ON DELETE CASCADE,
  FOREIGN KEY (click_id) REFERENCES ad_clicks(id) ON DELETE SET NULL,
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversions_impression ON ad_conversions(impression_id);
CREATE INDEX IF NOT EXISTS idx_conversions_click ON ad_conversions(click_id);
CREATE INDEX IF NOT EXISTS idx_conversions_ad ON ad_conversions(ad_id);
CREATE INDEX IF NOT EXISTS idx_conversions_user ON ad_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON ad_conversions(timestamp);

-- Ad metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS ad_metrics_daily (
  ad_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  ctr REAL NOT NULL DEFAULT 0,
  cpc REAL NOT NULL DEFAULT 0,
  cpm REAL NOT NULL DEFAULT 0,
  cvr REAL NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (ad_id, date),
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON ad_metrics_daily(date);

-- External network submissions (Google Ads, Bing Ads)
CREATE TABLE IF NOT EXISTS ad_external_networks (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL,
  network TEXT NOT NULL, -- 'google', 'bing'
  external_ad_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'running', 'paused'
  submitted_at TEXT NOT NULL,
  approved_at TEXT,
  rejection_reason TEXT,
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_networks_ad ON ad_external_networks(ad_id);
CREATE INDEX IF NOT EXISTS idx_external_networks_network ON ad_external_networks(network);
CREATE INDEX IF NOT EXISTS idx_external_networks_status ON ad_external_networks(status);

-- External network metrics (synced from Google/Bing)
CREATE TABLE IF NOT EXISTS ad_external_metrics (
  ad_id TEXT NOT NULL,
  network TEXT NOT NULL, -- 'google', 'bing'
  date TEXT NOT NULL, -- YYYY-MM-DD
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (ad_id, network, date),
  FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_metrics_date ON ad_external_metrics(date);
CREATE INDEX IF NOT EXISTS idx_external_metrics_network ON ad_external_metrics(network);
