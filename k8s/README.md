# FlowMaestro Kubernetes Deployment

This directory contains Kubernetes manifests for deploying FlowMaestro to GKE.

## Directory Structure

```
k8s/
├── base/                      # Base Kubernetes resources
│   ├── namespace.yaml         # Namespace and service account
│   ├── configmap.yaml         # Non-sensitive configuration
│   ├── api-deployment.yaml    # API server deployment + HPA
│   ├── worker-deployment.yaml # Temporal worker deployment + HPA
│   ├── services.yaml          # Services and backend config
│   ├── ingress.yaml           # Ingress and network policies
│   └── kustomization.yaml     # Kustomize base config
├── overlays/                  # Environment-specific overlays
│   ├── production/            # Production configuration
│   │   ├── kustomization.yaml
│   │   └── replica-patch.yaml
│   └── staging/               # Staging configuration
│       ├── kustomization.yaml
│       ├── replica-patch.yaml
│       └── resource-patch.yaml
└── jobs/                      # One-time jobs
    └── db-migration.yaml      # Database migration job
```

## Prerequisites

1. GKE cluster deployed (via Pulumi)
2. kubectl configured with cluster credentials
3. Docker images built and pushed to Artifact Registry
4. Secrets created in Kubernetes

## Quick Start

### 1. Get Cluster Credentials

```bash
# From Pulumi output
cd infrastructure
pulumi stack output kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml

# Or using gcloud
gcloud container clusters get-credentials flowmaestro-cluster \
    --region us-central1 \
    --project YOUR_PROJECT_ID
```

### 2. Create Namespace

```bash
kubectl apply -f k8s/base/namespace.yaml
```

### 3. Create Secrets

```bash
# Database credentials
kubectl create secret generic db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=<CLOUD_SQL_PRIVATE_IP> \
    --from-literal=port=5432 \
    --from-literal=database=flowmaestro \
    --from-literal=user=flowmaestro \
    --from-literal=password=<DB_PASSWORD>

# Redis credentials
kubectl create secret generic redis-credentials \
    --namespace=flowmaestro \
    --from-literal=host=<REDIS_HOST> \
    --from-literal=port=6379

# Application secrets
kubectl create secret generic app-secrets \
    --namespace=flowmaestro \
    --from-literal=jwt-secret=<JWT_SECRET> \
    --from-literal=encryption-key=<ENCRYPTION_KEY>

# Temporal Cloud credentials
kubectl create secret generic temporal-credentials \
    --namespace=flowmaestro \
    --from-literal=address=<TEMPORAL_ADDRESS> \
    --from-literal=namespace=<TEMPORAL_NAMESPACE> \
    --from-file=ca-cert=temporal-ca.pem \
    --from-file=client-cert=temporal-client.pem \
    --from-file=client-key=temporal-client-key.pem

# Optional: LLM API keys
kubectl create secret generic llm-api-keys \
    --namespace=flowmaestro \
    --from-literal=openai-api-key=<OPENAI_KEY> \
    --from-literal=anthropic-api-key=<ANTHROPIC_KEY> \
    --from-literal=google-api-key=<GOOGLE_KEY>
```

### 4. Update Manifests

Replace placeholders in manifests:

```bash
# Replace PROJECT_ID, REGION, and DOMAIN
find k8s -type f -name "*.yaml" -exec sed -i \
    -e "s|PROJECT_ID|your-project-id|g" \
    -e "s|REGION|us-central1|g" \
    -e "s|DOMAIN|yourdomain.com|g" \
    {} \;
```

Or use the deployment script:

```bash
./scripts/deploy.sh
```

### 5. Run Database Migrations

```bash
kubectl apply -f k8s/jobs/db-migration.yaml

# Watch migration logs
kubectl logs -f job/db-migration -n flowmaestro

# Verify completion
kubectl get jobs -n flowmaestro
```

### 6. Deploy Applications

```bash
# Deploy using kustomize
kubectl apply -k k8s/overlays/production

# Or deploy base manifests directly
kubectl apply -k k8s/base
```

### 7. Verify Deployment

```bash
# Check pods
kubectl get pods -n flowmaestro

# Check deployments
kubectl get deployments -n flowmaestro

# Check services
kubectl get services -n flowmaestro

# Check ingress
kubectl get ingress -n flowmaestro

# Check HPA
kubectl get hpa -n flowmaestro
```

## Deployments

### API Server

- **Image**: `backend:latest`
- **Replicas**: 3 (production), 1 (staging)
- **Port**: 3001
- **Resources**:
  - Requests: 500m CPU, 512Mi memory
  - Limits: 2000m CPU, 2Gi memory
- **HPA**: 3-10 replicas (70% CPU, 80% memory)
- **Health Checks**:
  - Liveness: `/health` (30s initial delay)
  - Readiness: `/health` (10s initial delay)

### Temporal Worker

- **Image**: `backend:latest` (different command)
- **Replicas**: 2 (production), 1 (staging)
- **Resources**:
  - Requests: 1000m CPU, 1Gi memory
  - Limits: 4000m CPU, 4Gi memory
- **HPA**: 2-5 replicas (75% CPU)
- **Command**: `node backend/dist/backend/src/temporal/workers/orchestrator-worker.js`

## Services

### API Service

- **Type**: ClusterIP
- **Port**: 3001
- **Session Affinity**: ClientIP (3 hours)
- **Backend Config**:
  - Timeout: 300s
  - Connection draining: 60s
  - Health check: `/health`

## Ingress

### Managed Certificate

- Automatically provisions SSL certificates for:
  - `api.yourdomain.com`
  - `app.yourdomain.com`
- Provisioning time: 15-60 minutes
- Requires DNS records to be configured

### Load Balancer

- **Type**: Global HTTP(S) Load Balancer
- **Static IP**: Reserved via Pulumi
- **Paths**:
  - `api.yourdomain.com/*` → API Service
  - `app.yourdomain.com/*` → Cloud Storage (via CDN)

### Network Policies

- **API Server**:
  - Ingress: From GCP Load Balancer
  - Egress: DNS, HTTPS, PostgreSQL, Redis, Temporal
- **Temporal Worker**:
  - Egress only: DNS, HTTPS, PostgreSQL, Redis, Temporal

## Environment Variables

### From ConfigMap (k8s/base/configmap.yaml)

- `NODE_ENV`: production
- `BACKEND_PORT`: 3001
- `BACKEND_HOST`: 0.0.0.0
- `LOG_LEVEL`: info
- `CORS_ORIGIN`: https://app.yourdomain.com
- `TEMPORAL_TASK_QUEUE`: flowmaestro-orchestrator
- `TEMPORAL_MAX_CONCURRENT_ACTIVITIES`: 10
- `TEMPORAL_MAX_CONCURRENT_WORKFLOWS`: 10

### From Secrets

- Database: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- Temporal: `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`
- App: `JWT_SECRET`, `ENCRYPTION_KEY`
- LLM (optional): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`

## Scaling

### Horizontal Pod Autoscaling

API Server HPA:
```bash
kubectl get hpa api-server-hpa -n flowmaestro
```

Worker HPA:
```bash
kubectl get hpa temporal-worker-hpa -n flowmaestro
```

Manual scaling:
```bash
# Scale API server
kubectl scale deployment api-server --replicas=5 -n flowmaestro

# Scale worker
kubectl scale deployment temporal-worker --replicas=3 -n flowmaestro
```

## Updating Deployments

### Update Image Tag

```bash
# Set new image for API server
kubectl set image deployment/api-server \
    api-server=us-central1-docker.pkg.dev/project-id/flowmaestro/backend:new-tag \
    -n flowmaestro

# Set new image for worker
kubectl set image deployment/temporal-worker \
    temporal-worker=us-central1-docker.pkg.dev/project-id/flowmaestro/backend:new-tag \
    -n flowmaestro
```

### Rolling Update

```bash
# Watch rollout status
kubectl rollout status deployment/api-server -n flowmaestro
kubectl rollout status deployment/temporal-worker -n flowmaestro

# View rollout history
kubectl rollout history deployment/api-server -n flowmaestro

# Rollback to previous version
kubectl rollout undo deployment/api-server -n flowmaestro
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

## Monitoring

### View Logs

```bash
# API server logs
kubectl logs -f deployment/api-server -n flowmaestro

# Worker logs
kubectl logs -f deployment/temporal-worker -n flowmaestro

# All pods with label
kubectl logs -f -l app=flowmaestro -n flowmaestro --max-log-requests=10

# Logs from previous container (after crash)
kubectl logs deployment/api-server -n flowmaestro --previous
```

### Pod Status

```bash
# Get pods
kubectl get pods -n flowmaestro -o wide

# Describe pod
kubectl describe pod <pod-name> -n flowmaestro

# Get pod events
kubectl get events -n flowmaestro --sort-by='.lastTimestamp'
```

### Resource Usage

```bash
# Top pods
kubectl top pods -n flowmaestro

# Top nodes
kubectl top nodes
```

### Execute Commands in Pod

```bash
# Get a shell
kubectl exec -it deployment/api-server -n flowmaestro -- sh

# Run a command
kubectl exec deployment/api-server -n flowmaestro -- env
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n flowmaestro

# Common issues:
# - Image pull errors: Check Artifact Registry permissions
# - Secret not found: Verify secrets exist
# - Resource limits: Check HPA metrics
```

### Database Connection Errors

```bash
# Verify secret
kubectl get secret db-credentials -n flowmaestro -o yaml

# Test connection from pod
kubectl exec -it deployment/api-server -n flowmaestro -- sh
nc -zv <db-host> 5432
```

### SSL Certificate Not Provisioning

```bash
# Check certificate status
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
# Check ingress backend health
kubectl describe ingress flowmaestro-ingress -n flowmaestro

# Verify service endpoints
kubectl get endpoints api-service -n flowmaestro

# Test from local machine
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
    https://api.yourdomain.com/ws
```

## Cleanup

### Delete Deployments

```bash
# Delete all resources in namespace
kubectl delete -k k8s/overlays/production

# Or delete namespace (removes everything)
kubectl delete namespace flowmaestro
```

### Delete Jobs

```bash
# Delete migration job
kubectl delete job db-migration -n flowmaestro
```

## Staging Environment

To deploy to staging:

```bash
# Create staging namespace
kubectl create namespace flowmaestro-staging

# Create staging secrets (use different values)
# ... (same as production but in flowmaestro-staging namespace)

# Deploy staging
kubectl apply -k k8s/overlays/staging
```

## CI/CD Integration

This deployment is automated via Cloud Build. See `../cloudbuild.yaml` for pipeline configuration.

Manual trigger:
```bash
gcloud builds submit --config=cloudbuild.yaml
```

## Best Practices

1. **Always run migrations first** before deploying new code
2. **Use specific image tags** in production (not `latest`)
3. **Monitor resource usage** and adjust requests/limits
4. **Test in staging** before deploying to production
5. **Keep secrets rotated** regularly
6. **Review logs** after each deployment
7. **Use kubectl dry-run** to preview changes: `kubectl apply --dry-run=client -k k8s/overlays/production`

## Support

For detailed deployment instructions, see:
- `../_docs/infrastructure-setup.md` - Complete deployment guide
- `../infrastructure/README.md` - Infrastructure setup

For Kubernetes documentation:
- https://kubernetes.io/docs/
- https://cloud.google.com/kubernetes-engine/docs
