import { clickhouse } from './sql'


const schema = /* sql */ `

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS data;
DROP TABLE IF EXISTS relationships;

CREATE TABLE IF NOT EXISTS pipeline (
  data JSON,
  _file String,
  _id String,
  _type String,
  _ts DateTime64,
  _url String,
  _visibility String,
  _version String,
)

CREATE TABLE IF NOT EXISTS events (
  id String,
  ts DateTime64,
  type Nullable(String),
  data Nullable(JSON),
  meta Nullable(JSON),
);

CREATE TABLE IF NOT EXISTS data (
  id String,
  ts DateTime64,
  type String,
  content String,
  data Nullable(JSON),
  meta Nullable(JSON),
);

CREATE TABLE IF NOT EXISTS relationships (
  from String,
  type String,
  to String,
  ts DateTime64,
);    
`


const queries = schema.split(';\n')

for (const query of queries) {
  const result = await clickhouse.command({ query, clickhouse_settings: { 'enable_json_type': 1 } })
  console.log(result)
}