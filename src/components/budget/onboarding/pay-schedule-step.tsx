'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayFrequency } from '@/types/budget';
import { OnboardingData } from '@/app/onboarding/page';

interface PayScheduleStepProps {
  initialData: OnboardingData;
  onComplete: (data: { frequency: PayFrequency; nextPayday: string; netAmount: number }) => void;
}

export function PayScheduleStep({ initialData, onComplete }: PayScheduleStepProps) {
  const [frequency, setFrequency] = useState<PayFrequency>(initialData.frequency || 'biweekly');
  const [nextPayday, setNextPayday] = useState(initialData.nextPayday || '');
  const [netAmount, setNetAmount] = useState(initialData.netAmount?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextPayday || !netAmount) return;

    onComplete({
      frequency,
      nextPayday,
      netAmount: parseFloat(netAmount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-[10px] p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="frequency" className="text-sm font-light text-foreground">
            Pay Frequency
          </Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as PayFrequency)}>
            <SelectTrigger id="frequency" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
              <SelectItem value="semimonthly">Semi-monthly (Twice a month)</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextPayday" className="text-sm font-light text-foreground">
            Next Payday
          </Label>
          <Input
            id="nextPayday"
            type="date"
            value={nextPayday}
            onChange={(e) => setNextPayday(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="netAmount" className="text-sm font-light text-foreground">
            Net Pay Amount
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="netAmount"
              type="number"
              step="0.01"
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
              required
              className="h-12 pl-8"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 font-bold" size="lg">
        Continue
      </Button>
    </form>
  );
}
