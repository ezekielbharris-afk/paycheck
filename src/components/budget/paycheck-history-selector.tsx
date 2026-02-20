"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paycheck } from "@/types/budget";
import { formatShortDate } from "@/lib/budget-utils";
import { ChevronDown, History, ArrowLeft } from "lucide-react";

interface PaycheckHistorySelectorProps {
  paychecks: Paycheck[];
  currentPaycheckId: string;
  selectedPaycheckId: string;
  onSelect: (paycheckId: string) => void;
}

export function PaycheckHistorySelector({
  paychecks,
  currentPaycheckId,
  selectedPaycheckId,
  onSelect,
}: PaycheckHistorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isViewingHistory = selectedPaycheckId !== currentPaycheckId;
  const selectedPaycheck = paychecks.find((p) => p.id === selectedPaycheckId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatPeriodLabel = (p: Paycheck) => {
    const start = p.period_start_date || p.pay_date;
    const end = p.period_end_date;
    if (end) {
      return `${formatShortDate(start)} – ${formatShortDate(end)}`;
    }
    return formatShortDate(start);
  };

  const sortedPaychecks = [...paychecks].sort(
    (a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime(),
  );

  return (
    <div className="flex items-center gap-3">
      {/* History badge when viewing historical paycheck */}
      {isViewingHistory && (
        <button
          onClick={() => onSelect(currentPaycheckId)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Current
        </button>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors border ${
            isViewingHistory
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>
            {isViewingHistory
              ? `Viewing: ${selectedPaycheck ? formatPeriodLabel(selectedPaycheck) : "..."}`
              : "Pay Period History"}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1714] border border-[#2a2520] rounded-[10px] shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[#2a2520]">
              <p
                className="text-[10px] text-[#faf5eb]/40 tracking-[0.15em] font-semibold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                SELECT PAY PERIOD
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {sortedPaychecks.map((p) => {
                const isCurrent = p.id === currentPaycheckId;
                const isSelected = p.id === selectedPaycheckId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-cyan-500/10 border-l-2 border-l-cyan-500"
                        : "border-l-2 border-l-transparent hover:bg-[#2a2520]/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${isSelected ? "text-cyan-400" : "text-[#faf5eb]"}`}
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {formatPeriodLabel(p)}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] tracking-wider font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#faf5eb]/40 mt-0.5">
                        Net: $
                        {Number(p.net_amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    )}
                  </button>
                );
              })}
              {sortedPaychecks.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-[#faf5eb]/40">
                  No pay periods found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
