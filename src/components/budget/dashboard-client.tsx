'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/auth';
import { BudgetNavbar } from '@/components/budget/budget-navbar';
import { DashboardHeader } from '@/components/budget/dashboard-header';
import { SummaryCard } from '@/components/budget/summary-card';
import { BillsList } from '@/components/budget/bills-list';
import { CategoriesGrid } from '@/components/budget/categories-grid';
import { Paycheck, BillPayment, CategorySpending, PaySchedule } from '@/types/budget';
import { calculateDaysUntil } from '@/lib/budget-utils';

export function DashboardClient() {
  const [paycheck, setPaycheck] = useState<Paycheck | null>(null);
  const [paySchedule, setPaySchedule] = useState<PaySchedule | null>(null);
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: schedule } = await supabase
        .from('pay_schedules')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setPaySchedule(schedule);

      const { data: currentPaycheck } = await supabase
        .from('paychecks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      if (currentPaycheck) {
        setPaycheck(currentPaycheck);

        const { data: billPayments } = await supabase
          .from('bill_payments')
          .select(`
            *,
            bill:bills(*)
          `)
          .eq('paycheck_id', currentPaycheck.id)
          .order('due_date', { ascending: true });

        setBills(billPayments || []);

        const { data: categorySpending } = await supabase
          .from('category_spending')
          .select(`
            *,
            category:categories(*)
          `)
          .eq('paycheck_id', currentPaycheck.id)
          .order('category.priority', { ascending: true });

        setCategories(categorySpending || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillPaid = async (billPaymentId: string, actualAmount: number) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('bill_payments')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          actual_amount: actualAmount,
        })
        .eq('id', billPaymentId);

      if (error) throw error;

      await loadDashboardData();
    } catch (error) {
      console.error('Error marking bill paid:', error);
    }
  };

  const handleSpendingLogged = async (categoryId: string, amount: number) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !paycheck) return;

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          paycheck_id: paycheck.id,
          category_id: categoryId,
          amount,
          transaction_date: new Date().toISOString().split('T')[0],
        });

      if (transactionError) throw transactionError;

      const categorySpend = categories.find(c => c.category_id === categoryId);
      if (categorySpend) {
        const { error: updateError } = await supabase
          .from('category_spending')
          .update({
            spent: categorySpend.spent + amount,
          })
          .eq('id', categorySpend.id);

        if (updateError) throw updateError;
      }

      await loadDashboardData();
    } catch (error) {
      console.error('Error logging spending:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!paycheck || !paySchedule) {
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
          <DashboardHeader
            payDate={paycheck.pay_date}
            netAmount={paycheck.net_amount}
            daysUntilNext={daysUntilNext}
          />

          <SummaryCard
            netPay={paycheck.net_amount}
            reservedBills={paycheck.reserved_bills}
            reservedSavings={paycheck.reserved_savings}
            spendable={paycheck.spendable}
          />

          <BillsList bills={bills} onBillPaid={handleBillPaid} />

          <CategoriesGrid categories={categories} onSpendingLogged={handleSpendingLogged} />
        </div>
      </div>
    </>
  );
}
