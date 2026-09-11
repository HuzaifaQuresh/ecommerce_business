-- Applicants can submit and read their own applications, but cannot self-approve.

DROP POLICY IF EXISTS "Users manage own vendor app" ON public.vendor_applications;
DROP POLICY IF EXISTS "Users insert own vendor app" ON public.vendor_applications;
DROP POLICY IF EXISTS "Users read own vendor app" ON public.vendor_applications;

CREATE POLICY "Users insert own vendor app"
  ON public.vendor_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users read own vendor app"
  ON public.vendor_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
