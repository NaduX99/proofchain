"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { api } from "@/lib/api";

type UserItem = {
  id: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuditLog = {
  id: string;
  userId?: string;
  user_id?: string;
  userEmail?: string;
  user_email?: string;
  action?: string;
  eventType?: string;
  event_type?: string;
  entityType?: string;
  entity_type?: string;
  resourceType?: string;
  resource_type?: string;
  entityId?: string;
  entity_id?: string;
  resourceId?: string;
  resource_id?: string;
  ipAddress?: string;
  ip_address?: string;
  userAgent?: string;
  user_agent?: string;
  description?: string;
  message?: string;
  metadata?: unknown;
  details?: unknown;
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
};

function extractList(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.logs)) return payload.logs;
  if (Array.isArray(payload.data?.logs)) return payload.data.logs;
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

function getAction(log: AuditLog) {
  return log.action || log.eventType || log.event_type || "UNKNOWN_ACTION";
}

function getEntityType(log: AuditLog) {
  return (
    log.entityType ||
    log.entity_type ||
    log.resourceType ||
    log.resource_type ||
    "UNKNOWN_ENTITY"
  );
}

function getEntityId(log: AuditLog) {
  return log.entityId || log.entity_id || log.resourceId || log.resource_id || "";
}

function getIpAddress(log: AuditLog) {
  return log.ipAddress || log.ip_address || "No IP";
}

function getUserAgent(log: AuditLog) {
  return log.userAgent || log.user_agent || "No user agent";
}

function getCreatedAt(log: AuditLog) {
  return log.createdAt || log.created_at || log.timestamp;
}

function getDetails(log: AuditLog) {
  const data = log.metadata || log.details;

  if (!data) {
    return log.description || log.message || "No extra details";
  }

  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "Unable to read details";
  }
}

export default function AuditLogsPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState("");

  function handleUnauthorized(error: unknown) {
    if (getStatusCode(error) === 401) {
      localStorage.clear();
      router.push("/login");
      return true;
    }

    return false;
  }

  async function fetchUsers() {
    try {
      setError("");
      setLoadingUsers(true);

      const response = await api.get("/users");
      setUsers(extractList(response.data));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchLogs(userId = selectedUserId) {
    try {
      setError("");
      setLoadingLogs(true);

      const endpoint =
        userId === "ALL" ? "/audit-logs" : `/audit-logs/users/${userId}`;

      const response = await api.get(endpoint);
      setLogs(extractList(response.data));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingLogs(false);
    }
  }

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
    fetchLogs(userId);
  }

  const filteredLogs = logs.filter((log) => {
    const search = searchText.toLowerCase().trim();

    if (!search) return true;

    const text = [
      log.id,
      log.userId,
      log.user_id,
      log.userEmail,
      log.user_email,
      getAction(log),
      getEntityType(log),
      getEntityId(log),
      getIpAddress(log),
      getUserAgent(log),
      getDetails(log),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchUsers();
    fetchLogs("ALL");
  }, []);

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="mt-2 text-slate-400">
              Track system activity, user actions, evidence events, and security
              history.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Visible Logs</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {filteredLogs.length}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Filter by User
              </label>

              <select
                value={selectedUserId}
                onChange={(event) => handleUserChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Users</option>

                {loadingUsers ? (
                  <option>Loading users...</option>
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

            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">
                Search Logs
              </label>

              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by action, entity, IP, user, ID..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => fetchLogs(selectedUserId)}
              disabled={loadingLogs}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {loadingLogs ? "Refreshing..." : "Refresh Logs"}
            </button>

            <button
              onClick={() => {
                setSelectedUserId("ALL");
                setSearchText("");
                fetchLogs("ALL");
              }}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-400"
            >
              Clear Filters
            </button>
          </div>

          {error && (
            <div className="mt-5 whitespace-pre-line rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Activity History</h2>

          {loadingLogs ? (
            <p className="mt-6 text-slate-400">Loading audit logs...</p>
          ) : filteredLogs.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="text-slate-400">No audit logs found.</p>
              <p className="mt-1 text-sm text-slate-500">
                Try creating evidence, uploading files, or verifying custody
                chain.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                          {getAction(log)}
                        </span>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                          {getEntityType(log)}
                        </span>

                        <span className="text-xs text-slate-500">
                          {formatDate(getCreatedAt(log))}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
                        <p className="break-all text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Log ID:
                          </span>{" "}
                          {log.id}
                        </p>

                        <p className="break-all text-slate-300">
                          <span className="font-semibold text-slate-400">
                            User:
                          </span>{" "}
                          {log.userEmail ||
                            log.user_email ||
                            log.userId ||
                            log.user_id ||
                            "Unknown user"}
                        </p>

                        <p className="break-all text-slate-300">
                          <span className="font-semibold text-slate-400">
                            Entity ID:
                          </span>{" "}
                          {getEntityId(log) || "No entity ID"}
                        </p>

                        <p className="break-all text-slate-300">
                          <span className="font-semibold text-slate-400">
                            IP Address:
                          </span>{" "}
                          {getIpAddress(log)}
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="mb-2 text-xs font-semibold text-slate-400">
                          Details
                        </p>

                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">
                          {getDetails(log)}
                        </pre>
                      </div>

                      <p className="mt-3 break-all text-xs text-slate-500">
                        User Agent: {getUserAgent(log)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}