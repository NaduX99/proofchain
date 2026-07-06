BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES organizations(id),

    user_id UUID
        REFERENCES users(id),

    action VARCHAR(120) NOT NULL,

    method VARCHAR(10) NOT NULL,

    path TEXT NOT NULL,

    status_code INTEGER,

    success BOOLEAN NOT NULL DEFAULT TRUE,

    ip_address VARCHAR(100),

    user_agent TEXT,

    request_body JSONB NOT NULL DEFAULT '{}'::jsonb,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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