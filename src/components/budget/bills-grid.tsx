"use client";

import { useState, useMemo } from "react";
import { Bill, BillPayment, BillGridItem } from "@/types/budget";
import { formatCurrency } from "@/lib/budget-utils";
import { EditBillDialog } from "@/components/budget/edit-bill-dialog";

interface BillsGridProps {
  /** All user bills (master list from the `bills` table). Always rendered. */
  allBills: Bill[];
  /** Bill payments for the currently displayed paycheck. Used for paid/unpaid status only. */
  billPayments: BillPayment[];
  onBillPaid: (billPaymentId: string, actualAmount: number, billId?: string, plannedAmount?: number) => void;
  onBillUndo?: (billPaymentId: string) => void;
  onBillDelete?: (billPaymentId: string) => void;
  onBillUpdated?: () => void;
  onAddBill?: () => void;
  periodStartDate?: string;
  periodEndDate?: string;
}

/**
 * Build a stable grid of all bills keyed by due_day, merged with
 * optional payment info for the current paycheck.
 */
function buildGridItems(
  allBills: Bill[],
  billPayments: BillPayment[],
  periodStartDate?: string,
  periodEndDate?: string,
): Map<number, BillGridItem[]> {
  // Index payments by bill_id for quick lookup
  const paymentsByBillId = new Map<string, BillPayment>();
  for (const bp of billPayments) {
    paymentsByBillId.set(bp.bill_id, bp);
  }

  // Determine period day range for highlighting
  const periodStartDay = periodStartDate
    ? new Date(periodStartDate + "T00:00:00").getDate()
    : null;
  const periodEndDay = periodEndDate
    ? new Date(periodEndDate + "T00:00:00").getDate()
    : null;

  // Handle cross-month periods (e.g. start=25, end=10)
  const isCrossMonth =
    periodStartDay !== null &&
    periodEndDay !== null &&
    periodStartDay > periodEndDay;

  const groups = new Map<number, BillGridItem[]>();

  for (const bill of allBills) {
    if (!bill.is_active) continue;

    const dueDay = bill.due_day;
    const payment = paymentsByBillId.get(bill.id) || null;

    // Determine if bill falls within current pay period
    let isInCurrentPeriod: boolean;
    if (periodStartDay === null || periodEndDay === null) {
      // No period info → highlight all
      isInCurrentPeriod = true;
    } else if (isCrossMonth) {
      // Period spans month boundary: day >= start OR day <= end
      isInCurrentPeriod = dueDay >= periodStartDay || dueDay <= periodEndDay;
    } else {
      isInCurrentPeriod = dueDay >= periodStartDay && dueDay <= periodEndDay;
    }

    if (!groups.has(dueDay)) {
      groups.set(dueDay, []);
    }
    groups.get(dueDay)!.push({ bill, payment, isInCurrentPeriod });
  }

  // Sort by due day
  return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
}

export function BillsGrid({
  allBills,
  billPayments,
  onBillPaid,
  onBillUndo,
  onBillDelete,
  onBillUpdated,
  onAddBill,
  periodStartDate,
  periodEndDate,
}: BillsGridProps) {
  const [selectedBillPayment, setSelectedBillPayment] =
    useState<BillPayment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const groupedBills = useMemo(
    () => buildGridItems(allBills, billPayments, periodStartDate, periodEndDate),
    [allBills, billPayments, periodStartDate, periodEndDate],
  );

  const activeBills = allBills.filter((b) => b.is_active);
  const totalBills = activeBills.length;

  const handleBillClick = (item: BillGridItem) => {
    if (item.payment) {
      // Has a payment record → open the edit dialog with full BillPayment
      setSelectedBillPayment({
        ...item.payment,
        bill: item.bill,
      });
      setIsEditDialogOpen(true);
    } else if (item.isInCurrentPeriod) {
      // No payment record but in current period → create a temporary BillPayment for editing
      setSelectedBillPayment({
        id: "", // temporary ID
        bill_id: item.bill.id,
        paycheck_id: "",
        planned_amount: item.bill.amount,
        actual_amount: undefined,
        is_paid: false,
        due_date: "",
        paid_at: undefined,
        created_at: "",
        updated_at: "",
        bill: item.bill,
      });
      setIsEditDialogOpen(true);
    }
  };

  if (totalBills === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl font-black text-[#faf5eb] mb-2">
            Bills by Due Date
          </h1>
          <p className="text-[#faf5eb]/60 text-lg font-light">
            No bills set up yet
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
          {/* Add Bill Card */}
          {onAddBill && (
            <div className="flex flex-col gap-2 relative">
              <div className="border-t-2 border-transparent" />
              <div className="flex-shrink-0 text-center px-2 py-1 bg-transparent border border-transparent rounded">
                <div className="text-lg font-black text-transparent">+</div>
                <div className="text-xs font-light text-transparent">ADD</div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onAddBill}
                  className="relative border-2 border-dashed border-[#2a2520] bg-[#1a1714]/50 rounded px-3 py-2 transition-all duration-200 ease-in-out hover:scale-105 hover:border-[#06B6D4]/50 hover:bg-[#06B6D4]/5 cursor-pointer min-w-[100px] flex flex-col items-center justify-center min-h-[60px] group"
                >
                  <div className="text-xl font-bold text-[#faf5eb]/30 group-hover:text-[#06B6D4] transition-colors">
                    +
                  </div>
                  <div className="text-xs font-light text-[#faf5eb]/30 group-hover:text-[#06B6D4]/70 transition-colors">
                    Add Bill
                  </div>
                </button>
              </div>
              <div className="text-center text-xs font-light text-transparent">$0</div>
            </div>
          )}
          {Array.from(groupedBills.entries()).map(([dueDay, items]) => {
            const groupTotal = items.reduce(
              (sum, item) =>
                sum +
                (item.payment?.actual_amount ||
                  item.payment?.planned_amount ||
                  item.bill.amount),
              0,
            );

            const isGroupInCurrentPeriod = items.some(
              (item) => item.isInCurrentPeriod,
            );

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
                  {items.map((item) => {
                    const isPaid = item.payment?.is_paid ?? false;
                    const billName = item.bill.name;
                    const amount =
                      item.payment?.actual_amount ||
                      item.payment?.planned_amount ||
                      item.bill.amount;

                    // Styling: current period → full opacity; outside → 30%
                    // Paid bills in current period → 50%
                    let opacityClass: string;
                    if (!item.isInCurrentPeriod) {
                      opacityClass = "opacity-30";
                    } else if (isPaid) {
                      opacityClass = "opacity-50";
                    } else {
                      opacityClass = "opacity-100";
                    }

                    return (
                      <div key={item.bill.id}>
                        <div
                          onClick={() => handleBillClick(item)}
                          className={`
                            relative border-2 border-[#2a2520] bg-[#1a1714]
                            rounded px-3 py-2
                            transition-all duration-200 ease-in-out
                            hover:scale-105 hover:brightness-125
                            cursor-pointer
                            ${opacityClass}
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
          })}
        </div>
        {/* Summary Stats */}
      </div>
      {/* Edit Bill Dialog */}
      <EditBillDialog
        bill={selectedBillPayment}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedBillPayment(null);
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
