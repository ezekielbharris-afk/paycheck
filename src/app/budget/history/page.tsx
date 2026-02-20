import { redirect } from 'next/navigation';
import { createClient } from "@/../supabase/server";
import { BudgetNavbar } from '@/components/budget/budget-navbar';

export default async function BudgetHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // History is now integrated into the main budget dashboard
  redirect('/budget');
}
