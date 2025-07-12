-- DROP TABLE events;
-- DROP TABLE data;
-- DROP VIEW mv_events_to_data;

/* Enable native JSON/Object once per session if you use JSON */
SET enable_json_type = 1;

------------------------------------------------------
-- 1)  RAW EVENT LOG  (immutable)
------------------------------------------------------
CREATE TABLE events
(
    -- when the event happened
    timestamp  DateTime64() DEFAULT now64(),

    -- what object it refers to
    id         String,                 -- full URI
    event      String,                 -- e.g. CreateAction, UpdateAction…
    type       String,                 -- e.g. CreativeWork
    data       JSON,                   -- arbitrary payload
    content    String,                 -- markdown
    visibility String                  -- 'public' or tenant slug
)
ENGINE = MergeTree
ORDER BY (timestamp, id);              -- fastest scans by time, tie-break by id


------------------------------------------------------
-- 2)  CURRENT STATE SNAPSHOT  (latest row wins)
------------------------------------------------------
CREATE TABLE data
(
    id         String,
    type       String,
    data       JSON,
    content    String,
    visibility String,
    updated    DateTime64()    -- last-seen timestamp
)
ENGINE = ReplacingMergeTree(updated)
ORDER BY id;                           -- dedupe solely on object URI


------------------------------------------------------
-- 3)  MATERIALIZED VIEW: stream raw → snapshot
------------------------------------------------------
CREATE MATERIALIZED VIEW mv_events_to_data
TO data
AS
SELECT
    id,
    type,
    data,
    content,
    visibility,
    /* map the event’s timestamp into the snapshot’s updated column */
    timestamp AS updated
FROM events;


------------------------------------------------------
-- 4)  S3 EVENT INGESTION QUEUE
------------------------------------------------------
-- The following objects continuously ingest JSONEachRow files that land in an
-- S3 bucket into the `events` table. Adjust the URL, credentials and any
-- S3Queue settings to match your environment.

/*
   S3 bucket layout (example):
   s3://my-bucket/events/2024-05-01T12-34-56Z.json
   Each object must contain newline-delimited JSON with the same shape as the
   `events` table. For example:
   {"timestamp":"2024-05-01T12:34:56.789Z","id":"urn:example:123","event":"CreateAction","type":"CreativeWork","data":{},"content":"# hello","visibility":"public"}
*/

CREATE TABLE s3_events_queue
(
    timestamp  DateTime64,
    id         String,
    event      String,
    type       String,
    data       JSON,
    content    String,
    visibility String
)
ENGINE = S3Queue(
    -- Path to a JSONEachRow object or a wildcard path. Update to your bucket.
    'https://s3.amazonaws.com/<YOUR_BUCKET_NAME>/events/*',
    'JSONEachRow'
)
SETTINGS
    mode = 'unordered',      -- tolerate out-of-order object names
    after_processing = 'delete';

/* On creation of the materialized view below the S3Queue starts to stream
   objects into the `events` table in real-time. */
CREATE MATERIALIZED VIEW mv_s3_events_to_events
TO events
AS
SELECT
    timestamp,
    id,
    event,
    type,
    data,
    content,
    visibility
FROM s3_events_queue;

CREATE TABLE relationships
(
    fromId     String,                      -- object that mentions the link
    toId       String,                      -- the URL that was found
    predicate  LowCardinality(String),      -- e.g. 'schema:mentions'
    relTs      DateTime64(3) DEFAULT now64()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(relTs)
ORDER BY (toId, relTs);


/* Assume source table `events`
   (ts DateTime64, object String, json_data JSON, md_content String)  */

CREATE MATERIALIZED VIEW mv_links_to_relationships
TO relationships
AS
/* -------- 1.  JSON field ---------- */
SELECT
    object                                   AS fromId,
    url                                      AS toId,
    path                                     AS predicate,     --  ←   JSONPath
    ts                                       AS relTs
FROM
(
    /* Get *all* paths in the document. */
    SELECT
        ts, object,
        arrayZip(                            -- pair path ↔ value
            JSONAllPaths(json_data),         -- every path (e.g. "$.author.url")
            arrayMap(p -> JSONExtractRaw(json_data, p),
                      JSONAllPaths(json_data))
        ) AS pairs
    FROM events
)
ARRAY JOIN
    arrayFilter(t -> t.2 LIKE 'http%' OR t.2 LIKE 'https%', pairs) AS t
    /* unpack each tuple */
    /* t.1 = path, t.2 = value */
    -- trim the surrounding quotes RE2-style
    CAST(trim(BOTH '"' FROM t.2) AS String)  AS url,
    t.1                                      AS path

UNION ALL
/* -------- 2.  Markdown field -------- */
SELECT
    object                                   AS fromId,
    url                                      AS toId,
    '$.markdown'                             AS predicate,     -- static
    ts                                       AS relTs
FROM
(
    SELECT
        ts, object,
        extractAll(md_content,
                   '(https?://[^\\s)]+)')    AS md_urls         -- every link
    FROM events
)
ARRAY JOIN md_urls AS url ;