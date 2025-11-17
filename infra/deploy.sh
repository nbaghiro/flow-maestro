#!/bin/bash

# FlowMaestro Deployment Script for Google Cloud Platform
# This script automates the complete deployment of FlowMaestro to a new GCP project
# Usage: ./infra/deploy.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

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

    if ! command -v pulumi &> /dev/null; then
        missing_tools+=("pulumi")
    fi

    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi

    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools:"
        echo "  - gcloud: https://cloud.google.com/sdk/docs/install"
        echo "  - kubectl: https://kubernetes.io/docs/tasks/tools/"
        echo "  - docker: https://docs.docker.com/get-docker/"
        echo "  - pulumi: https://www.pulumi.com/docs/get-started/install/"
        echo "  - node/npm: https://nodejs.org/"
        exit 1
    fi

    print_success "All prerequisites are installed"
}

# Gather configuration
gather_config() {
    print_header "Configuration"

    echo "Please provide the following configuration details:"
    echo ""

    # Project ID
    read -p "GCP Project ID: " GCP_PROJECT
    if [ -z "$GCP_PROJECT" ]; then
        print_error "Project ID cannot be empty"
        exit 1
    fi

    # Environment
    echo ""
    echo "Select environment:"
    echo "  1) Production"
    echo "  2) Staging"
    echo "  3) Development"
    read -p "Choice (1-3): " ENV_CHOICE

    case $ENV_CHOICE in
        1)
            ENVIRONMENT="prod"
            ;;
        2)
            ENVIRONMENT="staging"
            ;;
        3)
            ENVIRONMENT="dev"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    # Domain
    echo ""
    read -p "Domain name (e.g., flowmaestro.ai): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        print_error "Domain cannot be empty"
        exit 1
    fi

    # Region
    echo ""
    read -p "GCP Region [us-central1]: " GCP_REGION
    GCP_REGION=${GCP_REGION:-us-central1}

    # Generate secrets
    echo ""
    print_info "Generating secure random secrets..."
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    # Registry
    REGISTRY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/flowmaestro-images"

    # Summary
    echo ""
    print_header "Configuration Summary"
    echo "Project ID:     $GCP_PROJECT"
    echo "Environment:    $ENVIRONMENT"
    echo "Domain:         $DOMAIN"
    echo "Region:         $GCP_REGION"
    echo "DB Password:    [GENERATED]"
    echo "JWT Secret:     [GENERATED]"
    echo "Encryption Key: [GENERATED]"
    echo ""

    if ! confirm "Proceed with this configuration?"; then
        print_error "Deployment cancelled"
        exit 1
    fi
}

# Authenticate with GCP
authenticate_gcp() {
    print_header "GCP Authentication"

    print_info "Checking gcloud authentication..."
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_warn "Not authenticated with gcloud"
        if confirm "Authenticate now?"; then
            gcloud auth login
        else
            print_error "Authentication required to continue"
            exit 1
        fi
    fi

    print_info "Setting project to $GCP_PROJECT..."
    gcloud config set project "$GCP_PROJECT"

    print_success "Authenticated and project set"
}

# Enable required GCP APIs
enable_apis() {
    print_header "Enabling GCP APIs"

    local apis=(
        "compute.googleapis.com"
        "container.googleapis.com"
        "sqladmin.googleapis.com"
        "redis.googleapis.com"
        "artifactregistry.googleapis.com"
        "servicenetworking.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "iam.googleapis.com"
        "monitoring.googleapis.com"
        "logging.googleapis.com"
    )

    print_info "Enabling ${#apis[@]} required APIs..."
    gcloud services enable "${apis[@]}" --project="$GCP_PROJECT"

    print_success "All APIs enabled"
}

# Configure Pulumi
configure_pulumi() {
    print_header "Configuring Pulumi"

    cd infra/pulumi 2>/dev/null || true

    # Create or select stack
    local stack_name="$ENVIRONMENT"
    print_info "Creating/selecting Pulumi stack: $stack_name"

    if pulumi stack ls | grep -q "$stack_name"; then
        pulumi stack select "$stack_name"
    else
        pulumi stack init "$stack_name"
    fi

    # Set configuration
    print_info "Setting Pulumi configuration..."
    pulumi config set gcp:project "$GCP_PROJECT"
    pulumi config set gcp:region "$GCP_REGION"
    pulumi config set environment "$ENVIRONMENT"
    pulumi config set domain "$DOMAIN"
    pulumi config set --secret dbPassword "$DB_PASSWORD"
    pulumi config set --secret jwtSecret "$JWT_SECRET"
    pulumi config set --secret encryptionKey "$ENCRYPTION_KEY"

    print_success "Pulumi configured"

    cd ../..
}

# Deploy infrastructure with Pulumi
deploy_infrastructure() {
    print_header "Deploying Infrastructure with Pulumi"

    cd infra/pulumi 2>/dev/null || true

    print_info "Running Pulumi preview..."
    pulumi preview

    echo ""
    if ! confirm "Proceed with infrastructure deployment?"; then
        print_error "Deployment cancelled"
        exit 1
    fi

    print_info "Deploying infrastructure (this may take 10-15 minutes)..."
    pulumi up --yes

    print_success "Infrastructure deployed"

    cd ../..
}

# Get infrastructure outputs
get_infrastructure_outputs() {
    print_header "Retrieving Infrastructure Outputs"

    cd infra/pulumi 2>/dev/null || true

    LOAD_BALANCER_IP=$(pulumi stack output loadBalancerIp)

    print_info "Load Balancer IP: $LOAD_BALANCER_IP"

    cd ../..
}

# Configure DNS
configure_dns() {
    print_header "DNS Configuration"

    echo ""
    print_warn "Manual DNS configuration required!"
    echo ""
    echo "Please add the following DNS records to your domain:"
    echo ""
    echo "A Records:"
    echo "  Host: @             Value: $LOAD_BALANCER_IP"
    echo "  Host: www           Value: $LOAD_BALANCER_IP"
    echo "  Host: api           Value: $LOAD_BALANCER_IP"
    echo "  Host: app           Value: $LOAD_BALANCER_IP"
    echo ""

    read -p "Press Enter once DNS records are configured..."
}

# Build and push Docker images
build_and_push_images() {
    print_header "Building and Pushing Docker Images"

    # Configure Docker authentication
    print_info "Configuring Docker authentication for Artifact Registry..."
    gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet

    # Install dependencies
    print_info "Installing dependencies..."
    npm ci

    local images=("backend" "frontend" "marketing")

    for image in "${images[@]}"; do
        print_info "Building $image image for linux/amd64..."

        if [ "$image" = "frontend" ]; then
            docker build \
                --platform linux/amd64 \
                -f "infra/docker/$image/Dockerfile" \
                --build-arg VITE_API_URL="https://api.$DOMAIN" \
                --build-arg VITE_WS_URL="https://api.$DOMAIN" \
                -t "$REGISTRY/$image:latest" \
                -t "$REGISTRY/$image:$ENVIRONMENT" \
                .
        else
            docker build \
                --platform linux/amd64 \
                -f "infra/docker/$image/Dockerfile" \
                -t "$REGISTRY/$image:latest" \
                -t "$REGISTRY/$image:$ENVIRONMENT" \
                .
        fi

        print_info "Pushing $image image..."
        docker push "$REGISTRY/$image:latest"
        docker push "$REGISTRY/$image:$ENVIRONMENT"

        print_success "$image image built and pushed"
    done
}

# Configure kubectl
configure_kubectl() {
    print_header "Configuring kubectl"

    print_info "Getting GKE cluster credentials..."
    gcloud container clusters get-credentials \
        "flowmaestro-$ENVIRONMENT-cluster" \
        --region="$GCP_REGION" \
        --project="$GCP_PROJECT"

    print_success "kubectl configured"
}

# Update Kubernetes manifests
update_k8s_manifests() {
    print_header "Updating Kubernetes Manifests"

    local overlay_dir="infra/k8s/overlays/$ENVIRONMENT"

    # Create overlay directory if it doesn't exist
    mkdir -p "$overlay_dir"

    # Update kustomization.yaml
    print_info "Updating kustomization.yaml..."
    cat > "$overlay_dir/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flowmaestro

resources:
  - ../../base

images:
  - name: backend-image
    newName: $REGISTRY/backend
    newTag: latest
  - name: frontend-image
    newName: $REGISTRY/frontend
    newTag: latest
  - name: marketing-image
    newName: $REGISTRY/marketing
    newTag: latest

patches:
  - path: configmap-patch.yaml
EOF

    # Update configmap patch
    print_info "Updating ConfigMap patch..."
    cat > "$overlay_dir/configmap-patch.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: flowmaestro-config
  namespace: flowmaestro
data:
  CORS_ORIGIN: "https://app.$DOMAIN"
  NODE_ENV: "$ENVIRONMENT"
EOF

    print_success "Manifests updated"
}

# Create Kubernetes secrets
create_k8s_secrets() {
    print_header "Creating Kubernetes Secrets"

    # Create namespace
    print_info "Creating flowmaestro namespace..."
    kubectl create namespace flowmaestro --dry-run=client -o yaml | kubectl apply -f -

    # Get database connection details from Pulumi
    cd infra/pulumi 2>/dev/null || true
    DB_HOST=$(pulumi stack output dbHost)
    DB_NAME=$(pulumi stack output dbName)
    DB_USER=$(pulumi stack output dbUser)
    REDIS_HOST=$(pulumi stack output redisHost)
    cd ../..

    # Create app-secrets
    print_info "Creating app-secrets..."
    kubectl create secret generic app-secrets \
        --namespace=flowmaestro \
        --from-literal=DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" \
        --from-literal=REDIS_URL="redis://$REDIS_HOST:6379" \
        --from-literal=JWT_SECRET="$JWT_SECRET" \
        --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create temporal-db-credentials
    cd infra/pulumi 2>/dev/null || true
    TEMPORAL_DB_HOST=$(pulumi stack output temporalDbHost)
    TEMPORAL_DB_NAME=$(pulumi stack output temporalDbName)
    TEMPORAL_DB_USER=$(pulumi stack output temporalDbUser)
    TEMPORAL_VISIBILITY_DB=$(pulumi stack output temporalVisibilityDbName)
    cd ../..

    print_info "Creating temporal-db-credentials..."
    kubectl create secret generic temporal-db-credentials \
        --namespace=flowmaestro \
        --from-literal=host="$TEMPORAL_DB_HOST" \
        --from-literal=port="5432" \
        --from-literal=user="$TEMPORAL_DB_USER" \
        --from-literal=password="$DB_PASSWORD" \
        --from-literal=database="$TEMPORAL_DB_NAME" \
        --from-literal=visibility-database="$TEMPORAL_VISIBILITY_DB" \
        --dry-run=client -o yaml | kubectl apply -f -

    print_success "Secrets created"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    if confirm "Run database migrations now?"; then
        cd infra/pulumi 2>/dev/null || true
        DB_HOST=$(pulumi stack output dbHost)
        DB_NAME=$(pulumi stack output dbName)
        DB_USER=$(pulumi stack output dbUser)
        cd ../..

        print_info "Building backend..."
        npm run build --workspace=backend

        print_info "Running migrations..."
        cd backend
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" npm run db:migrate
        cd ..

        print_success "Migrations completed"
    else
        print_warn "Skipping migrations - remember to run them manually!"
    fi
}

# Deploy to Kubernetes
deploy_to_k8s() {
    print_header "Deploying to Kubernetes"

    print_info "Applying Kubernetes manifests..."
    kubectl apply -k "infra/k8s/overlays/$ENVIRONMENT"

    print_success "Manifests applied"
}

# Wait for pods to be ready
wait_for_pods() {
    print_header "Waiting for Pods to be Ready"

    print_info "Waiting for all pods to be running (this may take a few minutes)..."

    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        local not_ready=$(kubectl get pods -n flowmaestro --no-headers 2>/dev/null | grep -v "Running\|Completed" | wc -l)

        if [ "$not_ready" -eq 0 ]; then
            print_success "All pods are ready!"
            kubectl get pods -n flowmaestro
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 5
    done

    echo ""
    print_warn "Some pods are not ready yet. Current status:"
    kubectl get pods -n flowmaestro
    echo ""
    print_info "You can monitor pod status with: kubectl get pods -n flowmaestro --watch"
}

# Check SSL certificate status
check_ssl_certificate() {
    print_header "Checking SSL Certificate Status"

    print_info "Checking ManagedCertificate status..."
    kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

    echo ""
    print_warn "SSL certificate provisioning can take 15-60 minutes"
    print_info "Monitor with: kubectl describe managedcertificate flowmaestro-cert -n flowmaestro"
}

# Final instructions
final_instructions() {
    print_header "Deployment Complete!"

    echo ""
    print_success "FlowMaestro has been deployed to GCP!"
    echo ""
    echo "Configuration:"
    echo "  Environment:        $ENVIRONMENT"
    echo "  Domain:             $DOMAIN"
    echo "  Load Balancer IP:   $LOAD_BALANCER_IP"
    echo ""
    echo "Access URLs (once SSL is provisioned):"
    echo "  App:                https://app.$DOMAIN"
    echo "  API:                https://api.$DOMAIN"
    echo "  Marketing Site:     https://$DOMAIN"
    echo "  Marketing Site:     https://www.$DOMAIN"
    echo ""
    echo "Useful commands:"
    echo "  Check pods:         kubectl get pods -n flowmaestro"
    echo "  View logs:          kubectl logs -n flowmaestro -l app=flowmaestro --tail=100 -f"
    echo "  Check ingress:      kubectl get ingress -n flowmaestro"
    echo "  Check SSL cert:     kubectl describe managedcertificate flowmaestro-cert -n flowmaestro"
    echo ""
    print_warn "Remember:"
    echo "  - SSL certificate provisioning can take 15-60 minutes"
    echo "  - Ensure DNS records are properly configured"
    echo "  - Monitor pod logs for any startup issues"
    echo ""
}

# Main execution flow
main() {
    print_header "FlowMaestro GCP Deployment Script"

    check_prerequisites
    gather_config
    authenticate_gcp
    enable_apis
    configure_pulumi
    deploy_infrastructure
    get_infrastructure_outputs
    configure_dns
    build_and_push_images
    configure_kubectl
    update_k8s_manifests
    create_k8s_secrets
    run_migrations
    deploy_to_k8s
    wait_for_pods
    check_ssl_certificate
    final_instructions

    print_success "Deployment script completed!"
}

# Run main function
main
