"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Investigations",
    href: "/investigations",
  },
  {
    name: "Evidence",
    href: "/evidence",
  },
  {
    name: "Custody Chain",
    href: "/custody",
  },
  {
    name: "Transfers",
    href: "/transfers",
  },
  {
    name: "Audit Logs",
    href: "/audit-logs",
  },
  {
    name: "Reports",
    href: "/reports",
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="w-72 border-r border-slate-800 bg-slate-900 p-6">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-cyan-400">ProofChain</h1>
          <p className="mt-1 text-sm text-slate-400">
            Evidence Integrity System
          </p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-10 w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-400"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}