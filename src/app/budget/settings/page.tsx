import { redirect } from 'next/navigation';
import { createClient } from "@/../supabase/server";
import { BudgetNavbar } from '@/components/budget/budget-navbar';
import { InitializePaycheckButton } from '@/components/budget/initialize-paycheck-button';

export default async function BudgetSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: paySchedule } = await supabase
    .from('pay_schedules')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <>
      <BudgetNavbar />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          
          <div className="bg-card border border-border rounded-[10px] p-6 space-y-4">
            <h2 className="text-xl font-bold">Pay Schedule</h2>
            {paySchedule && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-medium capitalize">{paySchedule.frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Payday</span>
                  <span className="font-medium">{paySchedule.next_payday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Amount</span>
                  <span className="font-medium text-currency">${paySchedule.net_amount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-[10px] p-8 text-center">
            <p className="text-muted-foreground">Category and bill management coming soon</p>
          </div>

          <div className="bg-card border border-border rounded-[10px] p-6 space-y-4">
            <h2 className="text-xl font-bold">Advanced</h2>
            <p className="text-sm text-muted-foreground">Initialize categories for your current paycheck</p>
            <InitializePaycheckButton />
          </div>
        </div>
      </div>
    </>
  );
}
