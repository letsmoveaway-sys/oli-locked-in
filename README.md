# Oli: Locked In

Oli's private GCSE dashboard: a complete seven-phase V1 revision and learning application. It includes a responsive React client, Cloudflare Worker API, D1 schema and development data, signed cookie authentication, Parent course configuration, a confirmed Edexcel History map, built-in lessons and practice, evidence-based progress, an adaptive 14-day planner, Student and Parent dashboards, workload analytics, gamification and automated browser testing.

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

Sign in with username `student` or `parent` and the matching password chosen in step 2.

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

Open **Learn & practise** after signing in. Confirmed subjects include:

- the relevant exam-board paper structure and assessment objectives;
- clear advice on what examiners award marks for;
- links to the official specification, past papers and mark schemes, plus selected free learning resources;
- a navigable topic map whose confirmed topics open revision activities;
- learning objectives, key knowledge, worked examples, original practice questions, hints and revealable model answers.

Opening a topic now starts a full-page four-stage session: learn the topic, study worked examples, complete an independent test, then review the marked answers and direct topic resources. Test questions are automatically marked by weighted marks; Student results are saved directly to mastery and influence later planning. No manual percentage entry is needed.

Built-in History lessons include school-guide-based notes for Medicine and Elizabeth. Other confirmed History topics receive a revision activity and a link to the official specification. In-app practice questions are original; linked exam-board materials remain the authoritative source for official past questions and mark schemes.

Edexcel History is the only confirmed course. Other subjects display their exam board and specification as TBC until the school details are provided. They have no board-specific paper map or revision links and are excluded from topic planning.

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
   ```

   Generate hashes with the current `npm run auth:hash` script. Cloudflare's Worker PBKDF2 implementation rejects the older 210,000-iteration hashes; the script now uses 100,000 iterations. Use long, unique passwords and keep the production passwords in a password manager.

6. Change `ENVIRONMENT` in `wrangler.jsonc` to `production`, run `npm run check`, then deploy with `npm run deploy`.

The remote seed uses generic usernames and display names. Change them directly in D1 if the family wants different private account names. Production deployment is intentionally manual until the Cloudflare account and database are connected; CI validates every push without requiring account secrets.

## Phase 2 curriculum scope

The local migrations configure Pearson Edexcel GCSE History (1HI0) as the confirmed course. History covers Medicine in Britain and the Western Front (Paper 1, option 11), Early Elizabethan England and The American West (Paper 2, option 2M), and Weimar and Nazi Germany (Paper 3, option 31). The school guides in `SchoolRevisionGuides/History` cover Medicine and Elizabeth; the Edexcel Issue 6 specification supplies the complete map, including Germany and the American West. The requested “Health and the People” unit appears under Edexcel's official title “Medicine in Britain” in the course map. All other subjects remain TBC until their board and specification are supplied.

Unconfirmed boards, Literature texts, Science course/tier, Geography choices/case studies and D&T specialist area are marked `TBC`. Topic planning includes only confirmed courses.

## Phase 4 adaptive planner

The planner ranks confirmed, applicable leaf topics using mastery gap, exam proximity, time since revision, importance, incomplete coverage and manual priority. It adds modifiers for RAG state, assessment results, recent successful revision, tutor coverage and requests for more practice. It then fills the next 14 days within weekly availability while maintaining subject variety, limiting a subject to two independent sessions per day and avoiding consecutive repetition.

The development seed includes weekly availability plus alternating Tuesday Science/Mathematics tutors. Replanning preserves completed/rescheduled history and locked manual sessions, recreates tutor occurrences from their recurrence rules and replaces only unlocked future generated sessions. Availability exceptions can reduce capacity to zero and protect streaks; missed work returns to the priority pool rather than becoming an overdue list.

## Phase 5 Student experience

Students now land on a Today dashboard showing ordered revision and tutor sessions, planned time, current RAG state and a plain-language planning reason. Starting is immediate; completion records actual time, confidence, an optional quick-check score and notes, then recalculates mastery and replans future work. Students can also mark work as unavailable.

The weekly view lays out Monday–Sunday with daily workload and controls to postpone, swap or request a replan. Subject overviews combine grades, mastery, topic coverage and the next planned activity. Topic detail panels show confidence, review dates, cumulative work, assessments and mastery history, with actions to revise immediately, self-test or flag a weak topic.

## Phase 6 analytics and Parent experience

Analytics report coverage, mastery, workload remaining and consistency as separate measures. Overall and per-subject views include RAG distribution and accessible ideal-versus-actual burndown charts. The Parent dashboard summarises on-track status, planned/completed sessions and minutes, subject progress, weak topics, the next seven days, exams and availability exceptions. The calendar lets a Parent record holidays, school events or illness and optionally protect the Student's streak while the plan adapts.

## Phase 7 gamification and refinement

Completed sessions, self-tests, mastery transitions and weekly targets award idempotent XP. The Student dashboard shows level progress, a configurable weekly minutes goal, protected streaks and restrained achievements. Semantic landmarks, keyboard focus, text RAG labels, reduced-motion support, mobile layouts and accessible SVG descriptions support the accessibility baseline.

Playwright verifies the critical journey in isolated desktop and mobile Chromium environments: sign in, choose a topic, start revision, complete it with time/confidence/score/notes, receive XP and see the evidence in topic history. Production builds remove copied local secret files before deployment and responses include CSP, framing, MIME, referrer, permissions and production HSTS protections.

## Phase 3 progress model

The Student Progress view supports the four initial confidence choices and manually entered assessment scores. The Worker calculates mastery from assessment performance (40%), confidence (25%), session evidence (20%) and recency (15%), redistributing weights when evidence is unavailable. RAG thresholds are Grey for no evidence, Red for 0–49, Amber for 50–74 and Green for 75–100. Every update is recorded in mastery history and receives a next-review date. Parent accounts can view progress but cannot submit Student evidence.
