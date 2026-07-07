"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { api } from "@/lib/api";

type Investigation = {
  id: string;
  title?: string;
  status?: string;
  caseCode?: string;
  case_code?: string;
};

type EvidenceItem = {
  id: string;
  title?: string;
  status?: string;
  evidenceCode?: string;
  evidence_code?: string;
  investigationId?: string;
  investigation_id?: string;
};

type CustodyEvent = {
  id: string;
  eventType?: string;
  event_type?: string;
  reason?: string;
  eventTime?: string;
  event_time?: string;
  createdAt?: string;
  created_at?: string;
  evidenceCode?: string;
  evidence_code?: string;
  evidenceTitle?: string;
  evidence_title?: string;
};

type WarningItem = {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  evidenceCode?: string;
  evidence_code?: string;
  createdAt?: string;
  created_at?: string;
};

type StatusItem = {
  status: string;
  count: number;
};

type DashboardCounts = {
  investigations: number;
  evidence: number;
  files: number;
  custodyEvents: number;
  transfers: number;
  auditLogs: number;
  integrityWarnings: number;
};

function extractList(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.logs)) return payload.logs;
  if (Array.isArray(payload.data?.logs)) return payload.data.logs;
  if (Array.isArray(payload.warnings)) return payload.warnings;
  if (Array.isArray(payload.data?.warnings)) return payload.data.warnings;
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

function groupByStatus(items: { status?: string }[]) {
  const map = new Map<string, number>();

  for (const item of items) {
    const status = item.status || "UNKNOWN";
    map.set(status, (map.get(status) || 0) + 1);
  }

  return Array.from(map.entries()).map(([status, count]) => ({
    status,
    count,
  }));
}

function getEventType(event: CustodyEvent) {
  return event.eventType || event.event_type || "CUSTODY_EVENT";
}

function getEventDate(event: CustodyEvent) {
  return event.eventTime || event.event_time || event.createdAt || event.created_at;
}

function getWarningTitle(warning: WarningItem) {
  return warning.title || warning.type || "Integrity Warning";
}

function getWarningMessage(warning: WarningItem) {
  return warning.message || "Possible integrity issue detected.";
}

function StatusBreakdown({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: StatusItem[];
  emptyText: string;
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => {
            const width = Math.max((item.count / maxCount) * 100, 5);

            return (
              <div key={item.status}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{item.status}</span>
                  <span className="font-semibold text-cyan-400">
                    {item.count}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [counts, setCounts] = useState<DashboardCounts>({
    investigations: 0,
    evidence: 0,
    files: 0,
    custodyEvents: 0,
    transfers: 0,
    auditLogs: 0,
    integrityWarnings: 0,
  });

  const [evidenceStatus, setEvidenceStatus] = useState<StatusItem[]>([]);
  const [investigationStatus, setInvestigationStatus] = useState<StatusItem[]>(
    []
  );
  const [recentCustodyEvents, setRecentCustodyEvents] = useState<CustodyEvent[]>(
    []
  );
  const [integrityWarnings, setIntegrityWarnings] = useState<WarningItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function handleUnauthorized(error: unknown) {
    if (getStatusCode(error) === 401) {
      localStorage.clear();
      router.push("/login");
      return true;
    }

    return false;
  }

  async function safeGetList(endpoint: string) {
    try {
      const response = await api.get(endpoint);
      return extractList(response.data);
    } catch (error) {
      if (handleUnauthorized(error)) {
        throw error;
      }

      return [];
    }
  }

  async function fetchDashboard() {
    try {
      setError("");
      setLoading(true);

      const investigations = (await safeGetList(
        "/investigations"
      )) as Investigation[];

      const auditLogs = await safeGetList("/audit-logs");

      let allEvidence: EvidenceItem[] = [];
      let allFiles: any[] = [];
      let allCustodyEvents: CustodyEvent[] = [];
      let allTransfers: any[] = [];

      for (const investigation of investigations) {
        const evidenceList = (await safeGetList(
          `/investigations/${investigation.id}/evidence`
        )) as EvidenceItem[];

        allEvidence = [...allEvidence, ...evidenceList];

        for (const evidence of evidenceList) {
          const [files, custodyEvents, transfers] = await Promise.all([
            safeGetList(`/evidence/${evidence.id}/files`),
            safeGetList(`/evidence/${evidence.id}/custody-events`),
            safeGetList(`/evidence/${evidence.id}/transfer-requests`),
          ]);

          allFiles = [...allFiles, ...files];
          allCustodyEvents = [
            ...allCustodyEvents,
            ...(custodyEvents as CustodyEvent[]),
          ];
          allTransfers = [...allTransfers, ...transfers];
        }
      }

      const warnings = (await safeGetList(
        "/dashboard/integrity-warnings"
      )) as WarningItem[];

      allCustodyEvents.sort((a, b) => {
        const dateA = new Date(getEventDate(a) || 0).getTime();
        const dateB = new Date(getEventDate(b) || 0).getTime();
        return dateB - dateA;
      });

      setCounts({
        investigations: investigations.length,
        evidence: allEvidence.length,
        files: allFiles.length,
        custodyEvents: allCustodyEvents.length,
        transfers: allTransfers.length,
        auditLogs: auditLogs.length,
        integrityWarnings: warnings.length,
      });

      setInvestigationStatus(groupByStatus(investigations));
      setEvidenceStatus(groupByStatus(allEvidence));
      setRecentCustodyEvents(allCustodyEvents.slice(0, 6));
      setIntegrityWarnings(warnings.slice(0, 6));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchDashboard();
  }, []);

  const cards = [
    {
      title: "Investigations",
      value: counts.investigations,
      description: "Total case investigations",
      href: "/investigations",
    },
    {
      title: "Evidence Items",
      value: counts.evidence,
      description: "Registered evidence records",
      href: "/evidence",
    },
    {
      title: "Evidence Files",
      value: counts.files,
      description: "Uploaded hashed files",
      href: "/evidence-files",
    },
    {
      title: "Custody Events",
      value: counts.custodyEvents,
      description: "Chain-of-custody records",
      href: "/custody",
    },
    {
      title: "Transfers",
      value: counts.transfers,
      description: "Evidence transfer requests",
      href: "/transfers",
    },
    {
      title: "Audit Logs",
      value: counts.auditLogs,
      description: "System activity records",
      href: "/audit-logs",
    },
  ];

  return (
    <AppShell>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-slate-400">
              Real-time overview of investigations, evidence, custody chain, and
              integrity status.
            </p>
          </div>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Dashboard"}
          </button>
        </div>

        {error && (
          <div className="mt-6 whitespace-pre-line rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Integrity Warnings</p>
            <p
              className={`mt-3 text-3xl font-bold ${
                counts.integrityWarnings > 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              {loading ? "..." : counts.integrityWarnings}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {counts.integrityWarnings > 0
                ? "Review warnings immediately"
                : "No integrity issues detected"}
            </p>
          </div>

          {cards.slice(0, 3).map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500"
            >
              <p className="text-sm text-slate-400">{card.title}</p>
              <p className="mt-3 text-3xl font-bold text-cyan-400">
                {loading ? "..." : card.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">{card.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.slice(3).map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500"
            >
              <p className="text-sm text-slate-400">{card.title}</p>
              <p className="mt-3 text-3xl font-bold text-cyan-400">
                {loading ? "..." : card.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">{card.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <StatusBreakdown
            title="Evidence Status"
            items={evidenceStatus}
            emptyText="No evidence status data found."
          />

          <StatusBreakdown
            title="Investigation Status"
            items={investigationStatus}
            emptyText="No investigation status data found."
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Recent Custody Events</h2>

              <Link
                href="/custody"
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
              >
                View All
              </Link>
            </div>

            {recentCustodyEvents.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">No recent custody events.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {recentCustodyEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-cyan-400">
                          {getEventType(event)}
                        </p>

                        <p className="mt-2 text-sm text-slate-300">
                          {event.reason || "Custody event recorded"}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Evidence:{" "}
                          {event.evidenceCode ||
                            event.evidence_code ||
                            event.evidenceTitle ||
                            event.evidence_title ||
                            "Unknown evidence"}
                        </p>
                      </div>

                      <p className="min-w-32 text-right text-xs text-slate-500">
                        {formatDate(getEventDate(event))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Integrity Warnings</h2>

              <Link
                href="/reports"
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Reports
              </Link>
            </div>

            {integrityWarnings.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-green-500/30 bg-green-500/10 p-8 text-center">
                <p className="font-semibold text-green-400">
                  All integrity checks are clean.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  No file hash or custody chain warning found.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {integrityWarnings.map((warning, index) => (
                  <div
                    key={warning.id || index}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
                  >
                    <p className="text-sm font-semibold text-red-300">
                      {getWarningTitle(warning)}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {getWarningMessage(warning)}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Evidence:{" "}
                      {warning.evidenceCode ||
                        warning.evidence_code ||
                        "Unknown evidence"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(warning.createdAt || warning.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
          <h2 className="text-xl font-semibold text-cyan-300">
            Quick Actions
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/investigations"
              className="rounded-xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Investigation
            </Link>

            <Link
              href="/evidence"
              className="rounded-xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Register Evidence
            </Link>

            <Link
              href="/evidence-files"
              className="rounded-xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Upload Evidence File
            </Link>

            <Link
              href="/custody"
              className="rounded-xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Verify Custody Chain
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}