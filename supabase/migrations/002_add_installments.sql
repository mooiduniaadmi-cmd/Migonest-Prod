ALTER TABLE service_requests
ADD COLUMN payment_plan TEXT DEFAULT 'ONE_TIME',
ADD COLUMN installments_paid INTEGER DEFAULT 0,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN is_locked BOOLEAN DEFAULT false;
