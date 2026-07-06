"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Checking authentication...
      </main>
    );
  }

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Welcome to ProofChain evidence management system.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Total Investigations</p>
            <h2 className="mt-3 text-4xl font-bold text-cyan-400">0</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Evidence Items</p>
            <h2 className="mt-3 text-4xl font-bold text-cyan-400">0</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Custody Events</p>
            <h2 className="mt-3 text-4xl font-bold text-cyan-400">0</h2>
          </div>
        </div>
      </div>
    </AppShell>
  );
}