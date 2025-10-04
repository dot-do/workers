-- Voice AI Generation Service Schema

CREATE TABLE IF NOT EXISTS voice_generations (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'elevenlabs', 'google')),
  voice TEXT NOT NULL,
  model TEXT,
  format TEXT NOT NULL DEFAULT 'mp3',
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  audio_url TEXT,
  r2_key TEXT,
  duration REAL,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT,
  speed REAL,
  pitch REAL,
  emotion TEXT,
  style TEXT,
  language TEXT
);

CREATE INDEX IF NOT EXISTS idx_voice_generations_status ON voice_generations(status);
CREATE INDEX IF NOT EXISTS idx_voice_generations_provider ON voice_generations(provider);
CREATE INDEX IF NOT EXISTS idx_voice_generations_created_at ON voice_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_generations_metadata ON voice_generations(metadata);
