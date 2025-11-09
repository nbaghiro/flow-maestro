#!/bin/bash

set -e

# FlowMaestro Deployment Script
# This script helps deploy FlowMaestro to GKE

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_info "Checking requirements..."

    local missing_tools=()

    if ! command -v gcloud &> /dev/null; then
        missing_tools+=("gcloud")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install them before running this script"
        exit 1
    fi

    print_info "All requirements met"
}

# Get configuration from user
get_config() {
    print_info "Gathering configuration..."

    # GCP Project ID
    if [ -z "$GCP_PROJECT_ID" ]; then
        read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
    fi
    export GCP_PROJECT_ID

    # Region
    if [ -z "$GCP_REGION" ]; then
        GCP_REGION="us-central1"
        read -p "Enter GCP Region (default: us-central1): " input
        GCP_REGION=${input:-$GCP_REGION}
    fi
    export GCP_REGION

    # Domain
    if [ -z "$DOMAIN" ]; then
        read -p "Enter your domain (e.g., example.com): " DOMAIN
    fi
    export DOMAIN

    # Image tag
    if [ -z "$IMAGE_TAG" ]; then
        IMAGE_TAG=$(git rev-parse --short HEAD)
        print_info "Using git commit as image tag: $IMAGE_TAG"
    fi
    export IMAGE_TAG

    # Registry
    export REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/flowmaestro"

    print_info "Configuration:"
    print_info "  Project: $GCP_PROJECT_ID"
    print_info "  Region: $GCP_REGION"
    print_info "  Domain: $DOMAIN"
    print_info "  Image Tag: $IMAGE_TAG"
    print_info "  Registry: $REGISTRY"
}

# Create Artifact Registry repository
create_artifact_registry() {
    print_info "Creating Artifact Registry repository..."

    if gcloud artifacts repositories describe flowmaestro \
        --location=$GCP_REGION \
        --project=$GCP_PROJECT_ID &> /dev/null; then
        print_info "Artifact Registry repository already exists"
    else
        gcloud artifacts repositories create flowmaestro \
            --repository-format=docker \
            --location=$GCP_REGION \
            --description="FlowMaestro container images" \
            --project=$GCP_PROJECT_ID
        print_info "Artifact Registry repository created"
    fi

    # Configure Docker authentication
    gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev
}

# Build Docker images
build_images() {
    print_info "Building Docker images..."

    # Build backend
    print_info "Building backend image..."
    docker build -f infra/docker/backend/Dockerfile \
        -t ${REGISTRY}/backend:${IMAGE_TAG} \
        -t ${REGISTRY}/backend:latest .

    # Build frontend
    print_info "Building frontend image..."
    docker build -f infra/docker/frontend/Dockerfile \
        --build-arg VITE_API_URL=https://api.${DOMAIN} \
        --build-arg VITE_WS_URL=wss://api.${DOMAIN} \
        -t ${REGISTRY}/frontend:${IMAGE_TAG} \
        -t ${REGISTRY}/frontend:latest .

    # Build marketing
    print_info "Building marketing image..."
    docker build -f infra/docker/marketing/Dockerfile \
        -t ${REGISTRY}/marketing:${IMAGE_TAG} \
        -t ${REGISTRY}/marketing:latest .

    print_info "All images built successfully"
}

# Push Docker images
push_images() {
    print_info "Pushing Docker images to Artifact Registry..."

    docker push ${REGISTRY}/backend:${IMAGE_TAG}
    docker push ${REGISTRY}/backend:latest

    docker push ${REGISTRY}/frontend:${IMAGE_TAG}
    docker push ${REGISTRY}/frontend:latest

    docker push ${REGISTRY}/marketing:${IMAGE_TAG}
    docker push ${REGISTRY}/marketing:latest

    print_info "All images pushed successfully"
}

# Update Kubernetes image tags
update_k8s_images() {
    print_info "Updating Kubernetes deployment images..."

    # Create a temporary directory for modified manifests
    mkdir -p /tmp/flowmaestro-k8s
    cp -r infra/k8s/* /tmp/flowmaestro-k8s/

    # Update manifests with project-specific values
    find /tmp/flowmaestro-k8s -type f -name "*.yaml" -exec sed -i.bak \
        -e "s|REGION-docker.pkg.dev/PROJECT_ID|${REGISTRY}|g" \
        -e "s|PROJECT_ID|${GCP_PROJECT_ID}|g" \
        -e "s|REGION|${GCP_REGION}|g" \
        -e "s|DOMAIN|${DOMAIN}|g" \
        {} \;

    # Remove backup files
    find /tmp/flowmaestro-k8s -type f -name "*.bak" -delete

    # Copy back modified manifests
    cp -r /tmp/flowmaestro-k8s/* infra/k8s/

    print_info "Kubernetes manifests updated"
}

# Prompt for secrets creation
check_secrets() {
    print_info "Checking for required Kubernetes secrets..."

    local secrets_missing=false

    if ! kubectl get secret db-credentials -n flowmaestro &> /dev/null; then
        print_warn "Secret 'db-credentials' not found"
        secrets_missing=true
    fi

    if ! kubectl get secret temporal-db-credentials -n flowmaestro &> /dev/null; then
        print_warn "Secret 'temporal-db-credentials' not found"
        secrets_missing=true
    fi

    if ! kubectl get secret redis-credentials -n flowmaestro &> /dev/null; then
        print_warn "Secret 'redis-credentials' not found"
        secrets_missing=true
    fi

    if ! kubectl get secret app-secrets -n flowmaestro &> /dev/null; then
        print_warn "Secret 'app-secrets' not found"
        secrets_missing=true
    fi

    if [ "$secrets_missing" = true ]; then
        echo ""
        print_error "Required secrets are missing!"
        print_error "You must create Kubernetes secrets before deployment."
        print_error "Run 'pulumi stack output' to get connection info, then create secrets."
        print_error "See infra/README.md for detailed instructions."
        echo ""
        read -p "Have you created all required secrets? (y/n): " secrets_confirm
        if [ "$secrets_confirm" != "y" ]; then
            print_error "Please create secrets first, then re-run this script"
            exit 1
        fi
    else
        print_info "All required secrets found"
    fi
}

# Deploy to Kubernetes
deploy_to_k8s() {
    print_info "Deploying to Kubernetes..."

    # Create namespace if it doesn't exist
    kubectl create namespace flowmaestro --dry-run=client -o yaml | kubectl apply -f -

    # Deploy Temporal schema migration
    print_info "Running Temporal schema migrations..."
    kubectl apply -f infra/k8s/jobs/temporal-schema-migration.yaml
    kubectl wait --for=condition=complete --timeout=600s job/temporal-schema-migration -n flowmaestro || {
        print_error "Temporal schema migration failed"
        kubectl logs -f job/temporal-schema-migration -n flowmaestro
        exit 1
    }
    print_info "Temporal schema migration completed"

    # Deploy Temporal server
    print_info "Deploying Temporal server..."
    kubectl apply -f infra/k8s/base/temporal-deployment.yaml
    kubectl wait --for=condition=available --timeout=600s deployment/temporal-server -n flowmaestro
    print_info "Temporal server deployed"

    # Run application database migrations
    print_info "Running application database migrations..."
    kubectl apply -f infra/k8s/jobs/db-migration.yaml
    kubectl wait --for=condition=complete --timeout=600s job/db-migration -n flowmaestro || {
        print_error "Database migration failed"
        kubectl logs -f job/db-migration -n flowmaestro
        exit 1
    }
    print_info "Database migrations completed"

    # Deploy application
    print_info "Deploying application..."
    kubectl apply -k infra/k8s/overlays/production

    # Wait for rollouts
    print_info "Waiting for API server rollout..."
    kubectl rollout status deployment/api-server -n flowmaestro --timeout=600s

    print_info "Waiting for worker rollout..."
    kubectl rollout status deployment/temporal-worker -n flowmaestro --timeout=600s

    print_info "Waiting for frontend rollout..."
    kubectl rollout status deployment/frontend -n flowmaestro --timeout=600s

    print_info "Waiting for marketing rollout..."
    kubectl rollout status deployment/marketing -n flowmaestro --timeout=600s

    print_info "All deployments completed successfully"
}

# Show deployment status
show_status() {
    print_info "Deployment Status:"
    echo ""

    print_info "Pods:"
    kubectl get pods -n flowmaestro
    echo ""

    print_info "Services:"
    kubectl get services -n flowmaestro
    echo ""

    print_info "Ingress:"
    kubectl get ingress -n flowmaestro
    echo ""

    print_info "HPA:"
    kubectl get hpa -n flowmaestro
}

# Main deployment flow
main() {
    print_info "=== FlowMaestro Deployment Script ==="
    echo ""

    check_requirements
    get_config

    # Ask for confirmation
    read -p "Proceed with deployment? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        print_warn "Deployment cancelled"
        exit 0
    fi

    create_artifact_registry
    build_images
    push_images
    update_k8s_images
    check_secrets
    deploy_to_k8s
    show_status

    echo ""
    print_info "=== Deployment Complete! ==="
    echo ""
    print_info "Next steps:"
    print_info "1. Get the Load Balancer IP:"
    print_info "   kubectl get ingress flowmaestro-ingress -n flowmaestro"
    echo ""
    print_info "2. Configure DNS A records to point to the Load Balancer IP:"
    print_info "   - api.${DOMAIN}"
    print_info "   - app.${DOMAIN}"
    print_info "   - www.${DOMAIN}"
    print_info "   - ${DOMAIN}"
    echo ""
    print_info "3. Wait for SSL certificate provisioning (15-60 minutes):"
    print_info "   kubectl describe managedcertificate flowmaestro-cert -n flowmaestro"
    echo ""
    print_info "4. Access your application:"
    print_info "   - API: https://api.${DOMAIN}"
    print_info "   - Frontend: https://app.${DOMAIN}"
    print_info "   - Marketing: https://www.${DOMAIN}"
    echo ""
    print_info "5. Monitor your deployment:"
    print_info "   kubectl get pods -n flowmaestro -w"
}

# Run main function
main
