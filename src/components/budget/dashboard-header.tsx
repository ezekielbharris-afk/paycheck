import { formatDate, formatShortDate } from '@/lib/budget-utils';
import { Calendar, Clock, CalendarRange } from 'lucide-react';

interface DashboardHeaderProps {
  payDate: string;
  periodStartDate?: string;
  periodEndDate?: string;
  netAmount: number;
  daysUntilNext: number;
}

export function DashboardHeader({ payDate, periodStartDate, periodEndDate, netAmount, daysUntilNext }: DashboardHeaderProps) {
  const start = periodStartDate || payDate;
  const end = periodEndDate;

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
      <div className="flex flex-wrap items-center gap-3">
        {/* Active Pay Period Range */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-[10px]">
          <CalendarRange className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">
            Pay Period: {formatShortDate(start)}
            {end && (
              <> – {formatShortDate(end)}</>
            )}
          </span>
        </div>
        {/* Countdown to Next Payday */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-[10px]">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Next payday in</span>
          <span className="text-lg font-bold text-primary">{daysUntilNext}</span>
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </div>
    </div>
  );
}
