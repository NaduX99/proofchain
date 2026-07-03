BEGIN;

ALTER TABLE custody_events
ADD COLUMN IF NOT EXISTS sequence_number BIGINT;

ALTER TABLE custody_events
DISABLE TRIGGER custody_events_append_only;

WITH ranked_events AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY evidence_id
            ORDER BY event_time ASC, id ASC
        ) AS calculated_sequence
    FROM custody_events
)
UPDATE custody_events AS event
SET sequence_number =
    ranked_events.calculated_sequence
FROM ranked_events
WHERE event.id = ranked_events.id
  AND event.sequence_number IS NULL;

ALTER TABLE custody_events
ENABLE TRIGGER custody_events_append_only;

ALTER TABLE custody_events
ALTER COLUMN sequence_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
uq_custody_events_evidence_sequence
ON custody_events (
    evidence_id,
    sequence_number
);

CREATE UNIQUE INDEX IF NOT EXISTS
uq_custody_events_event_hash
ON custody_events (
    event_hash
);

CREATE INDEX IF NOT EXISTS
idx_custody_events_org_evidence_sequence
ON custody_events (
    organization_id,
    evidence_id,
    sequence_number
);

COMMIT;