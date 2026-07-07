"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { api } from "@/lib/api";

type ReportSummary = {
  totalInvestigations?: number;
  total_investigations?: number;
  totalEvidence?: number;
  total_evidence?: number;
  totalEvidenceItems?: number;
  total_evidence_items?: number;
  totalFiles?: number;
  total_files?: number;
  totalCustodyEvents?: number;
  total_custody_events?: number;
  totalAuditLogs?: number;
  total_audit_logs?: number;
  integrityWarnings?: number;
  integrity_warnings?: number;
  openInvestigations?: number;
  open_investigations?: number;
  closedInvestigations?: number;
  closed_investigations?: number;
};

type ReportFile = {
  title: string;
  description: string;
  endpoint: string;
  fileName: string;
};

const reportFiles: ReportFile[] = [
  {
    title: "Evidence Report",
    description: "Download all registered evidence items as CSV.",
    endpoint: "/reports/evidence.csv",
    fileName: "proofchain-evidence-report.csv",
  },
  {
    title: "Investigations Report",
    description: "Download all investigations and case details as CSV.",
    endpoint: "/reports/investigations.csv",
    fileName: "proofchain-investigations-report.csv",
  },
  {
    title: "Custody Events Report",
    description: "Download full custody chain event history as CSV.",
    endpoint: "/reports/custody-events.csv",
    fileName: "proofchain-custody-events-report.csv",
  },
  {
    title: "Audit Logs Report",
    description: "Download system activity and audit trail logs as CSV.",
    endpoint: "/reports/audit-logs.csv",
    fileName: "proofchain-audit-logs-report.csv",
  },
];

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

function getNumber(summary: ReportSummary | null, keys: string[]) {
  if (!summary) return 0;

  for (const key of keys) {
    const value = (summary as any)[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

export default function ReportsPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [downloading, setDownloading] = useState("");
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

  async function fetchSummary() {
    try {
      setError("");
      setLoadingSummary(true);

      const response = await api.get("/reports/summary");

      if (response.data?.data) {
        setSummary(response.data.data);
      } else {
        setSummary(response.data);
      }
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingSummary(false);
    }
  }

  async function downloadReport(report: ReportFile) {
    try {
      setError("");
      setSuccess("");
      setDownloading(report.endpoint);

      const response = await api.get(report.endpoint, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = report.fileName;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`${report.title} downloaded successfully.`);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setDownloading("");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchSummary();
  }, []);

  const totalInvestigations = getNumber(summary, [
    "totalInvestigations",
    "total_investigations",
  ]);

  const totalEvidence = getNumber(summary, [
    "totalEvidence",
    "total_evidence",
    "totalEvidenceItems",
    "total_evidence_items",
  ]);

  const totalFiles = getNumber(summary, ["totalFiles", "total_files"]);

  const totalCustodyEvents = getNumber(summary, [
    "totalCustodyEvents",
    "total_custody_events",
  ]);

  const totalAuditLogs = getNumber(summary, [
    "totalAuditLogs",
    "total_audit_logs",
  ]);

  const integrityWarnings = getNumber(summary, [
    "integrityWarnings",
    "integrity_warnings",
  ]);

  const openInvestigations = getNumber(summary, [
    "openInvestigations",
    "open_investigations",
  ]);

  const closedInvestigations = getNumber(summary, [
    "closedInvestigations",
    "closed_investigations",
  ]);

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="mt-2 text-slate-400">
              Generate system reports, export evidence records, and download
              audit history.
            </p>
          </div>

          <button
            onClick={fetchSummary}
            disabled={loadingSummary}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {loadingSummary ? "Refreshing..." : "Refresh Summary"}
          </button>
        </div>

        {error && (
          <div className="mt-6 whitespace-pre-line rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {success}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Investigations</p>
            <p className="mt-3 text-3xl font-bold text-cyan-400">
              {loadingSummary ? "..." : totalInvestigations}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Open: {openInvestigations} | Closed: {closedInvestigations}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Evidence Items</p>
            <p className="mt-3 text-3xl font-bold text-cyan-400">
              {loadingSummary ? "..." : totalEvidence}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Registered evidence records
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Evidence Files</p>
            <p className="mt-3 text-3xl font-bold text-cyan-400">
              {loadingSummary ? "..." : totalFiles}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Uploaded and hashed files
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Integrity Warnings</p>
            <p
              className={`mt-3 text-3xl font-bold ${
                integrityWarnings > 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              {loadingSummary ? "..." : integrityWarnings}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              File or custody chain issues
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Custody Events</p>
            <p className="mt-3 text-3xl font-bold text-cyan-400">
              {loadingSummary ? "..." : totalCustodyEvents}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Complete chain-of-custody event count
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Audit Logs</p>
            <p className="mt-3 text-3xl font-bold text-cyan-400">
              {loadingSummary ? "..." : totalAuditLogs}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Recorded user and system activities
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Download CSV Reports</h2>
          <p className="mt-2 text-sm text-slate-400">
            Export ProofChain data for submission, investigation review, or
            documentation.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {reportFiles.map((report) => (
              <div
                key={report.endpoint}
                className="rounded-xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {report.description}
                    </p>
                    <p className="mt-3 break-all text-xs text-slate-500">
                      Endpoint: {report.endpoint}
                    </p>
                  </div>

                  <button
                    onClick={() => downloadReport(report)}
                    disabled={downloading === report.endpoint}
                    className="min-w-28 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                  >
                    {downloading === report.endpoint
                      ? "Downloading..."
                      : "Download"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
          <h2 className="text-xl font-semibold text-cyan-300">
            Report Usage
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-300 md:grid-cols-2">
            <div>
              <p className="font-semibold text-white">Evidence Report</p>
              <p className="mt-1 text-slate-400">
                Use this to show all evidence items registered under
                investigations.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">Custody Events Report</p>
              <p className="mt-1 text-slate-400">
                Use this to prove movement and handling history of evidence.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">Audit Logs Report</p>
              <p className="mt-1 text-slate-400">
                Use this to prove who performed actions in the system.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">Investigations Report</p>
              <p className="mt-1 text-slate-400">
                Use this to summarize case records and investigation status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}