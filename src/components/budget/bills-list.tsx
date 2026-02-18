"use client";

import { useState } from "react";
import { BillPayment } from "@/types/budget";
import { formatShortDate } from "@/lib/budget-utils";
import { Check, Circle, Calendar, DollarSign, Trash2, Undo2, Plus } from "lucide-react";
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

interface BillsListProps {
  bills: BillPayment[];
  onBillPaid: (billPaymentId: string, actualAmount: number) => void;
  onBillUndo?: (billPaymentId: string) => void;
  onBillDelete?: (billPaymentId: string) => void;
  onAddBill?: () => void;
}

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

function getDueUrgency(
  dueDate: string,
): "overdue" | "urgent" | "soon" | "normal" {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return "overdue";
  if (days <= 2) return "urgent";
  if (days <= 5) return "soon";
  return "normal";
}

function getUrgencyStyles(
  urgency: "overdue" | "urgent" | "soon" | "normal",
  isPaid: boolean,
) {
  if (isPaid) {
    return {
      border: "border-success/30",
      badge: "bg-success/15 text-success",
      badgeText: "Paid",
      glow: "",
    };
  }
  switch (urgency) {
    case "overdue":
      return {
        border: "border-destructive/50",
        badge: "bg-destructive/15 text-destructive",
        badgeText: "Overdue",
        glow: "shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.2)]",
      };
    case "urgent":
      return {
        border: "border-warning/40",
        badge: "bg-warning/15 text-warning",
        badgeText: "Due Soon",
        glow: "",
      };
    case "soon":
      return {
        border: "border-border",
        badge: "bg-muted text-muted-foreground",
        badgeText: "Upcoming",
        glow: "",
      };
    case "normal":
      return {
        border: "border-border",
        badge: "",
        badgeText: "",
        glow: "",
      };
  }
}

export function BillsList({ bills, onBillPaid, onBillUndo, onBillDelete, onAddBill }: BillsListProps) {
  const [selectedBill, setSelectedBill] = useState<BillPayment | null>(null);
  const [actualAmount, setActualAmount] = useState("");
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  const handleBillClick = (bill: BillPayment) => {
    if (bill.is_paid) return;
    setSelectedBill(bill);
    setActualAmount(bill.planned_amount.toString());
  };

  const handleConfirmPaid = () => {
    if (!selectedBill) return;
    onBillPaid(selectedBill.id, parseFloat(actualAmount));
    setSelectedBill(null);
    setActualAmount("");
  };

  const handleUndoPaid = (billPaymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBillUndo) {
      onBillUndo(billPaymentId);
    }
  };

  const handleDeleteBill = (billPaymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBillToDelete(billPaymentId);
  };

  const confirmDelete = () => {
    if (billToDelete && onBillDelete) {
      onBillDelete(billToDelete);
      setBillToDelete(null);
    }
  };

  if (bills.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Bills This Period</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">0 bills</span>
            {onAddBill && (
              <Button
                onClick={onAddBill}
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Bill
              </Button>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-8 text-center">
          <p className="text-muted-foreground">No bills due this pay period</p>
        </div>
      </div>
    );
  }

  // Sort bills by due date (earliest first)
  const sortedBills = [...bills].sort((a, b) => {
    const dateA = new Date(a.due_date).getTime();
    const dateB = new Date(b.due_date).getTime();
    return dateA - dateB;
  });

  const paidCount = bills.filter((b) => b.is_paid).length;
  const unpaidCount = bills.length - paidCount;
  const totalAmount = bills.reduce(
    (sum, b) => sum + (b.actual_amount || b.planned_amount),
    0,
  );

  return (
    <>
      <div className="space-y-5">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Bills This Period</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {paidCount}/{bills.length} paid
              </span>
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                {unpaidCount} left
              </span>
            </div>
            <span className="text-sm font-bold text-currency text-foreground">
              ${totalAmount.toFixed(2)}
            </span>
            {onAddBill && (
              <Button
                onClick={onAddBill}
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Bill
              </Button>
            )}
          </div>
        </div>

        {/* Bills Grid — 5 columns on xl, responsive down */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedBills.map((billPayment) => {
            const urgency = getDueUrgency(billPayment.due_date);
            const styles = getUrgencyStyles(urgency, billPayment.is_paid);
            const amount =
              billPayment.actual_amount || billPayment.planned_amount;
            const daysUntil = getDaysUntilDue(billPayment.due_date);

            return (
              <div
                key={billPayment.id}
                className={`
                  group relative bg-card border ${styles.border} ${styles.glow}
                  rounded-[10px] p-5
                  transition-all duration-200 ease-out
                  ${
                    billPayment.is_paid
                      ? "opacity-60"
                      : "hover:border-primary/50 hover:bg-muted/30 cursor-pointer active:scale-[0.98]"
                  }
                `}
                onClick={() => !billPayment.is_paid && handleBillClick(billPayment)}
              >
                {/* Action buttons */}
                {billPayment.is_paid && onBillUndo && (
                  <div className="absolute top-3 left-3 z-10 flex gap-1">
                    <button
                      onClick={(e) => handleUndoPaid(billPayment.id, e)}
                      className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                      title="Undo payment"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {onBillDelete && (
                  <div className="absolute top-3 right-3 z-10 flex gap-1">
                    {!billPayment.is_paid && (
                      <button
                        onClick={(e) => handleDeleteBill(billPayment.id, e)}
                        className="p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete bill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Status badge */}
                {styles.badgeText && (
                  <div
                    className={`absolute ${billPayment.is_paid ? "top-3 right-3" : "top-12 right-3"} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles.badge}`}
                  >
                    {styles.badgeText}
                  </div>
                )}

                {/* Bill name */}
                <div className="mb-4 pr-12">
                  <h3
                    className={`font-bold text-base leading-tight truncate ${billPayment.is_paid ? "line-through decoration-success/50" : ""}`}
                  >
                    {billPayment.bill?.name}
                  </h3>
                </div>

                {/* Amount — hero number */}
                <div className="mb-4">
                  <div
                    className={`text-2xl font-bold text-currency ${billPayment.is_paid ? "text-success" : "text-foreground"}`}
                  >
                    ${amount.toFixed(2)}
                  </div>
                </div>

                {/* Due date & status row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatShortDate(billPayment.due_date)}</span>
                  </div>
                  <div
                    className={`${billPayment.is_paid ? "text-success" : "text-muted-foreground"}`}
                  >
                    {billPayment.is_paid ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Circle className="h-4 w-4 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>

                {/* Days until due indicator (unpaid only) */}
                {!billPayment.is_paid && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <span
                      className={`text-xs font-medium ${
                        urgency === "overdue"
                          ? "text-destructive"
                          : urgency === "urgent"
                            ? "text-warning"
                            : "text-muted-foreground"
                      }`}
                    >
                      {daysUntil < 0
                        ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} overdue`
                        : daysUntil === 0
                          ? "Due today"
                          : `${daysUntil} day${daysUntil !== 1 ? "s" : ""} left`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>
              {selectedBill?.bill?.name} — Due{" "}
              {selectedBill && formatShortDate(selectedBill.due_date)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="actualAmount">Actual Amount Paid</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="actualAmount"
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedBill(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmPaid} className="flex-1">
                Mark as Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Bill Confirmation Dialog */}
      <Dialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bill Payment?</DialogTitle>
            <DialogDescription>
              This will remove this bill from the current pay period. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setBillToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete} 
              variant="destructive"
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
