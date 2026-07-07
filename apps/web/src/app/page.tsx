import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold">ProofChain</h1>

        <p className="mt-4 text-lg text-slate-400">
          Secure digital evidence integrity and chain-of-custody platform.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Go to Login
        </Link>
      </div>
    </main>
  );
}