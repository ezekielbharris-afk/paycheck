"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/utils/auth";
import { toast } from "sonner";
import type {
  CategorySpending,
  Category,
  Transaction,
  CategoryType,
} from "@/types/budget";

// ─── Types ──────────────────────────────────────────────────
type EnvelopeState = "healthy" | "near-limit" | "over-budget";

interface EnvelopeTransaction {
  id: string;
  label: string;
  amount: number;
  date: string;
}

interface Envelope {
  id: string;
  categoryId: string;
  categorySpendingId: string;
  name: string;
  type: "fixed" | "flexible" | "savings";
  icon: string;
  allocated: number;
  spent: number;
  remaining: number;
  state: EnvelopeState;
  transactions: EnvelopeTransaction[];
}

// ─── Icon mapping for categories ────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  groceries: "🛒",
  gas: "⛽",
  "dining out": "🍔",
  dining: "🍔",
  food: "🍔",
  rent: "🏠",
  housing: "🏠",
  mortgage: "🏠",
  "emergency fund": "🛡️",
  emergency: "🛡️",
  savings: "💰",
  subscriptions: "📱",
  transportation: "🚌",
  transit: "🚌",
  "personal care": "💊",
  health: "💊",
  clothing: "👕",
  entertainment: "🎬",
  utilities: "💡",
  insurance: "🔒",
  phone: "📞",
  internet: "🌐",
  education: "📚",
  pets: "🐾",
  kids: "👶",
  gifts: "🎁",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "📂";
}

// ─── Transform Supabase data → Envelope[] ─────────────────

function buildEnvelopes(
  categorySpending: (CategorySpending & { category?: Category })[],
  transactions: Transaction[],
): Envelope[] {
  return categorySpending.map((cs) => {
    const cat = cs.category;
    const catTransactions = transactions
      .filter((t) => t.category_id === cs.category_id)
      .sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime(),
      )
      .slice(0, 8);

    const spent = Number(cs.spent) || 0;
    const allocated = Number(cs.planned) || 0;
    const remaining = allocated - spent;

    return {
      id: cs.category_id,
      categoryId: cs.category_id,
      categorySpendingId: cs.id,
      name: cat?.name ?? "Unknown",
      type: (cat?.type as "fixed" | "flexible" | "savings") ?? "flexible",
      icon: getCategoryIcon(cat?.name ?? ""),
      allocated,
      spent,
      remaining,
      state: computeState(spent, allocated),
      transactions: catTransactions.map((t) => ({
        id: t.id,
        label: t.description || "Spending",
        amount: Number(t.amount),
        date: formatDateLabel(t.transaction_date),
      })),
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────

function computeState(spent: number, allocated: number): EnvelopeState {
  if (allocated === 0) return "healthy";
  const pct = spent / allocated;
  if (pct > 1) return "over-budget";
  if (pct >= 0.8) return "near-limit";
  return "healthy";
}

function getStateColors(state: EnvelopeState) {
  switch (state) {
    case "healthy":
      return {
        accent: "#06B6D4",
        accentBg: "rgba(6, 182, 212, 0.12)",
        barBg: "rgba(6, 182, 212, 0.25)",
        barFill: "#06B6D4",
        badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
        text: "text-cyan-400",
        glow: "shadow-[0_0_20px_rgba(6,182,212,0.08)]",
        label: "UNDER BUDGET",
      };
    case "near-limit":
      return {
        accent: "#F59E0B",
        accentBg: "rgba(245, 158, 11, 0.12)",
        barBg: "rgba(245, 158, 11, 0.25)",
        barFill: "#F59E0B",
        badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        text: "text-amber-400",
        glow: "shadow-[0_0_20px_rgba(245,158,11,0.08)]",
        label: "NEAR LIMIT",
      };
    case "over-budget":
      return {
        accent: "#EF4444",
        accentBg: "rgba(239, 68, 68, 0.12)",
        barBg: "rgba(239, 68, 68, 0.25)",
        barFill: "#EF4444",
        badge: "bg-red-500/15 text-red-400 border-red-500/20",
        text: "text-red-400",
        glow: "shadow-[0_0_20px_rgba(239,68,68,0.08)]",
        label: "OVER BUDGET",
      };
  }
}

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

function getPercentage(spent: number, allocated: number): number {
  if (allocated === 0) return 0;
  return Math.min((spent / allocated) * 100, 100);
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "fixed":
      return "FIXED";
    case "flexible":
      return "FLEX";
    case "savings":
      return "SAVE";
    default:
      return type.toUpperCase();
  }
}

function getTodayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Log Spending Dialog Component ────────────────────────

function LogSpendingDialog({
  envelope,
  onClose,
  onSubmit,
  isSubmitting: externalSubmitting,
}: {
  envelope: Envelope;
  onClose: () => void;
  onSubmit: (amount: number, note: string, date: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [error, setError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const colors = getStateColors(envelope.state);

  useEffect(() => {
    const timer = setTimeout(() => amountRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmountStr(cleaned);
    setError("");
  };

  const parsedAmount = parseFloat(amountStr);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const newRemaining = isValidAmount
    ? envelope.remaining - parsedAmount
    : envelope.remaining;
  const wouldOverBudget = isValidAmount && newRemaining < 0;

  const handleSubmit = async () => {
    if (!amountStr.trim()) {
      setError("Amount is required");
      amountRef.current?.focus();
      return;
    }
    if (!isValidAmount) {
      setError("Enter a valid amount");
      amountRef.current?.focus();
      return;
    }

    try {
      await onSubmit(parsedAmount, note.trim(), date);
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="relative w-full max-w-[420px] bg-[#1a1714] border border-[#2a2520] rounded-[12px] overflow-hidden"
        style={{
          boxShadow: `0 0 40px rgba(0,0,0,0.5), 0 0 80px ${colors.accent}10`,
        }}
      >
        {/* Top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: colors.accent, opacity: 0.8 }}
        />

        {/* Success overlay */}
        {submitSuccess && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1a1714]/95">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}
            >
              <svg
                className="w-7 h-7 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-[#faf5eb] font-bold text-lg">
              Spending Logged
            </div>
            <div className="text-[#faf5eb]/40 text-sm mt-1">
              {formatMoney(parsedAmount)} from {envelope.name}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{envelope.icon}</span>
              <div>
                <div className="text-[10px] text-[#faf5eb]/30 tracking-[0.2em]">
                  LOG SPENDING
                </div>
                <h3 className="font-bold text-[#faf5eb] text-lg leading-tight">
                  {envelope.name}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#2a2520] transition-colors text-[#faf5eb]/40 hover:text-[#faf5eb]/70"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Current remaining banner */}
          <div
            className="mt-3 rounded-lg p-3 flex items-center justify-between"
            style={{
              backgroundColor: colors.accentBg,
              border: `1px solid ${colors.accent}20`,
            }}
          >
            <span className="text-[11px] text-[#faf5eb]/50 tracking-wider">
              CURRENTLY REMAINING
            </span>
            <span
              className={`text-xl font-bold ${colors.text}`}
              style={{ fontFeatureSettings: "'tnum' on" }}
            >
              {formatMoney(envelope.remaining)}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Amount field */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#faf5eb]/50 tracking-[0.1em] font-medium">
              AMOUNT SPENT <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#faf5eb]/30 text-lg font-bold">
                $
              </span>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className={`w-full bg-[#0f0d0a] border rounded-lg pl-8 pr-4 py-3 text-2xl font-bold text-[#faf5eb] placeholder-[#faf5eb]/15 focus:outline-none transition-colors ${
                  error
                    ? "border-red-500/60 focus:border-red-400"
                    : "border-[#2a2520] focus:border-[#3a3530]"
                }`}
                style={{ fontFeatureSettings: "'tnum' on" }}
              />
            </div>
            {error && (
              <div className="text-red-400 text-[11px] font-medium">
                {error}
              </div>
            )}

            {/* Live preview of new remaining */}
            {isValidAmount && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#faf5eb]/30">
                  After this purchase:
                </span>
                <span
                  className={`text-[13px] font-bold ${wouldOverBudget ? "text-red-400" : "text-cyan-400"}`}
                  style={{ fontFeatureSettings: "'tnum' on" }}
                >
                  {formatMoney(newRemaining)} remaining
                </span>
              </div>
            )}

            {/* Over-budget warning */}
            {wouldOverBudget && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-1">
                <svg
                  className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span className="text-[11px] text-red-400/80">
                  This will exceed your {envelope.name} budget by{" "}
                  <strong>{formatMoney(Math.abs(newRemaining))}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Note field */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#faf5eb]/50 tracking-[0.1em] font-medium">
              NOTE / DESCRIPTION
            </label>
            <input
              type="text"
              placeholder="e.g. Gas station, Groceries at Meijer"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className="w-full bg-[#0f0d0a] border border-[#2a2520] rounded-lg px-4 py-2.5 text-[14px] text-[#faf5eb] placeholder-[#faf5eb]/20 focus:outline-none focus:border-[#3a3530] transition-colors"
            />
          </div>

          {/* Date field */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#faf5eb]/50 tracking-[0.1em] font-medium">
              DATE
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0f0d0a] border border-[#2a2520] rounded-lg px-4 py-2.5 text-[14px] text-[#faf5eb] focus:outline-none focus:border-[#3a3530] transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-[13px] font-semibold tracking-wider text-[#faf5eb]/50 border border-[#2a2520] hover:bg-[#2a2520]/50 hover:text-[#faf5eb]/70 transition-all duration-200"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={externalSubmitting}
            className="flex-[2] py-3 rounded-lg text-[13px] font-semibold tracking-wider transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: externalSubmitting
                ? `${colors.accent}40`
                : colors.accent,
              color: "#0f0d0a",
            }}
          >
            {externalSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                SAVING...
              </span>
            ) : (
              "LOG SPENDING"
            )}
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="px-5 pb-4 flex justify-center">
          <span className="text-[10px] text-[#faf5eb]/20 tracking-wider">
            PRESS ENTER TO SUBMIT · ESC TO CLOSE
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit Category Dialog ─────────────────────────

function CategoryDialog({
  mode,
  envelope,
  onClose,
  onSubmit,
  onDelete,
  isSubmitting,
}: {
  mode: "create" | "edit";
  envelope?: Envelope;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: CategoryType;
    planned: number;
  }) => Promise<void>;
  onDelete?: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(envelope?.name ?? "");
  const [type, setType] = useState<CategoryType>(envelope?.type ?? "flexible");
  const [plannedStr, setPlannedStr] = useState(
    envelope ? envelope.allocated.toFixed(2) : "",
  );
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handlePlannedChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setPlannedStr(cleaned);
    setError("");
  };

  const parsedPlanned = parseFloat(plannedStr);
  const isValidPlanned = !isNaN(parsedPlanned) && parsedPlanned > 0;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Category name is required");
      nameRef.current?.focus();
      return;
    }
    if (!plannedStr.trim() || !isValidPlanned) {
      setError("Enter a valid allocation amount");
      return;
    }

    try {
      await onSubmit({ name: name.trim(), type, planned: parsedPlanned });
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  const typeOptions: { value: CategoryType; label: string; desc: string }[] = [
    { value: "fixed", label: "FIXED", desc: "Same amount every paycheck" },
    { value: "flexible", label: "FLEX", desc: "Variable spending budget" },
    { value: "savings", label: "SAVE", desc: "Savings goal contribution" },
  ];

  const accent = "#06B6D4";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="relative w-full max-w-[440px] bg-[#1a1714] border border-[#2a2520] rounded-[12px] overflow-hidden"
        style={{
          boxShadow: `0 0 40px rgba(0,0,0,0.5), 0 0 80px ${accent}10`,
        }}
      >
        {/* Top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: accent, opacity: 0.8 }}
        />

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1a1714]/98 p-6">
            <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#faf5eb] mb-2">
              Delete &ldquo;{envelope?.name}&rdquo;?
            </h3>
            <p className="text-[13px] text-[#faf5eb]/50 text-center mb-1">
              This will permanently remove:
            </p>
            <ul className="text-[12px] text-[#faf5eb]/40 text-center space-y-0.5 mb-6">
              <li>• The category and its allocation</li>
              <li>• All spending records for this paycheck</li>
              <li>• All transactions for this paycheck</li>
            </ul>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-lg text-[13px] font-semibold tracking-wider text-[#faf5eb]/50 border border-[#2a2520] hover:bg-[#2a2520]/50 hover:text-[#faf5eb]/70 transition-all duration-200"
              >
                CANCEL
              </button>
              <button
                onClick={onDelete}
                disabled={isSubmitting}
                className="flex-[2] py-3 rounded-lg text-[13px] font-semibold tracking-wider bg-red-500 text-white hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    DELETING...
                  </span>
                ) : (
                  "DELETE CATEGORY"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">
                {mode === "create" ? "✨" : envelope?.icon ?? "📂"}
              </span>
              <div>
                <div className="text-[10px] text-[#faf5eb]/30 tracking-[0.2em]">
                  {mode === "create" ? "NEW ENVELOPE" : "EDIT ENVELOPE"}
                </div>
                <h3 className="font-bold text-[#faf5eb] text-lg leading-tight">
                  {mode === "create"
                    ? "Create Category"
                    : envelope?.name ?? "Edit"}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#2a2520] transition-colors text-[#faf5eb]/40 hover:text-[#faf5eb]/70"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Name field */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#faf5eb]/50 tracking-[0.1em] font-medium">
              CATEGORY NAME <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              placeholder="e.g. Groceries, Gas, Emergency Fund"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className={`w-full bg-[#0f0d0a] border rounded-lg px-4 py-3 text-[15px] font-medium text-[#faf5eb] placeholder-[#faf5eb]/20 focus:outline-none transition-colors ${
                error && !name.trim()
                  ? "border-red-500/60 focus:border-red-400"
                  : "border-[#2a2520] focus:border-[#3a3530]"
              }`}
            />
          </div>

          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#faf5eb]/50 tracking-[0.1em] font-medium">
              CATEGORY TYPE
            </label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const isSelected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-[#2a2520] bg-[#0f0d0a] hover:border-[#3a3530]"
                    }`}
                  >
                    <div
                      className={`text-[12px] font-bold tracking-wider ${
                        isSelected ? "text-cyan-400" : "text-[#faf5eb]/60"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-[#faf5eb]/30 mt-0.5">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allocation amount */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#faf5eb]/50 tracking-[0.1em] font-medium">
              BUDGET PER PAYCHECK <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#faf5eb]/30 text-lg font-bold">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={plannedStr}
                onChange={(e) => handlePlannedChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className={`w-full bg-[#0f0d0a] border rounded-lg pl-8 pr-4 py-3 text-2xl font-bold text-[#faf5eb] placeholder-[#faf5eb]/15 focus:outline-none transition-colors ${
                  error && !isValidPlanned
                    ? "border-red-500/60 focus:border-red-400"
                    : "border-[#2a2520] focus:border-[#3a3530]"
                }`}
                style={{ fontFeatureSettings: "'tnum' on" }}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-[11px] font-medium">{error}</div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-[13px] font-semibold tracking-wider text-[#faf5eb]/50 border border-[#2a2520] hover:bg-[#2a2520]/50 hover:text-[#faf5eb]/70 transition-all duration-200"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-3 rounded-lg text-[13px] font-semibold tracking-wider transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: isSubmitting ? `${accent}40` : accent,
              color: "#0f0d0a",
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                SAVING...
              </span>
            ) : mode === "create" ? (
              "CREATE ENVELOPE"
            ) : (
              "SAVE CHANGES"
            )}
          </button>
        </div>

        {/* Delete button (edit mode only) */}
        {mode === "edit" && onDelete && (
          <div className="px-5 pb-4">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 rounded-lg text-[12px] font-semibold tracking-wider text-red-400/70 border border-red-500/15 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
            >
              DELETE CATEGORY
            </button>
          </div>
        )}

        {/* Keyboard shortcut hint */}
        <div className="px-5 pb-4 flex justify-center">
          <span className="text-[10px] text-[#faf5eb]/20 tracking-wider">
            PRESS ENTER TO SUBMIT · ESC TO CLOSE
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Envelope Card Component ──────────────────────────────

function EnvelopeCard({
  envelope,
  onTap,
  isExpanded,
  onLogSpending,
  onEdit,
}: {
  envelope: Envelope;
  onTap: () => void;
  isExpanded: boolean;
  onLogSpending: () => void;
  onEdit: () => void;
}) {
  const colors = getStateColors(envelope.state);
  const pct = getPercentage(envelope.spent, envelope.allocated);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      className={`
        relative w-full text-left
        bg-[#1a1714] border border-[#2a2520] rounded-[10px]
        hover:border-[#3a3530] transition-all duration-200
        ${isExpanded ? "ring-1" : ""}
        ${colors.glow}
        group overflow-hidden
        cursor-pointer
      `}
      style={{
        borderColor: isExpanded ? colors.accent : undefined,
        ringColor: isExpanded ? colors.accent : undefined,
      }}
    >
      {/* Envelope flap / top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: colors.accent, opacity: 0.6 }}
      />
      {/* Fill level background */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
        style={{
          height: `${pct}%`,
          backgroundColor: colors.accentBg,
        }}
      />
      {/* Content */}
      <div className="relative z-10 p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="font-bold text-[#faf5eb] text-base leading-tight">
                {envelope.name}
              </h3>
              <span className="text-[10px] tracking-[0.15em] text-[#faf5eb]/40 font-medium">
                {getTypeLabel(envelope.type)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#2a2520] transition-all duration-200 text-[#faf5eb]/40 hover:text-[#faf5eb]/70"
              title="Edit category"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <span
              className={`text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded border ${colors.badge}`}
            >
              {colors.label}
            </span>
          </div>
        </div>

        {/* Hero remaining number */}
        <div className="text-center py-2">
          <div
            className={`text-3xl font-bold tracking-tight ${colors.text}`}
            style={{ fontFeatureSettings: "'tnum' on" }}
          >
            {formatMoney(envelope.remaining)}
          </div>
          <div className="text-[11px] text-[#faf5eb]/40 tracking-wide mt-0.5">
            REMAINING
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#faf5eb]/50">
              {formatMoney(envelope.spent)} spent
            </span>
            <span className="text-[#faf5eb]/50">
              of {formatMoney(envelope.allocated)}
            </span>
          </div>
          <div className="h-1.5 bg-[#2a2520] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: colors.barFill,
              }}
            />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#faf5eb]/30">
              {pct.toFixed(0)}% used
            </span>
          </div>
        </div>

        {/* Tap hint */}
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[10px] text-[#faf5eb]/30 tracking-wider">
            TAP TO {isExpanded ? "CLOSE" : "VIEW DETAILS"}
          </span>
        </div>
      </div>
      {/* Expanded detail (transaction list) */}
      {isExpanded && (
        <div className="relative z-10 border-t border-[#2a2520] px-5 pb-5 pt-3 space-y-2">
          <div className="text-[10px] text-[#faf5eb]/40 tracking-[0.15em] mb-2">
            RECENT TRANSACTIONS
          </div>
          {envelope.transactions.length === 0 ? (
            <div className="text-[12px] text-[#faf5eb]/30 italic">
              No spending logged yet
            </div>
          ) : (
            envelope.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-[12px]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#faf5eb]/20" />
                  <span className="text-[#faf5eb]/70">{tx.label}</span>
                  <span className="text-[#faf5eb]/25">{tx.date}</span>
                </div>
                <span className="text-[#faf5eb]/60 font-medium">
                  -{formatMoney(tx.amount)}
                </span>
              </div>
            ))
          )}
          {/* Log Spending button */}
          <button
            className="w-full mt-3 py-2.5 rounded-md text-[12px] font-semibold tracking-wider transition-all duration-200 hover:brightness-110"
            style={{
              backgroundColor: colors.accentBg,
              color: colors.accent,
              border: `1px solid ${colors.accent}30`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onLogSpending();
            }}
          >
            + LOG SPENDING
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar Component ────────────────────────────────

function SummaryBar({
  envelopes,
  onCreateCategory,
}: {
  envelopes: Envelope[];
  onCreateCategory?: () => void;
}) {
  const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
  const totalRemaining = envelopes.reduce((s, e) => s + e.remaining, 0);
  const overBudgetCount = envelopes.filter(
    (e) => e.state === "over-budget",
  ).length;
  const nearLimitCount = envelopes.filter(
    (e) => e.state === "near-limit",
  ).length;
  const healthyCount = envelopes.filter((e) => e.state === "healthy").length;

  return (
    <div className="bg-[#1a1714] border border-[#2a2520] rounded-[10px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xl font-bold text-[#faf5eb]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Digital Envelopes
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[#faf5eb]/50">{healthyCount} healthy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[#faf5eb]/50">
                {nearLimitCount} caution
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[#faf5eb]/50">{overBudgetCount} over</span>
            </span>
          </div>
          {onCreateCategory && (
            <button
              onClick={onCreateCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider bg-cyan-500 text-[#0f0d0a] hover:bg-cyan-400 transition-colors ml-2"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              NEW
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] text-[#faf5eb]/40 tracking-[0.15em] mb-1">
            TOTAL ALLOCATED
          </div>
          <div
            className="text-2xl font-bold text-[#faf5eb]"
            style={{ fontFeatureSettings: "'tnum' on" }}
          >
            {formatMoney(totalAllocated)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#faf5eb]/40 tracking-[0.15em] mb-1">
            TOTAL SPENT
          </div>
          <div
            className="text-2xl font-bold text-[#faf5eb]/70"
            style={{ fontFeatureSettings: "'tnum' on" }}
          >
            {formatMoney(totalSpent)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#faf5eb]/40 tracking-[0.15em] mb-1">
            TOTAL REMAINING
          </div>
          <div
            className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-cyan-400" : "text-red-400"}`}
            style={{ fontFeatureSettings: "'tnum' on" }}
          >
            {formatMoney(totalRemaining)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────

function EnvelopesLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-[#1a1714] border border-[#2a2520] rounded-[10px] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-[#2a2520] rounded animate-pulse" />
          <div className="h-4 w-40 bg-[#2a2520] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-[#2a2520] rounded animate-pulse mb-2" />
              <div className="h-8 w-28 bg-[#2a2520] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-[#1a1714] border border-[#2a2520] rounded-[10px] p-5 space-y-4"
          >
            <div className="flex justify-between">
              <div className="h-5 w-24 bg-[#2a2520] rounded animate-pulse" />
              <div className="h-5 w-20 bg-[#2a2520] rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-center py-2">
              <div className="h-9 w-28 bg-[#2a2520] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#2a2520] rounded animate-pulse mt-2" />
            </div>
            <div className="h-1.5 bg-[#2a2520] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function DigitalEnvelopes() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logSpendingEnvelopeId, setLogSpendingEnvelopeId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paycheckId, setPaycheckId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Category CRUD dialog state
  const [categoryDialogMode, setCategoryDialogMode] = useState<
    "create" | "edit" | null
  >(null);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | undefined>(
    undefined,
  );

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadError("Not authenticated. Please sign in to view your envelopes.");
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Get the current paycheck
      const { data: currentPaycheck, error: pcError } = await supabase
        .from("paychecks")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .single();

      if (pcError || !currentPaycheck) {
        setEnvelopes([]);
        setIsLoading(false);
        return;
      }

      setPaycheckId(currentPaycheck.id);

      // Fetch category_spending with joined category data
      const { data: catSpending, error: csError } = await supabase
        .from("category_spending")
        .select(
          `
          *,
          category:categories(*)
        `,
        )
        .eq("paycheck_id", currentPaycheck.id);

      if (csError) {
        throw new Error(`Failed to load categories: ${csError.message}`);
      }

      // Fetch transactions for this paycheck
      const { data: txns, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("paycheck_id", currentPaycheck.id)
        .order("transaction_date", { ascending: false });

      if (txError) {
        throw new Error(`Failed to load transactions: ${txError.message}`);
      }

      const built = buildEnvelopes(catSpending || [], txns || []);
      setEnvelopes(built);
    } catch (err) {
      console.error("Error loading envelope data:", err);
      setLoadError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTap = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleOpenLogSpending = (id: string) => {
    setLogSpendingEnvelopeId(id);
  };

  const handleCloseLogSpending = () => {
    setLogSpendingEnvelopeId(null);
  };

  // ── Create Category ──
  const handleOpenCreateCategory = () => {
    setEditingEnvelope(undefined);
    setCategoryDialogMode("create");
  };

  // ── Edit Category ──
  const handleOpenEditCategory = (envelope: Envelope) => {
    setEditingEnvelope(envelope);
    setCategoryDialogMode("edit");
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogMode(null);
    setEditingEnvelope(undefined);
  };

  const handleCategorySubmit = async (data: {
    name: string;
    type: CategoryType;
    planned: number;
  }) => {
    if (!paycheckId || !userId) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (categoryDialogMode === "create") {
        // 1. Insert the new category
        const { data: newCat, error: catError } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: data.name,
            type: data.type,
            amount_per_paycheck: data.planned,
            priority: envelopes.length + 1,
          })
          .select()
          .single();

        if (catError || !newCat) {
          throw new Error(
            `Failed to create category: ${catError?.message ?? "Unknown error"}`,
          );
        }

        // 2. Insert category_spending row for the current paycheck
        const { error: csError } = await supabase
          .from("category_spending")
          .insert({
            paycheck_id: paycheckId,
            category_id: newCat.id,
            planned: data.planned,
            spent: 0,
          });

        if (csError) {
          throw new Error(
            `Failed to create category spending: ${csError.message}`,
          );
        }

        toast.success("Category created", {
          description: `${data.name} envelope has been added.`,
        });
      } else if (categoryDialogMode === "edit" && editingEnvelope) {
        // 1. Update the category record
        const { error: catError } = await supabase
          .from("categories")
          .update({
            name: data.name,
            type: data.type,
            amount_per_paycheck: data.planned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEnvelope.categoryId);

        if (catError) {
          throw new Error(
            `Failed to update category: ${catError.message}`,
          );
        }

        // 2. Update category_spending.planned for the current paycheck
        const { error: csError } = await supabase
          .from("category_spending")
          .update({
            planned: data.planned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEnvelope.categorySpendingId);

        if (csError) {
          throw new Error(
            `Failed to update allocation: ${csError.message}`,
          );
        }

        toast.success("Category updated", {
          description: `${data.name} envelope has been updated.`,
        });
      }

      handleCloseCategoryDialog();

      // Reload data to reflect changes
      await loadData();
    } catch (err) {
      console.error("Error saving category:", err);
      toast.error("Failed to save category", {
        description:
          err instanceof Error ? err.message : "An unexpected error occurred",
      });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Category ──
  const handleDeleteCategory = async () => {
    if (!editingEnvelope || !paycheckId || !userId) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const categoryId = editingEnvelope.categoryId;

      // 1. Delete transactions for this category in this paycheck
      const { error: txError } = await supabase
        .from("transactions")
        .delete()
        .eq("category_id", categoryId)
        .eq("paycheck_id", paycheckId);

      if (txError) {
        throw new Error(
          `Failed to delete transactions: ${txError.message}`,
        );
      }

      // 2. Delete category_spending for this category in this paycheck
      const { error: csError } = await supabase
        .from("category_spending")
        .delete()
        .eq("id", editingEnvelope.categorySpendingId);

      if (csError) {
        throw new Error(
          `Failed to delete category spending: ${csError.message}`,
        );
      }

      // 3. Check if there are any remaining category_spending rows for this category
      const { count, error: countError } = await supabase
        .from("category_spending")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId);

      if (countError) {
        console.warn("Could not check remaining spending rows:", countError);
      }

      // 4. If no other spending rows exist, delete the category itself
      if (count === 0) {
        const { error: delCatError } = await supabase
          .from("categories")
          .delete()
          .eq("id", categoryId);

        if (delCatError) {
          console.warn("Could not delete orphaned category:", delCatError);
        }
      }

      const deletedName = editingEnvelope.name;
      handleCloseCategoryDialog();

      toast.success("Category deleted", {
        description: `${deletedName} envelope has been removed.`,
      });

      // Reload data
      await loadData();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Failed to delete category", {
        description:
          err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSpending = async (
    envelopeId: string,
    amount: number,
    noteText: string,
    dateStr: string,
  ) => {
    if (!paycheckId || !userId) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Insert transaction row
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        paycheck_id: paycheckId,
        category_id: envelopeId,
        amount,
        description: noteText || null,
        transaction_date: dateStr,
      });

      if (txError) {
        throw new Error(`Failed to save transaction: ${txError.message}`);
      }

      // 2. Update the category_spending.spent for this envelope
      const envelope = envelopes.find((e) => e.id === envelopeId);
      if (envelope) {
        const { error: updateError } = await supabase
          .from("category_spending")
          .update({
            spent: envelope.spent + amount,
          })
          .eq("id", envelope.categorySpendingId);

        if (updateError) {
          throw new Error(
            `Failed to update category spending: ${updateError.message}`,
          );
        }
      }

      // 3. Optimistically update local state
      setEnvelopes((prev) =>
        prev.map((env) => {
          if (env.id !== envelopeId) return env;
          const newSpent = env.spent + amount;
          const newRemaining = env.allocated - newSpent;
          const newState = computeState(newSpent, env.allocated);
          return {
            ...env,
            spent: newSpent,
            remaining: newRemaining,
            state: newState,
            transactions: [
              {
                id: `temp-${Date.now()}`,
                label: noteText || "Spending",
                amount,
                date: formatDateLabel(dateStr),
              },
              ...env.transactions,
            ],
          };
        }),
      );

      setLogSpendingEnvelopeId(null);

      // Reload fresh data in background to sync with DB
      setTimeout(() => loadData(), 500);
    } catch (err) {
      console.error("Error submitting spending:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logSpendingEnvelope = logSpendingEnvelopeId
    ? (envelopes.find((e) => e.id === logSpendingEnvelopeId) ?? null)
    : null;

  // ── Loading state ──
  if (isLoading) {
    return <EnvelopesLoadingSkeleton />;
  }

  // ── Error state ──
  if (loadError) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#faf5eb]">
          Something went wrong
        </h2>
        <p className="text-red-400/80 text-sm">{loadError}</p>
        <button
          onClick={() => {
            setIsLoading(true);
            loadData();
          }}
          className="px-6 py-2.5 bg-cyan-500 text-[#0f0d0a] font-semibold text-sm rounded-lg hover:bg-cyan-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Empty state (now with create button) ──
  if (envelopes.length === 0) {
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-bold text-[#faf5eb]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Digital Envelopes
            </h2>
            <button
              onClick={handleOpenCreateCategory}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold tracking-wider bg-cyan-500 text-[#0f0d0a] hover:bg-cyan-400 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              NEW ENVELOPE
            </button>
          </div>
          <div className="bg-[#1a1714] border border-[#2a2520] rounded-[10px] p-8 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-[#faf5eb]/50 text-sm mb-4">
              No budget envelopes yet. Create your first category to start
              tracking your spending.
            </p>
            <button
              onClick={handleOpenCreateCategory}
              className="px-6 py-2.5 bg-cyan-500 text-[#0f0d0a] font-semibold text-sm rounded-lg hover:bg-cyan-400 transition-colors"
            >
              Create First Envelope
            </button>
          </div>
        </div>

        {/* Create Category Dialog */}
        {categoryDialogMode === "create" && (
          <CategoryDialog
            mode="create"
            onClose={handleCloseCategoryDialog}
            onSubmit={handleCategorySubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Bar with New Envelope button */}
        <SummaryBar
          envelopes={envelopes}
          onCreateCategory={handleOpenCreateCategory}
        />

        {/* Envelope Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {envelopes.map((envelope) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
              onTap={() => handleTap(envelope.id)}
              isExpanded={expandedId === envelope.id}
              onLogSpending={() => handleOpenLogSpending(envelope.id)}
              onEdit={() => handleOpenEditCategory(envelope)}
            />
          ))}
        </div>
      </div>

      {/* Log Spending Dialog */}
      {logSpendingEnvelope && (
        <LogSpendingDialog
          envelope={logSpendingEnvelope}
          onClose={handleCloseLogSpending}
          isSubmitting={isSubmitting}
          onSubmit={(amount, noteText, dateStr) =>
            handleSubmitSpending(
              logSpendingEnvelope.id,
              amount,
              noteText,
              dateStr,
            )
          }
        />
      )}

      {/* Create / Edit Category Dialog */}
      {categoryDialogMode && (
        <CategoryDialog
          mode={categoryDialogMode}
          envelope={editingEnvelope}
          onClose={handleCloseCategoryDialog}
          onSubmit={handleCategorySubmit}
          onDelete={
            categoryDialogMode === "edit" ? handleDeleteCategory : undefined
          }
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}
