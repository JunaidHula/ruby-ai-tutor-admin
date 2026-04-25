-- Migration 010: Admin staff table + audit log
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_service_role" ON public.staff
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "staff_own_read" ON public.staff
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           bigserial PRIMARY KEY,
  staff_id     uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_table text,
  target_id    text,
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_service_role" ON public.audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
