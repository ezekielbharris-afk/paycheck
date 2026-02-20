"use client";

import { useState, useMemo } from "react";
import { BillPayment } from "@/types/budget";
import { formatCurrency } from "@/lib/budget-utils";
import { EditBillDialog } from "@/components/budget/edit-bill-dialog";

interface BillsGridProps {
  bills: BillPayment[];
  onBillPaid: (billPaymentId: string, actualAmount: number) => void;
  onBillUndo?: (billPaymentId: string) => void;
  onBillDelete?: (billPaymentId: string) => void;
  onBillUpdated?: () => void;
  onAddBill?: () => void;
  periodStartDate?: string;
  periodEndDate?: string;
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
  onBillUpdated,
  onAddBill,
  periodStartDate,
  periodEndDate,
}: BillsGridProps) {
  const [selectedBill, setSelectedBill] = useState<BillPayment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const groupedBills = useMemo(() => groupBillsByDueDay(bills), [bills]);

  const totalBills = bills.length;
  const paidCount = bills.filter((b) => b.is_paid).length;
  const unpaidCount = totalBills - paidCount;
  const totalDue = bills.reduce(
    (sum, b) => sum + (b.actual_amount || b.planned_amount),
    0,
  );

  const handleBillClick = (bill: BillPayment) => {
    setSelectedBill(bill);
    setIsEditDialogOpen(true);
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
        <div className="grid gap-4 relative grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8">
          {Array.from(groupedBills.entries()).map(
            ([dueDay, dueDayBills], groupIndex) => {
              const groupTotal = dueDayBills.reduce(
                (sum, b) => sum + (b.actual_amount || b.planned_amount),
                0,
              );

              // Determine if this due day group falls within the current pay period
              const periodStartDay = periodStartDate
                ? new Date(periodStartDate).getDate()
                : null;
              const periodEndDay = periodEndDate
                ? new Date(periodEndDate).getDate()
                : null;
              const isGroupInCurrentPeriod =
                periodStartDay !== null && periodEndDay !== null
                  ? periodStartDay <= dueDay && dueDay <= periodEndDay
                  : true;

              return (
                <div key={dueDay} className="flex flex-col gap-2 relative">
                  {/* Cyan period indicator line - above the day header */}
                  {isGroupInCurrentPeriod && (
                    <div className="border-t-2 border-[#06B6D4]" />
                  )}
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
                    {dueDayBills.map((billPayment, billIndex) => {
                      const isPaid = billPayment.is_paid;
                      const billName = billPayment.bill?.name || "Unknown Bill";
                      const amount =
                        billPayment.actual_amount || billPayment.planned_amount;

                      return (
                        <div key={billPayment.id}>
                          <div
                            onClick={() => handleBillClick(billPayment)}
                            className={`
                          relative border-2 border-[#2a2520] bg-[#1a1714]
                          rounded px-3 py-2 cursor-pointer
                          transition-all duration-200 ease-in-out
                          hover:scale-105 hover:brightness-125
                          ${!isGroupInCurrentPeriod ? "opacity-30" : isPaid ? "opacity-50" : "opacity-100"}
                          min-w-[100px]
                        `}
                          >
                            {/* Paid checkmark */}
                            {isPaid && (
                              <div className="absolute -top-1 -right-1 text-xs font-bold text-[#10b981] bg-[#0f0d0a] rounded-full w-4 h-4 flex items-center justify-center">
                                ✓
                              </div>
                            )}
                            {/* Name */}
                            <div className="text-sm font-bold text-[#faf5eb] mb-1 leading-tight">
                              {billName}
                            </div>
                            {/* Amount */}
                            <div className="text-sm font-bold text-[#06B6D4]">
                              {formatCurrency(amount)}
                            </div>
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
      {/* Edit Bill Dialog */}
      <EditBillDialog
        bill={selectedBill}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedBill(null);
        }}
        onBillUpdated={() => {
          if (onBillUpdated) onBillUpdated();
        }}
        onBillPaid={onBillPaid}
        onBillUndo={onBillUndo}
      />
    </>
  );
}
