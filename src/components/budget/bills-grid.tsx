"use client";

import { useState, useMemo } from "react";
import { BillPayment } from "@/types/budget";
import { formatCurrency } from "@/lib/budget-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BillsGridProps {
  bills: BillPayment[];
  onBillPaid: (billPaymentId: string, actualAmount: number) => void;
  onBillUndo?: (billPaymentId: string) => void;
  onBillDelete?: (billPaymentId: string) => void;
  onAddBill?: () => void;
}

/**
 * Generate a 2-letter "element symbol" from a bill name.
 * E.g. "Rent" -> "Rn", "Credit Card" -> "Cc", "Electric" -> "El"
 */
function getBillSymbol(name: string): string {
  if (!name) return "??";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).charAt(0).toUpperCase() + (words[0][0] + words[1][0]).charAt(1).toLowerCase();
  }
  if (name.length === 1) return name[0].toUpperCase() + name[0].toLowerCase();
  return name[0].toUpperCase() + name[1].toLowerCase();
}

/**
 * Group bills by their due day-of-month
 */
function groupBillsByDueDay(bills: BillPayment[]): Map<number, BillPayment[]> {
  const groups = new Map<number, BillPayment[]>();
  
  for (const bill of bills) {
    const dueDate = new Date(bill.due_date);
    const dueDay = dueDate.getDate();
    
    if (!groups.has(dueDay)) {
      groups.set(dueDay, []);
    }
    groups.get(dueDay)!.push(bill);
  }
  
  return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
}

export function BillsGrid({
  bills,
  onBillPaid,
  onBillUndo,
  onBillDelete,
  onAddBill,
}: BillsGridProps) {
  const [selectedBill, setSelectedBill] = useState<BillPayment | null>(null);
  const [actualAmount, setActualAmount] = useState("");

  const groupedBills = useMemo(() => groupBillsByDueDay(bills), [bills]);

  const totalBills = bills.length;
  const paidCount = bills.filter((b) => b.is_paid).length;
  const unpaidCount = totalBills - paidCount;
  const totalDue = bills.reduce(
    (sum, b) => sum + (b.actual_amount || b.planned_amount),
    0,
  );

  const handleBillClick = (bill: BillPayment) => {
    if (bill.is_paid) {
      // Toggle undo for paid bills
      if (onBillUndo) {
        onBillUndo(bill.id);
      }
      return;
    }
    setSelectedBill(bill);
    setActualAmount(bill.planned_amount.toString());
  };

  const handleConfirmPaid = () => {
    if (!selectedBill) return;
    onBillPaid(selectedBill.id, parseFloat(actualAmount));
    setSelectedBill(null);
    setActualAmount("");
  };

  if (bills.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl font-black text-[#faf5eb] mb-2">
            Bills by Due Date
          </h1>
          <p className="text-[#faf5eb]/60 text-lg font-light">
            No bills assigned to this pay period
          </p>
        </div>
        {onAddBill && (
          <button
            onClick={onAddBill}
            className="border-2 border-dashed border-[#2a2520] rounded px-6 py-4 text-[#faf5eb]/40 hover:text-[#06B6D4] hover:border-[#06B6D4]/50 transition-all duration-200 cursor-pointer"
          >
            + Add a bill
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl font-black text-[#faf5eb] mb-2">
            Bills by Due Date
          </h1>
          <p className="text-[#faf5eb]/60 text-lg font-light">
            Organized chronologically through the month
          </p>
        </div>

        {/* Bills Grid */}
        <div className="flex flex-wrap gap-4 relative">
          {Array.from(groupedBills.entries()).map(
            ([dueDay, dueDayBills], groupIndex) => {
              const groupTotal = dueDayBills.reduce(
                (sum, b) => sum + (b.actual_amount || b.planned_amount),
                0,
              );

              return (
                <div
                  key={dueDay}
                  className={`flex flex-col gap-2 relative ${
                    groupIndex > 0
                      ? "before:absolute before:-top-6 before:left-0 before:right-0 before:h-0.5 before:bg-[#06B6D4]/50"
                      : ""
                  }`}
                >
                  {/* Due Day Header */}
                  <div className="flex-shrink-0 text-center px-2 py-1 bg-[#1a1714] border border-[#2a2520] rounded">
                    <div className="text-lg font-black text-[#06B6D4]">
                      {dueDay}
                    </div>
                    <div className="text-xs font-light text-[#faf5eb]/40">
                      DUE
                    </div>
                  </div>

                  {/* Bill Cards for this due day */}
                  <div className="flex flex-col gap-2">
                    {dueDayBills.map((billPayment) => {
                      const isPaid = billPayment.is_paid;
                      const billName =
                        billPayment.bill?.name || "Unknown Bill";
                      const amount =
                        billPayment.actual_amount ||
                        billPayment.planned_amount;

                      return (
                        <div
                          key={billPayment.id}
                          onClick={() => handleBillClick(billPayment)}
                          className={`
                            relative border-2 border-[#2a2520] bg-[#1a1714]
                            rounded px-3 py-2 cursor-pointer
                            transition-all duration-200 ease-in-out
                            hover:scale-105 hover:brightness-125
                            ${isPaid ? "opacity-50" : "opacity-100"}
                            min-w-[100px]
                          `}
                        >
                          {/* Paid checkmark */}
                          {isPaid && (
                            <div className="absolute -top-1 -right-1 text-xs font-bold text-[#10b981] bg-[#0f0d0a] rounded-full w-4 h-4 flex items-center justify-center">
                              ✓
                            </div>
                          )}

                          {/* Symbol */}
                          <div className="text-2xl font-black text-[#faf5eb] mb-1">
                            {getBillSymbol(billName)}
                          </div>

                          {/* Name */}
                          <div className="text-xs font-light text-[#faf5eb]/70 mb-1 leading-tight">
                            {billName}
                          </div>

                          {/* Amount */}
                          <div className="text-sm font-bold text-[#06B6D4]">
                            {formatCurrency(amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Group total */}
                  <div className="text-center text-xs font-light text-[#faf5eb]/60">
                    {formatCurrency(groupTotal)}
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#1a1714] border border-[#2a2520] rounded-lg p-5">
            <div className="text-xs font-light text-[#faf5eb]/60 mb-1">
              Total Bills
            </div>
            <div className="text-2xl font-black text-[#faf5eb]">
              {totalBills}
            </div>
          </div>
          <div className="bg-[#1a1714] border border-[#2a2520] rounded-lg p-5">
            <div className="text-xs font-light text-[#faf5eb]/60 mb-1">
              Total Due
            </div>
            <div className="text-2xl font-black text-[#faf5eb]">
              {formatCurrency(totalDue)}
            </div>
          </div>
          <div className="bg-[#1a1714] border border-[#2a2520] rounded-lg p-5">
            <div className="text-xs font-light text-[#faf5eb]/60 mb-1">
              Paid
            </div>
            <div className="text-2xl font-black text-[#10b981]">
              {paidCount}
            </div>
          </div>
          <div className="bg-[#1a1714] border border-[#2a2520] rounded-lg p-5">
            <div className="text-xs font-light text-[#faf5eb]/60 mb-1">
              Unpaid
            </div>
            <div className="text-2xl font-black text-[#ef4444]">
              {unpaidCount}
            </div>
          </div>
        </div>
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="bg-[#1a1714] border-[#2a2520] text-[#faf5eb]">
          <DialogHeader>
            <DialogTitle className="text-[#faf5eb]">
              Mark Bill as Paid
            </DialogTitle>
            <DialogDescription className="text-[#faf5eb]/60">
              {selectedBill?.bill?.name} — Due on{" "}
              {selectedBill &&
                new Date(selectedBill.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="actualAmount" className="text-[#faf5eb]/80">
                Actual Amount Paid
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#faf5eb]/40">
                  $
                </span>
                <Input
                  id="actualAmount"
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="pl-7 bg-[#0f0d0a] border-[#2a2520] text-[#faf5eb]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedBill(null)}
                className="flex-1 border-[#2a2520] text-[#faf5eb] hover:bg-[#2a2520]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPaid}
                className="flex-1 bg-[#06B6D4] hover:bg-[#06B6D4]/80 text-[#0f0d0a] font-bold"
              >
                Mark as Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
