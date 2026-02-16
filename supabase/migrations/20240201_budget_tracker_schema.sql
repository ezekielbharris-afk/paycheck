-- Create public.users table for foreign key relationships
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User pay schedule configuration
CREATE TABLE IF NOT EXISTS pay_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  next_payday DATE NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paychecks (individual pay periods)
CREATE TABLE IF NOT EXISTS paychecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pay_date DATE NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  reserved_bills DECIMAL(10, 2) DEFAULT 0,
  reserved_savings DECIMAL(10, 2) DEFAULT 0,
  spendable DECIMAL(10, 2) DEFAULT 0,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pay_date)
);

-- Budget categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'flexible', 'savings')),
  amount_per_paycheck DECIMAL(10, 2) NOT NULL,
  priority INTEGER DEFAULT 1,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category spending per paycheck
CREATE TABLE IF NOT EXISTS category_spending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paycheck_id UUID NOT NULL REFERENCES paychecks(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  planned DECIMAL(10, 2) NOT NULL,
  spent DECIMAL(10, 2) DEFAULT 0,
  remaining DECIMAL(10, 2) GENERATED ALWAYS AS (planned - spent) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paycheck_id, category_id)
);

-- Recurring bills
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill instances per paycheck
CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paycheck_id UUID NOT NULL REFERENCES paychecks(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  planned_amount DECIMAL(10, 2) NOT NULL,
  actual_amount DECIMAL(10, 2),
  due_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paycheck_id, bill_id)
);

-- Spending transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  paycheck_id UUID NOT NULL REFERENCES paychecks(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE paychecks;
ALTER PUBLICATION supabase_realtime ADD TABLE category_spending;
ALTER PUBLICATION supabase_realtime ADD TABLE bill_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pay_schedules_user ON pay_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_paychecks_user ON paychecks(user_id);
CREATE INDEX IF NOT EXISTS idx_paychecks_current ON paychecks(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paycheck ON transactions(paycheck_id);
