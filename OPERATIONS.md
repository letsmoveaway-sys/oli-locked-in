# Operations and recovery

This app holds revision evidence that may matter across an academic year. Production changes must therefore be recoverable. Commands below are deliberately manual so the operator verifies the Cloudflare account, database and output path before changing data.

## Before a deployment or progress reset

1. From the Parent dashboard, choose **Download Student data** and retain the dated JSON file.
2. Create a D1 SQL export in a dedicated local backup folder:

   ```powershell
   New-Item -ItemType Directory -Force -Path .backups
   npx wrangler d1 export gcse-revision-db --remote --output .backups/gcse-revision-before-change.sql
   ```

3. Confirm the file exists and is non-empty:

   ```powershell
   Get-Item -LiteralPath .backups/gcse-revision-before-change.sql
   ```

4. Keep `.backups/` outside source control and copy important production backups to an access-controlled location. D1 exports contain personal learning data.

Do not run a production reset if the export fails. The in-app JSON export is readable and useful for audit, but the SQL export is the recovery source.

## Rehearse a restore without touching production

1. Create a separate recovery database in the correct Cloudflare account:

   ```powershell
   npx wrangler d1 create gcse-revision-recovery
   ```

2. Copy `wrangler.jsonc` to a temporary recovery configuration and replace only its D1 `database_name` and `database_id` with the returned recovery values. Do not change the production configuration.
3. Restore the export into the isolated recovery database:

   ```powershell
   npx wrangler d1 execute gcse-revision-recovery --remote --file .backups/gcse-revision-before-change.sql
   ```

4. Inspect high-level counts and the latest migration entries:

   ```powershell
   npx wrangler d1 execute gcse-revision-recovery --remote --command "SELECT COUNT(*) AS sessions FROM revision_sessions; SELECT COUNT(*) AS assessments FROM assessments; SELECT * FROM d1_migrations ORDER BY applied_at DESC LIMIT 5;"
   ```

5. Record the rehearsal date, operator, export filename, row counts and outcome. Delete the recovery database only after verification and in line with the retention policy.

## Production restore

A production restore is a deliberate incident action. Stop writes, create a final export of the damaged database where possible, restore the last verified export into a new D1 database, validate it, and then change the Worker binding to the recovered database. Keeping the old database unchanged provides a rollback path.

Never pipe an uninspected remote export directly into production. Never seed development accounts into a recovered production database.

## Deployment checklist

- Run `npm run check`, `npm run build` and `npm run test:e2e`.
- Export D1 before applying remote migrations.
- Apply `npm run db:migrate:remote`; do not run `db:seed:remote` on an established production database.
- Deploy with `npm run deploy`.
- Check `/api/health`, then sign in as Student and Parent.
- Confirm Today loads, one lesson opens, Calendar shows the expected exam data, and Parent export downloads.
- Review Cloudflare Worker errors using request IDs. Logs contain route/method/error summaries, not answers or photographs.

## Incident signals

Treat these as urgent:

- repeated `500` responses or health-check failure;
- a completion stuck in `session_completion_attempts.status = 'evidence_saved'`;
- XP totals that do not equal the sum of XP events;
- dates displaying on different days between Today, Plan and Parent Calendar;
- a migration listed as unapplied after deployment.

An `evidence_saved` completion is designed to recover safely: retry the same completion request. Deterministic assessment IDs, mastery operation keys and XP uniqueness prevent duplicate evidence.

## Retention and access

Parent JSON exports and SQL backups contain personal data. Limit access to the family/operator, encrypt storage where available, and delete superseded copies according to the agreed retention period. Photographs selected for optional AI marking are not stored by this app.
