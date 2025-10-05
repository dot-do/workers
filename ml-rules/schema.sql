-- Business-as-Code RL Platform Database Schema
-- D1 SQLite Database

-- ===== OKRs Table =====

CREATE TABLE IF NOT EXISTS okrs (
  id TEXT PRIMARY KEY,
  objective TEXT NOT NULL,
  keyResults TEXT NOT NULL, -- JSON array
  constraints TEXT NOT NULL, -- JSON array
  northStar TEXT, -- JSON object (optional)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_okrs_created ON okrs(created_at DESC);

-- ===== Policies Table =====

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  architecture TEXT NOT NULL, -- 'ppo', 'a3c', 'dqn', 'sac'
  hyperparameters TEXT NOT NULL, -- JSON object
  performance TEXT NOT NULL, -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_policies_updated ON policies(updated_at DESC);
CREATE INDEX idx_policies_version ON policies(id, version);

-- ===== Episodes Table =====

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  okr_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  total_reward REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  states TEXT, -- JSON array
  actions TEXT, -- JSON array
  rewards TEXT, -- JSON array

  FOREIGN KEY (policy_id) REFERENCES policies(id),
  FOREIGN KEY (okr_id) REFERENCES okrs(id)
);

CREATE INDEX idx_episodes_policy ON episodes(policy_id);
CREATE INDEX idx_episodes_okr ON episodes(okr_id);
CREATE INDEX idx_episodes_start ON episodes(start_time DESC);
CREATE INDEX idx_episodes_status ON episodes(status);

-- ===== Vibe Experiments Table =====

CREATE TABLE IF NOT EXISTS vibe_experiments (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  prompt TEXT NOT NULL,
  models TEXT NOT NULL, -- JSON array
  best_variant_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'running', 'completed'
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX idx_vibe_experiments_created ON vibe_experiments(created_at DESC);
CREATE INDEX idx_vibe_experiments_status ON vibe_experiments(status);

-- ===== Code Variants Table =====

CREATE TABLE IF NOT EXISTS code_variants (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL, -- 'javascript', 'typescript'
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  success INTEGER NOT NULL, -- 0 or 1
  error TEXT,
  performance TEXT, -- JSON object (latency, tokens, cost)
  created_at INTEGER NOT NULL,

  FOREIGN KEY (experiment_id) REFERENCES vibe_experiments(id)
);

CREATE INDEX idx_code_variants_experiment ON code_variants(experiment_id);
CREATE INDEX idx_code_variants_success ON code_variants(success);
CREATE INDEX idx_code_variants_model ON code_variants(model);

-- ===== Business Metrics Table =====

CREATE TABLE IF NOT EXISTS business_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  dimensions TEXT, -- JSON object (optional)
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_metrics_name ON business_metrics(metric);
CREATE INDEX idx_metrics_timestamp ON business_metrics(timestamp DESC);

-- ===== Training Runs Table =====

CREATE TABLE IF NOT EXISTS training_runs (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  okr_id TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON object (TrainingConfig)
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  progress TEXT, -- JSON object (TrainingProgress)
  start_time INTEGER NOT NULL,
  end_time INTEGER,

  FOREIGN KEY (policy_id) REFERENCES policies(id),
  FOREIGN KEY (okr_id) REFERENCES okrs(id)
);

CREATE INDEX idx_training_runs_policy ON training_runs(policy_id);
CREATE INDEX idx_training_runs_okr ON training_runs(okr_id);
CREATE INDEX idx_training_runs_status ON training_runs(status);

-- ===== Action Space Table =====

CREATE TABLE IF NOT EXISTS action_spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL, -- JSON object (ActionSpace)
  created_at INTEGER NOT NULL
);

-- ===== Constraint Violations Table =====

CREATE TABLE IF NOT EXISTS constraint_violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT NOT NULL,
  constraint_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  threshold REAL NOT NULL,
  penalty REAL NOT NULL,
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE INDEX idx_violations_episode ON constraint_violations(episode_id);
CREATE INDEX idx_violations_timestamp ON constraint_violations(timestamp DESC);

-- ===== Rewards Table =====

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  okr_reward REAL NOT NULL,
  constraint_penalty REAL NOT NULL,
  exploration_bonus REAL NOT NULL,
  shaped_reward REAL NOT NULL,
  breakdown TEXT NOT NULL, -- JSON object
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE INDEX idx_rewards_episode ON rewards(episode_id);
CREATE INDEX idx_rewards_timestamp ON rewards(timestamp DESC);

-- ===== Insert Example OKRs =====

-- Revenue Optimization OKR
INSERT INTO okrs (id, objective, keyResults, constraints, northStar, created_at, updated_at)
VALUES (
  'revenue_optimization_q1_2025',
  'Maximize sustainable revenue growth while maintaining quality',
  '[
    {
      "id": "kr_1",
      "description": "Increase MRR to $100k",
      "metric": "monthly_recurring_revenue",
      "target": 100000,
      "current": 0,
      "weight": 0.5,
      "direction": "maximize",
      "unit": "USD"
    },
    {
      "id": "kr_2",
      "description": "Reduce CAC below $50",
      "metric": "customer_acquisition_cost",
      "target": 50,
      "current": 0,
      "weight": 0.2,
      "direction": "minimize",
      "unit": "USD"
    },
    {
      "id": "kr_3",
      "description": "Increase conversion rate to 5%",
      "metric": "conversion_rate",
      "target": 0.05,
      "current": 0,
      "weight": 0.3,
      "direction": "maximize"
    }
  ]',
  '[
    {
      "id": "constraint_1",
      "description": "Maintain CSAT above 90%",
      "metric": "customer_satisfaction",
      "operator": "gte",
      "threshold": 0.9,
      "penalty": 10
    },
    {
      "id": "constraint_2",
      "description": "Keep refund rate below 2%",
      "metric": "refund_rate",
      "operator": "lte",
      "threshold": 0.02,
      "penalty": 5
    }
  ]',
  '{
    "metric": "customer_lifetime_value",
    "description": "Total revenue per customer over lifetime",
    "formula": "arpu * (1 / churn_rate)"
  }',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- User Engagement OKR
INSERT INTO okrs (id, objective, keyResults, constraints, northStar, created_at, updated_at)
VALUES (
  'user_engagement_q1_2025',
  'Increase user engagement and retention',
  '[
    {
      "id": "kr_1",
      "description": "Reach 10k DAU",
      "metric": "daily_active_users",
      "target": 10000,
      "current": 0,
      "weight": 0.4,
      "direction": "maximize"
    },
    {
      "id": "kr_2",
      "description": "Increase avg session to 10 min",
      "metric": "session_duration",
      "target": 600,
      "current": 0,
      "weight": 0.3,
      "direction": "maximize",
      "unit": "seconds"
    },
    {
      "id": "kr_3",
      "description": "Improve 7-day retention to 60%",
      "metric": "retention_7d",
      "target": 0.6,
      "current": 0,
      "weight": 0.3,
      "direction": "maximize"
    }
  ]',
  '[
    {
      "id": "constraint_1",
      "description": "Keep crash rate below 1%",
      "metric": "crash_rate",
      "operator": "lte",
      "threshold": 0.01,
      "penalty": 20
    }
  ]',
  '{
    "metric": "engaged_time_per_user",
    "description": "Total engaged time per user per week"
  }',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
