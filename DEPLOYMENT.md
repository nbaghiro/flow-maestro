# FlowMaestro GKE Deployment Guide

Complete guide for deploying FlowMaestro to Google Kubernetes Engine (GKE).

## 📋 Overview

This deployment uses:
- **Infrastructure**: Pulumi (TypeScript) for GCP resources
- **Orchestration**: Kubernetes on GKE Autopilot
- **Managed Services**: Cloud SQL PostgreSQL, Memorystore Redis, Temporal Cloud
- **CI/CD**: Cloud Build
- **Containerization**: Docker with multi-stage builds

## 🚀 Quick Start

### Option 1: Automated Deployment Script

```bash
# Run the deployment script
./scripts/deploy.sh
```

The script will:
1. Check prerequisites
2. Gather configuration
3. Create Artifact Registry
4. Build and push Docker images
5. Update Kubernetes manifests
6. Deploy to GKE
7. Show deployment status

### Option 2: Manual Step-by-Step

Follow the sections below for manual deployment.

## 📦 Prerequisites

### Required Tools

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Install kubectl
gcloud components install kubectl

# Install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Install Docker
# https://docs.docker.com/get-docker/

# Verify installations
gcloud version
kubectl version --client
pulumi version
docker --version
```

### GCP Setup

```bash
# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
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
4. Save certificates for Pulumi configuration

## 🏗️ Infrastructure Deployment

### 1. Configure Pulumi

```bash
cd infrastructure
npm install

# Create stack
pulumi login
pulumi stack init production

# Configure
pulumi config set gcp:project $GCP_PROJECT_ID
pulumi config set gcp:region us-central1
pulumi config set domain "yourdomain.com"
pulumi config set appName "flowmaestro"
pulumi config set environment "production"

# Set secrets
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"
pulumi config set --secret jwtSecret "$(openssl rand -base64 64)"
pulumi config set --secret encryptionKey "$(openssl rand -hex 32)"

# Temporal Cloud
pulumi config set temporalNamespace "your-namespace"
pulumi config set temporalAddress "your-namespace.tmprl.cloud:7233"
pulumi config set --secret temporalCaCert "$(cat temporal-ca.pem)"
pulumi config set --secret temporalClientCert "$(cat temporal-client.pem)"
pulumi config set --secret temporalClientKey "$(cat temporal-client-key.pem)"

# Optional: LLM API keys
pulumi config set --secret openaiApiKey "sk-..."
pulumi config set --secret anthropicApiKey "sk-ant-..."
```

### 2. Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# Save outputs
pulumi stack output > ../infrastructure-outputs.json
pulumi stack output kubeconfig > ../kubeconfig.yaml
```

### 3. Configure kubectl

```bash
export KUBECONFIG=../kubeconfig.yaml
kubectl get nodes
```

## 🐳 Docker Images

### 1. Create Artifact Registry

```bash
export GCP_REGION="us-central1"

gcloud artifacts repositories create flowmaestro \
    --repository-format=docker \
    --location=$GCP_REGION \
    --description="FlowMaestro container images"

# Configure Docker
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
```

### 2. Build Images

```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)
export REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/flowmaestro"
export DOMAIN="yourdomain.com"

# Backend
docker build -f backend/Dockerfile -t ${REGISTRY}/backend:${IMAGE_TAG} .
docker tag ${REGISTRY}/backend:${IMAGE_TAG} ${REGISTRY}/backend:latest

# Frontend
docker build -f frontend/Dockerfile \
    --build-arg VITE_API_URL=https://api.${DOMAIN} \
    --build-arg VITE_WS_URL=wss://api.${DOMAIN} \
    -t ${REGISTRY}/frontend:${IMAGE_TAG} .
docker tag ${REGISTRY}/frontend:${IMAGE_TAG} ${REGISTRY}/frontend:latest

# Marketing
docker build -f marketing/Dockerfile -t ${REGISTRY}/marketing:${IMAGE_TAG} .
docker tag ${REGISTRY}/marketing:${IMAGE_TAG} ${REGISTRY}/marketing:latest
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

## ☸️ Kubernetes Deployment

### 1. Create Secrets

```bash
# Get values from Pulumi outputs
DB_HOST=$(pulumi stack output databasePrivateIp -C infrastructure)
REDIS_HOST=$(pulumi stack output redisHost -C infrastructure)
DB_PASSWORD=$(pulumi config get dbPassword --show-secrets -C infrastructure)
JWT_SECRET=$(pulumi config get jwtSecret --show-secrets -C infrastructure)
ENCRYPTION_KEY=$(pulumi config get encryptionKey --show-secrets -C infrastructure)
TEMPORAL_ADDRESS=$(pulumi config get temporalAddress -C infrastructure)
TEMPORAL_NAMESPACE=$(pulumi config get temporalNamespace -C infrastructure)

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
    --from-file=ca-cert=temporal-ca.pem \
    --from-file=client-cert=temporal-client.pem \
    --from-file=client-key=temporal-client-key.pem

# Optional: LLM API keys
kubectl create secret generic llm-api-keys \
    --namespace=flowmaestro \
    --from-literal=openai-api-key=$OPENAI_API_KEY \
    --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY
```

### 2. Update Manifests

```bash
# Replace placeholders
find k8s -type f -name "*.yaml" -exec sed -i \
    -e "s|PROJECT_ID|${GCP_PROJECT_ID}|g" \
    -e "s|REGION|${GCP_REGION}|g" \
    -e "s|DOMAIN|${DOMAIN}|g" \
    {} \;
```

### 3. Run Database Migrations

```bash
kubectl apply -f k8s/jobs/db-migration.yaml
kubectl logs -f job/db-migration -n flowmaestro
kubectl wait --for=condition=complete --timeout=300s job/db-migration -n flowmaestro
```

### 4. Deploy Application

```bash
kubectl apply -k k8s/overlays/production

# Watch rollout
kubectl rollout status deployment/api-server -n flowmaestro
kubectl rollout status deployment/temporal-worker -n flowmaestro
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n flowmaestro

# Check services
kubectl get services -n flowmaestro

# Check ingress
kubectl get ingress -n flowmaestro

# Check HPA
kubectl get hpa -n flowmaestro

# View logs
kubectl logs -f deployment/api-server -n flowmaestro
```

## 🌐 DNS Configuration

### Get Load Balancer IP

```bash
STATIC_IP=$(pulumi stack output staticIpAddress -C infrastructure)
echo "Load Balancer IP: $STATIC_IP"
```

### Configure DNS Records

Add these A records to your DNS provider:

```
api.yourdomain.com  -> <STATIC_IP>
app.yourdomain.com  -> <STATIC_IP>
www.yourdomain.com  -> <STATIC_IP>
```

### Wait for SSL Certificate

```bash
# Check certificate status (takes 15-60 minutes)
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

# Wait for "Active" status
watch kubectl get managedcertificate flowmaestro-cert -n flowmaestro
```

## 🔄 CI/CD Setup

### Configure Cloud Build Trigger

```bash
# Connect GitHub repository
gcloud builds triggers create github \
    --name="flowmaestro-production" \
    --repo-name="flowmaestro" \
    --repo-owner="your-github-username" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

### Manual Build Trigger

```bash
gcloud builds submit --config=cloudbuild.yaml
```

## 📊 Monitoring

### Cloud Console

- **Workloads**: https://console.cloud.google.com/kubernetes/workload
- **Logs**: https://console.cloud.google.com/logs
- **Monitoring**: https://console.cloud.google.com/monitoring

### View Metrics

```bash
# Pod metrics
kubectl top pods -n flowmaestro

# Node metrics
kubectl top nodes

# HPA status
kubectl get hpa -n flowmaestro
```

### View Logs

```bash
# API server
kubectl logs -f deployment/api-server -n flowmaestro

# Worker
kubectl logs -f deployment/temporal-worker -n flowmaestro

# All pods
kubectl logs -f -l app=flowmaestro -n flowmaestro --max-log-requests=10
```

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
```

### Scale Resources

```bash
# Manual scaling
kubectl scale deployment api-server --replicas=5 -n flowmaestro

# View HPA
kubectl get hpa -n flowmaestro
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-server -n flowmaestro

# Rollback to specific revision
kubectl rollout history deployment/api-server -n flowmaestro
kubectl rollout undo deployment/api-server --to-revision=2 -n flowmaestro
```

## 🧹 Cleanup

### Delete Kubernetes Resources

```bash
kubectl delete namespace flowmaestro
```

### Destroy Infrastructure

```bash
cd infrastructure
pulumi destroy
pulumi stack rm production
```

## 💰 Cost Estimate

Production infrastructure costs approximately:

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| GKE Autopilot | ~10 vCPUs, 20GB RAM | $250-400 |
| Cloud SQL | HA, 2 vCPUs, 7.5GB | $180-220 |
| Memorystore Redis | 5GB Standard | $150-180 |
| Load Balancer | Global HTTPS | $20-30 |
| Cloud CDN | 100GB egress | $10-20 |
| Temporal Cloud | Depends on plan | $200-500 |
| **Total** | | **$810-1,350/month** |

## 📚 Documentation

- **Infrastructure Setup**: [_docs/infrastructure-setup.md](_docs/infrastructure-setup.md)
- **Architecture**: [_docs/architecture.md](_docs/architecture.md)
- **Pulumi README**: [infrastructure/README.md](infrastructure/README.md)
- **Kubernetes README**: [k8s/README.md](k8s/README.md)

## 🆘 Troubleshooting

### Common Issues

1. **Pods not starting**: Check `kubectl describe pod` for image pull errors or secret issues
2. **Database connection errors**: Verify Cloud SQL private IP and credentials
3. **SSL certificate not provisioning**: Wait 24-48 hours for DNS propagation
4. **WebSocket failures**: Check ingress timeout settings (300s)

### Support Resources

- GCP Documentation: https://cloud.google.com/docs
- Kubernetes Documentation: https://kubernetes.io/docs
- Temporal Documentation: https://docs.temporal.io
- Pulumi Documentation: https://www.pulumi.com/docs

## ✅ Production Checklist

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
- [ ] Documentation reviewed

---

**Version**: 1.0.0
**Last Updated**: 2025-01-04
