ALTER TABLE evidence_items
ALTER COLUMN collected_at
SET DEFAULT NOW();

ALTER TABLE evidence_items
ALTER COLUMN evidence_code
TYPE VARCHAR(80);