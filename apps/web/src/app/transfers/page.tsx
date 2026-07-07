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

type UserItem = {
  id: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TransferRequest = {
  id: string;
  status?: string;
  reason?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
  requestedAt?: string;
  requested_at?: string;
  fromUserId?: string;
  from_user_id?: string;
  toUserId?: string;
  to_user_id?: string;
  fromCustodianId?: string;
  from_custodian_id?: string;
  toCustodianId?: string;
  to_custodian_id?: string;
  requestedBy?: string;
  requested_by?: string;
  requestedTo?: string;
  requested_to?: string;
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

function getUserName(user: UserItem) {
  return user.fullName || user.full_name || user.name || user.email || user.id;
}

function getTransferUserId(request: TransferRequest) {
  return (
    request.toUserId ||
    request.to_user_id ||
    request.toCustodianId ||
    request.to_custodian_id ||
    request.requestedTo ||
    request.requested_to ||
    "Unknown"
  );
}

async function postTransferRequestWithFallback(
  evidenceId: string,
  userId: string,
  reason: string
) {
  const payloads = [
    {
      toUserId: userId,
      reason,
    },
    {
      toCustodianId: userId,
      reason,
    },
    {
      requestedToUserId: userId,
      reason,
    },
    {
      requestedTo: userId,
      reason,
    },
    {
      assigneeUserId: userId,
      reason,
    },
  ];

  let lastError: unknown = null;

  for (const payload of payloads) {
    try {
      return await api.post(
        `/evidence/${evidenceId}/transfer-requests`,
        payload
      );
    } catch (error) {
      lastError = error;

      if (getStatusCode(error) !== 400) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function postActionWithFallback(url: string, reason: string) {
  const payloads = [
    {
      reason,
    },
    {
      notes: reason,
    },
    {},
  ];

  let lastError: unknown = null;

  for (const payload of payloads) {
    try {
      return await api.post(url, payload);
    } catch (error) {
      lastError = error;

      if (getStatusCode(error) !== 400) {
        throw error;
      }
    }
  }

  throw lastError;
}

export default function TransfersPage() {
  const router = useRouter();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);

  const [selectedInvestigationId, setSelectedInvestigationId] = useState("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const [reason, setReason] = useState(
    "Transfer evidence to another custodian for forensic analysis."
  );
  const [actionReason, setActionReason] = useState(
    "Transfer request reviewed and updated."
  );

  const [loadingInvestigations, setLoadingInvestigations] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setLoadingEvidence(true);
      setEvidenceItems([]);
      setRequests([]);
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

  async function fetchUsers() {
    try {
      setError("");
      setLoadingUsers(true);

      const response = await api.get("/users");
      const list = extractList(response.data);

      setUsers(list);

      if (list.length > 0 && !selectedUserId) {
        setSelectedUserId(list[0].id);
      }
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchTransferRequests(evidenceId: string) {
    if (!evidenceId) return;

    try {
      setError("");
      setLoadingRequests(true);

      const response = await api.get(`/evidence/${evidenceId}/transfer-requests`);
      setRequests(extractList(response.data));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEvidenceId) {
      setError("Please select evidence item");
      return;
    }

    if (!selectedUserId) {
      setError("Please select transfer user");
      return;
    }

    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setCreating(true);

      await postTransferRequestWithFallback(
        selectedEvidenceId,
        selectedUserId,
        reason
      );

      setSuccess("Transfer request created successfully.");
      setReason("Transfer evidence to another custodian for forensic analysis.");

      await fetchTransferRequests(selectedEvidenceId);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(requestId: string, action: "approve" | "reject" | "complete") {
    try {
      setError("");
      setSuccess("");
      setActionLoadingId(`${requestId}-${action}`);

      await postActionWithFallback(
        `/transfer-requests/${requestId}/${action}`,
        actionReason
      );

      setSuccess(`Transfer request ${action} action completed.`);

      if (selectedEvidenceId) {
        await fetchTransferRequests(selectedEvidenceId);
      }
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setActionLoadingId("");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchInvestigations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedInvestigationId) {
      fetchEvidence(selectedInvestigationId);
    }
  }, [selectedInvestigationId]);

  useEffect(() => {
    if (selectedEvidenceId) {
      fetchTransferRequests(selectedEvidenceId);
    }
  }, [selectedEvidenceId]);

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Transfers</h1>
            <p className="mt-2 text-slate-400">
              Create, approve, reject, and complete evidence transfer requests.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Transfer Requests</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {requests.length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-1"
          >
            <h2 className="text-xl font-semibold">Create Transfer Request</h2>

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
                Transfer To User
              </label>

              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                {loadingUsers ? (
                  <option>Loading...</option>
                ) : users.length === 0 ? (
                  <option>No users found</option>
                ) : (
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserName(user)}
                      {user.role ? ` - ${user.role}` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Transfer Reason
              </label>

              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                placeholder="Reason for transfer"
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Action Reason
              </label>

              <input
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                placeholder="Reason for approve/reject/complete"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
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
              disabled={creating || !selectedEvidenceId || !selectedUserId}
              className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Transfer Request"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Transfer Requests</h2>

              <button
                onClick={() => fetchTransferRequests(selectedEvidenceId)}
                disabled={!selectedEvidenceId || loadingRequests}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {loadingRequests ? (
              <p className="mt-6 text-slate-400">Loading transfer requests...</p>
            ) : requests.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">No transfer requests found.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create a transfer request using the form.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                            {request.status || "PENDING"}
                          </span>

                          <p className="text-xs text-slate-500">
                            {formatDate(
                              request.requestedAt ||
                                request.requested_at ||
                                request.createdAt ||
                                request.created_at
                            )}
                          </p>
                        </div>

                        <h3 className="mt-4 text-lg font-semibold">
                          Transfer Request
                        </h3>

                        <p className="mt-2 text-sm text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Reason:
                          </span>{" "}
                          {request.reason || request.notes || "No reason"}
                        </p>

                        <p className="mt-2 break-all text-sm text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Transfer To:
                          </span>{" "}
                          {getTransferUserId(request)}
                        </p>

                        <p className="mt-2 break-all text-xs text-slate-500">
                          Request ID: {request.id}
                        </p>
                      </div>

                      <div className="flex min-w-32 flex-col gap-2">
                        <button
                          onClick={() => handleAction(request.id, "approve")}
                          disabled={
                            actionLoadingId === `${request.id}-approve`
                          }
                          className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-green-400 disabled:opacity-60"
                        >
                          {actionLoadingId === `${request.id}-approve`
                            ? "Approving..."
                            : "Approve"}
                        </button>

                        <button
                          onClick={() => handleAction(request.id, "reject")}
                          disabled={actionLoadingId === `${request.id}-reject`}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                        >
                          {actionLoadingId === `${request.id}-reject`
                            ? "Rejecting..."
                            : "Reject"}
                        </button>

                        <button
                          onClick={() => handleAction(request.id, "complete")}
                          disabled={
                            actionLoadingId === `${request.id}-complete`
                          }
                          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                        >
                          {actionLoadingId === `${request.id}-complete`
                            ? "Completing..."
                            : "Complete"}
                        </button>
                      </div>
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