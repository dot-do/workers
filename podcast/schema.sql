-- Podcast AI Generation Service Database Schema

CREATE TABLE IF NOT EXISTS podcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL, -- deep-dive, interview, debate, news-discussion, storytelling
  topic TEXT,
  speakers TEXT NOT NULL, -- JSON array of Speaker objects
  dialogue TEXT NOT NULL, -- JSON array of DialogueLine objects
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  audio_url TEXT,
  r2_key TEXT,
  duration REAL, -- duration in seconds
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT -- JSON object
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_podcasts_status ON podcasts(status);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcasts_format ON podcasts(format);
CREATE INDEX IF NOT EXISTS idx_podcasts_completed_at ON podcasts(completed_at DESC);

-- Full-text search on titles and topics
CREATE VIRTUAL TABLE IF NOT EXISTS podcasts_fts USING fts5(
  id UNINDEXED,
  title,
  topic,
  content=podcasts,
  content_rowid=rowid
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS podcasts_fts_insert AFTER INSERT ON podcasts BEGIN
  INSERT INTO podcasts_fts(id, title, topic)
  VALUES (new.id, new.title, new.topic);
END;

CREATE TRIGGER IF NOT EXISTS podcasts_fts_update AFTER UPDATE ON podcasts BEGIN
  UPDATE podcasts_fts
  SET title = new.title, topic = new.topic
  WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS podcasts_fts_delete AFTER DELETE ON podcasts BEGIN
  DELETE FROM podcasts_fts WHERE id = old.id;
END;
