import { redirect } from 'next/navigation';
import { createClient } from "@/../supabase/server";
import { DashboardClient } from '@/components/budget/dashboard-client';

export default async function BudgetPage() {
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

  if (!paySchedule) {
    redirect('/onboarding');
  }

  return <DashboardClient />;
}
