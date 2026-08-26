"use client";

/**
 * Global error boundary — catches any server-side exception during
 * rendering and shows a friendly page instead of the raw platform error.
 * The digest matches what Vercel shows in its logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDbError =
    error.message.includes("DATABASE_URL") ||
    error.message.includes("Can't reach database") ||
    error.message.includes("P1001") ||
    error.message.includes("P1000") ||
    error.message.includes("environment variable");

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
            ⚠️
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            A server-side error occurred while loading this page
            {error.digest ? (
              <>
                {" "}
                (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{error.digest}</code>)
              </>
            ) : null}
            .
          </p>

          {isDbError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
              <p className="font-bold">Database connection problem</p>
              <p className="mt-1">
                The app could not reach PostgreSQL. Make sure the{" "}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs">DATABASE_URL</code>{" "}
                environment variable is set on the host (e.g. Vercel → Project Settings →
                Environment Variables) and points to a reachable database.
              </p>
            </div>
          )}

          <button
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
