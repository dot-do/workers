-- Imagen AI Image Generation Service Schema

CREATE TABLE IF NOT EXISTS imagen_images (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('google-imagen', 'openai-dalle')),
  size TEXT NOT NULL DEFAULT '1024x1024',
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  image_url TEXT,
  r2_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT,
  quality TEXT,
  style TEXT,
  negative_prompt TEXT
);

CREATE INDEX IF NOT EXISTS idx_imagen_images_status ON imagen_images(status);
CREATE INDEX IF NOT EXISTS idx_imagen_images_provider ON imagen_images(provider);
CREATE INDEX IF NOT EXISTS idx_imagen_images_created_at ON imagen_images(created_at);
CREATE INDEX IF NOT EXISTS idx_imagen_images_metadata ON imagen_images(metadata);
