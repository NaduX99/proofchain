"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { api } from "@/lib/api";

type Investigation = {
  id: string;
  caseCode?: string;
  case_code?: string;
  title: string;
  description?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
};

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: {
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

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [caseCode, setCaseCode] = useState("MOBILE-001");
  const [title, setTitle] = useState("Mobile Phone Evidence Case");
  const [description, setDescription] = useState(
    "Testing digital evidence investigation module."
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function fetchInvestigations() {
    try {
      setError("");
      setLoading(true);

      const response = await api.get("/investigations");
      const payload = response.data;

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.data?.items)
        ? payload.data.items
        : Array.isArray(payload.items)
        ? payload.items
        : [];

      setInvestigations(list);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!caseCode.trim()) {
      setError("Case code is required");
      return;
    }

    if (!title.trim()) {
      setError("Investigation title is required");
      return;
    }

    try {
      setError("");
      setCreating(true);

      await api.post("/investigations", {
        caseCode,
        title,
        description,
      });

      setCaseCode("");
      setTitle("");
      setDescription("");

      await fetchInvestigations();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    fetchInvestigations();
  }, []);

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Investigations</h1>
            <p className="mt-2 text-slate-400">
              Create and manage investigation records.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Total Investigations</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {investigations.length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-1"
          >
            <h2 className="text-xl font-semibold">Create Investigation</h2>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Case Code
              </label>

              <input
                value={caseCode}
                onChange={(event) =>
                  setCaseCode(event.target.value.toUpperCase())
                }
                placeholder="Example: MOBILE-001"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                Use only letters, numbers, and hyphens. Example: MOBILE-001
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">Title</label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Cyber Fraud Case"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-slate-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short investigation description"
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
              disabled={creating}
              className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Investigation"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold">Investigation List</h2>

            {loading ? (
              <p className="mt-6 text-slate-400">Loading investigations...</p>
            ) : investigations.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">No investigations found.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first investigation using the form.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {investigations.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-cyan-400">
                          {item.caseCode || item.case_code || "NO-CODE"}
                        </p>

                        <h3 className="text-lg font-semibold">{item.title}</h3>

                        <p className="mt-2 text-sm text-slate-400">
                          {item.description || "No description"}
                        </p>

                        <p className="mt-3 text-xs text-slate-500">
                          ID: {item.id}
                        </p>
                      </div>

                      <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                        {item.status || "OPEN"}
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