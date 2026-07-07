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

type EvidenceFile = {
  id: string;
  fileName?: string;
  file_name?: string;
  originalName?: string;
  original_name?: string;
  filename?: string;
  mimeType?: string;
  mime_type?: string;
  sizeBytes?: number;
  size_bytes?: number;
  sha256Hash?: string;
  sha256_hash?: string;
  hashSha256?: string;
  hash_sha256?: string;
  integrityStatus?: string;
  integrity_status?: string;
  createdAt?: string;
  created_at?: string;
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

function formatBytes(size?: number) {
  if (!size) return "Unknown size";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileName(file: EvidenceFile) {
  return (
    file.originalName ||
    file.original_name ||
    file.fileName ||
    file.file_name ||
    file.filename ||
    "Unnamed file"
  );
}

function getFileHash(file: EvidenceFile) {
  return (
    file.sha256Hash ||
    file.sha256_hash ||
    file.hashSha256 ||
    file.hash_sha256 ||
    "No hash"
  );
}

export default function EvidenceFilesPage() {
  const router = useRouter();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [files, setFiles] = useState<EvidenceFile[]>([]);

  const [selectedInvestigationId, setSelectedInvestigationId] = useState("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loadingInvestigations, setLoadingInvestigations] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyingFileId, setVerifyingFileId] = useState("");

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
      setFiles([]);
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

  async function fetchFiles(evidenceId: string) {
    if (!evidenceId) return;

    try {
      setError("");
      setLoadingFiles(true);

      const response = await api.get(`/evidence/${evidenceId}/files`);
      setFiles(extractList(response.data));
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEvidenceId) {
      setError("Please select evidence item");
      return;
    }

    if (!selectedFile) {
      setError("Please choose a file");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      await api.post(`/evidence/${selectedEvidenceId}/files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedFile(null);
      setSuccess("File uploaded successfully.");

      const fileInput = document.getElementById(
        "evidence-file-input"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await fetchFiles(selectedEvidenceId);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleVerify(fileId: string) {
    if (!selectedEvidenceId) return;

    try {
      setError("");
      setSuccess("");
      setVerifyingFileId(fileId);

      await api.post(`/evidence/${selectedEvidenceId}/files/${fileId}/verify`);

      setSuccess("File integrity verified successfully.");
      await fetchFiles(selectedEvidenceId);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setError(getErrorMessage(error));
    } finally {
      setVerifyingFileId("");
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
      fetchFiles(selectedEvidenceId);
    }
  }, [selectedEvidenceId]);

  return (
    <AppShell>
      <div>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Evidence Files</h1>
            <p className="mt-2 text-slate-400">
              Upload evidence files, store file hashes, and verify integrity.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Uploaded Files</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {files.length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleUpload}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-1"
          >
            <h2 className="text-xl font-semibold">Upload File</h2>

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
                Select File
              </label>

              <input
                id="evidence-file-input"
                type="file"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] || null)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
              />

              {selectedFile && (
                <p className="mt-2 text-xs text-slate-400">
                  Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                </p>
              )}
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
              disabled={uploading || !selectedEvidenceId || !selectedFile}
              className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold">Uploaded Files</h2>

            {loadingFiles ? (
              <p className="mt-6 text-slate-400">Loading files...</p>
            ) : files.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">No files uploaded yet.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Select an evidence item and upload a file.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-all text-lg font-semibold">
                          {getFileName(file)}
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                          Type: {file.mimeType || file.mime_type || "Unknown"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Size: {formatBytes(file.sizeBytes || file.size_bytes)}
                        </p>

                        <p className="mt-3 break-all text-xs text-slate-500">
                          SHA-256: {getFileHash(file)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          ID: {file.id}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                          {file.integrityStatus ||
                            file.integrity_status ||
                            "UPLOADED"}
                        </span>

                        <button
                          onClick={() => handleVerify(file.id)}
                          disabled={verifyingFileId === file.id}
                          className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-green-400 disabled:opacity-60"
                        >
                          {verifyingFileId === file.id
                            ? "Verifying..."
                            : "Verify"}
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