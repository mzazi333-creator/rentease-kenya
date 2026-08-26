"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useAction } from "@/components/ui/useAction";

/**
 * Button that runs a server action, optionally after a confirmation dialog.
 */
export default function ActionButton({
  action,
  label,
  className,
  confirm,
  confirmLabel,
  danger,
  children,
  onDone,
}: {
  action: () => Promise<{ ok: boolean; message: string; redirectTo?: string }>;
  label?: string;
  className?: string;
  confirm?: string; // if set, show confirmation dialog with this message
  confirmLabel?: string;
  danger?: boolean;
  children?: ReactNode;
  onDone?: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { pending, run } = useAction();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={className ?? "btn-secondary"}
        onClick={() => {
          if (confirm) setShowConfirm(true);
          else
            run(async () => {
              const res = await action();
              if (res.ok) onDone?.();
              return res;
            });
        }}
        aria-label={label}
      >
        {children ?? label}
      </button>
      {confirm && (
        <ConfirmDialog
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            run(async () => {
              const res = await action();
              if (res.ok) {
                setShowConfirm(false);
                onDone?.();
              }
              return res;
            });
          }}
          title={confirmLabel ?? "Are you sure?"}
          message={confirm}
          danger={danger}
          busy={pending}
        />
      )}
    </>
  );
}
