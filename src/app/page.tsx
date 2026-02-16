import { redirect } from 'next/navigation';
import { createClient } from "../../supabase/server";
import LandingPage from './landing/page';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: paySchedule } = await supabase
      .from('pay_schedules')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (paySchedule) {
      redirect('/budget');
    } else {
      redirect('/onboarding');
    }
  }

  return <LandingPage />;
}
