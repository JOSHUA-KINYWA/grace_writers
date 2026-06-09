-- Allow PayPal escrow authorization state in orders.payment_status.
-- The app stores PayPal authorizations before funds are captured, so
-- payment_status must accept "authorized" in addition to unpaid/partial/paid.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (
    payment_status IS NULL OR
    payment_status IN ('unpaid', 'authorized', 'partial', 'paid', 'failed', 'refunded')
  );
