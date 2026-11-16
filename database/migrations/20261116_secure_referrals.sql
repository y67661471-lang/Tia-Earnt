-- Secure referral attribution. Apply once after the base schema.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code
  ON public.users(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT NOT NULL
    REFERENCES public.users(id) ON DELETE RESTRICT,
  referred_user_id BIGINT NOT NULL UNIQUE
    REFERENCES public.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'qualified', 'rewarded', 'rejected')),
  reward_amount BIGINT NOT NULL DEFAULT 0
    CHECK (reward_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON public.referrals(referrer_user_id, created_at DESC);
