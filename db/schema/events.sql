SELECT  ULIDStringToDateTime(generateULID(), 'America/Chicago')

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
    concat({r2Id: String},':',{r2Secret: String}),
    format = 'JSONAsObject',
    compression_method = 'gzip'
)
SETTINGS
    mode                         = 'ordered',   -- preserve file order
    -- s3queue_buckets              = 4,           -- parallel “logical shards”
    -- s3queue_processing_threads_num = 4,         -- local threads per replica
    -- s3queue_parallel_inserts     = 1;           -- optional, boosts throughput


CREATE TABLE events
(
    ns         String,
    id         String DEFAULT generateULID(),
    ts         DateTime64() MATERIALIZED ULIDStringToDateTime(id, 'America/Chicago'),
    type       String DEFAULT 'Action',
    data       JSON,
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public')
    nsHash     UInt64 MATERIALIZED xxHash32(ns),
    idHash     UInt64 MATERIALIZED xxHash32(id),
    _e         String MATERIALIZED sqidEncode(nsHash, idHash, ts),
)
ENGINE = CoalescingMergeTree
ORDER BY (id);  


CREATE TABLE versions
(
    ns         String,
    id         String,
    ts         UInt32 DEFAULT toUnixTimestamp(now()),
    url        String DEFAULT concat('https://', ns, '/', id),
    name       Nullable(String),
    data       Nullable(JSON),
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public'),
    nsHash     UInt64 MATERIALIZED xxHash32(ns),
    idHash     UInt64 MATERIALIZED xxHash32(id),
    contentHash UInt64 MATERIALIZED xxHash32(content),
    _v         String MATERIALIZED sqidEncode(nsHash, idHash, contentHash, ts),
)
ENGINE = MergeTree
ORDER BY (ns, id, ts);  



CREATE TABLE data
(
    ns         String,
    id         String,
    url        String,
    name       Nullable(String),
    data       JSON,
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public'),
    nsHash     UInt64 MATERIALIZED xxHash32(ns),
    idHash     UInt64 MATERIALIZED xxHash32(id),
    _id        String MATERIALIZED sqidEncode(nsHash, idHash),
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