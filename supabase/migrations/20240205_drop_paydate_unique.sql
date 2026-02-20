ALTER TABLE paychecks DROP CONSTRAINT IF EXISTS paychecks_user_id_pay_date_key;

DROP INDEX IF EXISTS paychecks_user_id_pay_date_key;
