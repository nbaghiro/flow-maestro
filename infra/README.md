# FlowMaestro Infrastructure & Deployment Guide

Complete guide for deploying FlowMaestro to Google Kubernetes Engine (GKE) with self-hosted Temporal.

---

## 🚀 Quick Start

**Want to test locally first?** → See [LOCAL_QUICKSTART.md](LOCAL_QUICKSTART.md) or run:
```bash
cd infra
./local-test.sh
```

**Ready for production?** → Continue with this guide below.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup (Pulumi)](#infrastructure-setup-pulumi)
4. [Docker Image Build](#docker-image-build)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [DNS & SSL Configuration](#dns--ssl-configuration)
7. [Automated Deployment](#automated-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Cost Estimation](#cost-estimation)
10. [Local Testing](#local-testing)

---

## Architecture Overview

### Services Deployed

All services run in Kubernetes (GKE):

- **API Server** (3 replicas) - Fastify REST API + WebSocket server
- **Frontend App** (3 replicas) - React SPA served by Nginx
- **Marketing Site** (2 replicas) - Static marketing website served by Nginx
- **Temporal Server** (3 replicas) - Self-hosted workflow orchestration
- **Temporal UI** (1 replica) - Temporal web interface
- **Temporal Worker** (2 replicas) - Workflow execution workers

### Managed Services (GCP)

- **Cloud SQL PostgreSQL 15** (HA) - 3 databases:
  - `flowmaestro` - Application data
  - `temporal` - Temporal workflow state
  - `temporal_visibility` - Temporal visibility data
- **Memorystore Redis 7** (HA) - Caching and pub/sub
- **Cloud Storage** - User uploads and workflow artifacts
- **GKE Autopilot** - Managed Kubernetes cluster
- **Cloud Load Balancer** - SSL termination and routing
- **Secret Manager** - Secure credential storage
- **Cloud Monitoring** - Dashboards and alerts

### Architecture Diagram

```
Internet → Cloud Load Balancer (SSL) → GKE Ingress
                                          ↓
                    ┌─────────────────────┼─────────────────────┐
                    ↓                     ↓                     ↓
              [Frontend]            [Marketing]             [API]
              (Nginx)               (Nginx)              (Fastify)
                                                             ↓
                                            ┌────────────────┴───────────┐
                                            ↓                            ↓
                                     [Temporal Worker] ← → [Temporal Server]
                                            ↓                            ↓
                              ┌─────────────┴────────────────────────────┤
                              ↓                                          ↓
                        [Cloud SQL HA]                           [Redis HA]
                  (3 DBs: app, temporal,
                   temporal_visibility)
```

---

## Prerequisites

### Required Tools

Install these tools on your local machine:

```bash
# Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# kubectl (via gcloud)
gcloud components install kubectl

# Pulumi
curl -fsSL https://get.pulumi.com | sh

# Docker
# https://docs.docker.com/get-docker/

# Node.js 20+
# https://nodejs.org/

# Verify installations
gcloud --version
kubectl version --client
pulumi version
docker --version
node --version
```

### GCP Project Setup

```bash
# Create a new GCP project (or use existing)
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Set as default
gcloud config set project $GCP_PROJECT_ID
gcloud config set compute/region $GCP_REGION

# Authenticate
gcloud auth login
gcloud auth application-default login

# Enable required APIs
gcloud services enable \
    container.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    monitoring.googleapis.com
```

### Domain Requirements

- **Domain registered** and accessible for DNS configuration
- You'll need to create A records after infrastructure deployment

---

## Infrastructure Setup (Pulumi)

### 1. Initialize Pulumi

```bash
cd infra/pulumi

# Install dependencies
npm install

# Login to Pulumi (use local backend or Pulumi Cloud)
pulumi login  # or pulumi login --local

# Create a new stack
pulumi stack init production
```

### 2. Configure Pulumi Stack

```bash
# Required: GCP Project
pulumi config set gcp:project YOUR_PROJECT_ID
pulumi config set gcp:region us-central1

# Required: Domain
pulumi config set domain yourdomain.com

# Required: Generate secure secrets
pulumi config set --secret dbPassword $(openssl rand -base64 32)
pulumi config set --secret jwtSecret $(openssl rand -base64 64)
pulumi config set --secret encryptionKey $(openssl rand -hex 32)

# Optional: Temporal namespace (defaults to "default")
pulumi config set temporalNamespace production

# Optional: Application secrets (for integrations like OpenAI, Anthropic, etc.)
# Format: JSON object with key-value pairs
pulumi config set appSecrets '{
  "OPENAI_API_KEY": "sk-...",
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "GOOGLE_API_KEY": "AIza...",
  "SLACK_BOT_TOKEN": "xoxb-...",
  "NOTION_API_KEY": "secret_..."
}'

# Optional: Database configuration (defaults shown)
pulumi config set dbTier db-custom-2-7680  # 2 vCPU, 7.5GB RAM
pulumi config set dbDiskSize 100  # GB
pulumi config set dbHighAvailability true
pulumi config set dbBackupEnabled true

# Optional: Redis configuration (defaults shown)
pulumi config set redisMemorySizeGb 5
pulumi config set redisTier STANDARD_HA  # or BASIC
```

### 3. Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# This will create:
# - VPC network with private subnets
# - Cloud SQL PostgreSQL (HA) with 3 databases
# - Memorystore Redis (HA)
# - GKE Autopilot cluster
# - Cloud Storage buckets
# - Secret Manager secrets
# - Monitoring dashboards and alerts
# - Global static IP for Load Balancer

# Deployment takes approximately 20-30 minutes
```

### 4. Save Infrastructure Outputs

```bash
# Get kubeconfig
pulumi stack output kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml

# Test kubectl connectivity
kubectl get nodes

# Get other important outputs
pulumi stack output staticIpAddress  # For DNS configuration
pulumi stack output databasePrivateIp
pulumi stack output redisHost
```

---

## Docker Image Build

### 1. Create Artifact Registry Repository

```bash
cd ../..  # Back to project root

export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export IMAGE_TAG=$(git rev-parse --short HEAD)
export REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/flowmaestro"

# Create repository
gcloud artifacts repositories create flowmaestro \
    --repository-format=docker \
    --location=$GCP_REGION \
    --description="FlowMaestro container images"

# Configure Docker authentication
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
```

### 2. Build Images

```bash
# Build backend (API + Worker)
docker build -f infra/docker/backend/Dockerfile \
    -t ${REGISTRY}/backend:${IMAGE_TAG} \
    -t ${REGISTRY}/backend:latest .

# Build frontend
docker build -f infra/docker/frontend/Dockerfile \
    --build-arg VITE_API_URL=https://api.yourdomain.com \
    --build-arg VITE_WS_URL=wss://api.yourdomain.com \
    -t ${REGISTRY}/frontend:${IMAGE_TAG} \
    -t ${REGISTRY}/frontend:latest .

# Build marketing
docker build -f infra/docker/marketing/Dockerfile \
    -t ${REGISTRY}/marketing:${IMAGE_TAG} \
    -t ${REGISTRY}/marketing:latest .
```

### 3. Push Images

```bash
docker push ${REGISTRY}/backend:${IMAGE_TAG}
docker push ${REGISTRY}/backend:latest

docker push ${REGISTRY}/frontend:${IMAGE_TAG}
docker push ${REGISTRY}/frontend:latest

docker push ${REGISTRY}/marketing:${IMAGE_TAG}
docker push ${REGISTRY}/marketing:latest
```

---

## Kubernetes Deployment

### 1. Create Kubernetes Secrets

Get values from Pulumi outputs:

```bash
# Get database connection info
DB_HOST=$(pulumi stack output databasePrivateIp -C infra/pulumi)
REDIS_HOST=$(pulumi stack output redisHost -C infra/pulumi)

# Get secrets from Pulumi config
DB_PASSWORD=$(pulumi config get dbPassword --show-secrets -C infra/pulumi)
JWT_SECRET=$(pulumi config get jwtSecret --show-secrets -C infra/pulumi)
ENCRYPTION_KEY=$(pulumi config get encryptionKey --show-secrets -C infra/pulumi)
```

Create secrets:

```bash
# Create namespace
kubectl create namespace flowmaestro

# Application database credentials
kubectl create secret generic db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=${DB_HOST} \
    --from-literal=port=5432 \
    --from-literal=database=flowmaestro \
    --from-literal=user=flowmaestro \
    --from-literal=password="${DB_PASSWORD}"

# Temporal database credentials
kubectl create secret generic temporal-db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=${DB_HOST} \
    --from-literal=port=5432 \
    --from-literal=database=temporal \
    --from-literal=visibility-database=temporal_visibility \
    --from-literal=user=temporal \
    --from-literal=password="${DB_PASSWORD}"

# Redis credentials
kubectl create secret generic redis-credentials \
    --namespace=flowmaestro \
    --from-literal=host=${REDIS_HOST} \
    --from-literal=port=6379

# Application secrets
kubectl create secret generic app-secrets \
    --namespace=flowmaestro \
    --from-literal=jwt-secret="${JWT_SECRET}" \
    --from-literal=encryption-key="${ENCRYPTION_KEY}"

# Integration secrets (optional - from appSecrets config)
kubectl create secret generic integration-secrets \
    --namespace=flowmaestro \
    --from-literal=OPENAI_API_KEY="sk-..." \
    --from-literal=ANTHROPIC_API_KEY="sk-ant-..." \
    --from-literal=GOOGLE_API_KEY="AIza..." \
    --from-literal=SLACK_BOT_TOKEN="xoxb-..." \
    --from-literal=NOTION_API_KEY="secret_..."
```

### 2. Update Kubernetes Manifests

Replace placeholders in manifests:

```bash
cd infra

# Update manifests with your values
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export DOMAIN="yourdomain.com"

# Replace placeholders
find k8s -type f -name "*.yaml" -exec sed -i.bak \
    -e "s|REGION|${GCP_REGION}|g" \
    -e "s|PROJECT_ID|${GCP_PROJECT_ID}|g" \
    -e "s|DOMAIN|${DOMAIN}|g" \
    {} \;

# Remove backup files
find k8s -type f -name "*.bak" -delete
```

### 3. Deploy Temporal

```bash
# Run Temporal schema migration
kubectl apply -f k8s/jobs/temporal-schema-migration.yaml

# Wait for migration to complete
kubectl wait --for=condition=complete --timeout=10m \
    job/temporal-schema-migration -n flowmaestro

# Check migration logs
kubectl logs -f job/temporal-schema-migration -n flowmaestro

# Deploy Temporal server and UI
kubectl apply -f k8s/base/temporal-deployment.yaml

# Wait for Temporal to be ready
kubectl wait --for=condition=available --timeout=10m \
    deployment/temporal-server -n flowmaestro
```

### 4. Deploy Application

```bash
# Run application database migrations
kubectl apply -f k8s/jobs/db-migration.yaml

# Wait for migration to complete
kubectl wait --for=condition=complete --timeout=10m \
    job/db-migration -n flowmaestro

# Check migration logs
kubectl logs -f job/db-migration -n flowmaestro

# Deploy all services (API, workers, frontend, marketing)
kubectl apply -k k8s/overlays/production

# Wait for deployments
kubectl rollout status deployment/api-server -n flowmaestro --timeout=10m
kubectl rollout status deployment/temporal-worker -n flowmaestro --timeout=10m
kubectl rollout status deployment/frontend -n flowmaestro --timeout=10m
kubectl rollout status deployment/marketing -n flowmaestro --timeout=10m

# Verify all pods are running
kubectl get pods -n flowmaestro
```

---

## DNS & SSL Configuration

### 1. Get Load Balancer IP

```bash
# Get the external IP address
kubectl get ingress flowmaestro-ingress -n flowmaestro

# Example output:
# NAME                   CLASS    HOSTS                           ADDRESS          PORTS     AGE
# flowmaestro-ingress   <none>   api.example.com,app.example...  34.120.45.67     80, 443   5m
```

### 2. Configure DNS

Create A records in your DNS provider pointing to the Load Balancer IP:

```
Type    Name    Value           TTL
A       api     34.120.45.67    300
A       app     34.120.45.67    300
A       www     34.120.45.67    300
A       @       34.120.45.67    300
```

### 3. Wait for SSL Certificate

Google-managed SSL certificates take 15-60 minutes to provision after DNS propagation:

```bash
# Check certificate status
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

# Status will change from "Provisioning" to "Active"
# You can also check:
watch kubectl get managedcertificate -n flowmaestro
```

### 4. Verify Deployment

Once SSL is active:

```bash
# Test API
curl https://api.yourdomain.com/health

# Test Frontend
open https://app.yourdomain.com

# Test Marketing
open https://www.yourdomain.com

# View Temporal UI (if you want to expose it)
kubectl port-forward -n flowmaestro svc/temporal-ui-service 8080:8080
# Then access: http://localhost:8080
```

---

## Automated Deployment

Use the deployment script for automated deployment:

```bash
cd infra

# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh

# The script will:
# 1. Check prerequisites
# 2. Prompt for configuration (project, region, domain)
# 3. Create Artifact Registry repository
# 4. Build and push Docker images
# 5. Update Kubernetes manifests
# 6. Check for required secrets
# 7. Deploy Temporal schema migration
# 8. Deploy Temporal server
# 9. Deploy application database migration
# 10. Deploy all services
# 11. Show deployment status
```

**Note**: You must create Kubernetes secrets before running the script. The script will check for secrets and prompt you if they're missing.

---

## Troubleshooting

### Check Pod Status

```bash
# Get all pods
kubectl get pods -n flowmaestro

# Describe a pod
kubectl describe pod <pod-name> -n flowmaestro

# View logs
kubectl logs -f <pod-name> -n flowmaestro

# View previous logs (if pod restarted)
kubectl logs --previous <pod-name> -n flowmaestro
```

### Common Issues

#### 1. Pods Stuck in Pending

```bash
# Check events
kubectl get events -n flowmaestro --sort-by='.lastTimestamp'

# Check node resources
kubectl top nodes

# Common causes:
# - Insufficient cluster resources (GKE Autopilot will auto-scale)
# - Image pull errors (check image name and registry auth)
```

#### 2. Temporal Migration Fails

```bash
# View migration logs
kubectl logs -f job/temporal-schema-migration -n flowmaestro

# Common causes:
# - Database not accessible (check firewall rules)
# - Incorrect database credentials (check secret)
# - Database user lacks permissions

# Retry migration
kubectl delete job temporal-schema-migration -n flowmaestro
kubectl apply -f k8s/jobs/temporal-schema-migration.yaml
```

#### 3. SSL Certificate Not Provisioning

```bash
# Check certificate status
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

# Common causes:
# - DNS not configured correctly (verify A records)
# - DNS not propagated yet (wait 5-10 minutes)
# - Domain verification failed (check domain ownership)

# Verify DNS propagation
dig api.yourdomain.com
nslookup api.yourdomain.com
```

#### 4. Database Connection Errors

```bash
# Test database connectivity from a pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql -h <DB_HOST> -U flowmaestro -d flowmaestro

# Common causes:
# - Incorrect host/credentials in secrets
# - Cloud SQL private IP not accessible from GKE
# - Database user not created properly
```

#### 5. Temporal Server Not Starting

```bash
# Check Temporal server logs
kubectl logs -f deployment/temporal-server -n flowmaestro

# Common causes:
# - Database schema not migrated
# - Incorrect database credentials
# - Port conflicts

# Restart Temporal
kubectl rollout restart deployment/temporal-server -n flowmaestro
```

### View Logs

```bash
# API server logs
kubectl logs -f deployment/api-server -n flowmaestro

# Worker logs
kubectl logs -f deployment/temporal-worker -n flowmaestro

# Frontend logs
kubectl logs -f deployment/frontend -n flowmaestro

# Temporal server logs
kubectl logs -f deployment/temporal-server -n flowmaestro

# All logs for a deployment
kubectl logs -f deployment/<deployment-name> -n flowmaestro --all-containers=true
```

### Scale Deployments

```bash
# Scale a deployment manually
kubectl scale deployment api-server --replicas=5 -n flowmaestro

# View HPA status
kubectl get hpa -n flowmaestro

# Describe HPA
kubectl describe hpa api-server-hpa -n flowmaestro
```

### Database Access

```bash
# Get Cloud SQL connection info
pulumi stack output databaseConnectionName -C pulumi

# Connect via Cloud SQL Proxy
cloud_sql_proxy -instances=<CONNECTION_NAME>=tcp:5432

# Or connect directly from GKE
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql -h <DB_PRIVATE_IP> -U flowmaestro -d flowmaestro
```

---

## Cost Estimation

### Monthly Costs (High Availability Configuration)

| Service | Configuration | Est. Monthly Cost |
|---------|--------------|-------------------|
| **GKE Autopilot** | Variable based on actual usage | $200-400 |
| **Cloud SQL PostgreSQL** | HA, db-custom-2-7680, 100GB | $250-350 |
| **Memorystore Redis** | HA, 5GB | $150-200 |
| **Load Balancer** | Global external | $20-30 |
| **Cloud Storage** | Standard, ~50GB | $1-5 |
| **Artifact Registry** | ~10GB images | $5-10 |
| **Secret Manager** | ~20 secrets | $0.50 |
| **Monitoring** | Standard metrics | Included |
| **Network Egress** | Variable | $20-50 |
| **Total** | | **~$650-1,050/month** |

### Cost Optimization Tips

1. **Disable HA for Development**:
   ```bash
   pulumi config set dbHighAvailability false
   pulumi config set redisTier BASIC
   # Saves ~$200-300/month
   ```

2. **Use Smaller Database Instance**:
   ```bash
   pulumi config set dbTier db-custom-1-3840  # 1 vCPU, 3.75GB
   # Saves ~$100-150/month
   ```

3. **Reduce Replica Counts** (Staging):
   - Use staging overlay with 1 replica per service
   - Saves ~$100-200/month

4. **Use Preemptible/Spot Instances** (Development):
   - Note: GKE Autopilot doesn't support spot instances
   - Consider standard GKE for development environments

---

## Next Steps

After successful deployment:

1. **Monitor Application**:
   - View GCP Monitoring Dashboard (link in Pulumi outputs)
   - Set up alerts for errors and resource usage

2. **Configure Backups**:
   - Cloud SQL automated backups are enabled
   - Test backup restoration procedure

3. **Set Up CI/CD**:
   - Use Cloud Build or GitHub Actions
   - Automate image builds and deployments

4. **Security Hardening**:
   - Review NetworkPolicies
   - Enable Binary Authorization
   - Set up VPC Service Controls
   - Rotate secrets regularly

5. **Performance Tuning**:
   - Monitor HPA metrics
   - Adjust replica counts based on traffic
   - Optimize database queries
   - Enable connection pooling

6. **Documentation**:
   - Document custom workflows
   - Create runbooks for common operations
   - Train team on Temporal workflows

---

## Local Testing

Before deploying to GCP, you can test everything locally using Minikube or kind.

### Quick Local Test

```bash
cd infra
./local-test.sh
```

This automated script will:
1. Start a local Kubernetes cluster (Minikube or kind)
2. Deploy PostgreSQL and Redis via Helm
3. Build Docker images locally
4. Deploy all FlowMaestro services
5. Provide access URLs

### Documentation

- **Quick Start**: [LOCAL_QUICKSTART.md](LOCAL_QUICKSTART.md) - Get started in 10 minutes
- **Detailed Guide**: [LOCAL_TESTING.md](LOCAL_TESTING.md) - Complete local testing documentation

### Benefits of Local Testing

✅ **Fast Iteration**: Test changes without deploying to GCP
✅ **Cost Savings**: No cloud costs during development
✅ **Offline Development**: Work without internet connection
✅ **Safe Experimentation**: Break things without consequences
✅ **CI/CD Validation**: Test K8s manifests before production

---

## Additional Resources

- **Main Docs**: `/.docs/` directory in project root
- **Architecture**: `/.docs/architecture.md`
- **Temporal**: `/.docs/temporal-orchestration.md`
- **Testing**: `/.docs/testing-strategy.md`
- **Local Testing**: [LOCAL_TESTING.md](LOCAL_TESTING.md)
- **Pulumi Docs**: https://www.pulumi.com/docs/
- **GKE Docs**: https://cloud.google.com/kubernetes-engine/docs
- **Temporal Docs**: https://docs.temporal.io/

---

**Questions or Issues?**

- Check the troubleshooting section above
- Review logs with `kubectl logs`
- Check GCP Cloud Console for infrastructure issues
- Review Pulumi state with `pulumi stack`
- For local testing issues, see [LOCAL_TESTING.md](LOCAL_TESTING.md#troubleshooting)

**Happy Deploying! 🚀**
