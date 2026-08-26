"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${basePath}?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== -1) pages.push(-1);
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <button
        className="btn-secondary !px-3 !py-1.5"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === -1 ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "h-9 w-9 rounded-lg text-sm font-semibold",
              p === page ? "bg-brand-600 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        className="btn-secondary !px-3 !py-1.5"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
