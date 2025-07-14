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
  data String,
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
  data JSON,
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
  id String DEFAULT ulid(),
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
);

CREATE TABLE relationships (
  from String,
  type String,
  to String,
  ts DateTime64,
);  

CREATE MATERIALIZED VIEW versionEvents TO versions (
  id,
  ts,
  type,
  content,
  data,
  meta
)
AS SELECT
  'data.$id' AS ulid,  -- on events, the $id must be a ulid
  'data.$type' AS type,
  'data.$context' AS context,
  ts,
  data,
  source
FROM events
WHERE type = 'Upsert' AND 'data.$id' EXISTS;

-- events must be created last because it starts ingesting immediately, so the other materialized views need to be created first
CREATE MATERIALIZED VIEW eventPipeline TO events (
  id String,
  ts DateTime64,
  type Nullable(String),
  data Nullable(JSON),
  meta Nullable(JSON),
)
AS SELECT
  JSONExtractString(data, '$id') AS id,
  JSONExtractString(data, '$type') AS type,
  data,
  source
FROM pipeline;
`

const queries = schema.split(';\n')

for (const query of queries) {
  console.log(query)
  const result = await clickhouse.command({ query, clickhouse_settings: { 'enable_json_type': 1 } })
  console.log(result)
}