ALTER TABLE IF EXISTS public.pay_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paychecks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.category_spending ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own pay_schedules" ON public.pay_schedules;
CREATE POLICY "Users can manage own pay_schedules"
  ON public.pay_schedules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own paychecks" ON public.paychecks;
CREATE POLICY "Users can manage own paychecks"
  ON public.paychecks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories"
  ON public.categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own bills" ON public.bills;
CREATE POLICY "Users can manage own bills"
  ON public.bills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own bill_payments" ON public.bill_payments;
CREATE POLICY "Users can manage own bill_payments"
  ON public.bill_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.paychecks p
      WHERE p.id = bill_payments.paycheck_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paychecks p
      WHERE p.id = bill_payments.paycheck_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own category_spending" ON public.category_spending;
CREATE POLICY "Users can manage own category_spending"
  ON public.category_spending FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.paychecks p
      WHERE p.id = category_spending.paycheck_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paychecks p
      WHERE p.id = category_spending.paycheck_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
