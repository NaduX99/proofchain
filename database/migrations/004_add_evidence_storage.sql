CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    investigation_id UUID NOT NULL
        REFERENCES investigations(id)
        ON DELETE CASCADE,

    evidence_code VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(50) NOT NULL,

    collected_at TIMESTAMPTZ,
    collected_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    evidence_item_id UUID NOT NULL
        REFERENCES evidence_items(id)
        ON DELETE CASCADE,

    original_filename VARCHAR(255) NOT NULL,
    object_name TEXT NOT NULL,
    bucket_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    size_bytes BIGINT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,

    uploaded_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS investigation_id UUID;

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS evidence_code VARCHAR(80);

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS title VARCHAR(255);

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50);

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS collected_by UUID;

ALTER TABLE evidence_items
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
DEFAULT NOW();

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS evidence_item_id UUID;

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS object_name TEXT;

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS bucket_name VARCHAR(255);

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS sha256_hash CHAR(64);

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS uploaded_by UUID;

ALTER TABLE evidence_files
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS
uq_evidence_items_organization_code
ON evidence_items (
    organization_id,
    evidence_code
);

CREATE UNIQUE INDEX IF NOT EXISTS
uq_evidence_file_hash_per_item
ON evidence_files (
    evidence_item_id,
    sha256_hash
);

CREATE INDEX IF NOT EXISTS
idx_evidence_items_investigation
ON evidence_items (
    investigation_id
);

CREATE INDEX IF NOT EXISTS
idx_evidence_files_item
ON evidence_files (
    evidence_item_id
);

CREATE INDEX IF NOT EXISTS
idx_evidence_files_sha256
ON evidence_files (
    sha256_hash
);