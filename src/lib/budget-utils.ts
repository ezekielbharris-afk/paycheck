import { PayFrequency, BillFrequency } from '@/types/budget';
import { addDays, addWeeks, addMonths, subWeeks, subMonths, subDays, differenceInDays, format, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateNextPayday(currentDate: Date, frequency: PayFrequency): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'semimonthly':
      return addDays(currentDate, 15);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return addWeeks(currentDate, 2);
  }
}

/**
 * Given the user's next payday and pay frequency, compute the current
 * pay period as { periodStart, periodEnd }.
 *
 * periodEnd  = nextPayday (exclusive — the next payday itself starts a new period)
 * periodStart = nextPayday minus one pay-cycle length
 *
 * Example: biweekly, next payday = Feb 19
 *   → periodStart = Feb 5, periodEnd = Feb 19
 */
export function calculatePayPeriod(
  nextPayday: string | Date,
  frequency: PayFrequency
): { periodStart: Date; periodEnd: Date } {
  const end = typeof nextPayday === 'string' ? parseISO(nextPayday) : nextPayday;

  let start: Date;
  switch (frequency) {
    case 'weekly':
      start = subWeeks(end, 1);
      break;
    case 'biweekly':
      start = subWeeks(end, 2);
      break;
    case 'semimonthly':
      start = subDays(end, 15);
      break;
    case 'monthly':
      start = subMonths(end, 1);
      break;
    default:
      start = subWeeks(end, 2);
  }

  return { periodStart: start, periodEnd: end };
}

export function calculateDaysUntil(targetDate: string | Date): number {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
  return differenceInDays(target, new Date());
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
}

export function shouldBillBeInPaycheck(
  billDueDate: Date,
  paycheckDate: Date,
  nextPaycheckDate: Date
): boolean {
  return billDueDate >= paycheckDate && billDueDate < nextPaycheckDate;
}

export function getNextBillDueDate(dueDay: number, frequency: BillFrequency, fromDate: Date = new Date()): Date {
  const now = fromDate;
  let nextDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
  
  if (nextDate <= now) {
    switch (frequency) {
      case 'weekly':
        nextDate = addWeeks(nextDate, 1);
        break;
      case 'biweekly':
        nextDate = addWeeks(nextDate, 2);
        break;
      case 'monthly':
        nextDate = addMonths(nextDate, 1);
        break;
      case 'quarterly':
        nextDate = addMonths(nextDate, 3);
        break;
      case 'annual':
        nextDate = addMonths(nextDate, 12);
        break;
    }
  }
  
  return nextDate;
}

export function getBudgetHealthColor(spent: number, planned: number): string {
  if (spent === 0) return 'text-muted-foreground';
  const percentage = (spent / planned) * 100;
  
  if (percentage >= 100) return 'text-destructive';
  if (percentage >= 80) return 'text-warning';
  return 'text-success';
}

export function getBudgetHealthBg(spent: number, planned: number): string {
  if (spent === 0) return 'bg-muted';
  const percentage = (spent / planned) * 100;
  
  if (percentage >= 100) return 'bg-destructive';
  if (percentage >= 80) return 'bg-warning';
  return 'bg-success';
}

export function getProgressPercentage(spent: number, planned: number): number {
  if (planned === 0) return 0;
  return Math.min((spent / planned) * 100, 100);
}
