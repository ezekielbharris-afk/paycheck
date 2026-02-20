export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type CategoryType = 'fixed' | 'flexible' | 'savings';

export interface PaySchedule {
  id: string;
  user_id: string;
  frequency: PayFrequency;
  next_payday: string;
  net_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Paycheck {
  id: string;
  user_id: string;
  pay_date: string;
  period_start_date?: string;
  period_end_date?: string;
  net_amount: number;
  reserved_bills: number;
  reserved_savings: number;
  spendable: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  amount_per_paycheck: number;
  priority: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CategorySpending {
  id: string;
  paycheck_id: string;
  category_id: string;
  planned: number;
  spent: number;
  remaining: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  frequency: BillFrequency;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: string;
  paycheck_id: string;
  bill_id: string;
  planned_amount: number;
  actual_amount?: number;
  due_date: string;
  is_paid: boolean;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  bill?: Bill;
}

/**
 * A bill merged with its optional payment info for the current pay period.
 * Always present in the grid (from the `bills` table); payment data may be absent
 * if no bill_payment row exists for the displayed paycheck.
 */
export interface BillGridItem {
  bill: Bill;
  payment: BillPayment | null;
  isInCurrentPeriod: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  paycheck_id: string;
  category_id?: string;
  amount: number;
  description?: string;
  transaction_date: string;
  created_at: string;
}

export interface DashboardData {
  paycheck: Paycheck;
  bills: BillPayment[];
  categories: CategorySpending[];
  daysUntilNext: number;
}
