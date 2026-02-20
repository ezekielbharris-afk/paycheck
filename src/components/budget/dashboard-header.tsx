import { formatDate, formatShortDate } from '@/lib/budget-utils';
import { Calendar, Clock, CalendarRange, Pencil, Plus } from 'lucide-react';

interface DashboardHeaderProps {
  payDate: string;
  periodStartDate?: string;
  periodEndDate?: string;
  netAmount: number;
  daysUntilNext: number;
  onEdit?: () => void;
  onNewPayPeriod?: () => void;
  isHistorical?: boolean;
}

export function DashboardHeader({ payDate, periodStartDate, periodEndDate, netAmount, daysUntilNext, onEdit, onNewPayPeriod, isHistorical }: DashboardHeaderProps) {
  const start = periodStartDate || payDate;
  const end = periodEndDate;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-light">
            {isHistorical ? 'Historical Paycheck' : 'Current Paycheck'}
          </span>
          {isHistorical && (
            <span className="text-[9px] tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
              READ-ONLY
            </span>
          )}
        </div>
        {!isHistorical && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#faf5eb]/60 border border-[#2a2520] hover:bg-[#2a2520] hover:text-[#faf5eb] transition-colors"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}
            {onNewPayPeriod && (
              <button
                onClick={onNewPayPeriod}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
                New Period
              </button>
            )}
          </div>
        )}
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
        <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-[10px] ${isHistorical ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/10 border-primary/30'}`}>
          <CalendarRange className={`h-3.5 w-3.5 ${isHistorical ? 'text-amber-400' : 'text-primary'}`} />
          <span className={`text-sm font-bold ${isHistorical ? 'text-amber-400' : 'text-primary'}`}>
            Pay Period: {formatShortDate(start)}
            {end && (
              <> – {formatShortDate(end)}</>
            )}
          </span>
        </div>
        {/* Countdown to Next Payday - only show for current */}
        {!isHistorical && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-[10px]">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Next payday in</span>
            <span className="text-lg font-bold text-primary">{daysUntilNext}</span>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        )}
      </div>
    </div>
  );
}
