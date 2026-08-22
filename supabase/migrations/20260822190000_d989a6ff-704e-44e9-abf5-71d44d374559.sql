ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS hr_name text,
  ADD COLUMN IF NOT EXISTS hr_email text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS min_cgpa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligible_courses text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_companies_updated ON public.companies;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS work_mode text NOT NULL DEFAULT 'On-site',
  ADD COLUMN IF NOT EXISTS drive_date date,
  ADD COLUMN IF NOT EXISTS courses text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS doc_url text;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Published',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_announcements_updated ON public.announcements;
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS total_marks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passing_marks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts_allowed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS negative_marking numeric NOT NULL DEFAULT 0;

ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS marks numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS negative_marks numeric NOT NULL DEFAULT 0;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;