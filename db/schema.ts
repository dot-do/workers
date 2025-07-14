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


DROP TABLE IF EXISTS pipeline;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS data;
DROP TABLE IF EXISTS relationships;
DROP TABLE IF EXISTS embeddings;


CREATE TABLE pipeline (
  payload String,
  concat('https://b6641681fe423910342b9ffa1364c76d.r2.cloudflarestorage.com/events/', path) as source,
  _path   String,
  _file   String,
  _time   DateTime
)
ENGINE = S3Queue(
  'https://b6641681fe423910342b9ffa1364c76d.r2.cloudflarestorage.com/events/**/*', 'JSONEachRow', '9c546f5256ac6a8893a5f488eabb8289', ${process.env.R2_SECRET}
)
SETTINGS
  mode = 'ordered';

CREATE TABLE events (
  ulid String DEFAULT ulid(),
  id Nullable(String),
  ts DateTime64 DEFAULT ULIDStringToDateTime(ulid, 'America/Chicago'),
  type Nullable(String),
  payload JSON,
  source Nullable(String),
  ingested DateTime64 DEFAULT now(),
)
ENGINE = MergeTree
ORDER BY (id);

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
  ulid String DEFAULT ulid(),
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
  'payload.object.$id' AS id,  
  'payload.object.$type' AS type,
  'payload.object.data' AS data,
  'payload.object.content' AS content,
  'payload.object.meta' AS meta,
  ts,
  ulid
FROM events
WHERE type = 'UpsertVersion' AND 'payload.object.$id' LIKE 'https://';


CREATE MATERIALIZED VIEW dataEvents TO data
AS SELECT
  'payload.object.$id' AS id,  
  'payload.object.$type' AS type,
  'payload.object.data' AS data,
  'payload.object.content' AS content,
  'payload.object.meta' AS meta,
  ts,
  ulid
FROM events
WHERE type = 'Upsert' AND 'payload.object.$id' LIKE 'https://';


CREATE MATERIALIZED VIEW dataVersions TO data
AS SELECT * FROM versions;


CREATE MATERIALIZED VIEW metaEvents TO meta
AS SELECT
  'payload.object.$id' AS id,  
  'payload.object.$type' AS type,
  payload.object.data AS data,
  payload.object.meta AS meta,
  ts,
  ulid
FROM events
WHERE type = 'UpsertMeta' AND payload.object.meta EXISTS;

-- TODO: create a materialized view for the queue
-- TODO: create a materialized view for the embeddings
-- TODO: create a materialized view for the relationships


-- events must be created last because it starts ingesting immediately, so the other materialized views need to be created first
CREATE MATERIALIZED VIEW eventPipeline TO events
AS SELECT
  JSONExtractString(payload, '$id') AS ulid,  -- on incoming events, the $id must be a ulid
  JSONExtractString(payload, '$type') AS type,
  JSONExtractString(payload, 'data.$id') AS id,  -- on incoming events, the $id must be a ulid
  payload,
  source
FROM pipeline;
`

const queries = schema.split(';\n')

for (const query of queries) {
  console.log(query)
  const result = await clickhouse.command({ query, clickhouse_settings: { 'enable_json_type': 1 } })
  console.log(result)
}