BEGIN;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS method VARCHAR(10);

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS path TEXT;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS status_code INTEGER;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS request_body JSONB DEFAULT '{}'::jsonb;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE audit_logs
SET method = 'UNKNOWN'
WHERE method IS NULL;

UPDATE audit_logs
SET path = 'UNKNOWN'
WHERE path IS NULL;

UPDATE audit_logs
SET success = TRUE
WHERE success IS NULL;

UPDATE audit_logs
SET request_body = '{}'::jsonb
WHERE request_body IS NULL;

ALTER TABLE audit_logs
ALTER COLUMN method SET NOT NULL;

ALTER TABLE audit_logs
ALTER COLUMN path SET NOT NULL;

ALTER TABLE audit_logs
ALTER COLUMN success SET NOT NULL;

ALTER TABLE audit_logs
ALTER COLUMN request_body SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
ON audit_logs (
    organization_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
ON audit_logs (
    user_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
ON audit_logs (
    action,
    created_at DESC
);

COMMIT;