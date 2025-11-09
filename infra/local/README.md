# Local Development Infrastructure

This directory contains Docker Compose configuration for local development of FlowMaestro.

## Quick Start

From the project root, run:

```bash
npm run docker:up
```

This starts all required services:
- PostgreSQL 15 (with pgvector extension)
- Redis 7
- Temporal Server 1.23.0 (self-hosted)
- Temporal UI
- Adminer (database admin tool)

## Services

### PostgreSQL (Port 5432)
- **Image**: `pgvector/pgvector:pg15`
- **Database**: `flowmaestro` (default)
- **User**: `flowmaestro`
- **Password**: `flowmaestro_dev_password`
- **Additional Databases**: `temporal`, `temporal_visibility`
- **Extensions**: pgvector (for embeddings in knowledge base)

**Connection String**:
```
postgresql://flowmaestro:flowmaestro_dev_password@localhost:5432/flowmaestro
```

### Redis (Port 6379)
- **Image**: `redis:7-alpine`
- **No authentication** (local dev only)

**Connection String**:
```
redis://localhost:6379
```

### Temporal Server (Port 7233)
- **Image**: `temporalio/auto-setup:1.23.0`
- **Self-hosted workflow engine**
- **RPC Endpoint**: `localhost:7233`
- **Configuration**: See `temporal/dynamicconfig/development-sql.yaml`

### Temporal UI (Port 8088)
- **Image**: `temporalio/ui:2.22.3`
- **Web Interface**: http://localhost:8088
- **Workflow visualization and debugging**

### Adminer (Port 8080)
- **Image**: `adminer:latest`
- **Database Admin UI**: http://localhost:8080
- **Pre-configured to connect to PostgreSQL**

## Data Persistence

Data is persisted in Docker named volumes:
- `flowmaestro_postgres_data` - PostgreSQL database files
- `flowmaestro_redis_data` - Redis snapshots

These volumes are defined as **external** in docker-compose.yml to maintain data continuity even when the compose file location changes.

**To preserve data** across restarts:
```bash
npm run docker:down    # Stop services, keep data
```

**To delete all data** and start fresh:
```bash
npm run docker:clean   # Stop services and delete volumes
```

**Note**: The `docker:clean` command only stops containers. To completely remove the data volumes, run:
```bash
docker volume rm flowmaestro_postgres_data flowmaestro_redis_data
```

## Configuration Files

### postgres/init.sql
Initialization script that runs on first PostgreSQL startup:
- Enables pgvector extension
- Creates `temporal` and `temporal_visibility` databases
- Sets up proper permissions

### temporal/dynamicconfig/development-sql.yaml
Temporal runtime configuration for local development:
- 7-day workflow retention (vs 30 days in production)
- Debug mode disabled
- 10,000 RPS rate limit
- Search attributes and advanced visibility enabled

## Common Commands

```bash
# Start all services in background
npm run docker:up

# Stop all services (keep data)
npm run docker:down

# View logs (follow mode)
npm run docker:logs

# Remove all services and volumes
npm run docker:clean

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed
```

## Troubleshooting

### PostgreSQL won't start
Check if port 5432 is already in use:
```bash
lsof -i :5432
```

### Temporal server connection refused
1. Check if postgres is healthy: `docker ps`
2. View temporal logs: `docker logs flowmaestro-temporal`
3. Ensure temporal databases exist in postgres

### Data won't persist
Make sure you're using `docker:down` and NOT `docker:clean` when stopping services.

### Reset everything
```bash
npm run docker:clean
npm run docker:up
npm run db:migrate
```

## Production vs Local

| Aspect | Local (this folder) | Production (/infra/k8s) |
|--------|---------------------|------------------------|
| Postgres | Docker container | Cloud SQL |
| Redis | Docker container | Cloud Memorystore |
| Temporal | Self-hosted container | Self-hosted K8s deployment |
| Storage | Local volumes | GCS buckets |
| Config | docker-compose.yml | Kubernetes manifests |

See `/infra/README.md` for production deployment documentation.
