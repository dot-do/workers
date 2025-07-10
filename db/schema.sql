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