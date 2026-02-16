import { redirect } from 'next/navigation';
import { createClient } from '@/utils/auth';
import { BudgetNavbar } from '@/components/budget/budget-navbar';

export default async function BudgetHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <>
      <BudgetNavbar />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Paycheck History</h1>
          <div className="bg-card border border-border rounded-[10px] p-8 text-center">
            <p className="text-muted-foreground">History view coming soon</p>
          </div>
        </div>
      </div>
    </>
  );
}
