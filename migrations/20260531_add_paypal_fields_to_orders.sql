-- Add PayPal escrow/payment columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quote_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_authorization_id text;
