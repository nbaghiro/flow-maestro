# Local Kubernetes Testing Guide

Test FlowMaestro deployment on your local machine using Minikube or kind before deploying to GCP.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option 1: Using Minikube](#option-1-using-minikube)
3. [Option 2: Using kind](#option-2-using-kind)
4. [Setup Local Infrastructure](#setup-local-infrastructure)
5. [Build Docker Images Locally](#build-docker-images-locally)
6. [Deploy to Local Kubernetes](#deploy-to-local-kubernetes)
7. [Testing & Verification](#testing--verification)
8. [Cleanup](#cleanup)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Docker Desktop (required for both options)
# https://www.docker.com/products/docker-desktop

# Option 1: Minikube
brew install minikube

# Option 2: kind
brew install kind

# kubectl
brew install kubectl

# Helm (for easier PostgreSQL/Redis deployment)
brew install helm

# Verify installations
docker --version
minikube version  # or: kind version
kubectl version --client
helm version
```

---

## Option 1: Using Minikube

### 1. Start Minikube Cluster

```bash
# Start Minikube with sufficient resources
minikube start \
    --cpus=4 \
    --memory=8192 \
    --disk-size=40gb \
    --driver=docker \
    --kubernetes-version=v1.28.0

# Verify cluster is running
kubectl get nodes

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
```

### 2. Configure Docker to Use Minikube

```bash
# Point Docker CLI to Minikube's Docker daemon
eval $(minikube docker-env)

# Verify (you should see Minikube containers)
docker ps
```

---

## Option 2: Using kind

### 1. Create kind Cluster

Create a cluster configuration file:

```bash
cat > kind-config.yaml <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: flowmaestro-local
nodes:
  - role: control-plane
    kubeadmConfigPatches:
    - |
      kind: InitConfiguration
      nodeRegistration:
        kubeletExtraArgs:
          node-labels: "ingress-ready=true"
    extraPortMappings:
    - containerPort: 80
      hostPort: 80
      protocol: TCP
    - containerPort: 443
      hostPort: 443
      protocol: TCP
  - role: worker
  - role: worker
EOF

# Create cluster
kind create cluster --config kind-config.yaml

# Install ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

---

## Setup Local Infrastructure

### 1. Deploy PostgreSQL (via Helm)

```bash
# Add Bitnami Helm repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create namespace
kubectl create namespace flowmaestro

# Install PostgreSQL
helm install postgres bitnami/postgresql \
    --namespace flowmaestro \
    --set auth.username=flowmaestro \
    --set auth.password=localpassword123 \
    --set auth.database=flowmaestro \
    --set primary.persistence.size=5Gi

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n flowmaestro --timeout=180s

# Get PostgreSQL service name
kubectl get svc -n flowmaestro
# Service name will be: postgres-postgresql
```

### 2. Create Additional Databases for Temporal

```bash
# Connect to PostgreSQL and create Temporal databases
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql -h postgres-postgresql -U flowmaestro -d flowmaestro -c "
    CREATE DATABASE temporal;
    CREATE DATABASE temporal_visibility;
    CREATE USER temporal WITH PASSWORD 'localpassword123';
    GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
    GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO temporal;
    "

# Verify databases were created
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql -h postgres-postgresql -U flowmaestro -d flowmaestro -c "\l"
```

### 3. Deploy Redis (via Helm)

```bash
# Install Redis
helm install redis bitnami/redis \
    --namespace flowmaestro \
    --set auth.enabled=false \
    --set master.persistence.size=2Gi \
    --set replica.replicaCount=0

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n flowmaestro --timeout=180s

# Get Redis service name
kubectl get svc -n flowmaestro
# Service name will be: redis-master
```

---

## Build Docker Images Locally

### 1. Set Environment Variables

```bash
cd /path/to/flowmaestro  # Project root

export IMAGE_TAG=local
export REGISTRY=local

# For Minikube: Use Minikube's Docker daemon
eval $(minikube docker-env)

# For kind: Images are loaded directly (no registry needed)
```

### 2. Build All Images

```bash
# Build backend
docker build -f infra/docker/backend/Dockerfile \
    -t ${REGISTRY}/backend:${IMAGE_TAG} \
    -t ${REGISTRY}/backend:latest .

# Build frontend (with local API URL)
docker build -f infra/docker/frontend/Dockerfile \
    --build-arg VITE_API_URL=http://localhost/api \
    --build-arg VITE_WS_URL=ws://localhost/api \
    -t ${REGISTRY}/frontend:${IMAGE_TAG} \
    -t ${REGISTRY}/frontend:latest .

# Build marketing
docker build -f infra/docker/marketing/Dockerfile \
    -t ${REGISTRY}/marketing:${IMAGE_TAG} \
    -t ${REGISTRY}/marketing:latest .

# Verify images
docker images | grep local
```

### 3. Load Images into kind (kind only)

```bash
# Only needed for kind
kind load docker-image local/backend:latest --name flowmaestro-local
kind load docker-image local/frontend:latest --name flowmaestro-local
kind load docker-image local/marketing:latest --name flowmaestro-local
```

---

## Deploy to Local Kubernetes

### 1. Create Kubernetes Secrets

```bash
# Create secrets for local testing
kubectl create secret generic db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=postgres-postgresql \
    --from-literal=port=5432 \
    --from-literal=database=flowmaestro \
    --from-literal=user=flowmaestro \
    --from-literal=password=localpassword123

kubectl create secret generic temporal-db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=postgres-postgresql \
    --from-literal=port=5432 \
    --from-literal=database=temporal \
    --from-literal=visibility-database=temporal_visibility \
    --from-literal=user=temporal \
    --from-literal=password=localpassword123

kubectl create secret generic redis-credentials \
    --namespace=flowmaestro \
    --from-literal=host=redis-master \
    --from-literal=port=6379

kubectl create secret generic app-secrets \
    --namespace=flowmaestro \
    --from-literal=jwt-secret=$(openssl rand -base64 64) \
    --from-literal=encryption-key=$(openssl rand -hex 32)

# Optional: Integration secrets for testing
kubectl create secret generic integration-secrets \
    --namespace=flowmaestro \
    --from-literal=OPENAI_API_KEY="sk-test-key" \
    --from-literal=ANTHROPIC_API_KEY="sk-ant-test-key" \
    --from-literal=GOOGLE_API_KEY="test-key"
```

### 2. Create Local Kubernetes Manifests

Create a local overlay:

```bash
mkdir -p infra/k8s/overlays/local

cat > infra/k8s/overlays/local/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flowmaestro

bases:
  - ../../base

commonLabels:
  environment: local

# Image overrides for local testing
images:
  - name: REGION-docker.pkg.dev/PROJECT_ID/flowmaestro/backend
    newName: local/backend
    newTag: latest
  - name: REGION-docker.pkg.dev/PROJECT_ID/flowmaestro/frontend
    newName: local/frontend
    newTag: latest
  - name: REGION-docker.pkg.dev/PROJECT_ID/flowmaestro/marketing
    newName: local/marketing
    newTag: latest

# Patches for local environment
patchesStrategicMerge:
  - replica-patch.yaml
  - resource-patch.yaml
  - ingress-patch.yaml
EOF

# Create replica patch (fewer replicas for local)
cat > infra/k8s/overlays/local/replica-patch.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
spec:
  replicas: 1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marketing
spec:
  replicas: 1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-server
spec:
  replicas: 1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-ui
spec:
  replicas: 1
EOF

# Create resource patch (lower resource limits for local)
cat > infra/k8s/overlays/local/resource-patch.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
        - name: api-server
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
spec:
  template:
    spec:
      containers:
        - name: temporal-worker
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-server
spec:
  template:
    spec:
      containers:
        - name: temporal-server
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
EOF

# Create ingress patch (localhost routing)
cat > infra/k8s/overlays/local/ingress-patch.yaml <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flowmaestro-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: localhost
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 3001
          - path: /marketing
            pathType: Prefix
            backend:
              service:
                name: marketing-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
EOF
```

### 3. Deploy Temporal

```bash
cd infra

# Run Temporal schema migration
kubectl apply -f k8s/jobs/temporal-schema-migration.yaml

# Wait for migration to complete
kubectl wait --for=condition=complete --timeout=5m \
    job/temporal-schema-migration -n flowmaestro

# Check migration logs
kubectl logs -f job/temporal-schema-migration -n flowmaestro

# Deploy Temporal server
kubectl apply -f k8s/base/temporal-deployment.yaml

# Wait for Temporal to be ready
kubectl wait --for=condition=available --timeout=5m \
    deployment/temporal-server -n flowmaestro
```

### 4. Deploy Application

```bash
# Run app database migration
kubectl apply -f k8s/jobs/db-migration.yaml

# Wait for migration
kubectl wait --for=condition=complete --timeout=5m \
    job/db-migration -n flowmaestro

# Deploy all services
kubectl apply -k k8s/overlays/local

# Wait for deployments
kubectl rollout status deployment/api-server -n flowmaestro --timeout=5m
kubectl rollout status deployment/temporal-worker -n flowmaestro --timeout=5m
kubectl rollout status deployment/frontend -n flowmaestro --timeout=5m
kubectl rollout status deployment/marketing -n flowmaestro --timeout=5m

# Check all pods are running
kubectl get pods -n flowmaestro
```

---

## Testing & Verification

### 1. Access Services Locally

**For Minikube:**

```bash
# Get Minikube IP
minikube ip

# Access via Minikube IP
curl http://$(minikube ip)/api/health
open http://$(minikube ip)

# Or use port forwarding
kubectl port-forward -n flowmaestro svc/api-service 3001:3001
curl http://localhost:3001/health

kubectl port-forward -n flowmaestro svc/frontend-service 8080:80
open http://localhost:8080

kubectl port-forward -n flowmaestro svc/marketing-service 8081:80
open http://localhost:8081
```

**For kind:**

```bash
# Access via localhost (ingress is mapped to port 80)
curl http://localhost/api/health
open http://localhost

# Or use port forwarding
kubectl port-forward -n flowmaestro svc/api-service 3001:3001
kubectl port-forward -n flowmaestro svc/frontend-service 8080:80
kubectl port-forward -n flowmaestro svc/marketing-service 8081:80
```

### 2. Access Temporal UI

```bash
# Port forward Temporal UI
kubectl port-forward -n flowmaestro svc/temporal-ui-service 8082:8080

# Open in browser
open http://localhost:8082
```

### 3. Check Logs

```bash
# API server logs
kubectl logs -f deployment/api-server -n flowmaestro

# Worker logs
kubectl logs -f deployment/temporal-worker -n flowmaestro

# Temporal server logs
kubectl logs -f deployment/temporal-server -n flowmaestro

# All pods
kubectl get pods -n flowmaestro -w
```

### 4. Test Workflow Execution

```bash
# Create a test workflow via API
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "definition": {
      "nodes": [],
      "edges": []
    }
  }'

# Check Temporal UI to see if workflow appears
```

### 5. Database Access

```bash
# Connect to PostgreSQL
kubectl port-forward -n flowmaestro svc/postgres-postgresql 5432:5432

# In another terminal
psql -h localhost -U flowmaestro -d flowmaestro
# Password: localpassword123

# Check tables
\dt

# Check Temporal database
psql -h localhost -U temporal -d temporal
\dt
```

---

## Cleanup

### Stop and Remove Everything

**Minikube:**

```bash
# Stop Minikube
minikube stop

# Delete cluster
minikube delete

# Or just pause
minikube pause
```

**kind:**

```bash
# Delete cluster
kind delete cluster --name flowmaestro-local
```

### Clean Up Local Files

```bash
# Remove local overlay
rm -rf infra/k8s/overlays/local

# Remove kind config
rm kind-config.yaml
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n flowmaestro

# Describe pod
kubectl describe pod <pod-name> -n flowmaestro

# Check events
kubectl get events -n flowmaestro --sort-by='.lastTimestamp'

# Common issues:
# - ImagePullBackOff: Image not found in local registry
# - CrashLoopBackOff: Application error, check logs
# - Pending: Insufficient resources, increase Minikube memory
```

### Image Pull Errors

```bash
# For Minikube: Ensure you're using Minikube's Docker
eval $(minikube docker-env)
docker images | grep local

# For kind: Ensure images are loaded
kind load docker-image local/backend:latest --name flowmaestro-local
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
kubectl get pods -n flowmaestro -l app.kubernetes.io/name=postgresql

# Check Redis is running
kubectl get pods -n flowmaestro -l app.kubernetes.io/name=redis

# Test connection from a debug pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql -h postgres-postgresql -U flowmaestro -d flowmaestro
```

### Ingress Not Working

**Minikube:**

```bash
# Check ingress addon is enabled
minikube addons list

# Enable if not
minikube addons enable ingress

# Get Minikube IP
minikube ip
```

**kind:**

```bash
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Reinstall if needed
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

### Insufficient Resources

```bash
# For Minikube: Increase resources
minikube delete
minikube start --cpus=6 --memory=12288 --disk-size=60gb

# For kind: Edit kind-config.yaml and recreate cluster
```

---

## Quick Local Testing Script

Create a script for quick local testing:

```bash
cat > infra/local-test.sh <<'EOF'
#!/bin/bash

set -e

echo "🚀 Starting local FlowMaestro deployment..."

# Choose cluster type
read -p "Use Minikube or kind? (m/k): " CLUSTER_TYPE

if [ "$CLUSTER_TYPE" = "m" ]; then
    echo "📦 Starting Minikube..."
    minikube start --cpus=4 --memory=8192 --disk-size=40gb
    eval $(minikube docker-env)
elif [ "$CLUSTER_TYPE" = "k" ]; then
    echo "📦 Starting kind cluster..."
    kind create cluster --name flowmaestro-local
else
    echo "❌ Invalid choice"
    exit 1
fi

echo "🏗️  Installing infrastructure..."
kubectl create namespace flowmaestro || true
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install postgres bitnami/postgresql \
    --namespace flowmaestro \
    --set auth.username=flowmaestro \
    --set auth.password=localpassword123 \
    --set auth.database=flowmaestro \
    --wait

helm install redis bitnami/redis \
    --namespace flowmaestro \
    --set auth.enabled=false \
    --wait

echo "🐘 Creating Temporal databases..."
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n flowmaestro -- \
    psql -h postgres-postgresql -U flowmaestro -d flowmaestro -c "
    CREATE DATABASE IF NOT EXISTS temporal;
    CREATE DATABASE IF NOT EXISTS temporal_visibility;
    "

echo "🔨 Building Docker images..."
docker build -f infra/docker/backend/Dockerfile -t local/backend:latest .
docker build -f infra/docker/frontend/Dockerfile \
    --build-arg VITE_API_URL=http://localhost/api \
    --build-arg VITE_WS_URL=ws://localhost/api \
    -t local/frontend:latest .
docker build -f infra/docker/marketing/Dockerfile -t local/marketing:latest .

if [ "$CLUSTER_TYPE" = "k" ]; then
    echo "📥 Loading images into kind..."
    kind load docker-image local/backend:latest --name flowmaestro-local
    kind load docker-image local/frontend:latest --name flowmaestro-local
    kind load docker-image local/marketing:latest --name flowmaestro-local
fi

echo "🔐 Creating secrets..."
kubectl create secret generic db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=postgres-postgresql \
    --from-literal=port=5432 \
    --from-literal=database=flowmaestro \
    --from-literal=user=flowmaestro \
    --from-literal=password=localpassword123 \
    --dry-run=client -o yaml | kubectl apply -f -

# ... (create other secrets similarly)

echo "🚢 Deploying application..."
kubectl apply -f infra/k8s/jobs/temporal-schema-migration.yaml
kubectl wait --for=condition=complete --timeout=5m job/temporal-schema-migration -n flowmaestro

kubectl apply -f infra/k8s/base/temporal-deployment.yaml
kubectl wait --for=condition=available --timeout=5m deployment/temporal-server -n flowmaestro

kubectl apply -f infra/k8s/jobs/db-migration.yaml
kubectl wait --for=condition=complete --timeout=5m job/db-migration -n flowmaestro

kubectl apply -k infra/k8s/overlays/local

echo "✅ Deployment complete!"
echo "📊 Check status: kubectl get pods -n flowmaestro"
echo "🌐 Access application:"
if [ "$CLUSTER_TYPE" = "m" ]; then
    echo "   http://$(minikube ip)"
else
    echo "   http://localhost"
fi
EOF

chmod +x infra/local-test.sh
```

---

## Benefits of Local Testing

✅ **Fast Iteration**: Test changes without deploying to GCP
✅ **Cost Savings**: No cloud costs during development
✅ **Offline Development**: Work without internet connection
✅ **Safe Experimentation**: Break things without consequences
✅ **CI/CD Testing**: Validate K8s manifests before deployment

---

**Ready to test locally! Run `./infra/local-test.sh` to get started.** 🎉
