"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillPayment, BillFrequency } from "@/types/budget";
import { formatCurrency } from "@/lib/budget-utils";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EditBillDialogProps {
  bill: BillPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillUpdated: () => void;
  onBillPaid: (billPaymentId: string, actualAmount: number, billId?: string, plannedAmount?: number) => void;
  onBillUndo?: (billPaymentId: string) => void;
}

export function EditBillDialog({
  bill,
  open,
  onOpenChange,
  onBillUpdated,
  onBillPaid,
  onBillUndo,
}: EditBillDialogProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [frequency, setFrequency] = useState<BillFrequency>("monthly");
  const [actualAmount, setActualAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Populate form when bill changes
  useEffect(() => {
    if (bill?.bill) {
      setName(bill.bill.name);
      setAmount(bill.bill.amount.toString());
      setDueDay(bill.bill.due_day.toString());
      setFrequency(bill.bill.frequency);
      setActualAmount(bill.planned_amount.toString());
      setMode("view");
      setError("");
    }
  }, [bill]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !amount || !dueDay) {
      setError("Please fill in all fields");
      return;
    }

    const amountNum = parseFloat(amount);
    const dueDayNum = parseInt(dueDay);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError("Due day must be between 1 and 31");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bill?.bill?.id,
          name: name.trim(),
          amount: amountNum,
          due_day: dueDayNum,
          frequency,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update bill");
      }

      toast.success("Bill updated successfully");
      onBillUpdated();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update bill";
      setError(message);
      toast.error("Failed to update bill", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!bill?.bill?.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bills?id=${bill.bill.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete bill");
      }

      toast.success("Bill deleted permanently");
      setShowDeleteConfirm(false);
      onBillUpdated();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete bill";
      setError(message);
      toast.error("Failed to delete bill", { description: message });
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkPaid = () => {
    if (!bill) return;

    // Pass bill_id and planned_amount for cases where bill_payment doesn't exist yet
    onBillPaid(
      bill.id, 
      parseFloat(actualAmount),
      bill.bill_id,
      bill.planned_amount
    );
    onOpenChange(false);
  };

  const handleUndo = () => {
    if (!bill || !onBillUndo) return;

    if (!bill.id) {
      toast.error("Unable to undo payment", {
        description: "This bill hasn't been paid yet.",
      });
      return;
    }

    onBillUndo(bill.id);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting && !isDeleting) {
      setMode("view");
      setError("");
      onOpenChange(false);
    }
  };

  if (!bill) return null;

  const isPaid = bill.is_paid;
  const billName = bill.bill?.name || "Unknown Bill";

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[440px] bg-[#1a1714] border-[#2a2520] text-[#faf5eb]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#faf5eb]">
              {mode === "edit" ? "Edit Bill" : billName}
            </DialogTitle>
            <DialogDescription className="text-[#faf5eb]/60">
              {mode === "edit"
                ? "Update bill details"
                : `Due on ${new Date(bill.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </DialogDescription>
          </DialogHeader>

          {mode === "view" ? (
            <div className="space-y-5 pt-4">
              {/* Bill details view */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f0d0a] border border-[#2a2520] rounded-lg p-4">
                  <div className="text-xs font-light text-[#faf5eb]/40 mb-1">
                    Amount
                  </div>
                  <div className="text-xl font-bold text-[#06B6D4]">
                    {formatCurrency(bill.actual_amount || bill.planned_amount)}
                  </div>
                </div>
                <div className="bg-[#0f0d0a] border border-[#2a2520] rounded-lg p-4">
                  <div className="text-xs font-light text-[#faf5eb]/40 mb-1">
                    Status
                  </div>
                  <div
                    className={`text-xl font-bold ${isPaid ? "text-[#10b981]" : "text-[#ef4444]"}`}
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </div>
                </div>
                <div className="bg-[#0f0d0a] border border-[#2a2520] rounded-lg p-4">
                  <div className="text-xs font-light text-[#faf5eb]/40 mb-1">
                    Due Day
                  </div>
                  <div className="text-xl font-bold text-[#faf5eb]">
                    {bill.bill?.due_day || "—"}
                  </div>
                </div>
                <div className="bg-[#0f0d0a] border border-[#2a2520] rounded-lg p-4">
                  <div className="text-xs font-light text-[#faf5eb]/40 mb-1">
                    Frequency
                  </div>
                  <div className="text-xl font-bold text-[#faf5eb] capitalize">
                    {bill.bill?.frequency || "—"}
                  </div>
                </div>
              </div>

              {/* Pay/Undo section */}
              {!isPaid && (
                <div className="space-y-2">
                  <Label
                    htmlFor="actualAmountView"
                    className="text-sm font-light text-[#faf5eb]/60"
                  >
                    Actual Amount Paid
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#faf5eb]/40">
                      $
                    </span>
                    <Input
                      id="actualAmountView"
                      type="number"
                      step="0.01"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="pl-7 bg-[#0f0d0a] border-[#2a2520] text-[#faf5eb]"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-[#ef4444] bg-[#ef4444]/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {isPaid ? (
                  <Button
                    onClick={handleUndo}
                    variant="outline"
                    className="w-full border-[#2a2520] text-[#faf5eb] hover:bg-[#2a2520]"
                  >
                    Undo Payment
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkPaid}
                    className="w-full bg-[#10b981] hover:bg-[#10b981]/80 text-[#0f0d0a] font-bold"
                  >
                    Mark as Paid
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setMode("edit")}
                    variant="outline"
                    className="flex-1 border-[#2a2520] text-[#faf5eb] hover:bg-[#2a2520]"
                  >
                    Edit Bill
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Edit mode form */
            <form onSubmit={handleSave} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-bill-name"
                  className="text-sm font-light text-[#faf5eb]/60"
                >
                  Bill Name
                </Label>
                <Input
                  id="edit-bill-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Rent, Electric, Internet"
                  className="bg-[#0f0d0a] border-[#2a2520] text-[#faf5eb]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-bill-amount"
                  className="text-sm font-light text-[#faf5eb]/60"
                >
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#faf5eb]/40">
                    $
                  </span>
                  <Input
                    id="edit-bill-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7 bg-[#0f0d0a] border-[#2a2520] text-[#faf5eb]"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-bill-due-day"
                  className="text-sm font-light text-[#faf5eb]/60"
                >
                  Due Day of Month
                </Label>
                <Input
                  id="edit-bill-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="1-31"
                  className="bg-[#0f0d0a] border-[#2a2520] text-[#faf5eb]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-bill-frequency"
                  className="text-sm font-light text-[#faf5eb]/60"
                >
                  Frequency
                </Label>
                <Select
                  value={frequency}
                  onValueChange={(value) =>
                    setFrequency(value as BillFrequency)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="edit-bill-frequency"
                    className="bg-[#0f0d0a] border-[#2a2520] text-[#faf5eb]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1714] border-[#2a2520]">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-sm text-[#ef4444] bg-[#ef4444]/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode("view");
                    setError("");
                    // Reset to original values
                    if (bill?.bill) {
                      setName(bill.bill.name);
                      setAmount(bill.bill.amount.toString());
                      setDueDay(bill.bill.due_day.toString());
                      setFrequency(bill.bill.frequency);
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 border-[#2a2520] text-[#faf5eb] hover:bg-[#2a2520]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#06B6D4] hover:bg-[#06B6D4]/80 text-[#0f0d0a] font-bold"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#1a1714] border-[#2a2520]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#faf5eb]">
              Delete Bill
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#faf5eb]/60">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-[#faf5eb]">{billName}</span>? This
              will remove the bill and all its payment records. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-[#2a2520] text-[#faf5eb] hover:bg-[#2a2520]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-[#ef4444] hover:bg-[#ef4444]/80 text-white font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
