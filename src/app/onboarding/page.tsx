'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayScheduleStep } from '@/components/budget/onboarding/pay-schedule-step';
import { CategoriesStep } from '@/components/budget/onboarding/categories-step';
import { BillsStep } from '@/components/budget/onboarding/bills-step';
import { PayFrequency } from '@/types/budget';
import { createClient } from '@/utils/auth';

export type OnboardingData = {
  frequency?: PayFrequency;
  nextPayday?: string;
  netAmount?: number;
  categories?: Array<{ name: string; type: 'fixed' | 'flexible' | 'savings'; amount: number }>;
  bills?: Array<{ name: string; amount: number; dueDay: number; frequency: string }>;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePayScheduleComplete = (scheduleData: {
    frequency: PayFrequency;
    nextPayday: string;
    netAmount: number;
  }) => {
    setData((prev) => ({ ...prev, ...scheduleData }));
    setStep(2);
  };

  const handleCategoriesComplete = (categories: Array<{ name: string; type: 'fixed' | 'flexible' | 'savings'; amount: number }>) => {
    setData((prev) => ({ ...prev, categories }));
    setStep(3);
  };

  const handleBillsComplete = async (bills: Array<{ name: string; amount: number; dueDay: number; frequency: string }>) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error: scheduleError } = await supabase
        .from('pay_schedules')
        .insert({
          user_id: user.id,
          frequency: data.frequency,
          next_payday: data.nextPayday,
          net_amount: data.netAmount,
        });

      if (scheduleError) throw scheduleError;

      if (data.categories && data.categories.length > 0) {
        const categoriesData = data.categories.map((cat) => ({
          user_id: user.id,
          name: cat.name,
          type: cat.type,
          amount_per_paycheck: cat.amount,
          priority: 1,
        }));

        const { error: categoriesError } = await supabase
          .from('categories')
          .insert(categoriesData);

        if (categoriesError) throw categoriesError;
      }

      if (bills.length > 0) {
        const billsData = bills.map((bill) => ({
          user_id: user.id,
          name: bill.name,
          amount: bill.amount,
          due_day: bill.dueDay,
          frequency: bill.frequency,
          is_active: true,
        }));

        const { error: billsError } = await supabase
          .from('bills')
          .insert(billsData);

        if (billsError) throw billsError;
      }

      const { data: paycheckData, error: paycheckError } = await supabase
        .from('paychecks')
        .insert({
          user_id: user.id,
          pay_date: data.nextPayday,
          net_amount: data.netAmount,
          is_current: true,
        })
        .select()
        .single();

      if (paycheckError) throw paycheckError;

      await supabase.functions.invoke('supabase-functions-initialize-paycheck', {
        body: {
          userId: user.id,
          paycheckId: paycheckData.id,
        },
      });

      router.push('/budget');
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {step === 1 && 'Pay Schedule'}
            {step === 2 && 'Budget Categories'}
            {step === 3 && 'Recurring Bills'}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 && 'Tell us about your pay schedule'}
            {step === 2 && 'Set up your spending categories'}
            {step === 3 && 'Add your recurring bills'}
          </p>
        </div>

        {step === 1 && (
          <PayScheduleStep
            initialData={data}
            onComplete={handlePayScheduleComplete}
          />
        )}
        {step === 2 && (
          <CategoriesStep
            initialData={data.categories || []}
            onComplete={handleCategoriesComplete}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <BillsStep
            initialData={[]}
            onComplete={handleBillsComplete}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
