CREATE TABLE events
(
    ns         String,
    id         String DEFAULT generateULID(),
    tz         String DEFAULT 'America/Chicago',
    ts         DateTime64() MATERIALIZED ULIDStringToDateTime(id, tz),
    type       String DEFAULT 'Action',
    data       JSON,
    content    String,
    visibility LowCardinality(String) DEFAULT 'public'
)
ENGINE = CoalescingMergeTree
ORDER BY (id);  