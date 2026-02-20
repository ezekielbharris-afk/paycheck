"use client";

import React, { useState, useEffect, useRef } from "react";
import { Paycheck } from "@/types/budget";

interface EditPaycheckDialogProps {
  paycheck: Paycheck;
  onClose: () => void;
  onSave: (data: {
    pay_date: string;
    period_start_date: string;
    period_end_date: string;
    net_amount: number;
  }) => Promise<void>;
  isSaving: boolean;
}

export function EditPaycheckDialog({
  paycheck,
  onClose,
  onSave,
  isSaving,
}: EditPaycheckDialogProps) {
  const [payDate, setPayDate] = useState(paycheck.pay_date);
  const [periodStart, setPeriodStart] = useState(
    paycheck.period_start_date || paycheck.pay_date,
  );
  const [periodEnd, setPeriodEnd] = useState(
    paycheck.period_end_date || paycheck.pay_date,
  );
  const [netAmount, setNetAmount] = useState(paycheck.net_amount.toFixed(2));
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
          <h3 className="text-lg font-bold text-[#faf5eb]">
            Edit Pay Period
          </h3>
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
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
