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
    visibility LowCardinality(String) DEFAULT 'public'
)
ENGINE = CoalescingMergeTree
ORDER BY (id);  