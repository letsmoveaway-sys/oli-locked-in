# GCSE Student readiness plan

Execution plan for taking **Oli: Locked In** from a strong V1 proof of concept to a dependable daily revision app for a UK Year 11 student sitting GCSEs in Summer 2027.

Last updated: 1 October 2026.

## Implementation status

The code-level reliability, mobile daily-driver, guided configuration, planning, privacy, routing, export/recovery and accessibility-automation work in this plan has been implemented. The maintained checkbox record is in `APP-IMPROVEMENT-BACKLOG.md`; the current automated baseline is 82 unit/integration checks and eight desktop/mobile browser journeys.

The app is useful now as a personal planner, topic-practice and evidence tool, but Gate C is deliberately still open. It requires the Student's real final entries and dates, subject-teacher QA of content, deeper exam-question ladders, manual assistive-technology checks and ten school days of real Year 11 use. Those are evidence and human-review gates, not tasks that can be completed truthfully by changing code.

This plan assumes:

- one Student and one Parent account remain the V1 scope;
- the Student's real exam entries, options and school commitments will be confirmed before planning is treated as authoritative;
- mobile use after school is the primary Student experience;
- desktop remains important for Parents, analytics and longer written work;
- official exam-board material remains authoritative;
- AI marking is optional and is not required for the app to be useful;
- the existing React, Cloudflare Worker and D1 architecture will be improved incrementally rather than rebuilt.

The tracked task list remains in `APP-IMPROVEMENT-BACKLOG.md`. This document explains the delivery order and the conditions for calling each stage complete.

## 1. Product outcome

The app is ready for a GCSE student when the Student can:

1. open it on a phone and understand the next useful action within ten seconds;
2. begin revision in no more than two deliberate taps after sign-in;
3. trust that completed work, scores, XP and mastery are saved accurately;
4. see a realistic plan based on the correct courses, options, mocks and final examinations;
5. complete useful revision without needing AI or another paid service;
6. receive feedback that explains the next improvement rather than only producing a score;
7. recover safely from expired sessions, failed requests and interrupted work;
8. use the app with keyboard, screen reader, zoom and reduced-motion settings;
9. understand what data is stored and when work or photographs leave the app;
10. keep using it regularly because it reduces revision decisions rather than adding administration.

## 2. Release gates

### Gate A — safe private beta

The app may be used for real revision evidence when:

- all P0 data-integrity work is complete;
- every completion route collects the same evidence;
- failed saves never display success or discard input;
- reset, XP, mastery and session totals remain consistent;
- date and time behaviour is correct for `Europe/London`, including BST boundaries;
- expired sessions return to sign-in cleanly;
- the database has a tested backup and recovery procedure.

### Gate B — Student daily driver

The app may replace a paper weekly revision planner when:

- the phone landing screen exposes the first session before gamification and secondary analytics;
- primary Student navigation contains no more than five destinations;
- Start opens and persists a real revision flow;
- the Student can choose a quick 5-, 10- or 20-minute activity;
- Progress defaults to a useful subset rather than all syllabus topics;
- empty states are encouraging and do not mislabel a new learner as behind;
- actual course configuration and exam dates are confirmed.

### Gate C — exam-ready companion

The app may be presented as a complete revision companion when:

- every active syllabus leaf meets the minimum content standard in section 7;
- high-priority topics meet the full content standard;
- required practicals, case studies, set texts, option units and specialist materials match the Student's actual courses;
- timed exam practice and official past-paper links are integrated into the plan;
- content has subject-expert review and dated provenance;
- ten school days of real Student testing show that the core flow is understandable and sustainable.

The app should not claim to replace classroom teaching, textbooks or official past papers, even after Gate C.

## 3. Delivery sequence

### Phase 0 — establish the truth baseline

Estimated effort: 1–2 person-days plus Parent/school confirmation.

Purpose: prevent engineering and content work from optimising the wrong course assumptions.

Tasks:

- Confirm the exact entry code, board and tier for every active subject.
- Confirm English Literature texts and poetry cluster.
- Confirm all four Edexcel History options.
- Confirm AQA Geography optional environments, landscape units, resource option, named case studies and both fieldwork enquiries.
- Confirm the AQA D&T specialist material area and current NEA stage.
- Obtain the Student's mock dates, school assessment dates, intervention sessions and regular tutor commitments.
- Import or enter final Summer 2027 examination dates and mark each as sourced and confirmed.
- Record current working grades, target grades and any teacher priority topics.
- Capture a pre-change database backup and a small set of reference screenshots.
- Freeze a representative set of expected planner outputs for regression testing.

Deliverables:

- a completed course-configuration record;
- confirmed exam and mock calendar;
- a data backup and restore note;
- a baseline test fixture representing the real Student without containing secrets.

Exit criteria:

- no active subject is marked configured while a required option remains `TBC`;
- every active course can be traced to an official specification;
- every final examination has a date, paper/component and confirmation source;
- the Parent can see and verify the resulting configuration.

### Phase 1 — make progress data trustworthy

Estimated effort: 4–6 person-days.

Purpose: reach Gate A before expanding the interface or content.

#### 1.1 Unify session completion

- Extract a single completion workflow shared by Today, Week and 14-day Plan views.
- Remove direct one-click completion from the plan view.
- Always capture actual minutes and confidence.
- Capture an optional quick-check score only when the Student actually performed a check.
- Preserve notes and delayed-retrieval results.
- Display a review screen before final submission where the action materially changes mastery.
- Prevent duplicate submission with both UI state and server-side idempotency.

Acceptance tests:

- all completion entry points produce equivalent database evidence;
- a double click or retry cannot award duplicate XP;
- a failed completion leaves the form open with its values intact;
- planned minutes are never silently substituted for actual minutes in a Student-completed session.

#### 1.2 Fix save truthfulness

- Return structured API errors with status, code and retryability.
- Re-throw failed mutations from orchestration functions after recording global UI state.
- Show success only after the server confirms persistence.
- Keep typed answers, photographs, notes and scores until the save succeeds or the Student explicitly discards them.
- Add retry actions and distinguish validation, authentication, connectivity and server failures.

Acceptance tests:

- simulated `500`, network failure and `401` responses never produce a success message;
- closing/reopening a failed form does not silently mark the activity complete;
- the Student can retry without retyping safe local input.

#### 1.3 Make database mutations atomic and idempotent

- Wrap plan replacement in one transactional boundary or use versioned plan generation with a final activation step.
- Make session completion an idempotent operation keyed by session and completion attempt.
- Keep session status, topic totals, assessments, mastery history and XP consistent if a downstream operation fails.
- Add reconciliation checks for profile XP versus XP events and mastery versus its underlying evidence.
- Record operation identifiers in logs without recording Student answer content.

Acceptance tests:

- fault injection after each database step leaves either the old complete state or the new complete state;
- rerunning an interrupted operation converges on one correct result;
- reconciliation reports no inconsistency after the full test suite.

#### 1.4 Correct reset and recovery

- Reset `student_profiles.xp` and `level` as well as XP events.
- Verify topic totals, mastery, notes, assessments and generated sessions are reset as described.
- Preserve course configuration, exams, tutors and availability.
- Add a reset summary stating exactly what was cleared and preserved.
- Create a backup before a production reset or expose a documented D1 recovery route.

Acceptance tests:

- the reset dashboard starts at Level 1, 0 XP, 0 sessions and no assessed topics;
- a second reset is harmless;
- configuration and calendar data remain unchanged.

#### 1.5 Standardise UK dates and times

- Introduce shared date/time helpers with an explicit `Europe/London` product timezone.
- Treat exam/tutor/session timestamps as real instants and availability times as local wall-clock rules.
- Convert `datetime-local` values with the correct UK offset rather than appending `Z`.
- Derive Today, week boundaries, streaks and planner horizons from the same clock abstraction.
- Inject the clock into Worker services and components for deterministic tests.

Acceptance tests:

- sessions appear on the correct day before and after midnight;
- fixtures cover the March and October DST transitions;
- Today, Week, Analytics and Parent views agree on dates and times;
- a selected 17:00 UK commitment displays as 17:00 throughout the year.

#### 1.6 Improve authentication and loading recovery

- Centralise `401` handling and return to sign-in with “Your session expired; sign in again.”
- Load independent dashboard data independently or through an aggregate endpoint with partial-result semantics.
- Give each failed section a retry action.
- Keep the shell and primary navigation stable during loading.
- Explicitly authorise every mutation by its intended Student or Parent role.

Exit criteria for Phase 1:

- all Gate A conditions pass in automated tests;
- the existing unit and desktop/mobile browser suites remain green;
- new failure-injection, reset, duplicate-submission and timezone tests pass;
- a manual database audit after a complete session finds no contradictory totals.

### Phase 2 — build the mobile daily-driver experience

Estimated effort: 5–8 person-days.

Purpose: reach Gate B by making the app answer one question exceptionally well: “What useful revision should I do now?”

#### 2.1 Redesign Student information architecture

Primary Student destinations:

1. **Today** — next task, later tasks and quick revision.
2. **Learn** — subject/topic discovery and revision content.
3. **Progress** — due, weak, improving and secure topics.
4. **Plan** — this week first, then the longer horizon.
5. **More** — analytics, calendar, course information, account and sign-out.

Implementation notes:

- use a phone bottom navigation pattern and a compact desktop navigation;
- preserve visible focus and semantic navigation labels;
- add URLs for main views and topics so Back, refresh and deep links work;
- remember the last safe Student view, but always make Today one tap away;
- keep Parent navigation separate rather than exposing the complete Student tab set.

#### 2.2 Put the task before the dashboard

Mobile Today order:

1. next revision session with subject, topic, duration and reason;
2. primary **Start revision** button;
3. remaining sessions today;
4. quick-revision alternative;
5. compact weekly progress;
6. weak/due topics and secondary analytics.

Desktop can show more information above the fold, but the first action remains visually dominant.

#### 2.3 Create a real focus session

- Start records `started_at` and opens the exact content stage.
- Show a calm optional timer; do not make elapsed time a source of pressure.
- Save current stage and draft answers locally, with server persistence where appropriate.
- Allow pause/exit and make Resume unambiguous.
- End through the unified completion flow.
- Show one next step after completion rather than redirecting to a dense dashboard.

#### 2.4 Add quick revision

- Offer 5, 10 and 20-minute modes.
- Prefer due retrieval, previously weak knowledge and one-question practice.
- Do not create a 35-minute progress record for a five-minute activity.
- Award proportionate credit without making XP easier to farm.
- Allow “I have no energy” to produce a small achievable action rather than a broken streak.

#### 2.5 Make progress understandable

- Default to **Due now**, **Needs work** or the current subject instead of all topics.
- Add search plus Subject, Paper, RAG and Evidence filters.
- Replace unexplained workload units with estimated sessions/minutes and a short methodology link.
- Explain what evidence created a mastery score and when it was last updated.
- Separate “not assessed” from “needs work.”
- Use “Not enough evidence yet” for first-run Parent and Student summaries.
- Remove internal development labels such as “Phase 3.”

Acceptance measures:

- first task visible without vertical scrolling on a Pixel 7-sized viewport;
- first task can be started within two taps after sign-in;
- no primary navigation label is clipped or hidden without an explicit menu;
- a Student can find a named topic within 15 seconds;
- a first-time account is not described as failing or behind;
- usability test participants can explain mastery, confidence and latest assessment in their own words.

### Phase 3 — make planning genuinely UK-GCSE specific

Estimated effort: 4–6 person-days plus course-data confirmation.

#### 3.1 Guided Parent setup

Build a checklist wizard covering:

- active subject;
- board and specification code;
- tier where applicable;
- current and target grade;
- set texts and option units;
- Geography case studies and fieldwork;
- D&T specialist material and NEA stage;
- tutor/intervention commitments;
- regular weekly availability;
- mocks, assessments and final examinations.

The app must not show “Configured” until required choices are actually complete.

#### 3.2 Examination calendar

- Seed the published Summer 2027 dates for known entries.
- Require Parent confirmation because school entries and clashes may differ.
- Store source URL, verification date and confirmation status.
- Display paper/component, date, session and duration.
- Use the correct paper date in priority calculations.
- Add mock and school assessment dates with a separate evidence label.

#### 3.3 Formula and equation sheets

- Link the exact 2027 AQA Maths formula sheet and Combined Science equation sheet.
- Add short activities that require locating and applying a supplied equation.
- Do not tell the Student to memorise formulae that will be supplied; still teach selection, rearrangement, units and application.
- Mark content with the applicable examination year so future arrangements can be updated cleanly.

#### 3.4 Workload realism

- Allow different session lengths by weekday and subject.
- Account for tutors, homework, mocks, holidays, school events and study leave.
- Provide a maximum evening workload and a break rule.
- Explain every replan: what moved, why, and whether anything was dropped.
- Give overdue work a new feasible slot rather than building a guilt-inducing overdue list.
- Let the Student flag school-covered, already-secure or unexpectedly difficult topics.

Acceptance tests:

- planner prioritisation changes when a real exam or mock approaches;
- no plan schedules work during a zero-capacity exception or overlapping tutor session;
- plan explanations use plain English and name the evidence driving the choice;
- all course options are editable through the Parent UI and affect applicable topics;
- Parent and Student see the same confirmed calendar.

### Phase 4 — raise content from coverage to learning quality

Estimated effort: ongoing; initially 15–25 person-days for the highest-value content, followed by scheduled subject review.

Purpose: reach Gate C without pretending that one generic question per topic is a complete revision course.

#### 4.1 Content levels

##### Level 1 — minimum standard for every active syllabus leaf

Every topic must have:

- exact board/specification reference and applicability;
- a precise Student-friendly summary;
- three assessable learning objectives;
- core vocabulary, facts, formulae or quotations;
- at least one topic-specific worked example;
- at least one retrieval question and one exam-style question;
- an answer or mark points specific to the question;
- an explicit indication of whether the result can update mastery;
- official specification and assessment-resource links;
- content author/reviewer, version and review date.

##### Level 2 — daily-driver standard for priority topics

Add:

- common misconceptions and diagnostic feedback;
- a question ladder from recall through unfamiliar application;
- at least one automatically marked or structured self-mark activity;
- an annotated exemplar;
- difficulty/tier labels;
- an estimated time and relevant paper/question type;
- a recommended next activity for common failure modes.

##### Level 3 — exam-ready standard

Add:

- timed paper-style sets;
- multiple contexts or question variants;
- full mark-scheme mapping or level descriptors written in original language;
- lower-, middle- and higher-quality comparative exemplars where appropriate;
- interleaved and cumulative retrieval;
- performance history across repeated attempts;
- subject-expert sign-off.

#### 4.2 Suggested subject sequence

The actual order should respond to the Student's weakest subjects, mocks and teacher priorities. A sensible default is:

1. **Maths and Combined Science** — high topic volume, frequent objective checking and strong need for worked methods, diagrams and required practicals.
2. **English Language and Literature** — repeated writing practice, source/extract handling and qualitative feedback require deliberate design.
3. **History** — build on the existing school-guide-based Medicine and Elizabeth material; deepen American West, Germany, sources and interpretations.
4. **Geography** — only after options, named case studies and fieldwork are confirmed.
5. **Business and D&T** — contextual data-response work, specialist material content and NEA support.

#### 4.3 Subject-specific definition of good content

##### Mathematics

- diagrams where the question depends on geometry, graphs or transformations;
- complete worked methods with mark-bearing steps;
- calculator and non-calculator variants;
- exact/approximate answer handling, units and accuracy;
- distractors based on real misconceptions;
- multi-step Higher-tier problem solving, not only routine substitution.

##### Combined Science

- required-practical method, variables, controls, risks, graphing, evaluation and improvements;
- equations, rearrangement, unit conversion and significant figures;
- diagram and data interpretation;
- linked cause-mechanism-outcome explanations;
- several six-mark planning/explanation tasks with levelled exemplars;
- clear Higher-tier-only labels.

##### English Language

- complete original source extracts of realistic length;
- paper and question-number context;
- timing guidance and planning stages;
- language, structure, evaluation, comparison and writing tasks;
- annotated answers at different levels;
- feedback on interpretation, evidence, analysis, organisation and technical accuracy.

##### English Literature

- flexible short-quotation retrieval;
- character, theme, relationship and whole-text argument maps;
- extract-to-whole-text practice;
- poetry comparison selection and planning;
- context integrated into interpretations rather than bolted on;
- full essay plans and multiple-quality exemplars.

##### History

- exact option and period chronology;
- knowledge retrieval tied to Edexcel command words;
- causation, consequence, change, similarity/difference and significance structures;
- Western Front source enquiry practice;
- Germany interpretation comparison/evaluation;
- precise factual feedback rather than generic “add evidence.”

##### Geography

- the Student's actual named case studies and remembered statistics;
- processes supported by maps, diagrams and cause-effect chains;
- resource interpretation and numerical/map skills;
- both fieldwork enquiries, limitations and improvements;
- Paper 3 issue-evaluation preparation when pre-release material is available.

##### Business

- contextual calculations with formula, substitution and units;
- developed chains of impact;
- data/evidence selection from realistic business sources;
- conditional judgements and multiple defensible answers;
- explicit Edexcel command-word and level-demand guidance.

##### Design and Technology

- selected specialist-material properties and processes;
- annotated diagrams, dimensions and manufacturing sequences;
- maths/science application;
- user-centred specifications and measurable testing;
- NEA milestone prompts that support reflection without generating assessed work for the Student.

#### 4.4 Content workflow and QA

- Store content as structured, reviewable records rather than increasingly large TypeScript maps.
- Add a content validator for marks, answer completeness, IDs, tier/applicability, URLs and review metadata.
- Create a preview page for a reviewer to inspect the complete Student lesson.
- Require two review stages for high-stakes content: curriculum accuracy and Student clarity.
- Sample official past papers and examiner reports to identify authentic demand and common weaknesses, while keeping in-app questions original.
- Re-check links and exam-year guidance on a schedule.
- Track content changes separately from Student evidence migrations.

Content acceptance metrics:

- 100% of active applicable leaves meet Level 1;
- 100% of topics placed in the next 14-day plan meet at least Level 2 before they are assigned as self-contained learning;
- priority/weak topics reach Level 2 first;
- no topic updates mastery from unreviewed generic practice;
- automated validation reports no broken required metadata;
- a subject teacher signs off the Level 2/3 material used for high-stakes decisions.

### Phase 5 — improve assessment, feedback and AI safety

Estimated effort: 4–6 person-days excluding content authoring.

#### 5.1 Make non-AI assessment complete

- Every written activity must offer a useful self-check route.
- Show mark points one at a time after the Student commits an answer.
- Ask the Student to highlight where each point appears in their response.
- Allow a cautious self-reported score with that provenance clearly visible.
- Prefer automatic marking for deterministic knowledge, calculation and selection tasks.

#### 5.2 Protect evidence provenance

- Restrict the generic assessment endpoint to self-reported evidence.
- Save server-generated automatic and AI marking results directly, or return a short-lived signed result token.
- Introduce `teacher_marked` only with a genuine authorised teacher/Parent evidence workflow.
- Record marking model/version and rubric version for AI estimates.
- Weight mastery by evidence reliability only after the policy is explicit and tested.

#### 5.3 Make AI optional, private and comprehensible

- Parent-controlled enable/disable setting.
- Before upload, explain that typed work or photographs are sent to the configured provider.
- Warn the Student not to include names, school details or unrelated personal information.
- Compress large images and remove metadata where practical.
- Document provider retention/deletion terms and the app's own storage behaviour.
- Always label a mark as estimated and make confidence meaningful.
- Never let low-confidence marking change mastery.
- Provide correction and appeal flows when transcription or feedback is wrong.

Acceptance tests:

- a Student can complete every learning session with AI disabled;
- forged client provenance is rejected;
- low-confidence AI results cannot update mastery;
- photographs are validated, size-limited and not logged;
- privacy disclosure is shown before the first external transfer.

### Phase 6 — accessibility, privacy and operational readiness

Estimated effort: 4–6 person-days.

#### 6.1 Accessibility

- Create one reusable accessible dialog implementation.
- Support focus trapping, focus return, Escape close and inert background.
- Test all primary journeys with keyboard only.
- Test 200% zoom and narrow screens without clipped controls.
- Run automated axe checks in CI for sign-in, Today, lesson, completion, Progress and Parent views.
- Perform at least one NVDA or equivalent screen-reader walkthrough.
- Keep text equivalents for RAG, charts, progress bars and achievements.
- Confirm WCAG 2.2 AA contrast for text, focus and state indicators.

#### 6.2 Privacy and data control

- Add a short privacy notice written for Student and Parent audiences.
- Document data categories, purpose, retention, third-party transfer and deletion.
- Add Parent export of progress, plan and evidence in a readable format.
- Add controlled deletion and a recovery window.
- Avoid third-party behavioural tracking.

#### 6.3 Operations

- Establish scheduled D1 backup/export and a rehearsed restore procedure.
- Add privacy-safe error monitoring and health checks.
- Record deployment version and migration version in diagnostics.
- Add a production smoke test after deployment.
- Prevent any development secret file from entering a deployable output, including interrupted builds.
- Remove unused code and add lint, formatting and accessibility lint checks.

Exit criteria:

- no critical or serious automated accessibility findings on core pages;
- keyboard and screen-reader walkthroughs can complete a session;
- a backup can be restored into an isolated environment;
- Parent can export Student data;
- production errors can be detected without exposing answer content.

### Phase 7 — real Student beta and stabilisation

Estimated elapsed time: 10 school days; engineering effort depends on findings.

Beta protocol:

- Start with the real Student but treat the first week as observation, not performance judgement.
- Ask for a one-sentence rating after selected sessions: too easy, about right, too hard, or confusing.
- Conduct short interviews after days 1, 3, 5 and 10.
- Observe rather than explain the first use of Today, quick revision, topic search and completion.
- Review Parent use separately so Parent administration does not distort the Student workflow.
- Fix blockers and misleading data immediately; batch cosmetic requests.

Measures:

- time from sign-in to starting useful work;
- percentage of planned sessions started and completed;
- number of abandoned or postponed sessions and stated reasons;
- number of save/retry failures;
- return rate across school days;
- percentage of feedback followed by an improved next attempt;
- Student ability to explain why a topic was selected;
- Student trust in mastery, XP and completion totals;
- average mobile scroll before the first action;
- Parent ability to update calendar/course settings without developer help.

Gate C beta targets:

- median time to start under 20 seconds;
- at least 80% of completed sessions use the intended completion flow;
- no unreconciled progress or XP inconsistencies;
- no repeated confusion about primary navigation;
- no high-severity accessibility or privacy finding;
- Student reports that the plan reduces the effort of deciding what to revise;
- content gaps encountered in planned sessions are fixed or clearly routed to an authoritative resource.

## 4. Suggested calendar to Summer 2027

### October 2026 — trustworthy daily driver

- Complete Phases 0–2.
- Begin real use only after Gate A.
- Confirm all courses and import final exam dates.
- Establish weekly Student/Parent feedback.

### November–December 2026 — mocks and core content

- Complete Phase 3.
- Deepen Maths, Combined Science and English content around mock weaknesses.
- Add mock-paper practice and structured review of errors.
- Reach Level 1 for all active topics and Level 2 for topics likely to be planned before January.

### January–February 2027 — close syllabus gaps

- Deepen History and the confirmed Geography, Business and D&T content.
- Use mock evidence to prioritise weak/high-value topics.
- Increase timed and cumulative practice.
- Complete AI/privacy and accessibility work.

### March–April 2027 — exam mode

- Reduce generic learning and increase interleaved timed practice.
- Schedule full and partial papers with recovery time.
- Integrate official 2027 formula/equation sheets.
- Prepare Geography Paper 3 material when released through the proper school/exam-board route.
- Avoid large product changes during the Easter revision period.

### May–June 2027 — live examination period

- Prioritise the next examination while protecting sleep and recovery.
- Stop planning a subject once its final relevant paper is complete.
- Use short retrieval and confidence-building work immediately before papers.
- Freeze risky features and make only critical correctness/content fixes.

## 5. Engineering work packages

Recommended pull-request-sized packages:

1. **Reset consistency** — XP/level reset plus reconciliation tests.
2. **Unified completion contract** — shared UI and server input; remove plan bypass.
3. **Mutation reliability** — error propagation, preserved forms and idempotency.
4. **Atomic plan/session persistence** — fault-injection tests.
5. **UK date/time layer** — shared clock, BST tests and migrations if needed.
6. **Auth/loading recovery** — `401` redirect, independent loaders and retry UI.
7. **Student navigation shell** — routes and responsive primary navigation.
8. **Mobile Today redesign** — next task first and compact gamification.
9. **Focus/quick sessions** — persisted start, drafts and proportionate completion.
10. **Progress redesign** — filters, search, evidence explanation and onboarding.
11. **Parent setup wizard** — all course options and validation.
12. **Exam/calendar integration** — sourced dates, mocks and planner use.
13. **Content schema and validator** — provenance, levels and preview tooling.
14. **Subject content batches** — one subject or coherent paper per package.
15. **Evidence provenance** — trusted marking routes and mastery policy.
16. **AI privacy controls** — opt-in, disclosure, image handling and non-AI route.
17. **Accessibility foundation** — dialogs, axe, keyboard and screen-reader fixes.
18. **Operational readiness** — backup/restore, export, monitoring and deployment smoke tests.

Every package should include:

- tests proportionate to the risk;
- mobile and desktop verification where UI changes;
- migration/rollback notes where data changes;
- an update to the tracked backlog;
- no unrelated content or formatting rewrite.

## 6. Test strategy

### Unit tests

- mastery and planner scoring;
- UK date/time helpers and DST boundaries;
- content validators and question marking;
- progress reconciliation;
- role and evidence-provenance rules.

### API/integration tests

- every endpoint by unauthenticated, Student and Parent roles;
- duplicate and interrupted mutations;
- validation boundaries and payload limits;
- session expiry;
- reset preservation/deletion contract;
- failed database operation recovery.

### Browser tests

- sign in, see first task and start within two taps;
- pause/resume and complete with saved evidence;
- failed save and retry without lost input;
- quick revision;
- find a topic by search/filter;
- Parent completes course setup and adds an exception;
- session expiry during a draft;
- desktop, Pixel-sized mobile and 200% zoom;
- keyboard-only completion;
- AI-disabled written-answer route.

### Content tests

- every applicable leaf meets its required content level;
- marks, answer ranges and correct options are valid;
- Higher/Foundation applicability is correct;
- required practicals, set texts, options and case studies match configuration;
- source URLs and verification dates are present;
- no unreviewed generic activity updates mastery.

### Manual checks before a release

- Student mobile walkthrough on a real phone;
- Parent desktop walkthrough;
- backup and isolated restore;
- production CSP/security headers;
- privacy copy and AI opt-in;
- official exam-date and specification spot check;
- smoke completion without AI.

## 7. Decision rules

Use these rules to keep the programme focused:

- Reliability beats new features.
- The next revision action beats another summary card.
- Accurate “not enough evidence” beats a precise-looking invented score.
- One excellent topic activity beats five generic activities that appear complete.
- Non-AI use must always remain viable.
- Content used to update mastery needs stronger review than content offered only as optional guidance.
- Student friction is measured on a phone, not inferred from desktop screenshots.
- Parent control should configure and protect the plan, not turn the Student experience into surveillance.
- During the final examination period, stability beats redesign.

## 8. Immediate first sprint

The first implementation sprint should contain only the following:

1. fix reset so XP and level actually clear;
2. remove the plan-view completion bypass and reuse the full completion flow;
3. make failed assessment saves reject and keep the form open;
4. add operation idempotency for completion and XP;
5. introduce the UK clock/date abstraction with boundary tests;
6. centralise expired-session handling;
7. add regression tests for all six changes.

Sprint demo:

- Parent resets the isolated test account;
- Student signs in and sees a consistent new-user state;
- Student completes the same session once from each supported entry point;
- all routes collect equivalent evidence;
- a forced network/database failure preserves input and does not display success;
- a duplicate request does not duplicate XP or progress;
- Today remains correct in fixtures around midnight and both UK DST changes.

Do not begin the navigation redesign until this sprint passes. It is the foundation on which the improved Student experience will rely.
