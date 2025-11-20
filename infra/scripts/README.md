# FlowMaestro Infrastructure Scripts

This directory contains utility scripts for managing FlowMaestro infrastructure and secrets.

## Secrets Management

FlowMaestro uses **GCP Secret Manager** as the single source of truth for all secrets. This provides:

- Centralized secret management
- Version control for secrets
- Automatic syncing to deployed environments via External Secrets Operator
- Easy local development setup

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GCP Secret Manager                        │
│                  (Single Source of Truth)                    │
│                                                              │
│  • flowmaestro-jwt-secret                                   │
│  • flowmaestro-encryption-key                               │
│  • flowmaestro-db-config (JSON)                             │
│  • flowmaestro-redis-config (JSON)                          │
│  • flowmaestro-temporal-db-config (JSON)                    │
│  • flowmaestro-app-{provider}-api-key                       │
│  • flowmaestro-app-{service}-client-{id|secret}             │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌────────────────────┐          ┌──────────────────────┐
│  K8s/Production    │          │  Local Development   │
│                    │          │                      │
│  External Secrets  │          │  sync-secrets-       │
│  Operator (ESO)    │          │  local.sh script     │
│                    │          │                      │
│  • Auto-syncs      │          │  • Pulls secrets     │
│    every 5 min     │          │  • Generates .env    │
│  • Creates K8s     │          │  • Uses gcloud CLI   │
│    Secrets         │          │                      │
└────────────────────┘          └──────────────────────┘
```

## Scripts

### `setup-secrets-gcp.sh`

**Purpose**: Create or update secrets in GCP Secret Manager

**When to use**:

- Initial project setup
- Adding new secrets
- Updating existing secret values
- Rotating credentials

**Prerequisites**:

- `gcloud` CLI installed and authenticated
- Secret Manager Admin role on the GCP project
- Current gcloud default project set to your target project

**Usage**:

```bash
# Make sure you're using the correct GCP project
gcloud config get-value project

# If needed, set the correct project
gcloud config set project YOUR_PROJECT_ID

# Run the setup script
./infra/scripts/setup-secrets-gcp.sh
```

**What it does**:

1. Prompts you for all required secrets
2. Auto-generates secure values for JWT_SECRET, ENCRYPTION_KEY, and DB_PASSWORD if not provided
3. Creates JSON structures for complex configurations (database, Redis, Temporal)
4. Creates or updates secrets in GCP Secret Manager
5. Displays generated values for you to save securely

**Interactive prompts**:

- Core secrets: JWT_SECRET, ENCRYPTION_KEY
- Database configuration: host, port, name, user, password
- Redis configuration: host, port
- Temporal database configuration
- LLM API keys (optional): OpenAI, Anthropic, Google
- OAuth secrets (optional): Slack, Google, Notion

**Example session**:

```
========================================
FlowMaestro GCP Secrets Setup
========================================

ℹ️  GCP Project: flowmaestro-prod
⚠️  This will create/update secrets in GCP Secret Manager

Continue? (y/n): y

ℹ️  Core Application Secrets
JWT Secret (leave empty to generate): [press Enter]
ℹ️  Generated JWT Secret
Encryption Key (leave empty to generate): [press Enter]
ℹ️  Generated Encryption Key (64 hex chars)

ℹ️  Database Configuration
Database Host [localhost]: db.example.com
Database Port [5432]: 5432
Database Name [flowmaestro]: flowmaestro
Database User [flowmaestro]: flowmaestro
Database Password (leave empty to generate): [press Enter]
ℹ️  Generated Database Password

...

========================================
Creating/Updating Secrets in GCP Secret Manager
========================================

✅ Created flowmaestro-jwt-secret
✅ Created flowmaestro-encryption-key
✅ Created flowmaestro-db-config
...
```

---

### `sync-secrets-local.sh`

**Purpose**: Set up local development environment with appropriate secrets

**When to use**:

- New developer onboarding
- Updating local environment with latest API keys/OAuth credentials
- Setting up a fresh development environment

**Prerequisites**:

- `gcloud` CLI installed and authenticated
- Secret Manager Accessor role (read permission) on the GCP project
- Current gcloud default project set to your target project

**Usage**:

```bash
# Make sure you're using the correct GCP project
gcloud config get-value project

# If needed, set the correct project
gcloud config set project YOUR_PROJECT_ID

# Run the sync script
./infra/scripts/sync-secrets-local.sh
```

**What it does**:

1. Uses **local defaults** for system secrets (database, JWT, encryption)
2. Fetches **developer secrets** from GCP (LLM API keys, OAuth credentials)
3. Generates `backend/.env` file with all required variables
4. Displays next steps for starting development

**Secrets approach**:

- **System secrets** (local defaults):
    - JWT_SECRET: Safe development default
    - ENCRYPTION_KEY: Safe development default
    - Database config: localhost PostgreSQL
    - Redis config: localhost Redis
    - Temporal config: localhost Temporal

- **Developer secrets** (from GCP):
    - LLM API Keys: OpenAI, Anthropic, Google
    - OAuth: Slack, Google, Notion client IDs and secrets

**Why this approach?**

- System secrets are auto-generated and safe to use defaults locally
- Developer secrets (API keys, OAuth) are valuable and should be centrally managed
- Simpler setup - no need to configure databases or generate secure keys

**Example session**:

```
========================================
FlowMaestro Secrets Sync
========================================

ℹ️  GCP Project: flowmaestro-prod
⚠️  This will pull secrets from the current gcloud default project

========================================
Checking Prerequisites
========================================

✅ gcloud CLI found
✅ gcloud authenticated

========================================
Fetching Developer Secrets from GCP Secret Manager
========================================

ℹ️  NOTE: System secrets (JWT, encryption, database) use local defaults
ℹ️  Only fetching LLM API keys and OAuth credentials from GCP

ℹ️  Fetching LLM API keys...
✅ Found OpenAI API key
⚠️  Secret flowmaestro-app-anthropic-api-key not found, skipping
⚠️  Secret flowmaestro-app-google-api-key not found, skipping

ℹ️  Fetching OAuth secrets...
✅ Found Slack OAuth credentials
⚠️  Secret flowmaestro-app-google-client-id not found, skipping
⚠️  Secret flowmaestro-app-notion-client-id not found, skipping

✅ Developer secrets fetched successfully

========================================
Generating .env File
========================================

ℹ️  Writing to /path/to/flowmaestro/backend/.env...
✅ backend/.env file created

========================================
Secrets Sync Complete!
========================================

✅ backend/.env created with:
  • System secrets (database, JWT, encryption): Local defaults
  • Developer secrets (LLM keys, OAuth): From flowmaestro-prod

ℹ️  Next steps:
  1. Start your local infrastructure: npm run docker:up
  2. Run database migrations: npm run db:migrate
  3. Start the development servers: npm run dev

⚠️  Remember: Never commit .env files to git!
```

**Behavior for missing secrets**:

- System secrets: Always use local defaults (never fetched from GCP for local dev)
- Developer secrets: If not found in GCP, left empty (optional for most development)

---

## Secret Structure in GCP

### Simple Secrets (String Values)

These are stored as plain text strings:

| Secret Name                            | Description               | Example Value                      |
| -------------------------------------- | ------------------------- | ---------------------------------- |
| `flowmaestro-jwt-secret`               | JWT signing key           | `abc123...xyz` (64 chars)          |
| `flowmaestro-encryption-key`           | Credential encryption key | `0123456789abcdef...` (64 hex)     |
| `flowmaestro-app-openai-api-key`       | OpenAI API key            | `sk-...`                           |
| `flowmaestro-app-anthropic-api-key`    | Anthropic API key         | `sk-ant-...`                       |
| `flowmaestro-app-google-api-key`       | Google API key            | `AIza...`                          |
| `flowmaestro-app-slack-client-id`      | Slack OAuth client ID     | `123...`                           |
| `flowmaestro-app-slack-client-secret`  | Slack OAuth secret        | `abc...`                           |
| `flowmaestro-app-google-client-id`     | Google OAuth client ID    | `123...apps.googleusercontent.com` |
| `flowmaestro-app-google-client-secret` | Google OAuth secret       | `GOCSPX-...`                       |
| `flowmaestro-app-notion-client-id`     | Notion OAuth client ID    | `abc...`                           |
| `flowmaestro-app-notion-client-secret` | Notion OAuth secret       | `secret_...`                       |

### JSON Secrets (Complex Configurations)

These are stored as JSON for related configuration:

#### `flowmaestro-db-config`

```json
{
    "db_host": "localhost",
    "db_port": "5432",
    "db_name": "flowmaestro",
    "db_user": "flowmaestro",
    "db_password": "generated-password"
}
```

#### `flowmaestro-redis-config`

```json
{
    "redis_host": "localhost",
    "redis_port": "6379"
}
```

#### `flowmaestro-temporal-db-config`

```json
{
    "host": "localhost",
    "port": "5432",
    "database": "flowmaestro_temporal",
    "user": "flowmaestro",
    "password": "generated-password",
    "visibility-database": "flowmaestro_temporal_visibility"
}
```

---

## External Secrets Operator (Production)

In production/K8s environments, secrets are automatically synced using the External Secrets Operator (ESO).

### How ESO Works

1. **ESO runs in the cluster** (namespace: `external-secrets-system`)
2. **ClusterSecretStore** connects ESO to GCP Secret Manager using Workload Identity
3. **ExternalSecret resources** define which secrets to sync and how to map them
4. **ESO creates K8s Secrets** automatically from GCP Secret Manager
5. **Pods mount the K8s Secrets** as environment variables

### ExternalSecret Resources

Located in `infra/k8s/base/external-secrets/`:

- `secret-store.yaml` - Defines connection to GCP Secret Manager
- `app-secrets.yaml` - JWT and encryption key
- `db-credentials.yaml` - Database configuration + constructed DATABASE_URL
- `redis-credentials.yaml` - Redis configuration + constructed REDIS_URL
- `temporal-db-credentials.yaml` - Temporal database configuration
- `llm-api-keys.yaml` - LLM provider API keys
- `oauth-secrets.yaml` - OAuth client credentials

### Refresh Interval

ExternalSecrets automatically refresh every **5 minutes** (`refreshInterval: 5m`).

This means:

- Update a secret in GCP Secret Manager
- Within 5 minutes, the change propagates to all K8s Secrets
- Pods need to be restarted to pick up the new values

### Verifying ESO in Production

```bash
# Check ESO is running
kubectl get pods -n external-secrets-system

# Check ClusterSecretStore status
kubectl get clustersecretstore gcp-secret-manager -o yaml

# Check ExternalSecret status
kubectl get externalsecrets -n flowmaestro

# Check if K8s Secrets were created
kubectl get secrets -n flowmaestro

# View a specific secret (base64 encoded)
kubectl get secret app-secrets -n flowmaestro -o yaml

# Decode a secret value
kubectl get secret app-secrets -n flowmaestro -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

---

## Common Workflows

### Initial Project Setup (Team Lead)

```bash
# 1. Set GCP project
gcloud config set project flowmaestro-prod

# 2. Create secrets in GCP Secret Manager
./infra/scripts/setup-secrets-gcp.sh

# 3. Deploy infrastructure (includes ESO)
cd infra/pulumi
pulumi up

# 4. Deploy Kubernetes resources (includes ExternalSecrets)
cd ../..
./infra/deploy.sh
```

### New Developer Onboarding

```bash
# 1. Clone repository
git clone https://github.com/yourorg/flowmaestro.git
cd flowmaestro

# 2. Set GCP project
gcloud config set project flowmaestro-prod

# 3. Pull secrets from GCP
./infra/scripts/sync-secrets-local.sh

# 4. Start local infrastructure
npm run docker:up

# 5. Run migrations
npm run db:migrate

# 6. Start development servers
npm run dev
```

### Updating Secrets

**For production/deployed environments**:

```bash
# 1. Update secret in GCP Secret Manager
./infra/scripts/setup-secrets-gcp.sh

# 2. Wait 5 minutes for ESO to sync (or manually trigger sync)
kubectl delete externalsecret <secret-name> -n flowmaestro
kubectl apply -f infra/k8s/base/external-secrets/<secret-file>.yaml

# 3. Restart pods to pick up new values
kubectl rollout restart deployment/api -n flowmaestro
kubectl rollout restart deployment/worker -n flowmaestro
```

**For local development**:

```bash
# Pull latest secrets
./infra/scripts/sync-secrets-local.sh

# Restart local services
npm run docker:down
npm run docker:up
npm run dev
```

### Rotating Credentials

```bash
# 1. Generate new values and update in GCP
./infra/scripts/setup-secrets-gcp.sh

# 2. For production, wait for ESO sync and restart pods
kubectl rollout restart deployment/api -n flowmaestro
kubectl rollout restart deployment/worker -n flowmaestro

# 3. For local development, pull new secrets
./infra/scripts/sync-secrets-local.sh
npm run docker:restart  # Restart services that use the secrets
```

---

## Troubleshooting

### "No GCP project is set"

**Problem**: Script can't determine which GCP project to use

**Solution**:

```bash
# Check current project
gcloud config get-value project

# Set project
gcloud config set project YOUR_PROJECT_ID
```

### "Not authenticated with gcloud"

**Problem**: Not logged in to gcloud CLI

**Solution**:

```bash
gcloud auth login
gcloud auth application-default login
```

### "Secret not found" warnings

**Problem**: Secret doesn't exist in Secret Manager yet

**Solutions**:

1. Run `setup-secrets-gcp.sh` to create missing secrets
2. If optional (LLM/OAuth), you can ignore for local development
3. Check you're using the correct GCP project

### ExternalSecret shows "SecretSyncedError"

**Problem**: ESO can't sync secret from GCP

**Check**:

```bash
# View detailed error
kubectl describe externalsecret <name> -n flowmaestro

# Common issues:
# - Secret doesn't exist in GCP Secret Manager
# - Workload Identity not configured correctly
# - Service account missing permissions
```

**Solution**:

```bash
# Verify secret exists in GCP
gcloud secrets describe flowmaestro-<secret-name> --project=YOUR_PROJECT

# Check ESO service account permissions
gcloud projects get-iam-policy YOUR_PROJECT \
  --flatten="bindings[].members" \
  --filter="bindings.members:flowmaestro-prod-eso@*"

# Should have: roles/secretmanager.secretAccessor
```

### Local .env file not working

**Problem**: Application can't find environment variables

**Check**:

1. `.env` file exists in project root: `ls -la .env`
2. `backend/.env` exists: `ls -la backend/.env`
3. Files are not empty: `wc -l .env backend/.env`
4. No syntax errors in .env files

**Solution**:

```bash
# Re-run sync script
./infra/scripts/sync-secrets-local.sh

# Verify contents
head -n 20 .env
```

### Python JSON parsing errors

**Problem**: `sync-secrets-local.sh` fails with Python errors

**Check**: Python 3 is installed

```bash
python3 --version
```

**Solution**: Install Python 3 via your system package manager

---

## Security Best Practices

1. **Never commit .env files** - Already in `.gitignore`, but be careful
2. **Use separate projects** - Consider dev/staging/prod GCP projects for isolation
3. **Rotate secrets regularly** - Especially JWT_SECRET and ENCRYPTION_KEY
4. **Limit access** - Grant Secret Manager access only to those who need it
5. **Audit secret access** - Use GCP audit logs to monitor secret access
6. **Use Workload Identity** - Never use service account keys in K8s (ESO uses Workload Identity)
7. **Review generated values** - Save generated secrets securely (password manager)

---

## Additional Resources

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [External Secrets Operator Documentation](https://external-secrets.io)
- [Workload Identity Documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- FlowMaestro deployment guide: `infra/README.md`
