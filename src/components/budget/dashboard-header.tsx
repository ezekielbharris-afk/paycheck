import { formatDate } from '@/lib/budget-utils';
import { Calendar } from 'lucide-react';

interface DashboardHeaderProps {
  payDate: string;
  netAmount: number;
  daysUntilNext: number;
}

export function DashboardHeader({ payDate, netAmount, daysUntilNext }: DashboardHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-light">Current Paycheck</span>
      </div>
      <div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-currency">
          ${netAmount.toFixed(2)}
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          {formatDate(payDate)}
        </p>
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-[10px]">
        <span className="text-sm text-muted-foreground">Next payday in</span>
        <span className="text-lg font-bold text-primary">{daysUntilNext}</span>
        <span className="text-sm text-muted-foreground">days</span>
      </div>
    </div>
  );
}
