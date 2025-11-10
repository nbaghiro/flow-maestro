# Kubernetes Jobs & CronJobs

This directory contains Kubernetes Job and CronJob manifests for periodic and one-time tasks.

## Available Jobs

### 1. Database Migration (`db-migration.yaml`)

One-time job that runs database migrations using node-pg-migrate.

**Usage:**

```bash
# Run database migration
kubectl apply -f infra/k8s/jobs/db-migration.yaml

# Wait for completion
kubectl wait --for=condition=complete job/db-migration -n flowmaestro --timeout=5m

# Check logs
kubectl logs -n flowmaestro -l component=db-migration
```

### 2. Temporal Schema Migration (`temporal-schema-migration.yaml`)

One-time job that initializes Temporal database schemas.

**Usage:**

```bash
# Run Temporal schema migration
kubectl apply -f infra/k8s/jobs/temporal-schema-migration.yaml

# Wait for completion
kubectl wait --for=condition=complete job/temporal-schema-migration -n flowmaestro --timeout=5m
```

### 3. Analytics Aggregation CronJobs (`analytics-aggregation.yaml`)

Automated jobs that aggregate execution span data into analytics tables for dashboard visualization.

**Contains two CronJobs:**

#### Hourly Aggregation

- **Schedule:** Every hour at 5 minutes past (1:05, 2:05, 3:05, etc.)
- **Purpose:** Aggregates execution data into `hourly_analytics` table
- **What it does:**
    - Reads execution spans from the previous hour
    - Aggregates by user, entity type (workflow/agent), and hour
    - Calculates execution counts, success rates, token usage, costs, and durations
    - Updates the `hourly_analytics` table

#### Daily Aggregation

- **Schedule:** Once daily at 00:05 UTC (5 minutes past midnight)
- **Purpose:** Aggregates daily statistics and model usage data
- **What it does:**
    - Reads all execution spans from the previous day
    - Aggregates into `daily_analytics` table (by user, entity, date)
    - Aggregates into `model_usage_stats` table (by provider, model, date)
    - Refreshes the `recent_activity_summary` materialized view
    - Provides data for the Analytics dashboard

**Deploy CronJobs:**

```bash
# Deploy both hourly and daily CronJobs
kubectl apply -f infra/k8s/jobs/analytics-aggregation.yaml
```

**Check CronJob status:**

```bash
# List all CronJobs
kubectl get cronjobs -n flowmaestro

# Check specific CronJob
kubectl get cronjob analytics-hourly-aggregation -n flowmaestro
kubectl get cronjob analytics-daily-aggregation -n flowmaestro

# View CronJob schedule and last execution
kubectl describe cronjob analytics-hourly-aggregation -n flowmaestro
```

**View job execution history:**

```bash
# List recent jobs created by CronJobs
kubectl get jobs -n flowmaestro -l component=analytics-aggregation

# Check logs for the latest hourly job
kubectl logs -n flowmaestro -l component=analytics-aggregation,schedule=hourly --tail=100

# Check logs for the latest daily job
kubectl logs -n flowmaestro -l component=analytics-aggregation,schedule=daily --tail=100
```

**Manually trigger aggregation (outside of schedule):**

```bash
# Create a one-time job from the CronJob template
kubectl create job --from=cronjob/analytics-hourly-aggregation analytics-manual-run -n flowmaestro

# Wait for completion
kubectl wait --for=condition=complete job/analytics-manual-run -n flowmaestro --timeout=5m

# Check logs
kubectl logs -n flowmaestro job/analytics-manual-run

# Clean up
kubectl delete job analytics-manual-run -n flowmaestro
```

**Suspend/Resume CronJobs:**

```bash
# Suspend CronJob (stop scheduled runs)
kubectl patch cronjob analytics-hourly-aggregation -n flowmaestro -p '{"spec":{"suspend":true}}'

# Resume CronJob
kubectl patch cronjob analytics-hourly-aggregation -n flowmaestro -p '{"spec":{"suspend":false}}'
```

**Delete CronJobs:**

```bash
# Delete specific CronJob
kubectl delete cronjob analytics-hourly-aggregation -n flowmaestro

# Delete all analytics CronJobs
kubectl delete -f infra/k8s/jobs/analytics-aggregation.yaml
```

## Analytics Aggregation Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Workflow/Agent Execution                                │
│   - Creates execution_spans via SpanService             │
│   - Records timing, costs, tokens, errors               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ execution_spans table (raw data)                        │
│   - All span types: WORKFLOW_RUN, AGENT_RUN, etc.      │
│   - Includes cost data auto-calculated from pricing DB  │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌──────────────────────┐
│ Hourly CronJob   │  │  Daily CronJob       │
│ (Every hour)     │  │  (Once per day)      │
└────────┬─────────┘  └──────────┬───────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────────┐
│hourly_analytics │    │ daily_analytics      │
│                 │    │ model_usage_stats    │
│                 │    │ recent_activity_view │
└─────────────────┘    └──────────┬───────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ Analytics Dashboard UI   │
                    │ (frontend/Analytics.tsx) │
                    └──────────────────────────┘
```

## Local Development

For local development, analytics aggregation runs automatically via the in-process scheduler when the backend server starts. No separate CronJob is needed.

**Manual aggregation in local dev:**

```bash
cd backend

# Aggregate yesterday's data
npm run analytics:aggregate

# Backfill last 30 days
npm run analytics:aggregate -- --backfill 30

# Aggregate specific date
npm run analytics:aggregate -- --date 2024-11-09

# Show help
npm run analytics:aggregate -- --help
```

## Troubleshooting

### CronJob not running

**Check if CronJob is suspended:**

```bash
kubectl get cronjob analytics-hourly-aggregation -n flowmaestro -o yaml | grep suspend
```

**Check CronJob events:**

```bash
kubectl describe cronjob analytics-hourly-aggregation -n flowmaestro
```

### Failed job executions

**View failed job logs:**

```bash
# List failed jobs
kubectl get jobs -n flowmaestro -l component=analytics-aggregation --field-selector status.successful=0

# Check logs from failed job
kubectl logs -n flowmaestro job/<failed-job-name>
```

**Common issues:**

- Database connection timeout → Check db-credentials secret
- Out of memory → Increase resource limits in YAML
- Missing data → Ensure execution_spans table has data

### Analytics dashboard showing no data

**Check if aggregation has run:**

```bash
# Check for recent job completions
kubectl get jobs -n flowmaestro -l component=analytics-aggregation --sort-by=.status.startTime

# Verify data in analytics tables
kubectl exec -it -n flowmaestro deployment/api -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM flowmaestro.daily_analytics;"
```

**Manual backfill:**

```bash
# Create manual backfill job
kubectl create job --from=cronjob/analytics-daily-aggregation backfill-analytics -n flowmaestro

# Watch progress
kubectl logs -n flowmaestro -f job/backfill-analytics
```

## Monitoring

**Monitor CronJob execution metrics:**

```bash
# Check last schedule time and next schedule time
kubectl get cronjobs -n flowmaestro -o wide

# Watch job completions in real-time
kubectl get jobs -n flowmaestro -w -l component=analytics-aggregation
```

**Set up alerts for failed jobs:**

- Configure monitoring to alert when jobs fail > 2 consecutive times
- Monitor job duration to detect performance issues
- Track data freshness (last successful aggregation time)

## Resource Limits

**Hourly Aggregation:**

- CPU: 100m request, 500m limit
- Memory: 256Mi request, 512Mi limit
- Typical execution: 5-30 seconds

**Daily Aggregation:**

- CPU: 200m request, 1000m limit
- Memory: 512Mi request, 1Gi limit
- Typical execution: 1-5 minutes (depending on data volume)

**Adjust if needed:**

```bash
kubectl edit cronjob analytics-hourly-aggregation -n flowmaestro
# Modify resources section
```

## Best Practices

1. **Monitor job failures** - Set up alerts for consecutive failures
2. **Keep job history** - Retain at least 3 successful and 3 failed jobs for debugging
3. **Test before deploying** - Run manual jobs to verify before updating CronJob schedule
4. **Backup before backfilling** - Always backup analytics tables before large backfills
5. **Use concurrencyPolicy: Forbid** - Prevents overlapping runs that could cause duplicates
6. **Offset schedule by 5 minutes** - Ensures span data is fully written before aggregation

## Additional Resources

- Backend Analytics Service: `backend/src/shared/analytics/analytics-aggregator.ts`
- Scheduler: `backend/src/shared/analytics/analytics-scheduler.ts`
- CLI Tool: `backend/src/scripts/aggregate-analytics.ts`
- Database Schema: `backend/migrations/1730000000016_create-analytics-aggregation-tables.sql`
- Frontend Dashboard: `frontend/src/pages/Analytics.tsx`
