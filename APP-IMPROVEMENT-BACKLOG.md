# App improvement backlog

Maintained review backlog for **Oli: Locked In**. Last reviewed: 1 October 2026.

Delivery sequence, release gates and acceptance criteria are defined in `GCSE-STUDENT-READINESS-PLAN.md`.

Priority meanings:

- **P0** — fix before trusting the app with real revision progress.
- **P1** — high-value improvement for regular Student or Parent use.
- **P2** — polish, maintainability or later product development.

## P0 — progress accuracy and reliability

- [x] Use the full completion flow everywhere. The 14-day plan cannot complete a session without actual time and normal evidence.
- [x] Propagate failed saves back to the form, retain entered data and show success only after persistence.
- [x] Make plan replacement atomic and session completion safely idempotent. Runtime reconciliation checks XP, stalled completions and mastery history.
- [x] Reset XP and level with progress while preserving configuration.
- [x] Use one tested `Europe/London` time model across browser and Worker code, including BST and `datetime-local` conversion.
- [x] Handle expired sessions centrally while preserving safe local draft input.
- [x] Load dashboard sections independently and provide retry actions rather than discarding successful data.

## P1 — 16-year-old Student experience

- [x] Put **today's actual sessions first on mobile**, with momentum below the first task.
- [x] Use **Today**, **Learn**, **Progress**, **Plan** and **More**, including mobile bottom navigation.
- [x] Make **Start** open the exact lesson, optionally run a calm timer, persist `started_at` and return to one completion action.
- [x] Add 5-, 10- and 20-minute **Quick revision** routes for low-energy days and journeys.
- [x] Replace internal phase/workload copy with GCSE-student language and explain priority metrics.
- [x] Give first-use states an encouraging message instead of labelling a new learner behind.
- [x] Make Progress manageable with priority defaults, subject/RAG filters and search.
- [x] Let the learner explain why a session cannot be done and show exactly where it moved.
- [x] Reduce phone header space and move primary controls into bottom navigation.
- [x] Make one clear Start/Resume action primary; move logging work completed elsewhere and inability to attend into secondary options.
- [x] Replace the empty 0/145-style first-use dashboard with a short first-week journey and plain-language RAG labels.
- [x] Prioritise today's planned topic for quick revision before falling back to due or weak topics.
- [x] Put the next planned lesson first in Learn, use a phone-friendly subject picker and collapse the long exam reference guide.

## P1 — UK GCSE configuration and planning

- [ ] Enter the final Summer 2027 dates for the Student's exact entries. The Parent add/edit/confirm UI, provenance fields and planner integration are implemented; the real dates must be verified against the official timetable and school statement of entry.
- [x] Add the official 2027 AQA Maths formula sheet and Combined Science equation sheet as direct resources, with a short timed-use drill.
- [x] Turn Course setup into a guided checklist for board/code, tier, English Literature texts, History/Geography options, D&T specialist material/NEA stage and target grades.
- [x] Expose Geography and D&T options and prevent incomplete `TBC` choices from appearing fully configured.
- [x] Add mocks and school assessments through the exam editor; availability exceptions and tutor sessions cover other commitments.
- [ ] Add subject-specific session-length preferences. Day-specific 10–60 minute blocks, planned ten-minute gaps and evening/high-workload warnings are implemented.

## P1 — content quality and exam usefulness

- [x] Treat the app as a planner/retrieval tool until content depth is expanded; do not imply that it replaces teaching, textbooks or past papers.
- [x] Apply content standard 2.0 to every confirmed syllabus leaf: topic-specific core notes, at least three learning objectives, common mistakes, exam-use guidance and a retrieval/application/independent-practice ladder. Automated coverage verifies all active subjects.
- [ ] Replace generic fallback teaching with topic-specific explanations, misconceptions, vocabulary, diagrams, equations, required practicals and worked examples. Prioritise high-weight and weak topics first.
- [ ] Expand each topic from one principal written question to a question ladder: retrieval, standard application, unfamiliar application and an exam-style extended response where appropriate.
- [ ] Increase instant self-marking coverage beyond the current small set of auto-marked topics. Give diagnostic feedback for each distractor or common method error.
- [ ] Add tier/difficulty labels and grade-demand progression, especially for Higher Maths and Combined Science.
- [ ] Add subject-specific depth:
  - Maths: diagrams, multi-step problems, method marks, calculator/non-calculator variants and common-error feedback.
  - Science: required-practical sequences, variables/evaluation, equations, units, graphs and six-mark responses.
  - English Language: full original extracts, paper/question timing and several annotated responses at different levels.
  - English Literature: flexible quotation banks, whole-text argument plans, extract-to-whole-text practice and full comparison planning.
  - History: exact Edexcel question stems/structures, chronology retrieval, source/interpretation practice and option-specific knowledge.
  - Geography: the learner's named case studies with precise statistics, fieldwork and pre-release/issue-evaluation practice.
  - Business: data-response chains, calculations and levelled justify/evaluate practice.
  - D&T: the chosen specialist material, drawing/diagram tasks, calculations and NEA milestone support without writing assessed work for the student.
- [ ] Complete subject-teacher QA. Version, specification source, author/reviewer, review status and date fields are implemented; current app content is labelled editorially checked, not teacher approved.
- [x] Link official specifications, past papers and mark schemes while keeping in-app questions original and clearly labelled.
- [ ] Run structured Student testing with Year 11 learners: first-session comprehension, time-to-first-question, completion rate, return rate and whether feedback changes the next answer.

## P1 — AI marking, privacy and evidence trust

- [x] Show a clear disclosure before sending typed work or photographs to Gemini, including what leaves the app and what not to include.
- [x] Make AI marking Parent-controlled and resize/re-encode supported images client-side to remove embedded metadata.
- [x] Use short-lived signed marking-result tokens and reject client-asserted trusted provenance.
- [x] Restrict the general assessment route to self-reported evidence until a genuine teacher workflow exists.
- [x] Keep AI feedback optional and provide non-AI exemplar/marking-point routes.

## P1 — accessibility and interaction quality

- [x] Build a reusable accessible dialog with `role="dialog"`, `aria-modal`, focus trapping/restoration, Escape close and background inertness.
- [ ] Complete manual keyboard and screen-reader testing. Automated axe checks now run on representative desktop and mobile journeys.
- [x] Keep visible text RAG labels, explain them and label mastery as an evidence estimate.
- [x] Make mutation success/error states truthful and recoverable, with retry or return paths where relevant.

## P2 — product and operational improvements

- [x] Make main views routable/deep-linkable so refresh and browser Back preserve the learner's place.
- [x] Add Parent JSON export plus documented D1 backup and isolated restore procedures.
- [ ] Add a Parent-controlled full account-deletion/recovery-window flow. Privacy/retention documentation, Parent export and the explicitly scoped trial-progress reset are implemented.
- [x] Add privacy-safe structured error logs, request IDs, a health endpoint and documented incident signals. External alert routing remains a deployment choice.
- [ ] Remove unused components/styles and add linting, accessibility linting and formatting checks.
- [ ] Consider PWA installation, offline access to the next saved session and reminders only after the core flows are reliable.

## Validation already completed

- TypeScript and unit/integration checks: **84 passing**.
- Playwright critical journeys: **8 passing** across desktop Chromium and Pixel 7 emulation, including automated WCAG checks on representative screens.
- Production build: passing.
- Dependency audit: **0 known vulnerabilities**.
- Remaining unchecked items require content expansion, confirmed real course data, manual assistive-technology testing, deployment policy or real-Student validation; they cannot be truthfully completed by code alone.
