"use client";

import React, { useState, useEffect, useRef } from "react";
import { Paycheck } from "@/types/budget";
import { format, addDays, addWeeks, parseISO } from "date-fns";

interface CreatePayPeriodDialogProps {
  currentPaycheck: Paycheck | null;
  onClose: () => void;
  onSave: (data: {
    pay_date: string;
    period_start_date: string;
    period_end_date: string;
    net_amount: number;
  }) => Promise<void>;
  isSaving: boolean;
}

export function CreatePayPeriodDialog({
  currentPaycheck,
  onClose,
  onSave,
  isSaving,
}: CreatePayPeriodDialogProps) {
  // Smart defaults: next period starts day after current ends
  const getDefaults = () => {
    if (currentPaycheck) {
      const currentEnd = currentPaycheck.period_end_date || currentPaycheck.pay_date;
      const currentStart = currentPaycheck.period_start_date || currentPaycheck.pay_date;

      // Estimate period length from current paycheck
      const startDate = parseISO(currentStart);
      const endDate = parseISO(currentEnd);
      const periodLength = Math.max(
        Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        7
      );

      const newStart = format(addDays(endDate, 1), "yyyy-MM-dd");
      const newEnd = format(addDays(endDate, periodLength), "yyyy-MM-dd");
      const newPayDate = newEnd;

      return {
        payDate: newPayDate,
        periodStart: newStart,
        periodEnd: newEnd,
        netAmount: currentPaycheck.net_amount.toFixed(2),
      };
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const twoWeeks = format(addWeeks(new Date(), 2), "yyyy-MM-dd");
    return {
      payDate: twoWeeks,
      periodStart: today,
      periodEnd: twoWeeks,
      netAmount: "",
    };
  };

  const defaults = getDefaults();
  const [payDate, setPayDate] = useState(defaults.payDate);
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [netAmount, setNetAmount] = useState(defaults.netAmount);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

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
    setNetAmount(cleaned);
  };

  const handleSubmit = async () => {
    setError("");
    const amount = parseFloat(netAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid pay amount.");
      return;
    }
    if (!payDate || !periodStart || !periodEnd) {
      setError("Please fill in all date fields.");
      return;
    }
    if (periodStart > periodEnd) {
      setError("Period start must be before period end.");
      return;
    }

    await onSave({
      pay_date: payDate,
      period_start_date: periodStart,
      period_end_date: periodEnd,
      net_amount: amount,
    });
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        className="bg-[#1a1714] border border-[#2a2520] rounded-[14px] w-full max-w-md overflow-hidden"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#faf5eb]">
              New Pay Period
            </h3>
            <p className="text-xs text-[#faf5eb]/40 mt-0.5">
              The current period will be saved to history
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2a2520] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#faf5eb]/60"
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

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Info banner */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-cyan-400 leading-relaxed">
              Creating a new pay period will archive your current one. All envelopes and bills will be initialized for the new period based on your existing categories and active bills.
            </p>
          </div>

          {/* Net Amount */}
          <div>
            <label className="block text-[11px] text-[#faf5eb]/50 tracking-[0.15em] mb-1.5">
              NET PAY AMOUNT
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#faf5eb]/40 text-lg font-bold">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={netAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full bg-[#0f0d0a] border border-[#2a2520] rounded-lg px-3 pl-8 py-3 text-xl font-bold text-[#faf5eb] focus:outline-none focus:border-cyan-500 transition-colors"
                style={{ fontFeatureSettings: "'tnum' on" }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Pay Date */}
          <div>
            <label className="block text-[11px] text-[#faf5eb]/50 tracking-[0.15em] mb-1.5">
              PAY DATE
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full bg-[#0f0d0a] border border-[#2a2520] rounded-lg px-3 py-2.5 text-sm text-[#faf5eb] focus:outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Period Start */}
          <div>
            <label className="block text-[11px] text-[#faf5eb]/50 tracking-[0.15em] mb-1.5">
              PERIOD START DATE
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full bg-[#0f0d0a] border border-[#2a2520] rounded-lg px-3 py-2.5 text-sm text-[#faf5eb] focus:outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Period End */}
          <div>
            <label className="block text-[11px] text-[#faf5eb]/50 tracking-[0.15em] mb-1.5">
              PERIOD END DATE
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full bg-[#0f0d0a] border border-[#2a2520] rounded-lg px-3 py-2.5 text-sm text-[#faf5eb] focus:outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#faf5eb]/70 border border-[#2a2520] hover:bg-[#2a2520] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-cyan-500 text-[#0f0d0a] hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create Pay Period"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
