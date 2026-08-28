# Campus Connect Pro

# Build a Complete College Placement Management App

Build a modern, production-ready **College Placement Management System** as a responsive web application with a **mobile-first UI**. The application should feel like a premium college placement mobile app while also working perfectly on desktop.

Use the uploaded Placement App PRD and the provided UI reference image as the primary design and feature references.

The application should have two primary roles:

1. **Student**
2. **Admin / Placement Cell**

Do not create public student registration. Student accounts must be created/provisioned by Admin.

---

# 1. DESIGN DIRECTION

Create a clean, modern, professional education/career-focused interface.

### Visual style

* Premium college/career platform
* White/light background
* Deep navy/royal blue as the primary brand color
* Blue gradient accents where appropriate
* Rounded cards
* Soft shadows
* Clean typography
* Spacious layouts
* Modern icons
* Professional company logos
* Status badges
* Progress indicators
* Responsive mobile navigation
* Desktop sidebar navigation
* Mobile bottom navigation

The UI should be inspired by the uploaded reference image:

* Home
* Jobs
* Job Details
* Resume
* Test Center
* Active Test
* My Account
* Application History
* Notifications

Use realistic sample data for companies such as TCS, Infosys, Accenture, Wipro, Deloitte, Capgemini, Cognizant, etc.

---

# 2. AUTHENTICATION

Create a secure authentication system.

## Student Login

Students log in using:

* Student ID / College ID
* Password

Do NOT provide public self-registration.

Student accounts are created by Admin.

Features:

* Login
* Logout
* Forgot password
* Password reset
* Change password
* Force password change on first login
* Session management
* Role-based access control

## Admin Login

Admin has a separate secure login.

Admin should be able to access the complete placement management dashboard.

---

# 3. STUDENT APPLICATION

After student login, show a professional student dashboard.

Student navigation:

* Home
* Jobs
* Resume
* Test Center
* My Account

Also provide access to:

* Notifications
* Application History
* Profile
* Logout

---

# 4. STUDENT HOME PAGE

Create a personalized Home page.

Top section:

* College logo
* "Good Morning, Rahul 👋"
* Student name
* Notification bell
* Profile/avatar

Create a **Pinned Announcement** section.

Example:

"TCS Campus Recruitment Drive"

Show:

* Company
* Recruitment type
* Posted time
* Announcement text
* Pin badge
* Reaction counts

Students can react using emojis.

Do not allow text comments in the first version.

Create a **Latest Announcements** section.

Each announcement should show:

* Admin/Placement Cell avatar
* Announcement title/message
* Time
* Reaction counts
* Notification/read indicator

Include:

* View All
* Pin important announcements
* Newest announcements first

---

# 5. JOBS / PLACEMENTS PAGE

Create a Jobs/Placements page.

At the top:

* "Placements"
* Search jobs
* Filter button
* Sort button

Filters:

* Company
* Role
* Branch
* Minimum CGPA
* Package
* Location
* Application deadline
* Eligibility
* Application status

Each job should appear as a professional card.

Job card must display:

* Company logo
* Company name
* Job role
* Package / CTC
* Location
* Number of openings
* Branch eligibility
* CGPA requirement
* Backlog requirement
* Application deadline
* Eligibility status

Example:

Tata Consultancy Services

Digital | Ninja

₹3.36 LPA

Pune

100+ Openings

Branches:
BCA, BSc, BCom, BBA

CGPA:
≥ 7.0

Backlogs:
No active backlogs

Buttons:

* View Details
* Apply Now

If the student is not eligible:

Show:

"Not Eligible"

and explain the reason.

Example:

"CGPA 6.8 — Minimum 7.0 required"

The Apply button must be disabled/hidden for ineligible students.

---

# 6. AUTOMATIC ELIGIBILITY ENGINE

This is a critical feature.

Whenever a student opens a job, automatically compare the student's profile against the company's eligibility criteria.

Eligibility can include:

* Branch/course
* CGPA
* Backlogs
* Graduation year
* Skills
* Gender if required by the institution/company configuration
* Other configurable academic criteria

Return:

### Eligible

Show:

"Eligible ✓"

and enable Apply Now.

### Not Eligible

Show:

"Not Eligible"

and provide the exact reason.

Example:

* CGPA below required minimum
* Branch not eligible
* Active backlog exists
* Graduation year not eligible

Do not allow an ineligible student to submit an application.

---

# 7. JOB DETAILS PAGE

Create a detailed Job Details page.

Header:

* Back button
* Company logo
* Company name
* Bookmark
* Share

Display:

* Role
* Package
* Location
* Number of openings
* Application deadline
* Eligibility badge

Create an **Eligibility** section.

Show:

* Branch
* CGPA
* Backlogs
* Graduation year
* Skills if applicable

Use visual eligibility indicators.

Create:

### Job Description

Display detailed description.

Include a "Read More" interaction if the content is long.

Create:

### Selection Process

Show a horizontal/vertical timeline:

1. Aptitude Test
2. Technical Round
3. HR Round
4. Final Selection

Create:

### Important Information

* Application deadline
* Job type
* Work location
* Package
* Openings

Bottom sticky CTA:

**Apply Now**

After applying, change button to:

**Applied ✓**

and prevent duplicate applications.

---

# 8. APPLICATION FLOW

When the student clicks Apply Now:

Show confirmation modal.

Example:

"Are you sure you want to apply for Tata Consultancy Services — Digital Ninja?"

Show:

* Company
* Role
* Package
* Deadline

Buttons:

* Cancel
* Confirm Application

After confirmation:

* Create application record
* Show success message
* Notify student
* Update application status to "Applied"

Application statuses:

* Applied
* Under Review
* Shortlisted
* Selected
* Rejected

Admin can change these statuses.

---

# 9. APPLICATION HISTORY

Create a **My Applications** page.

Tabs:

* All
* Applied
* Under Review
* Shortlisted
* Selected
* Rejected

Each application card should show:

* Company logo
* Company name
* Job role
* Package
* Applied date
* Current status

Create a visual application progress timeline.

Example:

Applied → Under Review → Shortlisted → Selected

For rejected applications:

Applied → Under Review → Rejected

Use clear status badges.

---

# 10. RESUME PAGE

Create a professional **My Resume** page.

Show student information:

* Profile photo
* Name
* Student ID
* Course
* Email
* Phone

### Resume Summary

Allow student to maintain a short professional summary.

### Education

Display:

* Degree
* College
* Graduation year
* CGPA

### Skills

Use skill chips:

* Java
* Python
* SQL
* C++
* Problem Solving
* Communication

Allow students to add/edit skills.

### Resume File

Allow:

* Upload resume
* Replace resume
* Download resume
* Delete resume

Accepted formats:

* PDF
* DOC
* DOCX

Show uploaded filename and file size.

Include:

**Upload / Update Resume**

The resume can be used during job applications.

---

# 11. TEST CENTER

Create a dedicated **Test Center**.

At the top display a performance dashboard:

* Tests Attempted
* Average Score
* Best Score
* Total Questions
* Average Accuracy

Example:

12 Tests Attempted

68% Average Score

92% Best Score

Create test categories:

* Quantitative Aptitude
* Logical Reasoning
* Verbal Ability
* Technical
* Coding

Tests should be filtered based on student's branch/course where configured.

Each test card should display:

* Test title
* Number of questions
* Duration
* Difficulty
* Best score
* Number of attempts
* Start Test button

Example:

Quantitative Aptitude
Practice Set 01

25 Questions · 30 Min · Medium

Best Score: 88%

2 Attempts

**Start Test**

---

# 12. ACTIVE TEST SCREEN

Create a professional test-taking interface.

Top:

* Test name
* Timer
* Question number
* Total questions

Example:

Quantitative Aptitude
Practice Set 01

18:24 remaining

Create a question navigator:

1 2 3 4 5 6 7 8 9 10 ... 25

States:

* Unanswered
* Answered
* Marked for Review
* Current question

Question area:

Display:

"The average of 16 numbers is 40. If each number is multiplied by 2, what would be the new average?"

Options:

A. 40
B. 60
C. 80
D. 100

Allow one option selection.

Buttons:

* Previous
* Next
* Mark for Review

Bottom:

**Submit Test**

Before submitting, show confirmation:

"You have 3 unanswered questions. Are you sure you want to submit?"

Timer should automatically submit the test when it reaches zero.

---

# 13. TEST RESULTS

After submission show:

* Score
* Percentage
* Correct answers
* Incorrect answers
* Unanswered
* Time taken
* Accuracy

Example:

Score: 20/25

Percentage: 80%

Accuracy: 84%

Show question-by-question results.

Optional toggle:

"Show Correct Answers"

Also maintain test attempt history.

Create score trend information so students can see improvement over time.

---

# 14. MY ACCOUNT

Create a complete My Account page.

Header:

* Profile image
* Student name
* Student ID
* Placement status

Example:

Rahul Sharma

22BCA1047

Not Placed

Profile information:

* Branch/Course
* CGPA
* Email
* Phone
* Contact
* Graduation year
* Backlog status
* Placement status

Buttons:

* Edit Profile
* Change Password
* Privacy Settings
* Logout

Students should only be allowed to edit fields configured by Admin.

Academic information such as CGPA, branch and backlog data should normally be controlled by Admin.

---

# 15. NOTIFICATIONS

Create a Notifications page.

Notification types:

### New Placement Opportunity

"TCS has posted a new placement opportunity."

### Application Status Update

"Congratulations! You have been shortlisted by TCS."

### New Announcement

"Aptitude Test is scheduled for Friday."

### New Practice Test

"New Quantitative Aptitude test is available."

### Deadline Reminder

"Last date to apply for Infosys drive is 22 Aug 2026."

Use different icons for different notification types.

Features:

* Read/unread state
* Mark all as read
* Notification timestamp
* Click notification to open related content

Notification bell should show unread count.

---

# 16. ADMIN DASHBOARD

Create a completely separate Admin/Placement Cell dashboard.

Dashboard cards:

* Total Students
* Eligible Students
* Total Companies
* Active Drives
* Applications
* Shortlisted
* Selected
* Placement Percentage

Charts:

* Applications by company
* Placements by branch
* Placement status
* Average package
* Highest package
* Monthly placement activity

---

# 17. ADMIN ANNOUNCEMENT MANAGEMENT

Admin can:

* Create announcement
* Edit announcement
* Delete announcement
* Pin announcement
* Unpin announcement
* View reactions

Announcement fields:

* Title
* Message
* Target students/course
* Publish date
* Expiry date
* Pinned status

Admin announcements appear automatically in the student Home feed.

---

# 18. ADMIN JOB MANAGEMENT

Create a Jobs Management section.

Admin can:

* Create job
* Edit job
* Close job
* Delete job
* Duplicate job
* View applicants

Job creation form:

Company:

* Company name
* Logo

Job:

* Job title
* Role
* Description
* Package / CTC
* Location
* Number of openings

Eligibility:

* Branch
* Minimum CGPA
* Maximum backlog
* Graduation year
* Skills
* Other criteria

Application:

* Application opening date
* Application deadline
* Selection process

Admin should see how many students are:

* Eligible
* Applied
* Under Review
* Shortlisted
* Selected
* Rejected

---

# 19. ADMIN APPLICANT MANAGEMENT

For every job, Admin can open:

**View Applicants**

Display a table:

Student ID | Name | Branch | CGPA | Application Date | Status

Features:

* Search
* Filter
* Sort
* View student
* Download resume
* Change application status

Status workflow:

Applied
↓
Under Review
↓
Shortlisted
↓
Selected / Rejected

Admin can bulk update statuses.

Allow applicant list export as CSV/Excel.

---

# 20. STUDENT MANAGEMENT

Create Admin Student Management.

Admin can:

* Add student
* Edit student
* Deactivate student
* Reactivate student
* Reset password
* View student profile
* Update academic data

Student fields:

* Student ID
* Name
* Email
* Phone
* Branch
* Course
* CGPA
* Backlog count
* Graduation year
* Placement status
* Resume

---

# 21. BULK STUDENT IMPORT

Allow Admin to upload:

* CSV
* Excel

Columns:

Student ID
Name
Email
Phone
Course
Branch
CGPA
Backlog Count
Graduation Year

System should:

1. Validate uploaded data
2. Detect duplicates
3. Show errors
4. Import valid students
5. Generate temporary passwords
6. Notify students

Provide a downloadable sample import template.

---

# 22. PRACTICE TEST ADMIN MANAGEMENT

Admin can create test papers.

Test fields:

* Test name
* Course/branch
* Category
* Difficulty
* Duration
* Number of questions

Question fields:

* Question
* Option A
* Option B
* Option C
* Option D
* Correct answer
* Explanation

Admin can:

* Add question
* Edit question
* Delete question
* Reorder questions
* Publish test
* Unpublish test
* Duplicate test

---

# 23. ADMIN TEST ANALYTICS

Show:

* Total attempts
* Average score
* Highest score
* Lowest score
* Average accuracy
* Questions with highest error rate
* Student performance
* Branch-wise performance

---

# 24. NOTIFICATION MANAGEMENT

Admin should be able to trigger notifications for:

* New job
* Announcement
* Practice test
* Application status
* Deadline reminder
* General placement notice

Target:

* All students
* Specific branch
* Specific course
* Eligible students
* Applicants of a specific job

---

# 25. DATABASE

Use a relational database such as Supabase/PostgreSQL.

Create appropriate tables such as:

users
student_profiles
admin_profiles
companies
jobs
job_eligibility
applications
announcements
announcement_reactions
notifications
resumes
tests
test_questions
test_attempts
test_answers
application_status_history
audit_logs

Use proper foreign keys and indexes.

---

# 26. ROLE-BASED SECURITY

Implement strict role-based access.

Student:

* Can view own profile
* Can view eligible jobs
* Can apply to jobs
* Can view own applications
* Can upload own resume
* Can take tests
* Can view own test results
* Can view announcements

Student must NOT be able to:

* Modify CGPA
* Modify eligibility data
* Modify other students
* View other students' applications
* Access Admin pages
* Modify job postings

Admin:

* Manage students
* Manage companies
* Manage jobs
* Manage applications
* Manage announcements
* Manage tests
* Manage notifications
* View analytics
* Export reports

Implement database-level security/RLS where supported.

---

# 27. AUDIT LOG

Track important Admin actions:

* Student created
* Student updated
* Student deactivated
* Job created
* Job updated
* Job closed
* Application status changed
* Announcement published
* Test created
* Test updated

Store:

* Admin
* Action
* Entity
* Timestamp

---

# 28. RESPONSIVE DESIGN

The application must work on:

* Mobile
* Tablet
* Desktop

### Mobile

Use bottom navigation:

Home | Jobs | Resume | Test Center | Account

### Desktop

Use a left sidebar:

Dashboard
Students
Companies
Jobs
Applications
Announcements
Tests
Notifications
Analytics
Settings

---

# 29. SEARCH AND FILTERING

Implement fast search/filter functionality throughout the application.

Student Jobs:

* Company
* Role
* Location
* Package
* Eligibility

Admin Students:

* Name
* Student ID
* Branch
* CGPA
* Placement status

Admin Applications:

* Company
* Job
* Branch
* Status

Admin Jobs:

* Company
* Status
* Deadline

---

# 30. IMPORTANT UX DETAILS

Use loading states.

Use skeleton loaders where appropriate.

Use confirmation dialogs before destructive actions.

Use toast notifications for successful actions.

Examples:

"Application submitted successfully."

"Resume uploaded successfully."

"Test submitted successfully."

"Student account created."

"Job posting published."

Show useful empty states.

Example:

"No active placement opportunities right now."

"No applications yet."

"No tests available for your course."

---

# 31. SAMPLE STUDENT

Use this demo student:

Name:
Rahul Sharma

Student ID:
22BCA1047

Course:
BCA

College:
ABC College, Pune

CGPA:
7.56

Email:
[rahul.sharma@college.edu.in](mailto:rahul.sharma@college.edu.in)

Phone:
+91 98765 43210

Placement Status:
Not Placed

Skills:

Java
Python
SQL
C++
Problem Solving
Communication

Create realistic sample applications and test attempts.

---

# 32. SAMPLE JOB DATA

Create demo placement drives:

### Tata Consultancy Services

Role: Digital Ninja
Package: ₹3.36 LPA
Location: Pune
Openings: 100+
Minimum CGPA: 7.0
Backlogs: No active backlogs

### Infosys

Role: Systems Engineer
Package: ₹4.00 LPA
Location: Mysuru
Openings: 200+
Minimum CGPA: 7.0

### Accenture

Role: Associate Software Engineer
Package: ₹4.50 LPA
Location: Bengaluru
Openings: 150+
Minimum CGPA: 7.0

Create different eligibility results for the demo student so the UI demonstrates both eligible and ineligible jobs.

---

# 33. NAVIGATION

Student routes:

/login
/home
/jobs
/jobs/:id
/resume
/tests
/tests/:id
/tests/:id/attempt
/tests/:id/result
/applications
/notifications
/account
/account/edit

Admin routes:

/admin/login
/admin/dashboard
/admin/students
/admin/students/:id
/admin/companies
/admin/jobs
/admin/jobs/create
/admin/jobs/:id
/admin/jobs/:id/applicants
/admin/applications
/admin/announcements
/admin/tests
/admin/tests/create
/admin/notifications
/admin/analytics
/admin/audit-logs
/admin/settings

---

# 34. IMPORTANT IMPLEMENTATION RULE

Do not build this as only a static UI prototype.

Build functional workflows wherever possible:

* Authentication
* Role-based access
* Database persistence
* Student management
* Job creation
* Eligibility calculation
* Job application
* Application status updates
* Resume upload
* Tests
* Timer
* Automatic test scoring
* Test history
* Announcements
* Notifications
* Admin dashboard
* Analytics
* CSV/Excel import/export

All buttons should have meaningful functionality.

---

# 35. FUTURE-READY ARCHITECTURE

Structure the application so these can be added later without major redesign:

* Resume builder
* AI resume analysis
* AI interview preparation
* Interview scheduling
* Calendar integration
* Recruiter/company portal
* Company-side shortlisting
* Coding tests
* Online coding editor
* Push notifications
* Email integration
* Advanced placement analytics
* Placement package trends
* Branch-wise placement reports
* Multiple Admin roles
* Comments on announcements

---

# 36. FINAL UI QUALITY

The final result should look like a real commercial **College Placement Platform**, not a generic CRUD dashboard.

Prioritize:

* Excellent mobile experience
* Clean typography
* Consistent spacing
* Professional cards
* Strong information hierarchy
* Clear eligibility indicators
* Attractive dashboards
* Easy navigation
* Fast interactions
* Accessible forms
* Responsive layouts

The uploaded reference image should guide the visual hierarchy and mobile experience, while the uploaded Placement App PRD should guide the functional requirements and system structure.

Start by building the complete Student experience and Admin dashboard with realistic demo data, then connect the workflows and database so the application is functional end-to-end.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mcc-placement.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/572da509-f2eb-4dca-bf1a-b2b6d8bbef29).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
