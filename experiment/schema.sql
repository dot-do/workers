-- Experiment Worker Database Schema
-- For PostgreSQL / Neon (via db worker) and D1 (local)

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ab_test', 'thompson_sampling', 'ucb', etc.
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'running', 'paused', 'concluded'
  config TEXT NOT NULL, -- JSON blob with full experiment configuration
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  concluded_at TEXT,
  winner_variant_id TEXT,
  FOREIGN KEY (winner_variant_id) REFERENCES experiment_variants(id)
);

CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(type);

-- Experiment variants
CREATE TABLE IF NOT EXISTS experiment_variants (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_control INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  weight REAL NOT NULL DEFAULT 0.5, -- Traffic allocation weight
  config TEXT NOT NULL, -- JSON blob with variant configuration
  stats TEXT NOT NULL, -- JSON blob with running statistics
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variants_experiment ON experiment_variants(experiment_id);

-- Variant assignments (for consistency)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  context TEXT NOT NULL, -- JSON blob with assignment context
  assigned_at TEXT NOT NULL,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES experiment_variants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_variant ON experiment_assignments(variant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON experiment_assignments(user_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session ON experiment_assignments(session_id);

-- Observations (metric values)
CREATE TABLE IF NOT EXISTS experiment_observations (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  metric TEXT NOT NULL, -- 'click', 'conversion', 'revenue', etc.
  value REAL NOT NULL,
  metadata TEXT, -- JSON blob with additional context
  timestamp TEXT NOT NULL,
  FOREIGN KEY (assignment_id) REFERENCES experiment_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES experiment_variants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_observations_assignment ON experiment_observations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_observations_experiment ON experiment_observations(experiment_id);
CREATE INDEX IF NOT EXISTS idx_observations_variant ON experiment_observations(variant_id);
CREATE INDEX IF NOT EXISTS idx_observations_metric ON experiment_observations(metric);
CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON experiment_observations(timestamp);

-- Test results (cached statistical calculations)
CREATE TABLE IF NOT EXISTS experiment_test_results (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  control_variant_id TEXT NOT NULL,
  treatment_variant_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  p_value REAL,
  z_score REAL,
  absolute_difference REAL,
  relative_lift REAL,
  control_mean REAL,
  treatment_mean REAL,
  probability_to_be_best REAL, -- Bayesian
  is_significant INTEGER NOT NULL DEFAULT 0,
  recommended_action TEXT, -- 'continue', 'conclude', 'stop'
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
  FOREIGN KEY (control_variant_id) REFERENCES experiment_variants(id) ON DELETE CASCADE,
  FOREIGN KEY (treatment_variant_id) REFERENCES experiment_variants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_results_experiment ON experiment_test_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_test_results_calculated ON experiment_test_results(calculated_at);
