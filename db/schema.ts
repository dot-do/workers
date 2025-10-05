import 'dotenv/config'

console.log(process.env.CLICKHOUSE_URL)
import { createClient } from '@clickhouse/client-web'
const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL,
  database: process.env.CLICKHOUSE_DATABASE,
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
})


const schema = /* sql */ `



DROP VIEW IF EXISTS eventPipeline;
DROP VIEW IF EXISTS versionEvents;
DROP VIEW IF EXISTS dataEvents;
DROP VIEW IF EXISTS dataVersions;
DROP VIEW IF EXISTS dataItemsEvents;
DROP VIEW IF EXISTS metaItemsEvents;
DROP VIEW IF EXISTS metaEvents;
DROP VIEW IF EXISTS queueEvents;
DROP VIEW IF EXISTS embeddingsEvents;

DROP TABLE IF EXISTS pipeline;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS data;
DROP TABLE IF EXISTS queue;
DROP TABLE IF EXISTS meta;
DROP TABLE IF EXISTS relationships;
DROP TABLE IF EXISTS embeddings;
DROP TABLE IF EXISTS ai_fallback_events;
DROP TABLE IF EXISTS integrations;
DROP TABLE IF EXISTS oauth_tokens;
DROP TABLE IF EXISTS generated_api_code;
DROP TABLE IF EXISTS api_executions;

DROP FUNCTION IF EXISTS isULID;
DROP FUNCTION IF EXISTS randomizeULID;

CREATE FUNCTION isULID AS (u) -> match(upper(toString(u)), '^[0-9A-HJKMNP-TV-Z]{26}$');
CREATE FUNCTION randomizeULID AS (u) -> if(isULID(u), u, concat(substring(u, 1, 10), substring(generateULID(), 11, 16)));

CREATE TABLE pipeline (
  data    JSON
)
ENGINE = S3Queue(
  'https://b6641681fe423910342b9ffa1364c76d.r2.cloudflarestorage.com/events/do/**/*', '9c546f5256ac6a8893a5f488eabb8289', '${process.env.R2_SECRET_ACCESS_KEY}', 'JSONAsObject' --'JSONEachRow'
)
SETTINGS
  mode = 'ordered',
  s3queue_polling_min_timeout_ms = 1000, --250,
  s3queue_polling_max_timeout_ms = 1000, --250,
  s3queue_polling_backoff_ms     = 0;


CREATE TABLE events (
  ulid String DEFAULT generateULID(),
  type String,
  id String,
  data JSON,
  ts DateTime64 DEFAULT ULIDStringToDateTime(ulid, 'America/Chicago'),
  ingested DateTime64 DEFAULT now64(),
  -- delay IntervalMillisecond  MATERIALIZED dateDiff('millisecond', ts, ingested),
  source String,
)
ENGINE = MergeTree
ORDER BY (ulid);

CREATE TABLE versions (
  id String,
  type String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
  ts DateTime64,
  ulid String,
)
ENGINE = CoalescingMergeTree
ORDER BY (id, ts);

CREATE TABLE meta (
  id String,
  type String,
  data JSON,
  ts DateTime64,
  ulid String,
)
ENGINE = CoalescingMergeTree
ORDER BY (id, ts);

CREATE TABLE data (
  id String,
  type String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
  ts DateTime64,
  ulid String,
)
ENGINE = CoalescingMergeTree
ORDER BY (id);

CREATE TABLE queue (
  ulid String DEFAULT generateULID(),
  id String,
  ts DateTime64 DEFAULT ULIDStringToDateTime(ulid, 'America/Chicago'),
  type String,
  action String,
  target String,
  status Nullable(JSON),
  retries UInt16 DEFAULT 0,
  input Nullable(JSON),
  result Nullable(JSON),
  error Nullable(JSON),
)
ENGINE = CoalescingMergeTree
ORDER BY (id, ts);

CREATE TABLE embeddings (
  id String,
  type String,
  chunk String,
  chunkType String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
  embeddings Array(Float32),
  ts DateTime64,
  ulid String,
  INDEX index_embeddings embeddings TYPE vector_similarity('hnsw', 'L2Distance', 1024)
)
ENGINE = CoalescingMergeTree
ORDER BY (id, ts);

CREATE TABLE relationships (
  from String,
  type String,
  to String,
  ts DateTime64,
  ulid String,
)
ENGINE = CoalescingMergeTree
ORDER BY (to, ts);

CREATE TABLE ai_fallback_events (
  ulid String DEFAULT generateULID(),
  ts DateTime64 DEFAULT ULIDStringToDateTime(ulid, 'America/Chicago'),
  service String,
  method String,
  args JSON,
  user_id Nullable(String),
  session_id Nullable(String),
  decision Enum8('text' = 1, 'object' = 2),
  model String,
  success Bool,
  latency_ms UInt32,
  decision_latency_ms Nullable(UInt32),
  generation_latency_ms Nullable(UInt32),
  cost_usd Float64,
  decision_tokens Nullable(UInt32),
  generation_tokens Nullable(UInt32),
  result Nullable(JSON),
  error Nullable(String),
  metadata Nullable(JSON)
)
ENGINE = MergeTree
ORDER BY (service, ts)
SETTINGS index_granularity = 8192;

CREATE TABLE integrations (
  id String,
  provider String,
  name String,
  base_url String,
  oauth_config JSON,
  requires_oauth Bool DEFAULT true,
  api_docs_url Nullable(String),
  rate_limit_per_min UInt16 DEFAULT 60,
  rate_limit_per_hour UInt32 DEFAULT 1000,
  ts DateTime64,
  ulid String
)
ENGINE = CoalescingMergeTree
ORDER BY (provider);

CREATE TABLE oauth_tokens (
  id String DEFAULT generateULID(),
  user_id String,
  provider String,
  encrypted_access_token String,
  encrypted_refresh_token Nullable(String),
  expires_at Nullable(DateTime64),
  scopes JSON,
  ts DateTime64 DEFAULT ULIDStringToDateTime(id, 'America/Chicago'),
  updated_at DateTime64 DEFAULT now64()
)
ENGINE = MergeTree
ORDER BY (user_id, provider);

CREATE TABLE generated_api_code (
  id String DEFAULT generateULID(),
  provider String,
  method String,
  args_hash String,
  generated_code String,
  success_count UInt32 DEFAULT 0,
  failure_count UInt32 DEFAULT 0,
  last_success_at Nullable(DateTime64),
  last_failure_at Nullable(DateTime64),
  model String,
  prompt_tokens Nullable(UInt32),
  completion_tokens Nullable(UInt32),
  cost_usd Float64,
  ts DateTime64 DEFAULT ULIDStringToDateTime(id, 'America/Chicago'),
  validated Bool DEFAULT false
)
ENGINE = MergeTree
ORDER BY (provider, method, args_hash);

CREATE TABLE api_executions (
  ulid String DEFAULT generateULID(),
  ts DateTime64 DEFAULT ULIDStringToDateTime(ulid, 'America/Chicago'),
  user_id String,
  provider String,
  method String,
  args JSON,
  success Bool,
  latency_ms UInt32,
  cached Bool DEFAULT false,
  code_id Nullable(String),
  result Nullable(JSON),
  error Nullable(String)
)
ENGINE = MergeTree
ORDER BY (provider, ts);

CREATE MATERIALIZED VIEW versionEvents TO versions
AS SELECT
  data.object.id AS id,
  data.object.type AS type,
  data.object.data AS data,
  data.object.content AS content,
  data.object.meta AS meta,
  ts,
  ulid
FROM events
WHERE data.type = 'UpsertVersion';


CREATE MATERIALIZED VIEW dataEvents TO data
AS SELECT
  data as root,
  data.object.id AS id,
  data.object.type AS type,
  data.object.data AS data,
  data.object.content AS content,
  data.object.meta AS meta,
  ts,
  ulid
FROM events
WHERE data.type = 'Upsert';


CREATE MATERIALIZED VIEW dataVersions TO data
AS SELECT * FROM versions;


CREATE MATERIALIZED VIEW metaEvents TO meta
AS SELECT
  data.object.id AS id,
  data.object.type AS type,
  data.object.data AS data,
  data.object.content AS content,
  data.object.meta AS meta,
  ts,
  ulid
FROM events
WHERE data.type = 'UpsertMeta';


-- TODO: create a materialized view for the queue
-- TODO: create a materialized view for the embeddings
-- TODO: create a materialized view for the relationships


-- events must be created last because it starts ingesting immediately, so the other materialized views need to be created first
CREATE MATERIALIZED VIEW eventPipeline TO events
AS SELECT
  --JSONExtractString(data, '$.ulid') AS ulid,  -- on incoming events, the ulid must be a ulid
  data,
  --ulid(substring(data.ulid, 1, 26)) AS ulid,
  --coalesce("data.$type", data.type) AS type,  
  --coalesce(data.ulid, concat(substring(_file, 1, 10), substring(generateULID(), 11, 16))) AS ulid,
  coalesce(data.ulid, randomizeULID(substring(_file, 1, 26))) AS ulid,
  --randomizeULID(substring(_file, 1, 26)) AS ulid,
  --data.ulid AS ulid,
  --coalesce(data.$type, data.type) AS type,
  data.type AS type,
  data.url AS id,
  --JSONExtractString(data, '$.type') AS type,
  --JSONExtractString(data, '$.object.id') AS id,  -- on incoming events, the $id must be a ulid
  concat('https://b6641681fe423910342b9ffa1364c76d.r2.cloudflarestorage.com/events/', _path) AS source
FROM pipeline;
`

// Schema initialization - run manually via migration script, not at deploy time
// const queries = schema.split(';\n').filter(q => q.trim() !== '')
//
// for (const query of queries) {
//   console.log(query)
//   const result = await clickhouse.command({ query, clickhouse_settings: { enable_json_type: 1, allow_experimental_vector_similarity_index: 1, max_execution_time: 3600000 } })
//   console.log(result)
// }