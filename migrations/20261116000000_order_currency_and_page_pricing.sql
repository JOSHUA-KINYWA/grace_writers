ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS billing_unit text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS rate_per_page numeric(12, 2);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_currency_code_check CHECK (currency_code IN ('USD', 'KES')),
  ADD CONSTRAINT orders_billing_unit_check CHECK (billing_unit IN ('custom', 'page')),
  ADD CONSTRAINT orders_page_count_check CHECK (page_count IS NULL OR page_count >= 0),
  ADD CONSTRAINT orders_rate_per_page_check CHECK (rate_per_page IS NULL OR rate_per_page >= 0);
