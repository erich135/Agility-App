# New SQL scripts

Put *new* SQL scripts in `database/` while they are being worked on and reviewed.

Once applied/verified, move them into:
- `database/completed-sql-scripts/`

This keeps new scripts easy to spot and avoids re-running older migrations by accident.

## Permissions fixes

- If the UI shows `permission denied for schema public` when creating a project, start with `database/NEW_SQL_SCRIPTS_GO_HERE/03_fix_project_write_permissions.sql` (scoped, safer).
- If it still fails, your `projects` trigger/function may be trying to create yearly sequences for `project_number` (e.g. `project_number_seq_2026`). Run `database/NEW_SQL_SCRIPTS_GO_HERE/04_fix_project_number_generator_permissions.sql`.
- If it fails after that with missing permissions on related tables, run `database/NEW_SQL_SCRIPTS_GO_HERE/05_fix_projects_trigger_side_effect_permissions.sql`.
- Use `comprehensive_permissions_fix.sql` only for throwaway/dev environments; it grants very broad access.
