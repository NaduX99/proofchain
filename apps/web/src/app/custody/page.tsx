"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { api } from "@/lib/api";

type Investigation = {
  id: string;
  caseCode?: string;
  case_code?: string;
  title: string;
};

type EvidenceItem = {
  id: string;
  evidenceCode?: string;
  evidence_code?: string;
  title: string;
};

type CustodyEvent = {
  id: string;
  eventType?: string;
  event_type?: string;
  reason?: string;
  notes?: string;
  location?: string;
  performedBy?: string;
  performed_by?: string;
  eventTime?: string;
  event_time?: string;
  createdAt?: string;
  created_at?: string;
  sequenceNumber?: number;
  sequence_number?: number;
  eventHash?: string;
  event_hash?: string;
  previousEventHash?: string;
  previous_event_hash?: string;
  integrityStatus?: string;
  integrity_status?: string;
};

function extractList(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          message?: string | string[];
        };
      };
    };

    const message = axiosError.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join("\n");
    }

    return message || "Request failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function getStatusCode(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: {
        status?: number;
      };
    };

    return axiosError.response?.status;
  }

  return undefined;
}

function formatDate(value?: string) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getEventType(event: CustodyEvent) {
  return event.eventType || event.event_type || "CUSTODY_EVENT";
}

function getSequence(event: CustodyEvent) {
  return event.sequenceNumber || event.sequence_number || 0;
}

function getEventHash(event: CustodyEvent) {
  return event.eventHash || event.event_hash || "No hash";
}

function getPreviousHash(event: CustodyEvent) {
  return event.previousEventHash || event.previous_event_hash || "Genesis event";
}

function getIntegrityStatus(event: CustodyEvent) {
  return event.integrityStatus || event.integrity_status || "VALID";
}

export default function CustodyPage() {
  const router = useRouter();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [custodyEvents, setCustodyEvents] = useState<CustodyEvent[]>([]);

  const [selectedInvestigationId, setSelectedInvestigationId] = useState("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");

  const [eventType, setEventType] = useState("NOTE_ADDED");
  const [reason, setReason] = useState("Evidence moved for forensic analysis.");
  const [location, setLocation] = useState("Digital Forensics Lab");
  const [notes, setNotes] = useState("Manual custody event recorded.");

  const [loadingInvestigations, setLoadingInvestigations] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  function handleUnauthorized(error: unknown) {
    if (getStatusCode(error) === 401) {
      localStorage.clear();
      router.push("/login");
      return true;
    }

    return false;
  }

  async function fetchInvestigations() {
    try {
      setError("");
      setLoadingInvestigations(true);

      const response = await api.get("/investigations");
      const list = extractList(response.data);

      setInvestigations(list);

      if (list.length > 0 && !selectedInvestigationId) {
        setSelectedInvestigationId(list[0].id);
      }
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingInvestigations(false);
    }
  }

  async function fetchEvidence(investigationId: string) {
    if (!investigationId) return;

    try {
      setError("");
      setSuccess("");
      setVerifyResult(null);
      setLoadingEvidence(true);
      setEvidenceItems([]);
      setCustodyEvents([]);
      setSelectedEvidenceId("");

      const response = await api.get(
        `/investigations/${investigationId}/evidence`
      );

      const list = extractList(response.data);
      setEvidenceItems(list);

      if (list.length > 0) {
        setSelectedEvidenceId(list[0].id);
      }
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingEvidence(false);
    }
  }

  async function fetchCustodyEvents(evidenceId: string) {
    if (!evidenceId) return;

    try {
      setError("");
      setLoadingEvents(true);

      const response = await api.get(`/evidence/${evidenceId}/custody-events`);
      const list = extractList(response.data);

      setCustodyEvents(list);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingEvents(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEvidenceId) {
      setError("Please select evidence item");
      return;
    }

    if (!eventType.trim()) {
      setError("Event type is required");
      return;
    }

    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setVerifyResult(null);
      setCreating(true);

   await api.post(`/evidence/${selectedEvidenceId}/custody-events`, {
  eventType,
  reason: `${reason} Location: ${location}. Notes: ${notes}`,
});

      setSuccess("Custody event added successfully.");
      setReason("Manual custody note added.");
setLocation("Digital Forensics Lab");
setNotes("Manual custody event recorded.");
      await fetchCustodyEvents(selectedEvidenceId);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleVerifyChain() {
    if (!selectedEvidenceId) {
      setError("Please select evidence item");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setVerifying(true);

      const response = await api.get(
        `/evidence/${selectedEvidenceId}/custody-events/verify-chain`
      );

      setVerifyResult(response.data);
      setSuccess("Custody chain verification completed.");
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchInvestigations();
  }, []);

  useEffect(() => {
    if (selectedInvestigationId) {
      fetchEvidence(selectedInvestigationId);
    }
  }, [selectedInvestigationId]);

  useEffect(() => {
    if (selectedEvidenceId) {
      fetchCustodyEvents(selectedEvidenceId);
    }
  }, [selectedEvidenceId]);

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Custody Chain</h1>
            <p className="mt-2 text-slate-400">
              Track evidence movement, custody events, and chain integrity.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Custody Events</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {custodyEvents.length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-1"
          >
            <h2 className="text-xl font-semibold">Add Custody Event</h2>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Investigation
              </label>

              <select
                value={selectedInvestigationId}
                onChange={(event) =>
                  setSelectedInvestigationId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                {loadingInvestigations ? (
                  <option>Loading...</option>
                ) : investigations.length === 0 ? (
                  <option>No investigations found</option>
                ) : (
                  investigations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.caseCode || item.case_code || "NO-CODE"} -{" "}
                      {item.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Evidence Item
              </label>

              <select
                value={selectedEvidenceId}
                onChange={(event) => setSelectedEvidenceId(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                {loadingEvidence ? (
                  <option>Loading...</option>
                ) : evidenceItems.length === 0 ? (
                  <option>No evidence found</option>
                ) : (
                  evidenceItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.evidenceCode || item.evidence_code || "NO-CODE"} -{" "}
                      {item.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Event Type
              </label>

              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                
                <option value="EVIDENCE_REGISTERED">Evidence Registered</option>
<option value="FILE_UPLOADED">File Uploaded</option>
<option value="ACCESSED">Accessed</option>
<option value="TRANSFERRED">Transferred</option>
<option value="STATUS_CHANGED">Status Changed</option>
<option value="INTEGRITY_VERIFIED">Integrity Verified</option>
<option value="NOTE_ADDED">Note Added</option>
<option value="RELEASED">Released</option>
<option value="ARCHIVED">Archived</option>
<option value="TRANSFER_REQUESTED">Transfer Requested</option>
<option value="TRANSFER_APPROVED">Transfer Approved</option>
<option value="TRANSFER_REJECTED">Transfer Rejected</option>
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Reason
              </label>

              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for custody event"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Location
              </label>

              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Example: Digital Forensics Lab"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">Notes</label>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Additional notes"
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            {error && (
              <div className="mt-4 whitespace-pre-line rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={creating || !selectedEvidenceId}
              className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {creating ? "Adding..." : "Add Custody Event"}
            </button>

            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={verifying || !selectedEvidenceId}
              className="mt-3 w-full rounded-xl bg-green-500 px-4 py-3 font-semibold text-slate-950 hover:bg-green-400 disabled:opacity-60"
            >
              {verifying ? "Verifying..." : "Verify Chain Integrity"}
            </button>

            {verifyResult && (
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-cyan-300">
                  Verification Result
                </p>

                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">
                  {JSON.stringify(verifyResult, null, 2)}
                </pre>
              </div>
            )}
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Custody Timeline</h2>

              <button
                onClick={() => fetchCustodyEvents(selectedEvidenceId)}
                disabled={!selectedEvidenceId || loadingEvents}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {loadingEvents ? (
              <p className="mt-6 text-slate-400">Loading custody events...</p>
            ) : custodyEvents.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">No custody events found.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add a manual custody event or upload an evidence file.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {custodyEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="relative rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-slate-950">
                            {getSequence(event) || index + 1}
                          </span>

                          <div>
                            <h3 className="text-lg font-semibold">
                              {getEventType(event)}
                            </h3>

                            <p className="text-xs text-slate-500">
                              {formatDate(
                                event.eventTime ||
                                  event.event_time ||
                                  event.createdAt ||
                                  event.created_at
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Reason:
                          </span>{" "}
                          {event.reason || "No reason"}
                        </p>

                        <p className="mt-2 text-sm text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Location:
                          </span>{" "}
                          {event.location || "No location"}
                        </p>

                        <p className="mt-2 text-sm text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Notes:
                          </span>{" "}
                          {event.notes || "No notes"}
                        </p>

                        <p className="mt-3 break-all text-xs text-slate-500">
                          Previous Hash: {getPreviousHash(event)}
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-500">
                          Event Hash: {getEventHash(event)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Event ID: {event.id}
                        </p>
                      </div>

                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                        {getIntegrityStatus(event)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}