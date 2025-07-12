SET enable_json_type = 1;

CREATE TABLE eventsPipeline  
(
  data JSON,
  _path   String,
  _file   String,
  _time   DateTime
)
ENGINE = S3Queue(
  'https://<ACCOUNT_ID>.r2.cloudflarestorage.com/my-bucket/**/*.ndjson.gz',
  concat({R2_ACCOUNT_ID: String},':',{R2_ACCOUNT_SECRET: String}),
  format = 'JSONAsObject'
)
SETTINGS
  mode = 'ordered';


CREATE TABLE events
(
  ns         String DEFAULT 'events.do',
  id         String DEFAULT generateULID(),
  ts         DateTime64() MATERIALIZED ULIDStringToDateTime(id, 'America/Chicago'),
  url        String MATERIALIZED concat('https://', ns, '/', id),
  type       String DEFAULT 'Action',
  data       JSON,
  meta       Nullable(JSON),
  content    String,
  status     String DEFAULT 'CompletedActionStatus',
  result     Nullable(JSON),
  error      Nullable(JSON),
  visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public')
  nsHash     UInt32 MATERIALIZED xxHash32(ns),
  idHash     UInt32 MATERIALIZED xxHash32(id),
  urlHash    UInt32 MATERIALIZED xxHash32(url),
  
  _e         String MATERIALIZED sqidEncode(1, nsHash, idHash, ts)
  
  INDEX bf_eq_hash (nsHash, idHash, urlHash, _e) TYPE bloom_filter(2048, 3, 0) GRANULARITY 4, -- equality on ns, id, url
  INDEX tk_id (id) TYPE tokenbf_v1(2048, 2, 0) GRANULARITY 4, -- token search on id    
  INDEX ng_url (url) TYPE ngrambf_v1(3, 4096, 2, 0) GRANULARITY 8, -- arbitrary substring on url
  INDEX bf_status (status) TYPE bloom_filter(1024, 3, 0) GRANULARITY 4 -- equality on JSON status

)
ENGINE = CoalescingMergeTree
ORDER BY (ns, id);  


CREATE TABLE versions
(
  ns         String,
  id         String,
  ts         DateTime64(),
  url        String MATERIALIZED concat('https://', ns, '/', id),
  type       Nullable(String),
  name       Nullable(String),
  data       JSON,
  meta       Nullable(JSON),
  event      String,
  content    String,
  visibility LowCardinality(String) DEFAULT 'private',  --if(startsWith(id, '_'), 'private', 'public'),
  yaml       Nullable(String),
  html       Nullable(String),
  code       Nullable(String),
  jsx        Nullable(String),
  esm        Nullable(String),
  mdast      Nullable(JSON),
  estree     Nullable(JSON),
  embedding  Array(Float32),

  nsHash     UInt32 MATERIALIZED xxHash32(ns),
  idHash     UInt32 MATERIALIZED xxHash32(id),
  urlHash    UInt32 MATERIALIZED xxHash32(url),
  typeHash   UInt32 MATERIALIZED xxHash32(type),
  esmHash    UInt32 MATERIALIZED xxHash32(esm),
  hash       UInt32 MATERIALIZED xxHash32(concat(data, content)),

  _e         String MATERIALIZED sqidEncode(1, nsHash, idHash, ts),        -- events._e
  _v         String MATERIALIZED sqidEncode(2, nsHash, idHash, ts, hash),  -- versions._v
  _id        String MATERIALIZED sqidEncode(3, nsHash, idHash),            -- data._id
)
ENGINE = CoalescingMergeTree
ORDER BY (ns, id, ts);  



CREATE TABLE data
(
  ns         String,
  id         String,
  url        String,
  type       Nullable(String),
  name       Nullable(String),
  data       JSON,
  meta       Nullable(JSON),
  content    String,
  createdAt  DateTime64(),
  createdIn  String,
  createdBy  String,
  updatedAt  DateTime64(),
  updatedIn  String,
  updatedBy  String,
  visibility LowCardinality(String) DEFAULT 'private',
  yaml       Nullable(String),
  html       Nullable(String),
  code       Nullable(String),
  jsx        Nullable(String),
  esm        Nullable(String),
  mdast      Nullable(JSON),
  estree     Nullable(JSON),
  embedding  Array(Float32),
  nsHash     UInt32 MATERIALIZED xxHash32(ns),
  idHash     UInt32 MATERIALIZED xxHash32(id),
  urlHash    UInt32 MATERIALIZED xxHash32(url),
  typeHash   UInt32 MATERIALIZED xxHash32(type),
  hash       UInt32 MATERIALIZED xxHash32(concat(data, content)),

  _e         String MATERIALIZED sqidEncode(1, nsHash, idHash, ts),        -- events._e
  _v         String MATERIALIZED sqidEncode(2, nsHash, idHash, ts, hash),  -- versions._v
  _id        String MATERIALIZED sqidEncode(3, nsHash, idHash),            -- data._id
)
ENGINE = MergeTree
ORDER BY (ns, id, ts);  



CREATE TABLE relationships
(
  from        String,
  type        String,
  to          String,
  ts          DateTime64(),
  data        Nullable(JSON),
  meta        Nullable(JSON),
  nsFrom      String,
  nsTo        String,
  idFrom      String,
  idTo        String,
  nsFromHash  UInt32 MATERIALIZED xxHash32(nsFrom),
  idFromHash  UInt32 MATERIALIZED xxHash32(idFrom),
  nsToHash    UInt32 MATERIALIZED xxHash32(nsTo),
  idToHash    UInt32 MATERIALIZED xxHash32(idTo),
  typeHash    UInt32 MATERIALIZED xxHash32(type),
  _r          String MATERIALIZED sqidEncode(4, nsFromHash, idFromHash, typeHash, nsToHash, idToHash),  -- relationships._r
  _to         String MATERIALIZED sqidEncode(3, nsToHash, idToHash),  --  _to data._id
)
ENGINE = MergeTree
ORDER BY (nsTo, idTo, type);  


CREATE TABLE context
(
  ns          String,
  id          String,
  ts          DateTime64(),
  url         String MATERIALIZED concat('https://', ns, '/', id),
  type        Nullable(String),
  name        Nullable(String),
  contentType String,
  content     String,
  embedding   Array(Float32),
  visibility  LowCardinality(String) DEFAULT 'private',
  nsHash      UInt32 MATERIALIZED xxHash32(ns),
  idHash      UInt32 MATERIALIZED xxHash32(id),
  typeHash    UInt32 MATERIALIZED xxHash32(type),
  urlHash     UInt32 MATERIALIZED xxHash32(url),
  hash        UInt64 MATERIALIZED xxHash64(concat(contentType, content)),
  _id         String MATERIALIZED sqidEncode(3, nsHash, idHash), -- context._id
)
ENGINE = MergeTree
ORDER BY (ns, id, ts);  


-- Stream data from the S3Queue-backed `eventsPipeline` into the canonical `events` table
CREATE OR REPLACE MATERIALIZED VIEW pipelineStream TO events
AS
SELECT
    JSONExtractString(data, 'ns')                       AS ns,
    JSONExtractString(data, '$id')                      AS id,
    JSONExtractString(data, '$type')                    AS type,
    CAST(jsonMergePatch(data, '{"$id":null,"$type":null}') AS JSON) AS data,
    JSONExtractString(data, 'content')                  AS content,
    JSONExtractString(data, 'visibility')               AS visibility
FROM eventsPipeline; 