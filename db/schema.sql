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
    format = 'JSONAsObject'
)
SETTINGS
    mode = 'ordered';


CREATE TABLE events
(
    ns         String DEFAULT 'events.do',
    id         String DEFAULT generateULID(),
    ts         DateTime64() MATERIALIZED ULIDStringToDateTime(id, 'America/Chicago'),
    url        String DEFAULT concat('https://', ns, '/', id),
    type       String DEFAULT 'Action',
    data       JSON,
    meta       Nullable(JSON),
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public')
    nsHash     UInt64 MATERIALIZED xxHash32(ns),
    idHash     UInt64 MATERIALIZED xxHash32(id),
    urlHash    UInt64 MATERIALIZED xxHash32(url),
    _e         String MATERIALIZED sqidEncode(nsHash, idHash, ts), -- 3-part sqid is `event`
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
    data       JSON,
    meta       Nullable(JSON),
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public'),
    nsHash     UInt64 MATERIALIZED xxHash32(ns),
    idHash     UInt64 MATERIALIZED xxHash32(id),
    urlHash    UInt64 MATERIALIZED xxHash32(url),
    contentHash UInt64 MATERIALIZED xxHash32(content),
    _v         String MATERIALIZED sqidEncode(nsHash, idHash, ts, contentHash), -- 4-part sqid is `version` / _v
    _id        String MATERIALIZED sqidEncode(nsHash, idHash), -- 2-part sqid is `data` / _id
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
    meta       Nullable(JSON),
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public'),
    nsHash     UInt64 MATERIALIZED xxHash32(ns),
    idHash     UInt64 MATERIALIZED xxHash32(id),
    urlHash    UInt64 MATERIALIZED xxHash32(url),
    _id        String MATERIALIZED sqidEncode(nsHash, idHash), -- 2-part sqid is `data` / _id
)
ENGINE = MergeTree
ORDER BY (ns, id, ts);  



CREATE TABLE relationships
(
    from        String,
    type        String,
    to          String,
    data        Nullable(JSON),
    meta        Nullable(JSON),
    nsFrom      String,
    nsTo        String,
    idFrom      String,
    idTo        String,
    nsFromHash  UInt64 MATERIALIZED xxHash32(nsFrom),
    idFromHash  UInt64 MATERIALIZED xxHash32(idFrom),
    typeHash    UInt64 MATERIALIZED xxHash32(type),
    nsToHash    UInt64 MATERIALIZED xxHash32(nsTo),
    idToHash    UInt64 MATERIALIZED xxHash32(idTo),
    _r          String MATERIALIZED sqidEncode(nsFromHash, idFromHash, typeHash, nsToHash, idToHash), -- 5-part sqid is `relationship` / _r
)
ENGINE = MergeTree
ORDER BY (nsTo, idTo, type);  


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