-- 1) Inline admin checks in policies so the SECURITY DEFINER helpers no longer need to be callable by signed-in users.

-- announcements
DROP POLICY "admins manage announcements" ON public.announcements;
CREATE POLICY "admins manage announcements" ON public.announcements FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- application_status_history
DROP POLICY "insert status history" ON public.application_status_history;
CREATE POLICY "insert status history" ON public.application_status_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_status_history.application_id AND a.user_id = auth.uid())
);
DROP POLICY "read own status history" ON public.application_status_history;
CREATE POLICY "read own status history" ON public.application_status_history FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_status_history.application_id AND a.user_id = auth.uid())
);

-- applications
DROP POLICY "students read own applications" ON public.applications;
CREATE POLICY "students read own applications" ON public.applications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "admins manage applications" ON public.applications;
CREATE POLICY "admins manage applications" ON public.applications FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- audit_logs
DROP POLICY "admins read audit" ON public.audit_logs;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "admins write audit" ON public.audit_logs;
CREATE POLICY "admins write audit" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- companies: admin manage + reads limited to active students / admins
DROP POLICY "admins manage companies" ON public.companies;
CREATE POLICY "admins manage companies" ON public.companies FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "read companies" ON public.companies;
CREATE POLICY "read companies" ON public.companies FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active)
);

-- jobs
DROP POLICY "admins manage jobs" ON public.jobs;
CREATE POLICY "admins manage jobs" ON public.jobs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "read jobs" ON public.jobs;
CREATE POLICY "read jobs" ON public.jobs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active)
);

-- notifications
DROP POLICY "admins manage notifications" ON public.notifications;
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "read own notifications" ON public.notifications;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- student_profiles
DROP POLICY "students read own profile" ON public.student_profiles;
CREATE POLICY "students read own profile" ON public.student_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "admins manage profiles" ON public.student_profiles;
CREATE POLICY "admins manage profiles" ON public.student_profiles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- test_answers
DROP POLICY "read own answers" ON public.test_answers;
CREATE POLICY "read own answers" ON public.test_answers FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.test_attempts t WHERE t.id = test_answers.attempt_id AND t.user_id = auth.uid())
);

-- test_attempts
DROP POLICY "read own attempts" ON public.test_attempts;
CREATE POLICY "read own attempts" ON public.test_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- tests
DROP POLICY "admins manage tests" ON public.tests;
CREATE POLICY "admins manage tests" ON public.tests FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
DROP POLICY "read tests" ON public.tests;
CREATE POLICY "read tests" ON public.tests FOR SELECT TO authenticated
USING (published OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- 2) test_questions: answer keys are no longer readable by students at all.
DROP POLICY "read questions" ON public.test_questions;
DROP POLICY "admins manage questions" ON public.test_questions;
CREATE POLICY "admins manage questions" ON public.test_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- 3) user_roles self-read only (no helper function needed)
DROP POLICY "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4) storage policies
DROP POLICY "students read own resumes" ON storage.objects;
CREATE POLICY "students read own resumes" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  )
);
DROP POLICY "students delete own resumes" ON storage.objects;
CREATE POLICY "students delete own resumes" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
  )
);

-- 5) Revoke EXECUTE on SECURITY DEFINER helpers from client roles.
REVOKE ALL ON FUNCTION public.is_admin() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.guard_student_self_update() FROM anon, authenticated, PUBLIC;