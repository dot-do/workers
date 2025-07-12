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
    result     Nullable(JSON),
    error      Nullable(JSON),
    status     String DEFAULT 'pending',
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public')
    nsHash     UInt32 MATERIALIZED xxHash32(ns),
    idHash     UInt32 MATERIALIZED xxHash32(id),
    urlHash    UInt32 MATERIALIZED xxHash32(url),
    _e         String MATERIALIZED sqidEncode(1, nsHash, idHash, ts)
    
    INDEX bf_eq_hash (nsHash, idHash, urlHash, _e)
        TYPE bloom_filter(2048, 3, 0) GRANULARITY 4,

    INDEX tk_id (id)          -- token search on id
        TYPE tokenbf_v1(2048, 2, 0) GRANULARITY 4,

    INDEX ng_url (url)        -- arbitrary substring on url
        TYPE ngrambf_v1(3, 4096, 2, 0) GRANULARITY 8,

    INDEX bf_status (status)  -- equality on JSON status
        TYPE bloom_filter(1024, 3, 0) GRANULARITY 4

)
ENGINE = CoalescingMergeTree
ORDER BY (id);  


CREATE TABLE versions
(
    ns         String,
    id         String,
    ts         DateTime64(),
    url        String DEFAULT concat('https://', ns, '/', id),
    name       Nullable(String),
    data       JSON,
    meta       Nullable(JSON),
    createdIn  String,
    content    String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public'),
    nsHash     UInt32 MATERIALIZED xxHash32(ns),
    idHash     UInt32 MATERIALIZED xxHash32(id),
    urlHash    UInt32 MATERIALIZED xxHash32(url),
    contentHash UInt32 MATERIALIZED xxHash32(content),
    _v         String MATERIALIZED sqidEncode(2, nsHash, idHash, ts, contentHash),  -- versions._v
    _id        String MATERIALIZED sqidEncode(3, nsHash, idHash),                   -- data._id
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
    createdAt  DateTime64(),
    createdIn  String,
    createdBy  String,
    updatedAt  DateTime64(),
    updatedIn  String,
    updatedBy  String,
    visibility LowCardinality(String) DEFAULT if(startsWith(id, '_'), 'private', 'public'),
    nsHash     UInt32 MATERIALIZED xxHash32(ns),
    idHash     UInt32 MATERIALIZED xxHash32(id),
    urlHash    UInt32 MATERIALIZED xxHash32(url),
    _id        String MATERIALIZED sqidEncode(3, nsHash, idHash), -- data._id
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
    typeHash    UInt32 MATERIALIZED xxHash32(type),
    nsToHash    UInt32 MATERIALIZED xxHash32(nsTo),
    idToHash    UInt32 MATERIALIZED xxHash32(idTo),
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