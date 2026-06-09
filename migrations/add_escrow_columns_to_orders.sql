-- Add escrow-specific columns to orders table
-- These track the flow: authorized -> approved for release -> captured

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS authorized_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_release_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS captured_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS order_completion_date timestamp,
  ADD COLUMN IF NOT EXISTS final_payment_released_at timestamp;

-- escrow_status values:
-- 'pending' = awaiting payment authorization
-- 'authorized' = funds authorized, waiting for order completion
-- 'completed' = order done, awaiting client approval to release
-- 'partial' = client approved partial release
-- 'released' = client approved full release, funds captured
-- 'failed' = capture failed or refunded
