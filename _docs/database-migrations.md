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

1. **Always use `IF NOT EXISTS`** - Makes migrations idempotent
2. **Test rollbacks** - Ensure migrations can be rolled back
3. **One change per migration** - Keep migrations focused
4. **Document migrations** - Add comments explaining what and why
5. **Never edit existing migrations** - Create new ones instead
6. **Test in development first** - Always test before production

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
