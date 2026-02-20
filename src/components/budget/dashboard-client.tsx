"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/auth";
import { BudgetNavbar } from "@/components/budget/budget-navbar";
import { DashboardHeader } from "@/components/budget/dashboard-header";
import { BillsGrid } from "@/components/budget/bills-grid";
import { DigitalEnvelopes } from "@/components/budget/digital-envelopes";
import { AddBillDialog } from "@/components/budget/add-bill-dialog";
import { EditPaycheckDialog } from "@/components/budget/edit-paycheck-dialog";
import { CreatePayPeriodDialog } from "@/components/budget/create-payperiod-dialog";
import { PaycheckHistorySelector } from "@/components/budget/paycheck-history-selector";
import { Paycheck, Bill, BillPayment, PaySchedule } from "@/types/budget";
import { calculateDaysUntil } from "@/lib/budget-utils";
import { toast } from "sonner";

export function DashboardClient() {
  const [currentPaycheck, setCurrentPaycheck] = useState<Paycheck | null>(null);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);
  const [allPaychecks, setAllPaychecks] = useState<Paycheck[]>([]);
  const [paySchedule, setPaySchedule] = useState<PaySchedule | null>(null);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isEditPaycheckOpen, setIsEditPaycheckOpen] = useState(false);
  const [isCreatePayPeriodOpen, setIsCreatePayPeriodOpen] = useState(false);
  const [isSavingPaycheck, setIsSavingPaycheck] = useState(false);
  const [isCreatingPayPeriod, setIsCreatingPayPeriod] = useState(false);

  // The paycheck to display (either current or historical)
  const displayPaycheck = selectedPaycheck || currentPaycheck;
  const isHistorical = displayPaycheck && currentPaycheck
    ? displayPaycheck.id !== currentPaycheck.id
    : false;

  useEffect(() => {
    let mounted = true;

    loadDashboardData(() => mounted);

    return () => {
      mounted = false;
    };
  }, []);

  const loadDashboardData = async (isMounted: () => boolean = () => true) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: schedule } = await supabase
        .from("pay_schedules")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!isMounted()) return;
      setPaySchedule(schedule);

      // Fetch ALL paychecks for this user (for history selector)
      const { data: paychecks } = await supabase
        .from("paychecks")
        .select("*")
        .eq("user_id", user.id)
        .order("pay_date", { ascending: false });

      if (!isMounted()) return;
      setAllPaychecks(paychecks || []);

      // Find the current paycheck
      const current = (paychecks || []).find((p) => p.is_current);

      if (current) {
        if (!isMounted()) return;
        setCurrentPaycheck(current);

        // If we don't have a selected paycheck yet, use current
        // If we do have one selected, update it from fresh data
        if (!selectedPaycheck) {
          setSelectedPaycheck(current);
        } else {
          const refreshed = (paychecks || []).find((p) => p.id === selectedPaycheck.id);
          setSelectedPaycheck(refreshed || current);
        }

        // Fetch ALL active bills for this user (master list, independent of paycheck)
        const { data: userBills, error: userBillsError } = await supabase
          .from("bills")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("due_day", { ascending: true });

        if (userBillsError) {
          console.error("Error fetching user bills:", userBillsError);
        }

        if (!isMounted()) return;
        setAllBills(userBills || []);

        // Load bill payments for the display paycheck (status/amounts only)
        const targetId = selectedPaycheck?.id || current.id;
        const { data: billPayments, error: billsError } = await supabase
          .from("bill_payments")
          .select(
            `
            *,
            bill:bills(*)
          `,
          )
          .eq("paycheck_id", targetId)
          .order("due_date", { ascending: true });

        if (billsError) {
          console.error("Error fetching bill payments:", billsError);
        }

        if (!isMounted()) return;
        setBills(billPayments || []);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  };

  const loadBillsForPaycheck = async (paycheckId: string) => {
    try {
      const supabase = createClient();
      const { data: billPayments } = await supabase
        .from("bill_payments")
        .select(
          `
          *,
          bill:bills(*)
        `,
        )
        .eq("paycheck_id", paycheckId)
        .order("due_date", { ascending: true });

      setBills(billPayments || []);
    } catch (error) {
      console.error("Error loading bills:", error);
    }
  };

  const handleSelectPaycheck = (paycheckId: string) => {
    const selected = allPaychecks.find((p) => p.id === paycheckId);
    if (selected) {
      setSelectedPaycheck(selected);
      loadBillsForPaycheck(paycheckId);
    }
  };

  const handleSavePaycheck = async (data: {
    pay_date: string;
    period_start_date: string;
    period_end_date: string;
    net_amount: number;
  }) => {
    if (!currentPaycheck) return;
    setIsSavingPaycheck(true);

    try {
      const supabase = createClient();

      // Recalculate spendable based on new net_amount but existing reserved amounts
      const newSpendable =
        data.net_amount -
        currentPaycheck.reserved_bills -
        (currentPaycheck.reserved_savings +
          (currentPaycheck.net_amount -
            currentPaycheck.reserved_bills -
            currentPaycheck.reserved_savings -
            currentPaycheck.spendable));

      // Simpler: adjust spendable by the net_amount difference
      const amountDiff = data.net_amount - currentPaycheck.net_amount;
      const updatedSpendable = currentPaycheck.spendable + amountDiff;

      const { error } = await supabase
        .from("paychecks")
        .update({
          pay_date: data.pay_date,
          period_start_date: data.period_start_date,
          period_end_date: data.period_end_date,
          net_amount: data.net_amount,
          spendable: updatedSpendable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentPaycheck.id);

      if (error) throw error;

      // Also update the pay_schedule net_amount to keep them in sync
      if (paySchedule) {
        await supabase
          .from("pay_schedules")
          .update({
            net_amount: data.net_amount,
            next_payday: data.pay_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", paySchedule.id);
      }

      toast.success("Pay period updated", {
        description: "Your paycheck details have been saved.",
      });

      setIsEditPaycheckOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error("Error saving paycheck:", error);
      toast.error("Failed to update pay period", {
        description: "Please try again.",
      });
    } finally {
      setIsSavingPaycheck(false);
    }
  };

  const handleCreatePayPeriod = async (data: {
    pay_date: string;
    period_start_date: string;
    period_end_date: string;
    net_amount: number;
  }) => {
    setIsCreatingPayPeriod(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke(
        "supabase-functions-create-new-payperiod",
        {
          body: {
            userId: user.id,
            pay_date: data.pay_date,
            period_start_date: data.period_start_date,
            period_end_date: data.period_end_date,
            net_amount: data.net_amount,
          },
        },
      );

      if (response.error) throw response.error;

      toast.success("New pay period created", {
        description:
          "Your previous period has been saved to history. Envelopes and bills have been initialized.",
      });

      // Reset selection so the new current paycheck gets picked up
      setSelectedPaycheck(null);
      setIsCreatePayPeriodOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error("Error creating pay period:", error);
      toast.error("Failed to create pay period", {
        description: "Please try again.",
      });
    } finally {
      setIsCreatingPayPeriod(false);
    }
  };

  const handleBillPaid = async (
    billPaymentId: string,
    actualAmount: number,
    billId?: string,
    plannedAmount?: number,
  ) => {
    try {
      const supabase = createClient();

      // If no billPaymentId, create a new bill_payment record first
      if (!billPaymentId) {
        if (!billId || !displayPaycheck) {
          toast.error("Unable to mark bill as paid", {
            description: "Missing required information to create payment record.",
          });
          return;
        }

        // Get the bill to find the due_date
        const { data: billData, error: billError } = await supabase
          .from("bills")
          .select("due_day")
          .eq("id", billId)
          .single();

        if (billError || !billData) throw billError || new Error("Bill not found");

        // Calculate the due date within the current period
        const periodStart = new Date(displayPaycheck.period_start_date || displayPaycheck.pay_date);
        const periodEnd = new Date(displayPaycheck.period_end_date || displayPaycheck.pay_date);
        
        // Find the first occurrence of the due_day within the period
        let dueDate: Date | null = null;
        const currentYear = periodStart.getFullYear();
        const currentMonth = periodStart.getMonth();
        
        // Try current month first
        const candidate1 = new Date(currentYear, currentMonth, billData.due_day);
        if (candidate1 >= periodStart && candidate1 <= periodEnd) {
          dueDate = candidate1;
        } else {
          // Try next month
          const candidate2 = new Date(currentYear, currentMonth + 1, billData.due_day);
          if (candidate2 >= periodStart && candidate2 <= periodEnd) {
            dueDate = candidate2;
          }
        }

        if (!dueDate) {
          // Default to the due_day in the period_start month if no valid date found
          dueDate = new Date(currentYear, currentMonth, billData.due_day);
        }

        // Create the bill_payment record
        const { data: newPayment, error: insertError } = await supabase
          .from("bill_payments")
          .insert({
            paycheck_id: displayPaycheck.id,
            bill_id: billId,
            planned_amount: plannedAmount || actualAmount,
            due_date: dueDate.toISOString().split('T')[0],
            is_paid: true,
            paid_at: new Date().toISOString(),
            actual_amount: actualAmount,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update the paycheck's reserved_bills and spendable amounts
        const newReservedBills = displayPaycheck.reserved_bills + (plannedAmount || actualAmount);
        const newSpendable = displayPaycheck.spendable - (plannedAmount || actualAmount);

        await supabase
          .from("paychecks")
          .update({
            reserved_bills: newReservedBills,
            spendable: newSpendable,
            updated_at: new Date().toISOString(),
          })
          .eq("id", displayPaycheck.id);

        toast.success("Bill marked as paid");
        await loadDashboardData();
        return;
      }

      // Existing payment record - just update it
      const { error } = await supabase
        .from("bill_payments")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          actual_amount: actualAmount,
        })
        .eq("id", billPaymentId);

      if (error) throw error;

      toast.success("Bill marked as paid");
      await loadDashboardData();
    } catch (error) {
      console.error("Error marking bill paid:", error);
      toast.error("Failed to mark bill as paid", {
        description: "Please try again.",
      });
    }
  };

  const handleBillUndo = async (billPaymentId: string) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("bill_payments")
        .update({
          is_paid: false,
          paid_at: null,
          actual_amount: null,
        })
        .eq("id", billPaymentId);

      if (error) throw error;

      await loadDashboardData();
    } catch (error) {
      console.error("Error undoing bill payment:", error);
      toast.error("Failed to undo payment", {
        description: "Please try again.",
      });
    }
  };

  const handleBillDelete = async (billPaymentId: string) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("bill_payments")
        .delete()
        .eq("id", billPaymentId);

      if (error) throw error;

      await loadDashboardData();
    } catch (error) {
      console.error("Error deleting bill payment:", error);
      toast.error("Failed to delete bill", {
        description: "Please try again.",
      });
    }
  };

  const handleBillAdded = () => {
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!displayPaycheck || !paySchedule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">No active paycheck found</div>
      </div>
    );
  }

  const daysUntilNext = calculateDaysUntil(paySchedule.next_payday);

  return (
    <>
      <BudgetNavbar />
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* History Selector + Edit controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PaycheckHistorySelector
              paychecks={allPaychecks}
              currentPaycheckId={currentPaycheck?.id || ""}
              selectedPaycheckId={displayPaycheck.id}
              onSelect={handleSelectPaycheck}
            />

          </div>

          {/* Historical view banner */}
          {isHistorical && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-[10px] px-4 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm text-amber-400 font-medium">
                You are viewing a historical pay period. Data is read-only.
              </p>
            </div>
          )}

          <DashboardHeader
            payDate={displayPaycheck.pay_date}
            periodStartDate={displayPaycheck.period_start_date}
            periodEndDate={displayPaycheck.period_end_date}
            netAmount={displayPaycheck.net_amount}
            daysUntilNext={daysUntilNext}
            onEdit={() => setIsEditPaycheckOpen(true)}
            onNewPayPeriod={() => setIsCreatePayPeriodOpen(true)}
            isHistorical={isHistorical}
          />

          <DigitalEnvelopes
            paycheckIdOverride={displayPaycheck.id}
            readOnly={isHistorical}
          />
          <BillsGrid
            allBills={allBills}
            billPayments={bills}
            onBillPaid={isHistorical ? (_id: string, _amt: number) => {} : handleBillPaid}
            onBillUndo={isHistorical ? undefined : handleBillUndo}
            onBillDelete={isHistorical ? undefined : handleBillDelete}
            onBillUpdated={isHistorical ? undefined : loadDashboardData}
            onAddBill={isHistorical ? undefined : () => setIsAddBillOpen(true)}
            periodStartDate={displayPaycheck.period_start_date}
            periodEndDate={displayPaycheck.period_end_date}
          />
        </div>
      </div>
      {!isHistorical && (
        <AddBillDialog
          open={isAddBillOpen}
          onOpenChange={setIsAddBillOpen}
          onBillAdded={handleBillAdded}
        />
      )}
      {/* Edit Paycheck Dialog */}
      {isEditPaycheckOpen && currentPaycheck && (
        <EditPaycheckDialog
          paycheck={currentPaycheck}
          onClose={() => setIsEditPaycheckOpen(false)}
          onSave={handleSavePaycheck}
          isSaving={isSavingPaycheck}
        />
      )}
      {/* Create New Pay Period Dialog */}
      {isCreatePayPeriodOpen && (
        <CreatePayPeriodDialog
          currentPaycheck={currentPaycheck}
          onClose={() => setIsCreatePayPeriodOpen(false)}
          onSave={handleCreatePayPeriod}
          isSaving={isCreatingPayPeriod}
        />
      )}
    </>
  );
}
