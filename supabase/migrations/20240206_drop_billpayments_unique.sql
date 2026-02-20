ALTER TABLE bill_payments DROP CONSTRAINT IF EXISTS bill_payments_paycheck_id_bill_id_key;

DROP INDEX IF EXISTS bill_payments_paycheck_id_bill_id_key;
