# Local Testing - Quick Start

Test FlowMaestro on your local machine in **under 10 minutes**.

---

## One-Command Setup

```bash
cd infra
./local-test.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Start Minikube or kind cluster
3. ✅ Deploy PostgreSQL & Redis
4. ✅ Build Docker images
5. ✅ Create Kubernetes secrets
6. ✅ Deploy Temporal server
7. ✅ Deploy all services
8. ✅ Show access URLs

---

## Prerequisites

```bash
# Install required tools (Mac)
brew install docker minikube kubectl helm

# Or for kind instead of minikube
brew install docker kind kubectl helm

# Start Docker Desktop
open /Applications/Docker.app
```

---

## Quick Access

After deployment completes:

### Access Frontend
```bash
# Minikube
open http://$(minikube ip)

# kind
open http://localhost
```

### Access API
```bash
# Minikube
curl http://$(minikube ip)/api/health

# kind
curl http://localhost/api/health
```

### Access Temporal UI
```bash
kubectl port-forward -n flowmaestro svc/temporal-ui-service 8082:8080
open http://localhost:8082
```

---

## Common Tasks

### View Logs
```bash
# API logs
kubectl logs -f deployment/api-server -n flowmaestro

# Worker logs
kubectl logs -f deployment/temporal-worker -n flowmaestro

# All pods
kubectl get pods -n flowmaestro -w
```

### Rebuild & Redeploy

```bash
# Rebuild images
cd /path/to/flowmaestro
eval $(minikube docker-env)  # Only for Minikube
docker build -f infra/docker/backend/Dockerfile -t local/backend:latest .

# Restart deployment
kubectl rollout restart deployment/api-server -n flowmaestro
```

### Access Database

```bash
# Port forward PostgreSQL
kubectl port-forward -n flowmaestro svc/postgres-postgresql 5432:5432

# Connect in another terminal
psql -h localhost -U flowmaestro -d flowmaestro
# Password: localpassword123
```

---

## Cleanup

```bash
# Delete everything
kubectl delete namespace flowmaestro

# Stop cluster
minikube stop          # Minikube
# or
kind delete cluster --name flowmaestro-local  # kind

# Delete local overlay
rm -rf infra/k8s/overlays/local
```

---

## Troubleshooting

### Pods not starting?
```bash
kubectl get pods -n flowmaestro
kubectl describe pod <pod-name> -n flowmaestro
kubectl logs <pod-name> -n flowmaestro
```

### Out of memory?
```bash
# Increase Minikube resources
minikube delete
minikube start --cpus=6 --memory=12288
```

### Images not found?
```bash
# For Minikube: Use Minikube's Docker
eval $(minikube docker-env)
docker images | grep local

# For kind: Load images
kind load docker-image local/backend:latest --name flowmaestro-local
```

---

## What's Different from Production?

| Component | Production | Local |
|-----------|-----------|-------|
| **Kubernetes** | GKE Autopilot | Minikube/kind |
| **PostgreSQL** | Cloud SQL HA | Helm chart (single instance) |
| **Redis** | Memorystore HA | Helm chart (single instance) |
| **Temporal** | Self-hosted (HA) | Self-hosted (single instance) |
| **Ingress** | GKE Ingress | Nginx Ingress |
| **Replicas** | 2-3 per service | 1 per service |
| **Resources** | Production limits | Reduced limits |
| **Domain** | yourdomain.com | localhost |
| **SSL** | Google-managed cert | None (HTTP only) |

---

## Next Steps

✅ Once local testing passes, deploy to GCP:
1. Follow `infra/README.md` for production deployment
2. Use `infra/deploy.sh` for automated GCP deployment

---

**For detailed instructions, see: `infra/LOCAL_TESTING.md`**
