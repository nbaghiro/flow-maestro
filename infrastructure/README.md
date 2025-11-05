# FlowMaestro Infrastructure

This directory contains the Pulumi infrastructure-as-code for deploying FlowMaestro to Google Kubernetes Engine (GKE).

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) installed
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- Node.js 20+ installed

## Quick Start

### 1. Install Dependencies

```bash
cd infrastructure
npm install
```

### 2. Configure GCP Authentication

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Create Pulumi Stack

```bash
# Login to Pulumi (use local backend or Pulumi Cloud)
pulumi login

# Create a new stack
pulumi stack init production

# Configure the stack
pulumi config set gcp:project YOUR_PROJECT_ID
pulumi config set gcp:region us-central1
pulumi config set gcp:zone us-central1-a
pulumi config set domain "yourdomain.com"
pulumi config set appName "flowmaestro"
pulumi config set environment "production"
```

### 4. Set Secrets

```bash
# Generate and set secrets
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"
pulumi config set --secret jwtSecret "$(openssl rand -base64 64)"
pulumi config set --secret encryptionKey "$(openssl rand -hex 32)"

# Temporal Cloud credentials
pulumi config set temporalNamespace "your-namespace"
pulumi config set temporalAddress "your-namespace.tmprl.cloud:7233"
pulumi config set --secret temporalCaCert "$(cat path/to/ca.pem)"
pulumi config set --secret temporalClientCert "$(cat path/to/client.pem)"
pulumi config set --secret temporalClientKey "$(cat path/to/client-key.pem)"

# Optional: LLM API keys
pulumi config set --secret openaiApiKey "sk-..."
pulumi config set --secret anthropicApiKey "sk-ant-..."
```

### 5. Preview and Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy infrastructure
pulumi up

# View outputs
pulumi stack output
```

### 6. Save Kubeconfig

```bash
# Export kubeconfig
pulumi stack output kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml

# Verify connection
kubectl get nodes
```

## Infrastructure Components

The Pulumi stack provisions:

- **VPC Network** with private subnets and Cloud NAT
- **GKE Autopilot Cluster** with Workload Identity
- **Cloud SQL PostgreSQL** (HA, automated backups)
- **Memorystore Redis** (HA)
- **Cloud Storage** buckets for static assets
- **Load Balancer** with global static IP
- **Secret Manager** secrets
- **Monitoring** dashboards and alerts

## Configuration Options

### GKE Configuration

```bash
pulumi config set gkeAutopilot true  # Use Autopilot (recommended)
pulumi config set gkeVersion "latest"
```

### Database Configuration

```bash
pulumi config set dbVersion "POSTGRES_15"
pulumi config set dbTier "db-custom-2-7680"  # 2 vCPUs, 7.5GB RAM
pulumi config set dbDiskSize 100  # GB
pulumi config set dbHighAvailability true
pulumi config set dbBackupEnabled true
```

### Redis Configuration

```bash
pulumi config set redisVersion "REDIS_7_0"
pulumi config set redisMemorySizeGb 5
pulumi config set redisTier "STANDARD_HA"  # or "BASIC"
```

## Stack Outputs

After deployment, you can access outputs:

```bash
# Get all outputs
pulumi stack output

# Get specific output
pulumi stack output clusterName
pulumi stack output databasePrivateIp
pulumi stack output redisHost
pulumi stack output staticIpAddress
```

## Multi-Environment Setup

### Create Staging Stack

```bash
pulumi stack init staging
pulumi config set environment "staging"
pulumi config set domain "staging.yourdomain.com"

# Use smaller resources for staging
pulumi config set dbTier "db-f1-micro"
pulumi config set dbHighAvailability false
pulumi config set redisMemorySizeGb 1
pulumi config set redisTier "BASIC"

# Set secrets (generate new ones for staging)
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"
pulumi config set --secret jwtSecret "$(openssl rand -base64 64)"
pulumi config set --secret encryptionKey "$(openssl rand -hex 32)"

# Deploy staging
pulumi up
```

### Switch Between Stacks

```bash
# List stacks
pulumi stack ls

# Switch to production
pulumi stack select production

# Switch to staging
pulumi stack select staging
```

## Updating Infrastructure

```bash
# Make changes to Pulumi code
# Preview changes
pulumi preview

# Apply changes
pulumi up

# Refresh state (if resources changed outside Pulumi)
pulumi refresh
```

## Destroying Infrastructure

```bash
# Preview destruction
pulumi destroy --preview

# Destroy all resources
pulumi destroy

# Remove stack
pulumi stack rm production
```

## Troubleshooting

### Enable Required APIs

If you get API not enabled errors:

```bash
gcloud services enable \
    container.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com
```

### Check Pulumi Logs

```bash
# Verbose output
pulumi up -v=9

# View stack history
pulumi stack history
```

### Export State

```bash
# Export stack state
pulumi stack export > stack-state.json

# Import stack state
pulumi stack import < stack-state.json
```

## Cost Estimation

Production infrastructure costs approximately:

- GKE Autopilot: $250-400/month
- Cloud SQL (HA): $180-220/month
- Memorystore Redis: $150-180/month
- Load Balancer: $20-30/month
- Cloud Storage + CDN: $10-20/month
- **Total: $610-850/month** (excluding Temporal Cloud)

## Next Steps

After infrastructure is deployed:

1. **Configure DNS** - Point your domain to the static IP
2. **Build Docker images** - See `../README.md`
3. **Deploy to Kubernetes** - See `../k8s/README.md`
4. **Set up CI/CD** - See `../cloudbuild.yaml`
5. **Configure monitoring** - Access Cloud Console dashboards

## Support

For detailed deployment instructions, see:
- `../_docs/infrastructure-setup.md` - Complete deployment guide
- `../_docs/architecture.md` - Architecture documentation

For Pulumi documentation:
- https://www.pulumi.com/docs/
- https://www.pulumi.com/docs/clouds/gcp/
