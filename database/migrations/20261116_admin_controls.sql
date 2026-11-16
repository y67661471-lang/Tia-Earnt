-- Auditable administrative account controls.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  target_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('user_blocked', 'user_unblocked')),
  previous_status TEXT NOT NULL CHECK (previous_status IN ('active', 'blocked')),
  new_status TEXT NOT NULL CHECK (new_status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON public.admin_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_target
  ON public.admin_audit_log(target_user_id, created_at DESC);
