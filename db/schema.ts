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



CREATE TABLE pipeline (
  json    JSON,
  _path   String,
  _file   String,
  _time   DateTime
)
ENGINE = S3Queue(
  'https://b6641681fe423910342b9ffa1364c76d.r2.cloudflarestorage.com/events/do/**/*', '9c546f5256ac6a8893a5f488eabb8289', '${process.env.R2_SECRET_ACCESS_KEY}', 'JSONAsObject' --'JSONEachRow'
)
SETTINGS
  mode = 'ordered';

CREATE TABLE events (
  ulid String DEFAULT generateULID(),
  id Nullable(String),
  ts DateTime64 DEFAULT ULIDStringToDateTime(ulid, 'America/Chicago'),
  type Nullable(String),
  data JSON,
  source Nullable(String),
  ingested DateTime64 DEFAULT now(),
)
ENGINE = MergeTree
ORDER BY (ulid);

CREATE TABLE versions (
  id String,
  ts DateTime64,
  type String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
  ulid String,
)
ENGINE = CoalescingMergeTree
ORDER BY (id, ts);

CREATE TABLE meta (
  id String,
  ts DateTime64,
  type String,
  data JSON,
  ulid String,
)
ENGINE = CoalescingMergeTree
ORDER BY (id, ts);

CREATE TABLE data (
  id String,
  ts DateTime64,
  type String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
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
  ts DateTime64,
  type String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
  embedding Array(Float32),
  ulid String,
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
WHERE type = 'UpsertVersion';


CREATE MATERIALIZED VIEW dataEvents TO data
AS SELECT
  data.object.id AS id,
  data.object.type AS type,
  data.object.data AS data,
  data.object.content AS content,
  data.object.meta AS meta,
  ts,
  ulid
FROM events
WHERE type = 'Upsert';


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
WHERE type = 'UpsertMeta';

-- TODO: create a materialized view for the queue
-- TODO: create a materialized view for the embeddings
-- TODO: create a materialized view for the relationships


-- events must be created last because it starts ingesting immediately, so the other materialized views need to be created first
CREATE MATERIALIZED VIEW eventPipeline TO events
AS SELECT
  --JSONExtractString(data, '$.ulid') AS ulid,  -- on incoming events, the ulid must be a ulid
  json as data,
  --data.ulid AS ulid,
  --data.type AS type,  
  --data.object.id AS id,
  --JSONExtractString(data, '$.type') AS type,
  --JSONExtractString(data, '$.object.id') AS id,  -- on incoming events, the $id must be a ulid
  concat('https://b6641681fe423910342b9ffa1364c76d.r2.cloudflarestorage.com/events/do/', _path) AS source
FROM pipeline;
`

const queries = schema.split(';\n').filter(q => q.trim() !== '')

for (const query of queries) {
  console.log(query)
  const result = await clickhouse.command({ query, clickhouse_settings: { enable_json_type: 1, max_execution_time: 3600000 } })
  console.log(result)
}