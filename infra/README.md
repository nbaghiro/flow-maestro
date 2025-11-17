# FlowMaestro Infrastructure

Infrastructure-as-Code and deployment configuration for FlowMaestro on Google Cloud Platform.

## Quick Start

For automated deployment to a new GCP project:

```bash
./infra/deploy.sh
```

The script handles:

- GCP authentication and project setup
- Infrastructure provisioning (Pulumi)
- Docker image building and deployment
- Kubernetes configuration
- Database migrations
- SSL certificate setup

## Directory Structure

```
infra/
├── deploy.sh                  # Interactive deployment script
├── pulumi/                    # Infrastructure as Code
│   ├── index.ts              # Main entry point
│   ├── src/
│   │   ├── resources/        # GCP resource definitions
│   │   └── utils/            # Configuration utilities
│   └── Pulumi.*.yaml         # Stack configurations
├── k8s/                      # Kubernetes manifests
│   ├── base/                 # Base configurations
│   ├── overlays/             # Environment-specific overlays
│   └── jobs/                 # Jobs and CronJobs
└── docker/                   # Dockerfiles
    ├── backend/
    ├── frontend/
    └── marketing/
```

## Infrastructure Components

### Compute

- GKE Autopilot Cluster with auto-scaling
- Artifact Registry for Docker images

### Data

- Cloud SQL PostgreSQL 15 (HA) with 3 databases
- Memorystore Redis (HA) for caching

### Networking

- VPC with private subnets
- Cloud Load Balancer (HTTPS)
- Static IP and managed SSL certificates

### Self-Hosted Services

- Temporal Server (3 replicas)
- Temporal UI
- Temporal Workers (2 replicas)

## Prerequisites

**Tools:**

- gcloud CLI
- kubectl
- Docker
- Pulumi CLI
- Node.js 20+

**GCP:**

- Project with billing enabled
- Owner/Editor role

## Manual Deployment

If you need more control or troubleshooting:

### 1. Infrastructure

```bash
cd infra/pulumi

pulumi login
pulumi stack init production

pulumi config set gcp:project YOUR_PROJECT
pulumi config set gcp:region us-central1
pulumi config set environment prod
pulumi config set domain your-domain.com
pulumi config set --secret dbPassword $(openssl rand -base64 32)
pulumi config set --secret jwtSecret $(openssl rand -base64 64)
pulumi config set --secret encryptionKey $(openssl rand -hex 32)

pulumi up
```

### 2. Docker Images

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev

export REGISTRY="us-central1-docker.pkg.dev/YOUR_PROJECT/flowmaestro-images"

docker build --platform linux/amd64 \
    -f infra/docker/backend/Dockerfile \
    -t $REGISTRY/backend:latest .
docker push $REGISTRY/backend:latest

docker build --platform linux/amd64 \
    -f infra/docker/frontend/Dockerfile \
    --build-arg VITE_API_URL=https://api.your-domain.com \
    --build-arg VITE_WS_URL=https://api.your-domain.com \
    -t $REGISTRY/frontend:latest .
docker push $REGISTRY/frontend:latest

docker build --platform linux/amd64 \
    -f infra/docker/marketing/Dockerfile \
    -t $REGISTRY/marketing:latest .
docker push $REGISTRY/marketing:latest
```

### 3. DNS Configuration

Get load balancer IP:

```bash
pulumi stack output loadBalancerIp
```

Create A records for: `@`, `www`, `api`, `app`

### 4. Kubernetes Deployment

```bash
gcloud container clusters get-credentials \
    flowmaestro-prod-cluster \
    --region=us-central1

kubectl create namespace flowmaestro

# Create secrets (get values from Pulumi outputs)
kubectl create secret generic app-secrets \
    --namespace=flowmaestro \
    --from-literal=DATABASE_URL="..." \
    --from-literal=REDIS_URL="..." \
    --from-literal=JWT_SECRET="..." \
    --from-literal=ENCRYPTION_KEY="..."

kubectl create secret generic temporal-db-credentials \
    --namespace=flowmaestro \
    --from-literal=host="..." \
    --from-literal=port="5432" \
    --from-literal=user="..." \
    --from-literal=password="..." \
    --from-literal=database="..." \
    --from-literal=visibility-database="..."

kubectl apply -k infra/k8s/overlays/production
```

### 5. Database Migrations

```bash
cd backend
DATABASE_URL="..." npm run db:migrate
```

### 6. Monitor SSL Certificate

```bash
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro
```

SSL certificates take 15-60 minutes to provision.

## Configuration

### Pulumi Secrets

- `gcp:project`: GCP project ID
- `gcp:region`: GCP region
- `environment`: Environment name (prod/staging/dev)
- `domain`: Your domain name
- `dbPassword`: Database password (secret)
- `jwtSecret`: JWT signing secret (secret)
- `encryptionKey`: 64-character hex encryption key (secret)

### Kubernetes Secrets

- `app-secrets`: APPLICATION secrets
- `temporal-db-credentials`: Temporal database credentials

## Monitoring

```bash
pulumi stack output dashboardId
```

Visit: `https://console.cloud.google.com/monitoring/dashboards/custom/DASHBOARD_ID`

## Scaling

Horizontal Pod Autoscalers configured for:

- API Server: 3-10 replicas
- Temporal Workers: 2-10 replicas
- Temporal Server: 3-10 replicas

## Troubleshooting

### Check pod status

```bash
kubectl get pods -n flowmaestro
kubectl logs -n flowmaestro -l app=flowmaestro --tail=100
kubectl describe pod POD_NAME -n flowmaestro
```

### SSL Certificate issues

```bash
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro
kubectl describe ingress flowmaestro-ingress -n flowmaestro
```

### Database connectivity

```bash
kubectl get secret app-secrets -n flowmaestro -o yaml

kubectl run -it --rm debug --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

### Pulumi state

```bash
pulumi refresh
pulumi stack output
```

## Cost Estimate

Monthly costs (us-central1):

- GKE Autopilot: ~$150-300
- Cloud SQL (HA): ~$200-250
- Redis (HA): ~$150-200
- Load Balancer: ~$20
- Other: ~$55-110

**Total: ~$575-910/month**

Reduce costs by:

- Using non-HA for staging
- Smaller replica counts
- Committed use discounts

## Security

- Secrets in Kubernetes secrets (never in code)
- Network policies restrict pod communication
- Workload Identity for GCP access
- Private IPs for database/Redis
- SSL/TLS encryption
- Regular security updates

## Local Development

For local development and testing, use Docker Compose:

```bash
cd infra/local
docker-compose up
```

This provides:

- PostgreSQL (3 databases: app, temporal, temporal_visibility)
- Redis
- Temporal Server
- Temporal UI

See `infra/local/README.md` for details.
