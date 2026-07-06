BEGIN;

CREATE TABLE IF NOT EXISTS custody_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    evidence_id UUID NOT NULL
        REFERENCES evidence_items(id),

    requested_by UUID NOT NULL
        REFERENCES users(id),

    from_custodian_id UUID
        REFERENCES users(id),

    to_custodian_id UUID NOT NULL
        REFERENCES users(id),

    reason TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    approved_by UUID
        REFERENCES users(id),

    approved_at TIMESTAMPTZ,

    rejected_by UUID
        REFERENCES users(id),

    rejected_at TIMESTAMPTZ,

    rejection_reason TEXT,

    completed_by UUID
        REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT custody_transfer_requests_status_check
    CHECK (
        status IN (
            'PENDING',
            'APPROVED',
            'REJECTED',
            'COMPLETED',
            'CANCELLED'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_org_evidence
ON custody_transfer_requests (
    organization_id,
    evidence_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_status
ON custody_transfer_requests (
    organization_id,
    status
);

COMMIT;