# Oli: Locked In

Oli's private GCSE dashboard: a mobile-first revision planner and practice app being prepared for daily GCSE use. It includes a responsive React client, Cloudflare Worker API, D1 schema, signed cookie authentication, Parent course and calendar controls, original topic practice, evidence-based progress, an adaptive 14-day planner, Student and Parent dashboards, workload analytics, restrained gamification and automated browser testing.

The app is designed to reduce the decision of what to revise next. It does not claim to replace teaching, textbooks, official specifications, past papers or mark schemes. In-app practice is original and currently editorially checked; independent subject-teacher QA remains a release requirement for high-stakes content.

## Requirements

- Node.js 22.22.2 or newer
- npm
- A Cloudflare account only when you are ready to create or deploy remote resources

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.dev.vars.example` to `.dev.vars`. Generate separate password hashes:

   ```sh
   npm run auth:hash -- "your-long-student-password"
   npm run auth:hash -- "your-long-parent-password"
   ```

3. Put the generated hashes in `STUDENT_PASSWORD_HASH` and `PARENT_PASSWORD_HASH`. Generate at least 32 random bytes with a password manager for `SESSION_SECRET`. Never commit `.dev.vars`.

4. Create and seed the local D1 database:

   ```sh
   npm run db:migrate:local
   npm run db:seed:local
   ```

5. Run the app:

   ```sh
   npm run dev
   ```

Sign in with username `oliver` or `parent` and the matching password chosen in step 2.

## Checks

```sh
npm run check
npm run build
```

For the isolated desktop and mobile browser journey:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite creates its own ignored `.e2e` database and generated credentials; it never changes the normal local development database.

Tests cover password/session security, API authentication and role enforcement, course validation, the Edexcel History paper view, mastery and planner logic, the Today completion journey, weekly planner, subject overviews and migration completeness.

## Learn and practise

The public `/demo` page lets visitors try a sample revision session, an original History question, a weekly availability change and a Parent summary without signing in. It uses browser-only example data, makes no API requests and resets when the visitor leaves. The private Student and Parent accounts remain behind sign-in.

Open **Learn** after signing in. Confirmed subjects include:

- the relevant exam-board paper structure and assessment objectives;
- clear advice on what examiners award marks for;
- links to the official specification, past papers and mark schemes, plus selected free learning resources;
- a navigable topic map whose confirmed topics open revision activities;
- learning objectives, key knowledge, worked examples, original practice questions, mark-appropriate exemplars and plain-English explanations of why an answer earns credit.

Opening a topic starts a full-page four-stage session: learn the topic, study worked examples, complete independent practice, then review marked answers and direct topic resources. Selected knowledge questions are marked by the server. Written responses can always be typed and checked against marking points and an exemplar without AI. Activities offer a **Continue on phone** QR hand-off; the QR contains no password or session. If a Parent enables optional AI marking, the Student can also select up to four photographs. On supported phones, the no-key route can share photographs and a prepared prompt to Gemini; a manual copy/open route remains available. Optional server-side marking provides a one-tap route when configured. The Student sees a disclosure and must opt in before each transfer. Only signed, sufficiently confident server marks can update mastery; pasted external results provide feedback only.

Completed sessions expose a read-only **Review content** action. Learners can revisit explanations, exemplars and practice without replacing stored scores or mastery. Where BBC has a close lesson match, extra help links directly to that verified BBC Bitesize topic page rather than to general search results; unmatched lessons do not show a misleading BBC link.

During the POC, the Parent dashboard includes a typed-confirmation **Reset POC revision progress** control. It clears lesson activity, assessments, mastery, notes and XP and then generates a fresh plan, while preserving accounts, course configuration, exam dates, tutors and availability.

Generic topic-description quizzes are not used. A topic without topic-specific assessment content shows starter guidance and official resources; its practice can receive feedback but cannot change mastery. Every lesson displays its content version, source and review status.

Built-in History lessons include school-guide-based notes for Medicine and Elizabeth. Other confirmed History topics receive a revision activity and a link to the official specification. In-app practice questions are original; linked exam-board materials remain the authoritative source for official past questions and mark schemes.

Confirmed courses are AQA Mathematics 8300 Higher, English Language 8700, English Literature 8702 with *Macbeth*, *A Christmas Carol*, *An Inspector Calls* and Power and Conflict, AQA Combined Science: Trilogy 8464 Higher, Edexcel History 1HI0, AQA Geography 8035, Pearson Edexcel Business 1BS0, and AQA Design and Technology 8552. Trilogy is recorded as a working assumption pending sight of the final entry code. Geography option units and named case studies, plus the D&T specialist material area, remain explicitly marked as choices to confirm and stay out of adaptive planning until then.

## Architecture

```text
Browser (React) -> /api/* (Cloudflare Worker) -> D1
```

- `src/` contains browser-only UI and API client code.
- `worker/api/` owns routing, validation and predictable error responses.
- `worker/auth/` owns PBKDF2 password verification and signed HTTP-only sessions.
- `worker/services/planner/` defines the UI-independent planner boundary for later phases.
- `database/migrations/` contains repeatable versioned schema changes.
- `database/seed/` contains non-secret development records.

Passwords are never stored in D1 or source control. Authentication secrets are Worker secrets or local `.dev.vars` values. `SameSite=Strict`, HTTP-only cookies and same-origin checks protect state-changing endpoints; production cookies also use `Secure`.

## Cloudflare setup and deployment

These steps require you to sign into your own Cloudflare account; do not share tokens or passwords.

1. Authenticate Wrangler:

   ```sh
   npx wrangler login
   ```

2. Create the production database:

   ```sh
   npx wrangler d1 create gcse-revision-db
   ```

3. Replace the placeholder `database_id` in `wrangler.jsonc` with the ID returned by Cloudflare.

4. Apply migrations and seed the development accounts, subjects and availability:

   ```sh
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

5. Store secrets interactively (use the PBKDF2 hashes, not plaintext passwords):

   ```sh
   npx wrangler secret put STUDENT_PASSWORD_HASH
   npx wrangler secret put PARENT_PASSWORD_HASH
   npx wrangler secret put SESSION_SECRET
   # Optional: enables one-tap automatic marking inside the app
   npx wrangler secret put GEMINI_API_KEY
   ```

   `GEMINI_API_KEY` is optional. AI routes are off by default in production and require a Parent to enable them. Without a key, an enabled account can use the external Gemini share/copy flow; pasted feedback cannot change mastery. With a key, the one-tap route is also available and returns signed evidence. A configured key is used only by the Worker and is never returned to the browser. `GEMINI_MODEL` defaults to `gemini-2.5-flash` and can be set as a non-secret Worker variable.

   Generate hashes with the current `npm run auth:hash` script. Cloudflare's Worker PBKDF2 implementation rejects the older 210,000-iteration hashes; the script now uses 100,000 iterations. Use long, unique passwords and keep the production passwords in a password manager.

6. Change `ENVIRONMENT` in `wrangler.jsonc` to `production`, run `npm run check`, then deploy with `npm run deploy`.

Backups, restore rehearsal and the post-deployment smoke test are documented in [OPERATIONS.md](OPERATIONS.md).

The seed creates `oliver` and `parent` accounts. The Oliver username is also applied to existing databases by migration `0011_rename_student_oliver.sql`. Production deployment is intentionally manual; CI validates every push without requiring account secrets.

## Phase 2 curriculum scope

The local migrations configure AQA Mathematics 8300 Higher, English Language 8700, English Literature 8702, Combined Science: Trilogy 8464 Higher, and Pearson Edexcel GCSE History 1HI0. English Literature uses *Macbeth*, *A Christmas Carol*, *An Inspector Calls* and Power and Conflict. Trilogy is explicitly recorded as the working Science assumption so a later migration can replace it cleanly if entry code 8465 is confirmed.

History covers Medicine in Britain and the Western Front (Paper 1, option 11), Early Elizabethan England and The American West (Paper 2, option 2M), and Weimar and Nazi Germany (Paper 3, option 31). The school guides in `SchoolRevisionGuides/History` cover Medicine and Elizabeth; the Edexcel Issue 6 specification supplies the complete map, including Germany and the American West.

The AQA Geography, Pearson Edexcel Business and AQA Design and Technology specification maps and assessments are included. Geography choices and named case studies and the D&T specialist material area remain `TBC`; the app shows these rows but excludes them from adaptive planning until confirmed. The Geography guide also links to the requested BBC Bitesize and Internet Geography resources.

## Phase 4 adaptive planner

The planner ranks confirmed, applicable leaf topics using mastery gap, exam proximity, time since revision, importance, incomplete coverage and manual priority. It combines an equal subject baseline with remaining workload so every active course receives regular attention without ignoring larger or weaker courses. Within each subject it rotates uncovered topics before repeating them, while RAG state, assessment results, recent successful revision, tutor coverage and requests for more practice still influence priority.

Completed learning creates a dated next-review signal. When that review becomes due, the planner adds a short closed-book retrieval segment to a later session and labels it clearly as earlier learning. The Student can record a delayed-recall score separately from the main topic check; that evidence updates mastery and schedules the next interval. A typical 35-minute mixed session reserves about eight minutes for one due review, preventing retrieval work from crowding out new syllabus coverage.

The development seed includes weekly availability plus alternating Tuesday Science/Mathematics tutors. Replanning preserves completed/rescheduled history and locked manual sessions, recreates tutor occurrences from their recurrence rules and replaces only unlocked future generated sessions. Availability exceptions can reduce capacity to zero and protect streaks; missed work returns to the priority pool rather than becoming an overdue list.

## Phase 5 Student experience

Students now land on a Today dashboard showing ordered revision and tutor sessions, planned time, current RAG state and a plain-language planning reason. Starting is immediate; completion records actual time, confidence, an optional quick-check score and notes, then recalculates mastery and replans future work. Students can also mark work as unavailable.

The weekly view lays out Monday–Sunday with daily workload and controls to postpone, swap or request a replan. Subject overviews combine grades, mastery, topic coverage and the next planned activity. Topic detail panels show confidence, review dates, cumulative work, assessments and mastery history, with actions to revise immediately, self-test or flag a weak topic.

## Phase 6 analytics and Parent experience

Analytics report coverage, mastery, workload remaining and consistency as separate measures. Overall and per-subject views include RAG distribution and accessible ideal-versus-actual burndown charts. The Parent dashboard summarises on-track status, planned/completed sessions and minutes, subject progress, weak topics, the next seven days, exams and availability exceptions. The calendar lets a Parent record holidays, school events or illness and optionally protect the Student's streak while the plan adapts.

## Phase 7 gamification and refinement

Completed sessions, self-tests, mastery transitions and weekly targets award idempotent XP. The Student dashboard shows level progress, a configurable weekly minutes goal, protected streaks and restrained achievements. Semantic landmarks, keyboard focus, text RAG labels, reduced-motion support, mobile layouts and accessible SVG descriptions support the accessibility baseline.

The automated suite currently has 82 unit/integration checks and eight Playwright journeys across desktop and mobile Chromium. It verifies sign-in, deep links and refresh, topic learning, phone hand-off, optional marking, trustworthy completion/evidence, Parent reset and representative WCAG scans. Production builds remove copied local secret files before deployment and responses include CSP, framing, MIME, referrer, permissions and production HSTS protections. `npm audit` reports no known dependency vulnerabilities at the time of this update.

## Phase 3 progress model

The Student Progress view supports the four initial confidence choices and manually entered assessment scores. The Worker calculates mastery from assessment performance (40%), confidence (25%), session evidence (20%) and recency (15%), redistributing weights when evidence is unavailable. RAG thresholds are Grey for no evidence, Red for 0–49, Amber for 50–74 and Green for 75–100. Every update is recorded in mastery history and receives a next-review date. Parent accounts can view progress but cannot submit Student evidence.
