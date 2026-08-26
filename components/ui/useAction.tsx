"use client";

import { useCallback, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export interface ActionResult {
  ok: boolean;
  message: string;
  redirectTo?: string;
  data?: unknown;
}

/**
 * Uniform wrapper around server actions: shows toasts, refreshes server
 * components, follows redirects. Every action in the app returns ActionResult.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const run = useCallback(
    async (
      fn: () => Promise<ActionResult>,
      opts?: { successMessage?: string; redirectTo?: string; refresh?: boolean }
    ) => {
      startTransition(async () => {
        const res = await fn();
        if (res.ok) {
          toast.success(opts?.successMessage ?? res.message);
          if (opts?.refresh !== false) router.refresh();
          const dest = res.redirectTo ?? opts?.redirectTo;
          if (dest) router.push(dest);
        } else {
          toast.error(res.message);
        }
      });
    },
    [router, toast]
  );

  return { pending, run };
}

export function SubmitButton({
  pending,
  children,
  className,
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={className ?? "btn-primary"}>
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {pending ? "Working..." : children}
    </button>
  );
}
