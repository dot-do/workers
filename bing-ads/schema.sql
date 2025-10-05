-- Bing Ads Worker Database Schema
-- For PostgreSQL / Neon (via db worker) and D1 (local)

-- OAuth tokens (with MFA support)
CREATE TABLE IF NOT EXISTS bing_ads_auth (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  scope TEXT NOT NULL, -- Must include 'msads.manage' for MFA
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bing_ads_auth_user ON bing_ads_auth(user_id);

-- Search campaigns
CREATE TABLE IF NOT EXISTS bing_search_campaigns (
  id TEXT PRIMARY KEY,
  external_campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  daily_budget REAL NOT NULL,
  total_budget REAL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'deleted'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bing_search_campaigns_external ON bing_search_campaigns(external_campaign_id);
CREATE INDEX IF NOT EXISTS idx_bing_search_campaigns_account ON bing_search_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_bing_search_campaigns_status ON bing_search_campaigns(status);

-- Search ads
CREATE TABLE IF NOT EXISTS bing_search_ads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  external_ad_id TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  headline1 TEXT NOT NULL,
  headline2 TEXT NOT NULL,
  headline3 TEXT,
  description1 TEXT NOT NULL,
  description2 TEXT,
  display_url TEXT NOT NULL,
  final_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'deleted'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES bing_search_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bing_search_ads_campaign ON bing_search_ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bing_search_ads_external ON bing_search_ads(external_ad_id);
CREATE INDEX IF NOT EXISTS idx_bing_search_ads_status ON bing_search_ads(status);

-- Keywords
CREATE TABLE IF NOT EXISTS bing_keywords (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL, -- 'exact', 'phrase', 'broad'
  bid REAL NOT NULL,
  quality_score REAL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'deleted'
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ad_id) REFERENCES bing_search_ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bing_keywords_ad ON bing_keywords(ad_id);
CREATE INDEX IF NOT EXISTS idx_bing_keywords_keyword ON bing_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_bing_keywords_status ON bing_keywords(status);

-- Performance metrics (synced daily from Bing Ads)
CREATE TABLE IF NOT EXISTS bing_ad_metrics (
  ad_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend REAL NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  ctr REAL,
  cpc REAL,
  cvr REAL,
  roas REAL,
  average_position REAL,
  PRIMARY KEY (ad_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bing_ad_metrics_date ON bing_ad_metrics(date);
CREATE INDEX IF NOT EXISTS idx_bing_ad_metrics_ad ON bing_ad_metrics(ad_id);
