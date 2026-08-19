
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','student');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin');
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- STUDENT PROFILES
CREATE TABLE public.student_profiles (
  user_id uuid PRIMARY KEY,
  student_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  course text NOT NULL DEFAULT 'BCA',
  branch text NOT NULL DEFAULT 'BCA',
  college text NOT NULL DEFAULT 'ABC College, Pune',
  cgpa numeric(4,2) NOT NULL DEFAULT 0,
  backlog_count int NOT NULL DEFAULT 0,
  graduation_year int NOT NULL DEFAULT 2026,
  gender text,
  placement_status text NOT NULL DEFAULT 'Not Placed',
  summary text,
  skills text[] NOT NULL DEFAULT '{}',
  avatar_url text,
  resume_url text,
  resume_name text,
  resume_size int,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own profile" ON public.student_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admins manage profiles" ON public.student_profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- students may only edit non-academic fields on their own row
CREATE OR REPLACE FUNCTION public.guard_student_self_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  NEW.student_id := OLD.student_id;
  NEW.cgpa := OLD.cgpa;
  NEW.branch := OLD.branch;
  NEW.course := OLD.course;
  NEW.backlog_count := OLD.backlog_count;
  NEW.graduation_year := OLD.graduation_year;
  NEW.placement_status := OLD.placement_status;
  NEW.is_active := OLD.is_active;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_student_guard BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_student_self_update();
CREATE POLICY "students update own profile" ON public.student_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  logo_color text NOT NULL DEFAULT '#1e3a8a',
  website text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage companies" ON public.companies FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- JOBS
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  role_tag text,
  description text NOT NULL DEFAULT '',
  package_lpa numeric(5,2) NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT '',
  openings text NOT NULL DEFAULT '',
  job_type text NOT NULL DEFAULT 'Full Time',
  branches text[] NOT NULL DEFAULT '{}',
  min_cgpa numeric(4,2) NOT NULL DEFAULT 0,
  max_backlogs int NOT NULL DEFAULT 0,
  graduation_years int[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  selection_process text[] NOT NULL DEFAULT '{}',
  open_date date NOT NULL DEFAULT current_date,
  deadline date NOT NULL DEFAULT (current_date + 30),
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
GRANT SELECT ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage jobs" ON public.jobs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- APPLICATIONS
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Applied',
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);
CREATE INDEX idx_applications_user ON public.applications(user_id);
CREATE INDEX idx_applications_job ON public.applications(job_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own applications" ON public.applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "students create own applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage applications" ON public.applications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own status history" ON public.application_status_history FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.user_id = auth.uid()));
CREATE POLICY "insert status history" ON public.application_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.user_id = auth.uid()));

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  company text,
  drive_type text,
  author_name text NOT NULL DEFAULT 'Placement Cell',
  target_course text,
  pinned boolean NOT NULL DEFAULT false,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.announcement_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_reactions TO authenticated;
GRANT ALL ON public.announcement_reactions TO service_role;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reactions" ON public.announcement_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own reactions" ON public.announcement_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own reactions" ON public.announcement_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- TESTS
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Quantitative Aptitude',
  course text,
  difficulty text NOT NULL DEFAULT 'Medium',
  duration_min int NOT NULL DEFAULT 30,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read tests" ON public.tests FOR SELECT TO authenticated USING (published OR public.is_admin());
CREATE POLICY "admins manage tests" ON public.tests FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 1,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL,
  explanation text
);
CREATE INDEX idx_questions_test ON public.test_questions(test_id, position);
GRANT SELECT ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read questions" ON public.test_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage questions" ON public.test_questions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  total_questions int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  incorrect_count int NOT NULL DEFAULT 0,
  unanswered_count int NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  accuracy numeric(5,2) NOT NULL DEFAULT 0,
  time_taken_sec int NOT NULL DEFAULT 0
);
CREATE INDEX idx_attempts_user ON public.test_attempts(user_id);
GRANT SELECT, INSERT, UPDATE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own attempts" ON public.test_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "create own attempts" ON public.test_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own attempts" ON public.test_attempts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  selected_option text,
  is_correct boolean NOT NULL DEFAULT false,
  marked_for_review boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_answers_attempt ON public.test_answers(attempt_id);
GRANT SELECT, INSERT, UPDATE ON public.test_answers TO authenticated;
GRANT ALL ON public.test_answers TO service_role;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own answers" ON public.test_answers FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.test_attempts t WHERE t.id = attempt_id AND t.user_id = auth.uid()));
CREATE POLICY "write own answers" ON public.test_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.test_attempts t WHERE t.id = attempt_id AND t.user_id = auth.uid()));

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid,
  admin_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admins write audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- DEMO DATA
INSERT INTO public.companies (name, short_name, logo_color) VALUES
 ('Tata Consultancy Services','TCS','#0a2d6e'),
 ('Infosys','Infosys','#0f7bc4'),
 ('Accenture','accenture','#a100ff'),
 ('Wipro','Wipro','#f36f21'),
 ('Deloitte','Deloitte','#86bc25'),
 ('Capgemini','Capgemini','#0070ad'),
 ('Cognizant','Cognizant','#1c4ed8');

INSERT INTO public.jobs (company_id, title, role_tag, description, package_lpa, location, openings, branches, min_cgpa, max_backlogs, graduation_years, skills, selection_process, deadline)
SELECT c.id, v.title, v.role_tag, v.description, v.pkg, v.loc, v.openings, v.branches, v.cgpa, v.backlogs, v.years, v.skills, v.process, v.deadline
FROM (VALUES
 ('Tata Consultancy Services','Digital Ninja','Digital | Ninja','Work on live projects, develop digital solutions and collaborate with global teams to build innovative products. You will be part of the TCS Digital track working across cloud, data and full-stack engineering, with structured mentoring and certification support during the first year.',3.36,'Pune','100+ Openings',ARRAY['BCA','BSc','BCom','BBA'],7.0,0,ARRAY[2026,2027],ARRAY['Java','SQL','Problem Solving'],ARRAY['Aptitude Test','Technical Round','HR Round','Final Selection'],DATE '2026-08-25'),
 ('Infosys','Systems Engineer','Systems Engineer','Join Infosys as a Systems Engineer and work on enterprise application development, testing and support across global client engagements. Includes a 12-week Mysuru training programme.',4.00,'Mysuru','200+ Openings',ARRAY['BE','B.Tech','BCA','MCA'],7.0,1,ARRAY[2026],ARRAY['Python','SQL','Communication'],ARRAY['Aptitude Test','Technical Round','HR Round','Final Selection'],DATE '2026-08-22'),
 ('Accenture','Associate Software Engineer','Software Engineer','Build and maintain software solutions for Fortune 500 clients. Work across application development, cloud and automation with a strong focus on continuous learning.',4.50,'Bengaluru','150+ Openings',ARRAY['BE','B.Tech'],7.0,0,ARRAY[2026],ARRAY['Java','C++','Problem Solving'],ARRAY['Aptitude Test','Coding Round','Technical Round','HR Round'],DATE '2026-08-28'),
 ('Wipro','Project Engineer','Elite NTH','Wipro Elite National Talent Hunt hires engineering graduates for project engineering roles spanning application development, infrastructure and cloud operations.',3.50,'Hyderabad','120+ Openings',ARRAY['BCA','BSc','BE','B.Tech'],6.5,1,ARRAY[2026,2027],ARRAY['SQL','Communication'],ARRAY['Aptitude Test','Technical Round','HR Round'],DATE '2026-09-02'),
 ('Deloitte','Analyst - Technology','Analyst','Deloitte hires analysts for technology consulting engagements covering data analytics, risk advisory and enterprise platforms.',6.50,'Gurugram','40+ Openings',ARRAY['BE','B.Tech','MCA'],8.0,0,ARRAY[2026],ARRAY['Python','SQL','Communication'],ARRAY['Aptitude Test','Group Discussion','Technical Round','HR Round'],DATE '2026-09-05'),
 ('Capgemini','Analyst','Analyst','Capgemini hires analysts across application engineering and cloud infrastructure services with structured career progression.',4.25,'Mumbai','90+ Openings',ARRAY['BCA','BSc','BE','B.Tech','BBA'],6.0,2,ARRAY[2026,2027],ARRAY['Java','SQL'],ARRAY['Aptitude Test','Technical Round','HR Round'],DATE '2026-09-10'),
 ('Cognizant','Programmer Analyst Trainee','GenC','Cognizant GenC programme trains graduates in full-stack development and delivery, with placement into client projects after certification.',4.00,'Chennai','180+ Openings',ARRAY['BCA','MCA','BE','B.Tech'],7.0,0,ARRAY[2026],ARRAY['Java','Python','Problem Solving'],ARRAY['Aptitude Test','Technical Round','HR Round','Final Selection'],DATE '2026-09-12')
) AS v(company,title,role_tag,description,pkg,loc,openings,branches,cgpa,backlogs,years,skills,process,deadline)
JOIN public.companies c ON c.name = v.company;

INSERT INTO public.announcements (title, message, company, drive_type, pinned, created_at) VALUES
 ('TCS Campus Recruitment Drive','Registration is now open for the TCS Campus Recruitment Drive. Eligible students must complete their profile and upload an updated resume before 25 Aug 2026.','Tata Consultancy Services','Pinned',true, now() - interval '2 hours'),
 ('Aptitude Test scheduled for Friday','A mandatory aptitude practice test is scheduled for Friday at 10:00 AM in the computer lab. Please carry your college ID card.',null,null,false, now() - interval '4 hours'),
 ('Important: Update your profile','All final year students must update CGPA proofs and contact details with the placement cell before the next drive.',null,null,false, now() - interval '1 day'),
 ('Infosys Virtual Recruitment Drive','Infosys will conduct a virtual recruitment drive for the Systems Engineer role. Shortlisted students will receive a test link on their registered email.','Infosys',null,false, now() - interval '2 days');

INSERT INTO public.tests (name, category, course, difficulty, duration_min) VALUES
 ('Quantitative Aptitude Practice Set 01','Quantitative Aptitude','BCA','Medium',30),
 ('Logical Reasoning Practice Set 01','Logical Reasoning','BCA','Medium',30),
 ('Verbal Ability Practice Set 01','Verbal Ability','BCA','Easy',30);

INSERT INTO public.test_questions (test_id, position, question, option_a, option_b, option_c, option_d, correct_option, explanation)
SELECT t.id, v.pos, v.q, v.a, v.b, v.c, v.d, v.correct, v.expl
FROM (VALUES
 ('Quantitative Aptitude Practice Set 01',1,'The average of 16 numbers is 40. If each number is multiplied by 2, what would be the new average?','40','60','80','100','C','Multiplying every value by 2 multiplies the average by 2, so 40 x 2 = 80.'),
 ('Quantitative Aptitude Practice Set 01',2,'A train 150 m long passes a pole in 15 seconds. What is its speed?','36 km/h','40 km/h','45 km/h','54 km/h','A','Speed = 150/15 = 10 m/s = 36 km/h.'),
 ('Quantitative Aptitude Practice Set 01',3,'If 20% of a number is 60, what is the number?','200','240','300','360','C','60 / 0.20 = 300.'),
 ('Quantitative Aptitude Practice Set 01',4,'Simple interest on Rs 5000 at 8% per annum for 2 years is:','Rs 700','Rs 800','Rs 900','Rs 1000','B','SI = 5000 x 8 x 2 / 100 = 800.'),
 ('Quantitative Aptitude Practice Set 01',5,'The ratio 3:5 expressed as a percentage is:','50%','60%','65%','75%','B','3/5 = 0.6 = 60%.'),
 ('Quantitative Aptitude Practice Set 01',6,'A shopkeeper sells an item for Rs 480 at 20% profit. Cost price is:','Rs 380','Rs 400','Rs 420','Rs 440','B','CP = 480 / 1.2 = 400.'),
 ('Quantitative Aptitude Practice Set 01',7,'What is the LCM of 12 and 18?','24','30','36','72','C','LCM(12,18) = 36.'),
 ('Quantitative Aptitude Practice Set 01',8,'Two pipes fill a tank in 12 and 24 minutes. Together they take:','6 min','8 min','9 min','10 min','B','1/12 + 1/24 = 1/8, so 8 minutes.'),
 ('Logical Reasoning Practice Set 01',1,'Find the next number: 2, 6, 12, 20, 30, ?','36','40','42','48','C','Differences increase by 2: +4,+6,+8,+10,+12 gives 42.'),
 ('Logical Reasoning Practice Set 01',2,'If CAT is coded as DBU, how is DOG coded?','EPH','EOG','DPH','FPH','A','Each letter shifts forward by one.'),
 ('Logical Reasoning Practice Set 01',3,'Pointing to a man, Rita said "He is the son of my grandfather''s only son". Who is he?','Her father','Her brother','Her uncle','Her cousin','B','Grandfather''s only son is her father, so his son is her brother.'),
 ('Logical Reasoning Practice Set 01',4,'Which one does not belong: Square, Rectangle, Circle, Triangle?','Square','Rectangle','Circle','Triangle','C','Circle has no straight sides or vertices.'),
 ('Logical Reasoning Practice Set 01',5,'Complete the series: A, C, F, J, ?','M','N','O','P','C','Gaps increase: +2,+3,+4,+5 gives O.'),
 ('Verbal Ability Practice Set 01',1,'Choose the synonym of "Abundant".','Scarce','Plentiful','Weak','Tiny','B','Abundant means plentiful.'),
 ('Verbal Ability Practice Set 01',2,'Choose the antonym of "Optimistic".','Hopeful','Cheerful','Pessimistic','Positive','C','Pessimistic is the opposite of optimistic.'),
 ('Verbal Ability Practice Set 01',3,'Fill in the blank: She is good ___ mathematics.','in','at','on','for','B','"Good at" is the correct collocation.'),
 ('Verbal Ability Practice Set 01',4,'Identify the correctly spelled word.','Recieve','Receive','Receeve','Receve','B','The correct spelling is receive.'),
 ('Verbal Ability Practice Set 01',5,'Choose the correct sentence.','He do not likes tea.','He does not likes tea.','He does not like tea.','He not like tea.','C','Correct auxiliary and base verb usage.')
) AS v(test,pos,q,a,b,c,d,correct,expl)
JOIN public.tests t ON t.name = v.test;
