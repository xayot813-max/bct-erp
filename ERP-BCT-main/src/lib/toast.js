"use client";

import React from "react";
import { toast } from "sonner";
import { Check, XCircle, AlertTriangle, Loader2 } from "lucide-react";

const COLORS = {
  success: { box: "bg-[var(--success)]", border: "border-[var(--border-default)]" },
  error:   { box: "bg-[var(--danger)]", border: "border-[var(--border-default)]" },
  warning: { box: "bg-[var(--warning)]", border: "border-[var(--border-default)]" },
  loading: { box: "bg-[var(--accent)]", border: "border-[var(--border-default)]" },
};

function BaseToast({ variant = "success", title, description }) {
  const c = COLORS[variant] || COLORS.success;

  const Icon =
    variant === "success" ? Check :
    variant === "error"   ? XCircle :
    variant === "warning" ? AlertTriangle :
    Loader2;

  return (
    <div
      className={`
        w-[350px]   /* ✅ kenglikni fiks qildik */
        min-w-[350px] 
        max-w-[350px] 
        rounded-b-xl border ${c.border} bg-[var(--surface-elevated)] p-4 text-[var(--text-primary)] shadow-[var(--surface-shadow)]
      `}
    >
      <div className="flex items-start">
        {/* chap icon box */}
        <div className={`mr-3 h-12 w-12 flex items-center justify-center rounded-xl ${c.box}`}>
          <Icon className={`h-6 w-6 text-white ${variant === "loading" ? "animate-spin" : ""}`} />
        </div>

        {/* matn */}
        <div className="flex-1">
          <div className="text-[18px] font-semibold text-[var(--text-primary)]">
            {title || ""}
          </div>
          {description && (
            <div className="mt-1 text-[15px] leading-snug text-[var(--text-secondary)]">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// helpers
export function toastSuccess(p = {}) {
  return toast.custom(() => <BaseToast variant="success" {...p} />, {
    duration: p.duration ?? 3000,
    closeButton: true,
  });
}

export function toastError(p = {}) {
  return toast.custom(() => <BaseToast variant="error" {...p} />, {
    duration: p.duration ?? 3500,
    closeButton: true,
  });
}

export function toastWarning(p = {}) {
  return toast.custom(() => <BaseToast variant="warning" {...p} />, {
    duration: p.duration ?? 3000,
    closeButton: true,
  });
}

export function toastLoading(p = {}) {
  return toast.custom(() => <BaseToast variant="loading" {...p} />, {
    duration: Infinity,
    closeButton: false,
  });
}
