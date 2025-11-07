# FlowMaestro Infrastructure

Complete infrastructure setup for deploying FlowMaestro to Google Kubernetes Engine (GKE).

## 📁 Directory Structure

```
infra/
├── pulumi/                 # Infrastructure as Code (Pulumi + TypeScript)
│   ├── config.ts           # Configuration management
│   ├── networking.ts       # VPC, Load Balancer, NAT, Static IP
│   ├── database.ts         # Cloud SQL PostgreSQL 15 (HA)
│   ├── redis.ts            # Memorystore Redis 7 (HA)
│   ├── gke-cluster.ts      # GKE Autopilot cluster
│   ├── secrets.ts          # Secret Manager integration
│   ├── storage.ts          # Cloud Storage + CDN
│   ├── monitoring.ts       # Dashboards, alerts, uptime checks
│   ├── index.ts            # Main entry point & outputs
│   ├── package.json        # Dependencies
│   ├── tsconfig.json       # TypeScript config
│   └── Pulumi.yaml         # Pulumi project config
│
├── k8s/                    # Kubernetes manifests
│   ├── base/               # Base configurations
│   │   ├── namespace.yaml          # Namespace + ServiceAccount
│   │   ├── configmap.yaml          # Environment variables
│   │   ├── api-deployment.yaml     # API server + HPA
│   │   ├── worker-deployment.yaml  # Temporal worker + HPA
│   │   ├── services.yaml           # Services + BackendConfig
│   │   ├── ingress.yaml            # Ingress + SSL + NetworkPolicies
│   │   └── kustomization.yaml      # Kustomize base
│   ├── overlays/
│   │   ├── production/     # Production config (3 API, 2 workers)
│   │   └── staging/        # Staging config (1 API, 1 worker)
│   └── jobs/
│       └── db-migration.yaml       # Database migration job
│
├── docker/                 # Docker configurations
│   ├── backend/
│   │   ├── Dockerfile      # Multi-stage Node.js 20 Alpine
│   │   └── .dockerignore
│   ├── frontend/
│   │   ├── Dockerfile      # Nginx Alpine with React SPA
│   │   ├── nginx.conf      # Nginx config with caching
│   │   └── .dockerignore
│   └── marketing/
│       ├── Dockerfile      # Nginx Alpine with static site
│       ├── nginx.conf
│       └── .dockerignore
│
├── deploy.sh               # Automated deployment script
└── README.md               # This file
```

## 🚀 Quick Start

### Automated Deployment

```bash
cd infra
./deploy.sh
```

The script will:

1. Verify prerequisites
2. Gather configuration
3. Create Artifact Registry
4. Build and push Docker images
5. Update Kubernetes manifests
6. Deploy to GKE

### Manual Deployment

Follow the sections below for step-by-step deployment.

---

## 📋 Prerequisites

### Required Tools

```bash
# Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# kubectl
gcloud components install kubectl

# Pulumi
curl -fsSL https://get.pulumi.com | sh

# Docker
# https://docs.docker.com/get-docker/

# Node.js 20+
# https://nodejs.org/
```

### GCP Setup

```bash
# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID
gcloud config set compute/region us-central1

# Enable APIs
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

### Temporal Cloud Setup

1. Sign up at https://temporal.io/cloud
2. Create namespace (e.g., `flowmaestro-production`)
3. Download CA certificate and generate client certificates
4. Save certificates for configuration

---

## 🏗️ 1. Deploy Infrastructure with Pulumi

### Initialize Pulumi

```bash
cd pulumi
npm install

# Login (local or cloud backend)
pulumi login

# Create stack
pulumi stack init production
```

### Configure Stack

```bash
# GCP settings
pulumi config set gcp:project $GCP_PROJECT_ID
pulumi config set gcp:region us-central1
pulumi config set gcp:zone us-central1-a

# Application settings
pulumi config set domain "yourdomain.com"
pulumi config set appName "flowmaestro"
pulumi config set environment "production"

# Generate secrets
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"
pulumi config set --secret jwtSecret "$(openssl rand -base64 64)"
pulumi config set --secret encryptionKey "$(openssl rand -hex 32)"

# Temporal Cloud configuration
pulumi config set temporalNamespace "your-namespace"
pulumi config set temporalAddress "your-namespace.tmprl.cloud:7233"
pulumi config set --secret temporalCaCert "$(cat path/to/ca.pem)"
pulumi config set --secret temporalClientCert "$(cat path/to/client.pem)"
pulumi config set --secret temporalClientKey "$(cat path/to/client-key.pem)"

# Optional: LLM API keys
pulumi config set --secret openaiApiKey "sk-..."
pulumi config set --secret anthropicApiKey "sk-ant-..."
pulumi config set --secret googleApiKey "..."
```

### Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# Save outputs
pulumi stack output > ../outputs.json
pulumi stack output kubeconfig > ../../kubeconfig.yaml

# Configure kubectl
export KUBECONFIG=../../kubeconfig.yaml
kubectl get nodes
```

### Infrastructure Components Deployed

- ✅ VPC with private subnets and Cloud NAT
- ✅ GKE Autopilot cluster with Workload Identity
- ✅ Cloud SQL PostgreSQL 15 (HA, automated backups)
- ✅ Memorystore Redis 7 (HA)
- ✅ Global Load Balancer with static IP
- ✅ Cloud Storage buckets + CDN
- ✅ Secret Manager secrets
- ✅ Monitoring dashboards and alerts

---

## 🐳 2. Build and Push Docker Images

### Create Artifact Registry

```bash
cd ..  # Back to infra root

export GCP_REGION="us-central1"

gcloud artifacts repositories create flowmaestro \
    --repository-format=docker \
    --location=$GCP_REGION \
    --description="FlowMaestro container images"

gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
```

### Build Images

```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)
export REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/flowmaestro"
export DOMAIN="yourdomain.com"

# Build backend (from project root)
cd ..
docker build -f infra/docker/backend/Dockerfile -t ${REGISTRY}/backend:${IMAGE_TAG} .
docker tag ${REGISTRY}/backend:${IMAGE_TAG} ${REGISTRY}/backend:latest

# Build frontend
docker build -f infra/docker/frontend/Dockerfile \
    --build-arg VITE_API_URL=https://api.${DOMAIN} \
    --build-arg VITE_WS_URL=wss://api.${DOMAIN} \
    -t ${REGISTRY}/frontend:${IMAGE_TAG} .
docker tag ${REGISTRY}/frontend:${IMAGE_TAG} ${REGISTRY}/frontend:latest

# Build marketing
docker build -f infra/docker/marketing/Dockerfile -t ${REGISTRY}/marketing:${IMAGE_TAG} .
docker tag ${REGISTRY}/marketing:${IMAGE_TAG} ${REGISTRY}/marketing:latest
```

### Push Images

```bash
docker push ${REGISTRY}/backend:${IMAGE_TAG}
docker push ${REGISTRY}/backend:latest

docker push ${REGISTRY}/frontend:${IMAGE_TAG}
docker push ${REGISTRY}/frontend:latest

docker push ${REGISTRY}/marketing:${IMAGE_TAG}
docker push ${REGISTRY}/marketing:latest
```

---

## ☸️ 3. Deploy to Kubernetes

### Create Secrets

```bash
cd infra

# Get values from Pulumi
DB_HOST=$(pulumi stack output databasePrivateIp -C pulumi)
REDIS_HOST=$(pulumi stack output redisHost -C pulumi)
DB_PASSWORD=$(pulumi config get dbPassword --show-secrets -C pulumi)
JWT_SECRET=$(pulumi config get jwtSecret --show-secrets -C pulumi)
ENCRYPTION_KEY=$(pulumi config get encryptionKey --show-secrets -C pulumi)
TEMPORAL_ADDRESS=$(pulumi config get temporalAddress -C pulumi)
TEMPORAL_NAMESPACE=$(pulumi config get temporalNamespace -C pulumi)

# Create namespace
kubectl create namespace flowmaestro

# Database credentials
kubectl create secret generic db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=$DB_HOST \
    --from-literal=port=5432 \
    --from-literal=database=flowmaestro \
    --from-literal=user=flowmaestro \
    --from-literal=password=$DB_PASSWORD

# Redis credentials
kubectl create secret generic redis-credentials \
    --namespace=flowmaestro \
    --from-literal=host=$REDIS_HOST \
    --from-literal=port=6379

# Application secrets
kubectl create secret generic app-secrets \
    --namespace=flowmaestro \
    --from-literal=jwt-secret=$JWT_SECRET \
    --from-literal=encryption-key=$ENCRYPTION_KEY

# Temporal credentials
kubectl create secret generic temporal-credentials \
    --namespace=flowmaestro \
    --from-literal=address=$TEMPORAL_ADDRESS \
    --from-literal=namespace=$TEMPORAL_NAMESPACE \
    --from-file=ca-cert=path/to/ca.pem \
    --from-file=client-cert=path/to/client.pem \
    --from-file=client-key=path/to/client-key.pem

# Optional: LLM API keys
kubectl create secret generic llm-api-keys \
    --namespace=flowmaestro \
    --from-literal=openai-api-key=$OPENAI_API_KEY \
    --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY \
    --from-literal=google-api-key=$GOOGLE_API_KEY
```

### Update Manifests

```bash
# Replace placeholders
find k8s -type f -name "*.yaml" -exec sed -i \
    -e "s|PROJECT_ID|${GCP_PROJECT_ID}|g" \
    -e "s|REGION|${GCP_REGION}|g" \
    -e "s|DOMAIN|${DOMAIN}|g" \
    {} \;
```

### Run Database Migrations

```bash
kubectl apply -f k8s/jobs/db-migration.yaml
kubectl logs -f job/db-migration -n flowmaestro
kubectl wait --for=condition=complete --timeout=300s job/db-migration -n flowmaestro
```

### Deploy Applications

```bash
kubectl apply -k k8s/overlays/production

# Watch rollout
kubectl rollout status deployment/api-server -n flowmaestro
kubectl rollout status deployment/temporal-worker -n flowmaestro

# Verify
kubectl get pods -n flowmaestro
kubectl get services -n flowmaestro
kubectl get ingress -n flowmaestro
kubectl get hpa -n flowmaestro
```

---

## 🌐 4. Configure DNS

### Get Load Balancer IP

```bash
cd pulumi
STATIC_IP=$(pulumi stack output staticIpAddress)
echo "Load Balancer IP: $STATIC_IP"
```

### Add DNS Records

Add these A records to your DNS provider:

```
api.yourdomain.com  -> <STATIC_IP>
app.yourdomain.com  -> <STATIC_IP>
www.yourdomain.com  -> <STATIC_IP>
```

### Wait for SSL Certificate

```bash
# Check status (takes 15-60 minutes)
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

# Wait for Active status
watch kubectl get managedcertificate flowmaestro-cert -n flowmaestro
```

---

## 🔄 5. Set Up CI/CD (Optional)

### Cloud Build Trigger

```bash
gcloud builds triggers create github \
    --name="flowmaestro-production" \
    --repo-name="flowmaestro" \
    --repo-owner="your-github-username" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

### Manual Build

```bash
cd ..  # Project root
gcloud builds submit --config=cloudbuild.yaml
```

---

## 📊 Monitoring

### Cloud Console

- **Workloads**: https://console.cloud.google.com/kubernetes/workload
- **Logs**: https://console.cloud.google.com/logs
- **Monitoring**: https://console.cloud.google.com/monitoring

### Dashboard

```bash
cd infra/pulumi
DASHBOARD_ID=$(pulumi stack output dashboardId)
echo "https://console.cloud.google.com/monitoring/dashboards/custom/$DASHBOARD_ID"
```

### Kubernetes Metrics

```bash
# Pod metrics
kubectl top pods -n flowmaestro

# Node metrics
kubectl top nodes

# HPA status
kubectl get hpa -n flowmaestro

# Logs
kubectl logs -f deployment/api-server -n flowmaestro
kubectl logs -f deployment/temporal-worker -n flowmaestro
```

---

## 🔧 Operations

### Update Application

```bash
# Build new images with new tag
export NEW_TAG=$(git rev-parse --short HEAD)

# Build and push (same as before with NEW_TAG)

# Update deployments
kubectl set image deployment/api-server \
    api-server=${REGISTRY}/backend:${NEW_TAG} -n flowmaestro

kubectl set image deployment/temporal-worker \
    temporal-worker=${REGISTRY}/backend:${NEW_TAG} -n flowmaestro

# Watch rollout
kubectl rollout status deployment/api-server -n flowmaestro
kubectl rollout status deployment/temporal-worker -n flowmaestro
```

### Scale Manually

```bash
# Scale API server
kubectl scale deployment api-server --replicas=5 -n flowmaestro

# Scale worker
kubectl scale deployment temporal-worker --replicas=3 -n flowmaestro
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-server -n flowmaestro

# Rollback to specific revision
kubectl rollout history deployment/api-server -n flowmaestro
kubectl rollout undo deployment/api-server --to-revision=2 -n flowmaestro
```

### Update ConfigMap

```bash
# Edit ConfigMap
kubectl edit configmap flowmaestro-config -n flowmaestro

# Or apply updated file
kubectl apply -f k8s/base/configmap.yaml

# Restart deployments to pick up changes
kubectl rollout restart deployment/api-server -n flowmaestro
kubectl rollout restart deployment/temporal-worker -n flowmaestro
```

---

## 🌍 Multi-Environment Setup

### Create Staging Environment

```bash
# Pulumi stack
cd pulumi
pulumi stack init staging
pulumi config set environment "staging"
pulumi config set domain "staging.yourdomain.com"

# Use smaller resources
pulumi config set dbTier "db-f1-micro"
pulumi config set dbHighAvailability false
pulumi config set redisMemorySizeGb 1
pulumi config set redisTier "BASIC"

# Set new secrets
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"
pulumi config set --secret jwtSecret "$(openssl rand -base64 64)"
pulumi config set --secret encryptionKey "$(openssl rand -hex 32)"

# Deploy
pulumi up

# Deploy to Kubernetes
cd ../k8s
kubectl create namespace flowmaestro-staging
# Create staging secrets...
kubectl apply -k overlays/staging
```

---

## 🧹 Cleanup

### Delete Kubernetes Resources

```bash
kubectl delete namespace flowmaestro
```

### Destroy Infrastructure

```bash
cd infra/pulumi
pulumi destroy
pulumi stack rm production
```

---

## 💰 Cost Estimate

Production infrastructure costs approximately **$810-1,350/month**:

| Service           | Configuration       | Monthly Cost |
| ----------------- | ------------------- | ------------ |
| GKE Autopilot     | ~10 vCPUs, 20GB RAM | $250-400     |
| Cloud SQL         | HA, 2 vCPUs, 7.5GB  | $180-220     |
| Memorystore Redis | 5GB Standard        | $150-180     |
| Load Balancer     | Global HTTPS        | $20-30       |
| Cloud CDN         | 100GB egress        | $10-20       |
| Temporal Cloud    | Depends on plan     | $200-500     |

**Cost Optimization Tips:**

- Use Autopilot GKE (pay for pods only)
- Enable Cloud CDN caching
- Use committed use discounts (37% savings)
- Right-size resources after monitoring
- Use staging for testing (lower costs)

---

## 🆘 Troubleshooting

### Pods Not Starting

```bash
kubectl get pods -n flowmaestro
kubectl describe pod <pod-name> -n flowmaestro
kubectl logs <pod-name> -n flowmaestro

# Common issues:
# - Image pull errors: Check Artifact Registry permissions
# - Secret not found: Verify secrets exist
# - Resource limits: Check HPA metrics
```

### Database Connection Errors

```bash
# Verify secret
kubectl get secret db-credentials -n flowmaestro -o yaml

# Test from pod
kubectl exec -it deployment/api-server -n flowmaestro -- sh
nc -zv <db-host> 5432
```

### SSL Certificate Not Provisioning

```bash
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

# Common issues:
# - DNS not propagated: Wait 24-48 hours
# - Domain verification failed: Check DNS records
# - Load balancer not created: Check ingress

# Force renewal
kubectl delete managedcertificate flowmaestro-cert -n flowmaestro
kubectl apply -f k8s/base/ingress.yaml
```

### WebSocket Connection Failures

```bash
# Check ingress
kubectl describe ingress flowmaestro-ingress -n flowmaestro

# Verify service endpoints
kubectl get endpoints api-service -n flowmaestro

# Test
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
    https://api.yourdomain.com/ws
```

### Infrastructure Issues

```bash
cd pulumi

# Check stack
pulumi stack

# Refresh state
pulumi refresh

# View resources
pulumi stack export

# Verbose logs
pulumi up -v=9
```

---

## 📚 Additional Documentation

- **Detailed Infrastructure Guide**: [../\_docs/infrastructure-setup.md](../_docs/infrastructure-setup.md)
- **Architecture Overview**: [../\_docs/architecture.md](../_docs/architecture.md)
- **Development Guidelines**: [../claude.md](../claude.md)
- **Project README**: [../README.md](../README.md)

### External Resources

- [Pulumi GCP Documentation](https://www.pulumi.com/docs/clouds/gcp/)
- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Temporal Documentation](https://docs.temporal.io)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

## ✅ Production Checklist

- [ ] GCP project created and APIs enabled
- [ ] Temporal Cloud namespace created
- [ ] Domain registered and DNS ready
- [ ] Pulumi installed and authenticated
- [ ] Infrastructure deployed via Pulumi
- [ ] Docker images built and pushed
- [ ] Kubernetes secrets created
- [ ] Database migrations completed
- [ ] Applications deployed and healthy
- [ ] DNS records configured
- [ ] SSL certificates provisioned
- [ ] Monitoring dashboards set up
- [ ] Alert policies configured
- [ ] CI/CD pipeline configured
- [ ] Backup strategy verified
- [ ] Security scan completed
- [ ] Load testing completed

---

**Version**: 2.0.0
**Last Updated**: 2025-01-04
