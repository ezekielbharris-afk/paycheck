ALTER TABLE paychecks ADD COLUMN IF NOT EXISTS period_start_date DATE;
ALTER TABLE paychecks ADD COLUMN IF NOT EXISTS period_end_date DATE;

UPDATE paychecks SET period_start_date = pay_date WHERE period_start_date IS NULL;
UPDATE paychecks SET period_end_date = pay_date + INTERVAL '14 days' WHERE period_end_date IS NULL;
