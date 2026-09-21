# GCSE Revision Planner — V1 Build Specification

**Version:** 1.0  
**Status:** Approved starting specification  
**Target examination period:** Summer 2027  
**Primary users:** One GCSE student and one parent  

## 1. Purpose

Build a private, responsive web application that tells the student what to revise next, adapts when circumstances change, and shows both student and parent whether revision is on track.

The product must answer four questions clearly:

1. What should I revise today?
2. Why has the app selected it?
3. How much progress have I made?
4. Am I on track for my GCSE examinations?

The adaptive planner is the core product. Quizzes and AI tutoring are useful later additions, but V1 must remain fully useful without AI.

## 2. V1 success outcome

The first usable release must support this end-to-end journey:

1. Parent and student sign in with separate accounts.
2. Parent configures subjects, availability, tutor sessions and known course options.
3. The app loads applicable syllabus topics.
4. The planner creates a rolling 14-day revision plan.
5. The student opens the app and immediately sees today's revision.
6. The student completes a session and records confidence.
7. Topic mastery, RAG status, XP and progress update.
8. Future sessions are recalculated when required.
9. The parent sees progress, weak areas and whether the plan is on track.

## 3. Users and permissions

### 3.1 Student

The student can:

- View today's revision and the weekly plan.
- Start, complete, partially complete, skip or request a swap for a session.
- See why each topic was selected.
- Record confidence and optional notes after a session.
- Enter quiz or assessment results where enabled.
- Browse subjects, papers, topics and progress history.
- View coverage, mastery, workload, consistency, burndown, XP and streaks.
- Add personal availability exceptions.
- Flag a topic for additional revision.

### 3.2 Parent

The parent can:

- View all progress and planning information.
- Configure subjects, exam boards, tiers, texts and course options.
- Enter current and target grades.
- Configure normal weekly availability.
- Add holidays, events, illness and other exceptions.
- Configure recurring tutor sessions.
- Enter or correct exam dates.
- Set a manual topic priority.
- Lock or change future sessions.

Parent administration routes and operations must be enforced by the backend, not merely hidden in the interface.

## 4. Initial subjects

| Subject | Initial board | Configuration still required |
|---|---|---|
| Mathematics | TBC | Exam board, specification and tier |
| English Language | TBC | Exam board and specification |
| English Literature | TBC | Exam board, texts and poetry cluster |
| Combined Science | TBC | Exam board, course and tier |
| History | Pearson Edexcel (1HI0) | Medicine in Britain and the Western Front; Early Elizabethan England; The American West; Weimar and Nazi Germany confirmed |
| Geography | TBC | Exam board, options and case studies |
| Business Studies | TBC | Exam board and specification |
| Design & Technology | TBC | Exam board and specialist technical area |

Unknown options must be stored as **TBC** and must not block planning for confirmed subjects.

## 5. Curriculum model

Use this hierarchy:

`Qualification → Subject → Paper/Component → Topic → Subtopic`

Examples:

- `Mathematics → Number → Fractions → Operations with fractions`
- `Combined Science → Physics → Electricity → Series and parallel circuits`

Each syllabus item must support:

| Field | Purpose |
|---|---|
| `id` | Stable unique identifier |
| `subject_id` | Owning subject |
| `parent_topic_id` | Hierarchy relationship |
| `component` | Relevant paper or unit |
| `name` | Display name |
| `description` | Concise syllabus-aligned description |
| `exam_board` | Confirmed board, or TBC |
| `specification_code` | Official qualification identifier |
| `tier` | Foundation, Higher, both or not applicable |
| `estimated_effort` | Relative workload units |
| `importance` | Relative planning weight |
| `source_reference` | Official source URL/reference |
| `specification_version` | Version or year verified |
| `active` | Whether the topic applies to this course |

Syllabus content should be derived from official exam-board specifications and paraphrased. School-specific options can be enabled or disabled later.

## 6. Topic progress state

Each active topic has student-specific progress containing:

- Mastery score from 0–100.
- RAG status.
- Confidence score.
- Last revised date/time.
- Total revision sessions and minutes.
- Most recent assessment result.
- Next recommended review date.
- Current calculated priority.
- Optional manual priority.
- Student notes.
- Mastery history.

### 6.1 RAG thresholds

| Score | State | Meaning |
|---:|---|---|
| No evidence | Grey | Not assessed |
| 0–49 | Red | Needs significant work |
| 50–74 | Amber | Partial understanding |
| 75–100 | Green | Good current mastery |

Thresholds must be configurable. A completed revision session alone must not automatically make a topic Green.

### 6.2 Initial confidence assessment

V1 must allow a quick initial assessment:

- Don't know it
- Struggling
- OK
- Confident

This creates an approximate starting score. Topics without evidence remain Grey.

### 6.3 Mastery calculation

Use an understandable weighted model:

| Input | Default weight |
|---|---:|
| Quiz/assessment performance | 40% |
| Student confidence | 25% |
| Session/revision evidence | 20% |
| Recency and retention | 15% |

Redistribute weights proportionally when an input is unavailable. Mastery may decay gradually when a topic has not been revisited. The score is a planning signal, not a formal predicted grade.

## 7. Adaptive planner

### 7.1 Planning principle

The planner optimises for:

> What is the most valuable use of the next 35 minutes?

It must not simply schedule topics in syllabus order.

### 7.2 Priority calculation

Conceptually:

`priority = mastery gap + exam urgency + forgetting risk + importance + incomplete coverage + manual priority`

Default weighting:

| Factor | Weight |
|---|---:|
| Mastery gap | 35% |
| Exam proximity | 20% |
| Time since revision | 15% |
| Topic importance | 10% |
| Not yet covered | 10% |
| Manual/current-school priority | 10% |

Modifiers:

- Increase for Red or Grey topics, poor recent assessments and approaching exams.
- Temporarily reduce after recent successful revision.
- Reduce same-day independent study for a subject already covered by a tutor, unless explicitly needed.
- Set priority to zero for inactive or inapplicable topics.
- Increase when the student requests more practice.

All generated sessions must store a short, student-readable explanation, such as:

> Red topic · low recent quiz score · not revised for 18 days

### 7.3 Planning constraints

- Default session length is 35 minutes; configurable from 30–40 minutes.
- Never schedule outside stated availability.
- Never schedule inactive syllabus content.
- Prioritise Red before Amber before Green, subject to urgency and coverage.
- Maintain reasonable subject variety.
- Avoid the same topic in consecutive sessions unless necessary.
- Normally schedule no more than two sessions for the same subject in one day.
- Revisit Green topics using spaced maintenance rather than treating them as permanently complete.
- Account for tutor sessions and exams.
- Do not overload the day after illness or another unavailable period.
- Respect manually locked sessions.

### 7.4 Planning horizon

Generate a detailed rolling plan 14 days ahead. Beyond that, show a forecast rather than fixed sessions. Recalculate daily and after material changes.

### 7.5 Replanning triggers

Replan future sessions when:

- A session is completed, partially completed, missed or skipped.
- Confidence changes.
- An assessment is recorded.
- Availability changes.
- Illness, holiday or an event is added.
- An exam date changes.
- A tutor session is added or amended.
- Course configuration changes.
- Manual topic priority changes.

Replanning must preserve:

- Completed history.
- Tutor sessions.
- Exams and unavailable periods.
- Manually locked future sessions.

Uncompleted automatically generated future sessions may be replaced.

### 7.6 Missed work

Missed sessions must not accumulate as an intimidating overdue list.

When a session is missed:

1. Mark the original as missed or rescheduled.
2. Return its outstanding workload to the planning pool.
3. Recalculate future priorities.
4. Allocate work to an appropriate future slot if it remains valuable.
5. Tell the student: **Your plan has been adjusted.**

### 7.7 Planner service interface

Planner logic must be independent of UI components. It should expose functions equivalent to:

```ts
calculateMastery(topicEvidence)
calculateTopicPriority(topic, context)
calculateRemainingWorkload(topic)
generateRevisionPlan(context, horizonDays)
replanAfterChange(change, context)
calculateBurndown(context)
```

## 8. Sessions and activities

A revision session contains:

- Date and optional start time/period.
- Subject and topic/subtopic.
- Revision activity type.
- Planned and actual duration.
- Planner explanation.
- Completion status.
- Confidence afterwards.
- Optional assessment result and notes.
- XP awarded.
- Whether it was generated, manual or locked.

Statuses:

- Planned
- Completed
- Partially completed
- Skipped
- Rescheduled
- Cancelled due to illness/unavailability
- Tutor session

Activity types:

- Learn/review
- Flashcards
- Active recall
- Practice questions
- Exam question
- Past-paper section
- Tutor session
- School-assigned revision
- Student-selected revision

## 9. Availability and tutor sessions

Store available revision minutes for each weekday. Support one-off exceptions with start/end dates, reason, reduced or zero availability, and whether a streak is protected.

Initial tutor pattern:

- Tuesday, Week A: Science tutor.
- Tuesday, Week B: Mathematics tutor.

Tutor sessions count as study activity but must not automatically make a topic Green. When topics covered are recorded, the session may contribute mastery evidence.

## 10. Exams

Store:

- Subject and paper/component.
- Exam date and time.
- Duration.
- Exam board.
- Confirmed/unconfirmed state.
- Official source and last verified date.

Priority rises as an exam approaches. After a paper has been sat, work exclusively relevant to that paper is removed from future planning.

## 11. Progress measures

Keep these separate:

| Measure | Definition |
|---|---|
| Coverage | Percentage of applicable syllabus visited |
| Mastery | Current evidence-based understanding |
| Workload remaining | Estimated revision effort still required |
| Consistency | Completion against the agreed plan |

Do not combine them into one misleading percentage.

### 11.1 Workload model

Suggested formula:

`topic work remaining = estimated topic effort × mastery gap`

Example: effort 4 units and mastery 25% gives `4 × 0.75 = 3` units remaining. Green topics retain a small maintenance requirement.

### 11.2 Burndown

Show ideal versus actual remaining workload over time:

- X-axis: date.
- Y-axis: revision workload remaining.
- Filter by subject.
- Indicate on track, slightly behind or significantly behind.

## 12. Required screens

### 12.1 Sign in

- Secure sign-in.
- Separate Student and Parent roles.
- Clear error and recovery states.

### 12.2 Student dashboard / Today

This is the default student screen and must show:

- Today's date and total planned minutes.
- Tutor and revision sessions in order.
- Subject, topic, activity and duration.
- RAG state and human-readable reason for selection.
- Start, complete, cannot-do, swap and view-topic actions.
- Overall coverage/mastery summary.
- This week's planned/completed sessions and minutes.
- Priority weak areas.
- XP, level, weekly goal and streak.

The student should not need to navigate before discovering what to revise.

### 12.3 Weekly planner

- Monday–Sunday layout.
- Planned and tutor sessions.
- Unavailable periods.
- Total minutes per day.
- Move, swap, postpone and request-replan actions.

### 12.4 Subject overview

- Overall mastery and RAG state.
- Syllabus coverage.
- Workload remaining.
- Current and target grade.
- Latest and next activity.
- Expandable paper/topic hierarchy.

### 12.5 Topic detail

- Topic and subject context.
- Mastery, RAG, confidence and last revised.
- Total sessions/minutes.
- Assessment and revision history.
- Next planned review.
- Syllabus-aligned description and component.
- Notes.
- Revise now, change confidence, test me, flag for more work and view history actions.

`Test me` may be a placeholder or simple manually scored activity in early V1.

### 12.6 Progress and burndown

- Overall and per-subject filters.
- Coverage, mastery, remaining workload and consistency.
- Ideal versus actual burndown.
- RAG distribution and trend.

### 12.7 Calendar and availability

- Weekly availability template.
- Tutor sessions.
- Exams.
- Holidays, school events, illness and other exceptions.

### 12.8 Parent dashboard

- Overall on-track status.
- Sessions and minutes planned/completed this week.
- Subject RAG summary.
- Top weak topics.
- Overall and subject burndown.
- Next seven days of workload.
- Upcoming exams and unavailable periods.
- Links to course, availability and tutor configuration.

### 12.9 Course configuration

For each subject:

- Active state.
- Exam board, qualification and specification.
- Tier.
- Course options, texts and optional units.
- Current and target grade.
- TBC/incomplete indicator.

## 13. Gamification

Use restrained, age-appropriate gamification:

- XP and levels.
- Weekly targets.
- Daily streak and weekly consistency.
- Achievements and personal bests.

Suggested configurable XP awards:

| Activity | XP |
|---|---:|
| Complete planned session | 10 |
| Complete practice quiz | 5 |
| Red to Amber | 20 |
| Amber to Green | 30 |
| Meet weekly target | 50 |

Recorded illness and planned rest/unavailable days protect the streak. Tutor sessions can satisfy the day's planned activity. Weekly consistency is more important than a daily streak.

## 14. Data model

Minimum V1 entities:

### `users`

`id`, `email_or_username`, `display_name`, `role`, `auth_identity`, `created_at`, `active`

### `student_profiles`

`user_id`, `exam_year`, `default_session_minutes`, `xp`, `level`

### `subjects`

`id`, `name`, `exam_board`, `specification_code`, `active`

### `student_subjects`

`student_id`, `subject_id`, `tier`, `target_grade`, `current_grade`, `options_json`, `active`

### `topics`

`id`, `subject_id`, `parent_topic_id`, `component`, `name`, `description`, `tier`, `estimated_effort`, `importance`, `source_reference`, `specification_version`, `active`

### `topic_progress`

`student_id`, `topic_id`, `mastery_score`, `confidence`, `rag_status`, `last_revised_at`, `total_minutes`, `next_review_at`, `priority_score`, `manual_priority`

### `revision_sessions`

`id`, `student_id`, `topic_id`, `subject_id`, `scheduled_at`, `planned_minutes`, `actual_minutes`, `session_type`, `status`, `confidence_after`, `planner_reason`, `source`, `locked`, `xp_awarded`

### `assessments`

`id`, `student_id`, `topic_id`, `score`, `maximum_score`, `percentage`, `assessment_type`, `completed_at`

### `weekly_availability`

`id`, `student_id`, `weekday`, `available_minutes`, `start_time`, `active`

### `availability_exceptions`

`id`, `student_id`, `start_datetime`, `end_datetime`, `reason`, `available_minutes`, `protect_streak`

### `tutor_sessions`

`id`, `student_id`, `subject_id`, `recurrence_rule`, `weekday`, `start_date`, `start_time`, `duration_minutes`, `notes`

### `exams`

`id`, `subject_id`, `component`, `exam_datetime`, `duration_minutes`, `confirmed`, `source`, `last_verified_at`

### `mastery_history`

`id`, `student_id`, `topic_id`, `score`, `recorded_at`, `reason`

### `xp_events`

`id`, `student_id`, `event_type`, `points`, `created_at`, `related_session_id`

### `settings`

Configurable thresholds, weights, XP values and planner defaults.

All tables require appropriate primary keys, foreign keys, indexes, timestamps and integrity constraints. Database changes must use versioned migrations.

## 15. API requirements

Suggested route groups:

```text
/api/auth
/api/dashboard
/api/subjects
/api/topics
/api/progress
/api/sessions
/api/planner
/api/availability
/api/tutors
/api/exams
/api/assessments
/api/parent
/api/settings
```

The browser must not manipulate the database directly. Validate request bodies and permissions in the API. Return predictable error shapes and appropriate status codes.

## 16. Technical architecture

Recommended implementation:

- **Frontend:** React, TypeScript and Vite.
- **Backend:** Cloudflare Worker in the same project.
- **Database:** Cloudflare D1.
- **Deployment:** Cloudflare Workers static assets plus Worker API.
- **Source control:** GitHub.
- **Testing:** Vitest for units/services and Playwright for critical user journeys.
- **Styling:** A lightweight accessible approach chosen during scaffolding; avoid unnecessary component-library lock-in.

Logical flow:

`Browser → React application → Worker API → D1 database`

Every push/merge to `main` should be capable of automated production deployment after checks pass.

Suggested repository structure:

```text
gcse-revision/
├── src/
│   ├── components/
│   ├── features/
│   │   ├── planner/
│   │   ├── progress/
│   │   ├── subjects/
│   │   ├── sessions/
│   │   └── parent/
│   ├── pages/
│   └── services/
├── worker/
│   ├── api/
│   ├── auth/
│   └── services/
│       └── planner/
├── database/
│   ├── migrations/
│   └── seed/
├── data/
│   └── syllabus/
│       └── edexcel/
├── tests/
├── package.json
├── wrangler.jsonc
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 17. Authentication and privacy

- Support one Student and one Parent account in V1.
- Never store plaintext passwords.
- Use secure, HTTP-only cookies or an equivalent secure session mechanism.
- Protect state-changing operations against common web attacks.
- Authorise every protected backend operation by role.
- Expose no student data publicly.
- Keep authentication behind a clear interface so the provider can change later.
- Do not add analytics or third-party tracking by default.

## 18. Responsive design and accessibility

- Design student flows mobile-first.
- Support phone, tablet, laptop and desktop.
- Today's plan, session completion and confidence input must be easy on a phone.
- Use semantic HTML, visible focus states and keyboard navigation.
- Meet WCAG 2.2 AA contrast where practical.
- Never communicate RAG status by colour alone; show text such as **Red — Needs work**.
- Respect reduced-motion settings.

The architecture should permit later PWA installation and push reminders, but offline support and notifications do not block V1.

## 19. Empty, loading and error states

The app must remain useful with incomplete data.

Examples:

- `English Literature configuration incomplete` rather than blocking all planning.
- A first-run explanation when no topics have evidence.
- A useful message and retry action if planning fails.
- Skeleton/loading state for dashboards.
- Confirmation when a plan is adjusted.

## 20. Non-functional requirements

| Area | Requirement |
|---|---|
| Cost | Target £0/month for initial family use within free-tier limits |
| Performance | Primary views should normally load in about two seconds on typical home/mobile internet |
| Reliability | Student data persists across deployments; migrations are safe and repeatable |
| Security | Server-side authentication, authorisation and validation |
| Privacy | Only the two authorised accounts can access personal progress |
| Maintainability | Strict TypeScript, isolated planner service, versioned migrations and tests |
| Observability | Useful server logs without recording sensitive content unnecessarily |

## 21. Required automated tests

At minimum:

1. **Missed day:** outstanding work is returned to the pool without creating overdue debt.
2. **Illness:** three unavailable days remove planned work and preserve the streak when configured.
3. **Exam urgency:** equally weak topics favour the earlier examination.
4. **Tutor Tuesday:** a Maths tutor session reduces additional Maths scheduling that day.
5. **Weak assessment:** a poor result increases topic priority.
6. **Strong assessment:** repeated strong results reduce immediate priority and create a later maintenance review.
7. **Reduced availability:** decreasing Saturday capacity redistributes future work.
8. **Locked session:** replanning does not move a locked manual session.
9. **Inactive course option:** inactive topics are never scheduled.
10. **Role enforcement:** Student requests to parent-only operations are rejected.
11. **End-to-end:** sign in, view today's session, complete it, add confidence and see progress update.

## 22. First-run setup

Parent setup flow:

1. Student display name and exam year (2027).
2. Active subjects.
3. Exam boards/specifications.
4. Known course options; unknown options remain TBC.
5. Current and target grades, if known.
6. Standard weekly availability.
7. Alternating Tuesday Science/Maths tutors.
8. Optional quick confidence assessment.
9. Generate the first 14-day plan.

## 23. Delivery phases

### Phase 1 — Foundation

- Repository and project scaffold.
- React/TypeScript UI and Worker API.
- D1 database and migrations.
- Development seed data.
- Authentication and role protection.
- CI checks and deployment documentation.

### Phase 2 — Curriculum and setup

- Subject/course configuration.
- Topic hierarchy.
- Incremental exam-board syllabus seed data.
- First-run setup flow.

### Phase 3 — Progress model

- Confidence, assessments and session evidence.
- Mastery calculation.
- RAG state and mastery history.

### Phase 4 — Planner

- Availability and tutor recurrence.
- Priority scoring and slot allocation.
- Rolling 14-day generation.
- Missed work, illness and adaptive replanning.
- Planner unit tests.

### Phase 5 — Student experience

- Today/dashboard.
- Session completion.
- Weekly planner.
- Subject and topic views.

### Phase 6 — Analytics and parent experience

- Workload calculation and burndown.
- Progress views.
- Parent dashboard and administration.

### Phase 7 — Gamification and refinement

- XP, levels, streaks and weekly goals.
- Responsive and accessibility refinement.
- End-to-end tests and production hardening.

## 24. V1 acceptance criteria

V1 is accepted when:

- Student and Parent can sign in separately.
- Role-restricted operations are enforced by the API.
- Subjects and applicable exam-board topics can be configured and loaded.
- Unknown course choices do not block usable subjects.
- Weekly availability and alternating tutor sessions can be configured.
- The planner creates an explainable rolling 14-day plan.
- The student sees today's plan immediately after sign-in.
- A session can be completed with actual time and confidence.
- Mastery and RAG state update using recorded evidence.
- Missed sessions, illness and availability changes adapt future work.
- Completed history and locked sessions are preserved during replanning.
- Coverage, mastery, workload and consistency are reported separately.
- Overall and subject burndown are visible.
- Parent can see progress, weak areas and on-track status.
- The application works comfortably on phone and desktop.
- Automated tests cover the critical planner and security scenarios.
- Data persists through a deployment.
- The project includes clear local-development and Cloudflare-deployment instructions.
- Normal family usage stays within the intended free tier.

## 25. Explicitly outside V1

These must not delay the first usable release:

- Advanced AI answer marking.
- Full past-paper ingestion and automatic marking.
- OCR of school reports.
- School management-system integration.
- Teacher accounts.
- Multiple families or public registration.
- Native iOS/Android applications.
- Social features or public leaderboards.
- Paid services.
- Email, SMS or push-notification infrastructure.

## 26. AI-ready extension for V2

The core application should define an internal `AIService` boundary for later features:

- Explain this topic.
- Explain it another way.
- Quiz me.
- Generate an exam-style question.
- Mark my answer and explain mistakes.
- Create flashcards or revision notes.

Every AI request must receive subject, board, specification, tier, topic and exam year. AI should operate against curated curriculum data and must not invent syllabus requirements.

## 27. Information still needed from the family

These values can be added after development starts:

- Mathematics tier.
- Combined Science course and tier.
- English Literature texts and poetry cluster.
- Geography options and relevant case studies.
- Design & Technology specialist area.
- Current and target grades.
- Exact available revision minutes by weekday.
- Tutor start date, time and typical duration.
- Confirmed exam dates when available.

## 28. Local development prerequisites

After installing VS Code, install or create:

1. **Git** — source control.
2. **Node.js LTS** — includes `npm` for installing and running the application.
3. **Codex for VS Code** — open the project folder and allow it to edit that workspace.
4. **GitHub account** — for the private repository and version history.
5. **Cloudflare account** — for the Worker and D1 database when deployment begins.
6. **Optional Wrangler login** — Codex can guide this when the first deployment is ready.

Do not send account passwords, API tokens or recovery codes to Codex. Complete browser/CLI sign-in prompts yourself and store any required secrets in local environment files or the hosting platform's secret store. Environment files containing secrets must be excluded from Git.

## 29. Initial Codex implementation instruction

After creating and opening an empty folder named `gcse-revision` in VS Code, attach this specification and ask Codex:

> Build Phase 1 of this specification in the currently open folder. Start by inspecting the workspace, then create a React + TypeScript + Vite application with a Cloudflare Worker API, D1 migrations, development seed data, strict TypeScript, automated tests and a README. Keep planner logic separate from UI code. Use current stable tooling, do not add paid dependencies, never commit secrets, and run all available checks before reporting completion. Implement only Phase 1 initially and tell me which manual account or Cloudflare steps I need to perform.

Proceed phase by phase, reviewing and testing each phase before moving to the next.

---

**Guiding product principle:** The application should reduce decision-making and reliably answer, **“What is the most valuable use of the next 35 minutes?”**
