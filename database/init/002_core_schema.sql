DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investigation_status') THEN
        CREATE TYPE investigation_status AS ENUM (
            'OPEN',
            'UNDER_INVESTIGATION',
            'CLOSED',
            'ARCHIVED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_status') THEN
        CREATE TYPE evidence_status AS ENUM (
            'REGISTERED',
            'IN_STORAGE',
            'IN_EXAMINATION',
            'TRANSFER_PENDING',
            'TRANSFERRED',
            'INTEGRITY_WARNING',
            'ARCHIVED'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(40) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    case_code VARCHAR(60) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status investigation_status NOT NULL DEFAULT 'OPEN',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    UNIQUE (organization_id, case_code)
);

CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    investigation_id UUID NOT NULL REFERENCES investigations(id),
    evidence_code VARCHAR(60) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(50) NOT NULL,
    collected_by UUID REFERENCES users(id),
    collected_at TIMESTAMPTZ NOT NULL,
    collection_location TEXT,
    current_custodian_id UUID REFERENCES users(id),
    status evidence_status NOT NULL DEFAULT 'REGISTERED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, evidence_code)
);

CREATE TABLE IF NOT EXISTS evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    evidence_id UUID NOT NULL REFERENCES evidence_items(id),
    original_filename TEXT NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(150),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
    sha256_hash CHAR(64) NOT NULL,
    is_original BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (storage_bucket, storage_key)
);

CREATE TABLE IF NOT EXISTS custody_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    evidence_id UUID NOT NULL REFERENCES evidence_items(id),
    event_type VARCHAR(60) NOT NULL,
    performed_by UUID REFERENCES users(id),
    from_custodian_id UUID REFERENCES users(id),
    to_custodian_id UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    previous_event_hash CHAR(64),
    event_hash CHAR(64) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_custody_events_evidence_time
    ON custody_events (evidence_id, event_time);

CREATE TABLE IF NOT EXISTS integrity_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    evidence_file_id UUID NOT NULL REFERENCES evidence_files(id),
    checked_by UUID REFERENCES users(id),
    stored_hash CHAR(64) NOT NULL,
    calculated_hash CHAR(64) NOT NULL,
    is_verified BOOLEAN NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80),
    entity_id UUID,
    result VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    ip_address INET,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_append_only_changes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% is append-only. Insert a correction event instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custody_events_append_only ON custody_events;
CREATE TRIGGER custody_events_append_only
BEFORE UPDATE OR DELETE ON custody_events
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_changes();

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_changes();
