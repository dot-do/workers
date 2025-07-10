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