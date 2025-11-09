#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    local missing_tools=()

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install them first. See infra/LOCAL_TESTING.md for instructions"
        exit 1
    fi

    print_info "All prerequisites met"
}

# Choose cluster type
choose_cluster() {
    print_step "Choose Kubernetes cluster type"
    echo ""
    echo "1) Minikube (recommended for Mac/Windows)"
    echo "2) kind (Kubernetes in Docker)"
    echo ""
    read -p "Enter choice (1 or 2): " choice

    case $choice in
        1)
            CLUSTER_TYPE="minikube"
            if ! command -v minikube &> /dev/null; then
                print_error "Minikube not found. Install: brew install minikube"
                exit 1
            fi
            ;;
        2)
            CLUSTER_TYPE="kind"
            if ! command -v kind &> /dev/null; then
                print_error "kind not found. Install: brew install kind"
                exit 1
            fi
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    print_info "Using ${CLUSTER_TYPE}"
}

# Start cluster
start_cluster() {
    if [ "$CLUSTER_TYPE" = "minikube" ]; then
        print_step "Starting Minikube cluster..."

        if minikube status &> /dev/null; then
            print_warn "Minikube already running"
            read -p "Delete and recreate? (y/n): " recreate
            if [ "$recreate" = "y" ]; then
                minikube delete
            else
                print_info "Using existing Minikube cluster"
                return
            fi
        fi

        minikube start \
            --cpus=4 \
            --memory=8192 \
            --disk-size=40gb \
            --driver=docker \
            --kubernetes-version=v1.28.0

        # Enable addons
        minikube addons enable ingress
        minikube addons enable metrics-server

        # Configure Docker to use Minikube
        eval $(minikube docker-env)
        export USING_MINIKUBE=true

        print_info "Minikube cluster started"

    else
        print_step "Starting kind cluster..."

        if kind get clusters | grep -q flowmaestro-local; then
            print_warn "kind cluster 'flowmaestro-local' already exists"
            read -p "Delete and recreate? (y/n): " recreate
            if [ "$recreate" = "y" ]; then
                kind delete cluster --name flowmaestro-local
            else
                print_info "Using existing kind cluster"
                kubectl config use-context kind-flowmaestro-local
                return
            fi
        fi

        # Create kind config
        cat > /tmp/kind-config.yaml <<EOF
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
EOF

        kind create cluster --config /tmp/kind-config.yaml

        # Install ingress controller
        print_info "Installing ingress controller..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

        # Wait for ingress
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=90s

        export USING_KIND=true

        print_info "kind cluster started"
    fi

    # Verify cluster
    kubectl get nodes
}

# Deploy infrastructure (PostgreSQL, Redis)
deploy_infrastructure() {
    print_step "Deploying local infrastructure (PostgreSQL, Redis)..."

    # Create namespace
    kubectl create namespace flowmaestro --dry-run=client -o yaml | kubectl apply -f -

    # Add Helm repos
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update

    # Install PostgreSQL
    print_info "Installing PostgreSQL..."
    helm upgrade --install postgres bitnami/postgresql \
        --namespace flowmaestro \
        --set auth.username=flowmaestro \
        --set auth.password=localpassword123 \
        --set auth.database=flowmaestro \
        --set primary.persistence.size=5Gi \
        --wait \
        --timeout=5m

    # Create Temporal databases
    print_info "Creating Temporal databases..."
    sleep 10  # Wait for PostgreSQL to be fully ready

    kubectl run create-temporal-dbs --image=postgres:15 --restart=Never -n flowmaestro --rm -i -- \
        psql -h postgres-postgresql -U flowmaestro -d flowmaestro <<EOF
CREATE DATABASE temporal;
CREATE DATABASE temporal_visibility;
CREATE USER temporal WITH PASSWORD 'localpassword123';
GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO temporal;
EOF

    # Install Redis
    print_info "Installing Redis..."
    helm upgrade --install redis bitnami/redis \
        --namespace flowmaestro \
        --set auth.enabled=false \
        --set master.persistence.size=2Gi \
        --set replica.replicaCount=0 \
        --wait \
        --timeout=5m

    print_info "Infrastructure deployed successfully"
}

# Build Docker images
build_images() {
    print_step "Building Docker images..."

    cd "$(dirname "$0")/.."  # Go to project root

    if [ "$USING_MINIKUBE" = "true" ]; then
        eval $(minikube docker-env)
    fi

    export IMAGE_TAG=local
    export REGISTRY=local

    print_info "Building backend image..."
    docker build -f infra/docker/backend/Dockerfile \
        -t ${REGISTRY}/backend:${IMAGE_TAG} \
        -t ${REGISTRY}/backend:latest \
        .

    print_info "Building frontend image..."
    docker build -f infra/docker/frontend/Dockerfile \
        --build-arg VITE_API_URL=http://localhost/api \
        --build-arg VITE_WS_URL=ws://localhost/api \
        -t ${REGISTRY}/frontend:${IMAGE_TAG} \
        -t ${REGISTRY}/frontend:latest \
        .

    print_info "Building marketing image..."
    docker build -f infra/docker/marketing/Dockerfile \
        -t ${REGISTRY}/marketing:${IMAGE_TAG} \
        -t ${REGISTRY}/marketing:latest \
        .

    # Load images into kind if needed
    if [ "$USING_KIND" = "true" ]; then
        print_info "Loading images into kind cluster..."
        kind load docker-image ${REGISTRY}/backend:latest --name flowmaestro-local
        kind load docker-image ${REGISTRY}/frontend:latest --name flowmaestro-local
        kind load docker-image ${REGISTRY}/marketing:latest --name flowmaestro-local
    fi

    print_info "All images built successfully"
}

# Create Kubernetes secrets
create_secrets() {
    print_step "Creating Kubernetes secrets..."

    # Application database credentials
    kubectl create secret generic db-credentials \
        --namespace=flowmaestro \
        --from-literal=host=postgres-postgresql \
        --from-literal=port=5432 \
        --from-literal=database=flowmaestro \
        --from-literal=user=flowmaestro \
        --from-literal=password=localpassword123 \
        --dry-run=client -o yaml | kubectl apply -f -

    # Temporal database credentials
    kubectl create secret generic temporal-db-credentials \
        --namespace=flowmaestro \
        --from-literal=host=postgres-postgresql \
        --from-literal=port=5432 \
        --from-literal=database=temporal \
        --from-literal=visibility-database=temporal_visibility \
        --from-literal=user=temporal \
        --from-literal=password=localpassword123 \
        --dry-run=client -o yaml | kubectl apply -f -

    # Redis credentials
    kubectl create secret generic redis-credentials \
        --namespace=flowmaestro \
        --from-literal=host=redis-master \
        --from-literal=port=6379 \
        --dry-run=client -o yaml | kubectl apply -f -

    # Application secrets
    kubectl create secret generic app-secrets \
        --namespace=flowmaestro \
        --from-literal=jwt-secret=$(openssl rand -base64 64) \
        --from-literal=encryption-key=$(openssl rand -hex 32) \
        --dry-run=client -o yaml | kubectl apply -f -

    # Integration secrets (optional, with dummy values)
    kubectl create secret generic integration-secrets \
        --namespace=flowmaestro \
        --from-literal=OPENAI_API_KEY="sk-test-key" \
        --from-literal=ANTHROPIC_API_KEY="sk-ant-test-key" \
        --from-literal=GOOGLE_API_KEY="test-key" \
        --dry-run=client -o yaml | kubectl apply -f -

    print_info "Secrets created successfully"
}

# Create local overlay
create_local_overlay() {
    print_step "Creating local Kubernetes overlay..."

    mkdir -p infra/k8s/overlays/local

    # Kustomization file
    cat > infra/k8s/overlays/local/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flowmaestro

bases:
  - ../../base

commonLabels:
  environment: local

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

patchesStrategicMerge:
  - replica-patch.yaml
  - resource-patch.yaml
  - ingress-patch.yaml
EOF

    # Replica patch
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

    # Resource patch
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

    # Ingress patch
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
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
EOF

    print_info "Local overlay created"
}

# Deploy application
deploy_application() {
    print_step "Deploying FlowMaestro application..."

    cd infra

    # Deploy Temporal schema migration
    print_info "Running Temporal schema migration..."
    kubectl apply -f k8s/jobs/temporal-schema-migration.yaml
    kubectl wait --for=condition=complete --timeout=5m \
        job/temporal-schema-migration -n flowmaestro || {
        print_error "Temporal schema migration failed"
        kubectl logs -f job/temporal-schema-migration -n flowmaestro
        exit 1
    }

    # Deploy Temporal server
    print_info "Deploying Temporal server..."
    kubectl apply -f k8s/base/temporal-deployment.yaml
    kubectl wait --for=condition=available --timeout=5m \
        deployment/temporal-server -n flowmaestro

    # Deploy app database migration
    print_info "Running application database migration..."
    kubectl apply -f k8s/jobs/db-migration.yaml
    kubectl wait --for=condition=complete --timeout=5m \
        job/db-migration -n flowmaestro || {
        print_error "Database migration failed"
        kubectl logs -f job/db-migration -n flowmaestro
        exit 1
    }

    # Deploy all services
    print_info "Deploying all services..."
    kubectl apply -k k8s/overlays/local

    # Wait for deployments
    print_info "Waiting for deployments to be ready..."
    kubectl rollout status deployment/api-server -n flowmaestro --timeout=5m
    kubectl rollout status deployment/temporal-worker -n flowmaestro --timeout=5m
    kubectl rollout status deployment/frontend -n flowmaestro --timeout=5m
    kubectl rollout status deployment/marketing -n flowmaestro --timeout=5m

    print_info "Application deployed successfully"
}

# Show access information
show_access_info() {
    print_step "Deployment complete! 🎉"
    echo ""

    # Get pod status
    print_info "Pod status:"
    kubectl get pods -n flowmaestro
    echo ""

    # Access information
    print_info "Access your application:"
    if [ "$CLUSTER_TYPE" = "minikube" ]; then
        MINIKUBE_IP=$(minikube ip)
        echo "  Frontend:    http://${MINIKUBE_IP}"
        echo "  API:         http://${MINIKUBE_IP}/api/health"
        echo ""
        echo "  Or use port forwarding:"
        echo "  kubectl port-forward -n flowmaestro svc/frontend-service 8080:80"
        echo "  kubectl port-forward -n flowmaestro svc/api-service 3001:3001"
    else
        echo "  Frontend:    http://localhost"
        echo "  API:         http://localhost/api/health"
        echo ""
        echo "  Or use port forwarding:"
        echo "  kubectl port-forward -n flowmaestro svc/frontend-service 8080:80"
        echo "  kubectl port-forward -n flowmaestro svc/api-service 3001:3001"
    fi

    echo ""
    print_info "Temporal UI:"
    echo "  kubectl port-forward -n flowmaestro svc/temporal-ui-service 8082:8080"
    echo "  Then visit: http://localhost:8082"

    echo ""
    print_info "Useful commands:"
    echo "  View logs:     kubectl logs -f deployment/api-server -n flowmaestro"
    echo "  Watch pods:    kubectl get pods -n flowmaestro -w"
    echo "  Delete all:    kubectl delete namespace flowmaestro"

    if [ "$CLUSTER_TYPE" = "minikube" ]; then
        echo "  Stop cluster:  minikube stop"
        echo "  Delete cluster: minikube delete"
    else
        echo "  Delete cluster: kind delete cluster --name flowmaestro-local"
    fi
}

# Main execution
main() {
    echo ""
    print_step "FlowMaestro Local Testing Setup"
    echo ""

    check_prerequisites
    choose_cluster
    start_cluster
    deploy_infrastructure
    build_images
    create_secrets
    create_local_overlay
    deploy_application
    show_access_info

    echo ""
    print_info "🎉 Local deployment complete!"
}

# Run main function
main
