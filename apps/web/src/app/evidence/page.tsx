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
  description?: string;
  evidenceType?: string;
  evidence_type?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
};

function createEvidenceCode() {
  return `EV-${Date.now().toString().slice(-6)}`;
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

function extractList(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function EvidencePage() {
  const router = useRouter();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState("");
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);

  const [evidenceCode, setEvidenceCode] = useState(createEvidenceCode());
  const [title, setTitle] = useState("Mobile Phone Evidence");
  const [description, setDescription] = useState(
    "Samsung mobile phone collected for digital forensic analysis."
  );
  const [evidenceType, setEvidenceType] = useState("DIGITAL_DEVICE");

  const [loadingInvestigations, setLoadingInvestigations] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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
      setLoadingEvidence(true);

      const response = await api.get(
        `/investigations/${investigationId}/evidence`
      );

      setEvidenceItems(extractList(response.data));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingEvidence(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedInvestigationId) {
      setError("Please select an investigation");
      return;
    }

    if (!evidenceCode.trim()) {
      setError("Evidence code is required");
      return;
    }

    if (!title.trim()) {
      setError("Evidence title is required");
      return;
    }

    try {
      setError("");
      setCreating(true);

      await api.post(`/investigations/${selectedInvestigationId}/evidence`, {
        evidenceCode,
        title,
        description,
        evidenceType,
      });

      setEvidenceCode(createEvidenceCode());
      setTitle("Mobile Phone Evidence");
      setDescription("Samsung mobile phone collected for digital forensic analysis.");
      setEvidenceType("DIGITAL_DEVICE");

      await fetchEvidence(selectedInvestigationId);
    } catch (error) {
      if (handleUnauthorized(error)) return;

      const message = getErrorMessage(error);

      if (
        getStatusCode(error) === 409 ||
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("duplicate")
      ) {
        setError(
          "This Evidence Code already exists. Please use a new Evidence Code."
        );
        setEvidenceCode(createEvidenceCode());
      } else {
        setError(message);
      }

      await fetchEvidence(selectedInvestigationId);
    } finally {
      setCreating(false);
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

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Evidence</h1>
            <p className="mt-2 text-slate-400">
              Register and manage digital evidence items.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Evidence Items</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {evidenceItems.length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-1"
          >
            <h2 className="text-xl font-semibold">Register Evidence</h2>

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
                Evidence Code
              </label>

              <input
                value={evidenceCode}
                onChange={(event) =>
                  setEvidenceCode(event.target.value.toUpperCase())
                }
                placeholder="Example: EV-001"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">Title</label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Mobile Phone Evidence"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Evidence Type
              </label>

              <select
                value={evidenceType}
                onChange={(event) => setEvidenceType(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                <option value="DIGITAL_DEVICE">Digital Device</option>
                <option value="DOCUMENT">Document</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="AUDIO">Audio</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Evidence description"
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            {error && (
              <div className="mt-4 whitespace-pre-line rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creating || !selectedInvestigationId}
              className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {creating ? "Registering..." : "Register Evidence"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold">Evidence List</h2>

            {loadingEvidence ? (
              <p className="mt-6 text-slate-400">Loading evidence...</p>
            ) : evidenceItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">No evidence found.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Register your first evidence item using the form.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {evidenceItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-cyan-400">
                          {item.evidenceCode ||
                            item.evidence_code ||
                            "NO-EVIDENCE-CODE"}
                        </p>

                        <h3 className="text-lg font-semibold">{item.title}</h3>

                        <p className="mt-2 text-sm text-slate-400">
                          {item.description || "No description"}
                        </p>

                        <p className="mt-3 text-xs text-slate-500">
                          Type:{" "}
                          {item.evidenceType ||
                            item.evidence_type ||
                            "UNKNOWN"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          ID: {item.id}
                        </p>
                      </div>

                      <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                        {item.status || "REGISTERED"}
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