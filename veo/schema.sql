-- Veo 3 Video Generation Service Schema

CREATE TABLE IF NOT EXISTS veo_videos (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  video_url TEXT,
  r2_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT,
  duration INTEGER,
  negative_prompt TEXT
);

CREATE INDEX IF NOT EXISTS idx_veo_videos_status ON veo_videos(status);
CREATE INDEX IF NOT EXISTS idx_veo_videos_created_at ON veo_videos(created_at);
CREATE INDEX IF NOT EXISTS idx_veo_videos_metadata ON veo_videos(metadata);
