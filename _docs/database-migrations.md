# Database Migrations

This directory contains database migrations for FlowMaestro using [node-pg-migrate](https://github.com/salsita/node-pg-migrate).

## Quick Start

**Note:** Migration commands require the `DATABASE_URL` environment variable to be set. You can:
1. Create a `.env` file (copy from `.env.example`)
2. Or prefix commands with `DATABASE_URL=postgresql://...`

```bash
# Run all pending migrations
DATABASE_URL=postgresql://flowmaestro:flowmaestro_dev_password@localhost:5432/flowmaestro npm run db:migrate

# Create a new migration
DATABASE_URL=postgresql://flowmaestro:flowmaestro_dev_password@localhost:5432/flowmaestro npm run db:migrate:create add_new_feature

# Check migration status
npm run db:migrate:status

# Rollback last migration
DATABASE_URL=postgresql://flowmaestro:flowmaestro_dev_password@localhost:5432/flowmaestro npm run db:migrate:down
```

## Migration Naming Convention

Migrations are named with a timestamp prefix followed by a descriptive name:
```
[timestamp]_descriptive-name.sql
```

Example:
```
1730000000001_initial-schema.sql
1730000000002_add-credentials-and-integrations.sql
```

## Creating New Migrations

1. Create a new migration file:
   ```bash
   npm run db:migrate:create add_workflow_triggers
   ```

2. Edit the generated file in `migrations/` directory

3. Write your SQL (use `IF NOT EXISTS` for safety):
   ```sql
   -- Migration: Add Workflow Triggers
   -- Created: 2024-10-27
   -- Description: Add triggers table for workflow automation

   CREATE TABLE IF NOT EXISTS flowmaestro.workflow_triggers (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       workflow_id UUID NOT NULL REFERENCES flowmaestro.workflows(id),
       -- ... more columns
   );
   ```

4. Run the migration:
   ```bash
   DATABASE_URL=postgresql://flowmaestro:flowmaestro_dev_password@localhost:5432/flowmaestro npm run db:migrate
   ```

## Best Practices

Writing reliable database migrations requires following several key practices to ensure safety and maintainability.

**Always use `IF NOT EXISTS`** when creating tables, indexes, or other database objects. This makes migrations idempotent, meaning they can be run multiple times without error. If a migration fails partway through and needs to be re-run, the idempotent structure prevents conflicts.

**Test rollbacks** to ensure migrations can be safely reverted. Before deploying a migration to production, verify that the down migration successfully reverses all changes. This is critical for handling issues in production where you may need to quickly roll back a problematic migration.

**One change per migration** keeps migrations focused and easier to understand, test, and roll back. Instead of bundling multiple unrelated changes into a single migration, create separate migrations for each logical change. This also makes it easier to selectively apply or revert specific features.

**Document migrations** with clear comments explaining what the migration does and why it's needed. Include the date, a description of the business requirement driving the change, and any important considerations for future developers. Well-documented migrations serve as a historical record of how the schema evolved.

**Never edit existing migrations** that have been deployed to production. Migrations that have already run should be treated as immutable historical records. If you need to make changes, create a new migration that modifies the previous work. This ensures consistency across all environments and prevents conflicts in the migration history.

**Test in development first** before running migrations in production. Always apply migrations to a development environment that mirrors production, verify the changes work as expected, test the rollback path, and only then proceed to staging and production environments.

## Migration Files

- `1730000000001_initial-schema.sql` - Base schema (users, workflows, executions)
- `1730000000002_add-credentials-and-integrations.sql` - Credentials and integrations support

## Rollback

To rollback the last migration:
```bash
npm run db:migrate:down
```

To rollback multiple migrations:
```bash
npm run db:migrate:down 2
```

## Environment Variables

Migrations use the following environment variables (from `.env`):
- `POSTGRES_HOST` - Database host
- `POSTGRES_PORT` - Database port
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password

Or use `DATABASE_URL`:
```
DATABASE_URL=postgresql://flowmaestro:password@localhost:5432/flowmaestro
```

## Troubleshooting

### Migration table doesn't exist
First run will create the `pgmigrations` table automatically.

### Migration already run
Check status with `npm run db:migrate:status` to see which migrations have been applied.

### Need to manually mark a migration as run
```bash
npx node-pg-migrate mark --migrationsTable flowmaestro.pgmigrations [migration-name]
```
