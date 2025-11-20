#!/bin/bash

# FlowMaestro GCP Secret Manager Setup Script
# Creates/updates secrets in GCP Secret Manager from local values
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Secret Manager Admin role on the GCP project
#
# Usage: ./infra/scripts/setup-secrets-gcp.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to get secret from K8s
get_k8s_secret_value() {
    local secret_name=$1
    local key=$2
    local namespace=${3:-flowmaestro}

    kubectl get secret "$secret_name" -n "$namespace" -o jsonpath="{.data.$key}" 2>/dev/null | base64 -d 2>/dev/null || echo ""
}

# Function to parse DATABASE_URL or REDIS_URL from K8s
parse_connection_url() {
    local url=$1
    local component=$2  # host, port, user, password, database

    if [[ $url =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
        case $component in
            user) echo "${BASH_REMATCH[1]}" ;;
            password) echo "${BASH_REMATCH[2]}" ;;
            host) echo "${BASH_REMATCH[3]}" ;;
            port) echo "${BASH_REMATCH[4]}" ;;
            database) echo "${BASH_REMATCH[5]}" ;;
        esac
    elif [[ $url =~ ^redis://([^:]+):([0-9]+)$ ]]; then
        case $component in
            host) echo "${BASH_REMATCH[1]}" ;;
            port) echo "${BASH_REMATCH[2]}" ;;
        esac
    fi
}

# Function to get Pulumi stack output
get_pulumi_output() {
    local output_name=$1
    local pulumi_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../pulumi" && pwd)"

    (cd "$pulumi_dir" && pulumi stack output "$output_name" 2>/dev/null) || echo ""
}

# Function to mask secret for display
mask_secret() {
    local secret=$1
    local visible=4

    if [ ${#secret} -le $visible ]; then
        echo "****"
    else
        echo "${secret:0:$visible}$(printf '%.0s*' $(seq 1 $((${#secret} - $visible))))"
    fi
}

# Function to prompt with existing value
prompt_with_existing() {
    local prompt_text=$1
    local existing_value=$2
    local var_name=$3

    if [ -n "$existing_value" ]; then
        local masked=$(mask_secret "$existing_value")
        read -p "$prompt_text [current: $masked, press Enter to keep]: " user_input
        if [ -z "$user_input" ]; then
            eval "$var_name=\"$existing_value\""
        else
            eval "$var_name=\"$user_input\""
        fi
    else
        read -p "$prompt_text: " user_input
        eval "$var_name=\"$user_input\""
    fi
}

# Get current GCP project
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$GCP_PROJECT" ]; then
    print_error "No GCP project is set"
    echo "Set your project with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_header "FlowMaestro GCP Secrets Setup"
print_info "GCP Project: ${GCP_PROJECT}"
print_warn "This will create/update secrets in GCP Secret Manager"

echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Cancelled"
    exit 1
fi

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2

    if [ -z "$secret_value" ]; then
        print_warn "Skipping ${secret_name} (no value provided)"
        return
    fi

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$GCP_PROJECT" &>/dev/null; then
        # Update existing secret
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$GCP_PROJECT" \
            --data-file=- >/dev/null 2>&1
        print_success "Updated ${secret_name}"
    else
        # Create new secret
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$GCP_PROJECT" \
            --replication-policy="automatic" \
            --data-file=- >/dev/null 2>&1
        print_success "Created ${secret_name}"
    fi
}

# Function to create or update a JSON secret
create_or_update_json_secret() {
    local secret_name=$1
    local json_data=$2

    if [ -z "$json_data" ] || [ "$json_data" = "{}" ]; then
        print_warn "Skipping ${secret_name} (no data provided)"
        return
    fi

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$GCP_PROJECT" &>/dev/null; then
        # Update existing secret
        echo -n "$json_data" | gcloud secrets versions add "$secret_name" \
            --project="$GCP_PROJECT" \
            --data-file=- >/dev/null 2>&1
        print_success "Updated ${secret_name}"
    else
        # Create new secret
        echo -n "$json_data" | gcloud secrets create "$secret_name" \
            --project="$GCP_PROJECT" \
            --replication-policy="automatic" \
            --data-file=- >/dev/null 2>&1
        print_success "Created ${secret_name}"
    fi
}

print_header "Detecting Existing Secrets"

# Try to detect existing secrets from K8s
print_info "Checking for existing secrets in Kubernetes..."

# Try new ESO format first (JWT_SECRET, ENCRYPTION_KEY)
EXISTING_JWT=$(get_k8s_secret_value "app-secrets" "JWT_SECRET")
EXISTING_ENCRYPTION=$(get_k8s_secret_value "app-secrets" "ENCRYPTION_KEY")
EXISTING_DATABASE_URL=$(get_k8s_secret_value "app-secrets" "DATABASE_URL")
EXISTING_REDIS_URL=$(get_k8s_secret_value "app-secrets" "REDIS_URL")

# Fall back to old manual format (jwt-secret, encryption-key)
if [ -z "$EXISTING_JWT" ]; then
    EXISTING_JWT=$(get_k8s_secret_value "app-secrets" "jwt-secret")
fi
if [ -z "$EXISTING_ENCRYPTION" ]; then
    EXISTING_ENCRYPTION=$(get_k8s_secret_value "app-secrets" "encryption-key")
fi

# Check old db-credentials secret
if [ -z "$EXISTING_DATABASE_URL" ]; then
    EXISTING_DB_HOST=$(get_k8s_secret_value "db-credentials" "host")
    EXISTING_DB_PORT=$(get_k8s_secret_value "db-credentials" "port")
    EXISTING_DB_NAME=$(get_k8s_secret_value "db-credentials" "database")
    EXISTING_DB_USER=$(get_k8s_secret_value "db-credentials" "user")
    EXISTING_DB_PASSWORD=$(get_k8s_secret_value "db-credentials" "password")
fi

# Check old redis-credentials secret
if [ -z "$EXISTING_REDIS_URL" ]; then
    EXISTING_REDIS_HOST=$(get_k8s_secret_value "redis-credentials" "host")
    EXISTING_REDIS_PORT=$(get_k8s_secret_value "redis-credentials" "port")
fi

# Parse connection URLs
if [ -n "$EXISTING_DATABASE_URL" ]; then
    EXISTING_DB_USER=$(parse_connection_url "$EXISTING_DATABASE_URL" "user")
    EXISTING_DB_PASSWORD=$(parse_connection_url "$EXISTING_DATABASE_URL" "password")
    EXISTING_DB_HOST=$(parse_connection_url "$EXISTING_DATABASE_URL" "host")
    EXISTING_DB_PORT=$(parse_connection_url "$EXISTING_DATABASE_URL" "port")
    EXISTING_DB_NAME=$(parse_connection_url "$EXISTING_DATABASE_URL" "database")
fi

if [ -n "$EXISTING_REDIS_URL" ]; then
    EXISTING_REDIS_HOST=$(parse_connection_url "$EXISTING_REDIS_URL" "host")
    EXISTING_REDIS_PORT=$(parse_connection_url "$EXISTING_REDIS_URL" "port")
fi

# Try to get from Pulumi outputs as fallback
if [ -z "$EXISTING_DB_HOST" ]; then
    EXISTING_DB_HOST=$(get_pulumi_output "dbHost")
fi
if [ -z "$EXISTING_REDIS_HOST" ]; then
    EXISTING_REDIS_HOST=$(get_pulumi_output "redisHost")
fi

# Show what was found
if [ -n "$EXISTING_JWT" ] || [ -n "$EXISTING_ENCRYPTION" ] || [ -n "$EXISTING_DB_HOST" ]; then
    print_success "Found existing secrets!"
    [ -n "$EXISTING_JWT" ] && print_info "  - JWT Secret: $(mask_secret "$EXISTING_JWT")"
    [ -n "$EXISTING_ENCRYPTION" ] && print_info "  - Encryption Key: $(mask_secret "$EXISTING_ENCRYPTION")"
    [ -n "$EXISTING_DB_HOST" ] && print_info "  - Database Host: $EXISTING_DB_HOST"
    [ -n "$EXISTING_REDIS_HOST" ] && print_info "  - Redis Host: $EXISTING_REDIS_HOST"
    echo ""
else
    print_warn "No existing secrets found - will prompt for new values"
    echo ""
fi

print_header "Interactive Secret Setup"

# Core Secrets
print_info "Core Application Secrets"

# JWT Secret
if [ -n "$EXISTING_JWT" ]; then
    prompt_with_existing "JWT Secret (leave empty to keep current, or type 'generate' for new)" "$EXISTING_JWT" "JWT_SECRET"
    if [ "$JWT_SECRET" = "generate" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        print_info "Generated new JWT Secret"
    fi
else
    read -p "JWT Secret (leave empty to generate): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        print_info "Generated JWT Secret"
    fi
fi

# Encryption Key
if [ -n "$EXISTING_ENCRYPTION" ]; then
    prompt_with_existing "Encryption Key (leave empty to keep current, or type 'generate' for new)" "$EXISTING_ENCRYPTION" "ENCRYPTION_KEY"
    if [ "$ENCRYPTION_KEY" = "generate" ]; then
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        print_info "Generated new Encryption Key"
    fi
else
    read -p "Encryption Key (leave empty to generate): " ENCRYPTION_KEY
    if [ -z "$ENCRYPTION_KEY" ]; then
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        print_info "Generated Encryption Key (64 hex chars)"
    fi
fi

# Database Config
echo ""
print_info "Database Configuration"

# Database Host
if [ -n "$EXISTING_DB_HOST" ]; then
    read -p "Database Host [current: $EXISTING_DB_HOST]: " DB_HOST
    DB_HOST=${DB_HOST:-$EXISTING_DB_HOST}
else
    DB_HOST=$(get_pulumi_output "dbHost")
    if [ -z "$DB_HOST" ]; then
        read -p "Database Host [localhost]: " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
    else
        read -p "Database Host [$DB_HOST]: " DB_HOST_INPUT
        DB_HOST=${DB_HOST_INPUT:-$DB_HOST}
    fi
fi

# Database Port
read -p "Database Port [${EXISTING_DB_PORT:-5432}]: " DB_PORT
DB_PORT=${DB_PORT:-${EXISTING_DB_PORT:-5432}}

# Database Name
read -p "Database Name [${EXISTING_DB_NAME:-flowmaestro}]: " DB_NAME
DB_NAME=${DB_NAME:-${EXISTING_DB_NAME:-flowmaestro}}

# Database User
read -p "Database User [${EXISTING_DB_USER:-flowmaestro}]: " DB_USER
DB_USER=${DB_USER:-${EXISTING_DB_USER:-flowmaestro}}

# Database Password
if [ -n "$EXISTING_DB_PASSWORD" ]; then
    prompt_with_existing "Database Password (leave empty to keep current, or type 'generate' for new)" "$EXISTING_DB_PASSWORD" "DB_PASSWORD"
    if [ "$DB_PASSWORD" = "generate" ]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        print_info "Generated new Database Password"
    fi
else
    read -p "Database Password (leave empty to generate): " -s DB_PASSWORD
    echo
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        print_info "Generated Database Password"
    fi
fi

DB_CONFIG_JSON=$(cat <<EOF
{
  "db_host": "${DB_HOST}",
  "db_port": "${DB_PORT}",
  "db_name": "${DB_NAME}",
  "db_user": "${DB_USER}",
  "db_password": "${DB_PASSWORD}"
}
EOF
)

# Redis Config
echo ""
print_info "Redis Configuration"

# Redis Host
if [ -n "$EXISTING_REDIS_HOST" ]; then
    read -p "Redis Host [current: $EXISTING_REDIS_HOST]: " REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-$EXISTING_REDIS_HOST}
else
    REDIS_HOST=$(get_pulumi_output "redisHost")
    if [ -z "$REDIS_HOST" ]; then
        read -p "Redis Host [localhost]: " REDIS_HOST
        REDIS_HOST=${REDIS_HOST:-localhost}
    else
        read -p "Redis Host [$REDIS_HOST]: " REDIS_HOST_INPUT
        REDIS_HOST=${REDIS_HOST_INPUT:-$REDIS_HOST}
    fi
fi

# Redis Port
read -p "Redis Port [${EXISTING_REDIS_PORT:-6379}]: " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-${EXISTING_REDIS_PORT:-6379}}

REDIS_CONFIG_JSON=$(cat <<EOF
{
  "redis_host": "${REDIS_HOST}",
  "redis_port": "${REDIS_PORT}"
}
EOF
)

# Temporal DB Config
echo ""
print_info "Temporal Database Configuration"
read -p "Use same as main database? (y/n): " -n 1 -r USE_SAME_DB
echo
if [[ $USE_SAME_DB =~ ^[Yy]$ ]]; then
    TEMPORAL_DB_HOST=$DB_HOST
    TEMPORAL_DB_PORT=$DB_PORT
    TEMPORAL_DB_USER=$DB_USER
    TEMPORAL_DB_PASSWORD=$DB_PASSWORD
else
    read -p "Temporal DB Host: " TEMPORAL_DB_HOST
    read -p "Temporal DB Port [5432]: " TEMPORAL_DB_PORT
    TEMPORAL_DB_PORT=${TEMPORAL_DB_PORT:-5432}
    read -p "Temporal DB User: " TEMPORAL_DB_USER
    read -p "Temporal DB Password: " -s TEMPORAL_DB_PASSWORD
    echo
fi

read -p "Temporal Database Name [flowmaestro_temporal]: " TEMPORAL_DB_NAME
TEMPORAL_DB_NAME=${TEMPORAL_DB_NAME:-flowmaestro_temporal}
read -p "Temporal Visibility Database Name [flowmaestro_temporal_visibility]: " TEMPORAL_VISIBILITY_DB
TEMPORAL_VISIBILITY_DB=${TEMPORAL_VISIBILITY_DB:-flowmaestro_temporal_visibility}

TEMPORAL_DB_CONFIG_JSON=$(cat <<EOF
{
  "host": "${TEMPORAL_DB_HOST}",
  "port": "${TEMPORAL_DB_PORT}",
  "database": "${TEMPORAL_DB_NAME}",
  "user": "${TEMPORAL_DB_USER}",
  "password": "${TEMPORAL_DB_PASSWORD}",
  "visibility-database": "${TEMPORAL_VISIBILITY_DB}"
}
EOF
)

# LLM API Keys (optional)
echo ""
print_info "LLM API Keys (optional - press Enter to skip)"
read -p "OpenAI API Key: " OPENAI_API_KEY
read -p "Anthropic API Key: " ANTHROPIC_API_KEY
read -p "Google API Key: " GOOGLE_API_KEY

# OAuth Secrets (optional)
echo ""
print_info "OAuth Secrets (optional - press Enter to skip)"
read -p "Slack Client ID: " SLACK_CLIENT_ID
read -p "Slack Client Secret: " -s SLACK_CLIENT_SECRET
echo
read -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "Google OAuth Client Secret: " -s GOOGLE_CLIENT_SECRET
echo
read -p "Notion Client ID: " NOTION_CLIENT_ID
read -p "Notion Client Secret: " -s NOTION_CLIENT_SECRET
echo

print_header "Creating/Updating Secrets in GCP Secret Manager"

# Create/update all secrets
create_or_update_secret "flowmaestro-jwt-secret" "$JWT_SECRET"
create_or_update_secret "flowmaestro-encryption-key" "$ENCRYPTION_KEY"

create_or_update_json_secret "flowmaestro-db-config" "$DB_CONFIG_JSON"
create_or_update_json_secret "flowmaestro-redis-config" "$REDIS_CONFIG_JSON"
create_or_update_json_secret "flowmaestro-temporal-db-config" "$TEMPORAL_DB_CONFIG_JSON"

# LLM Keys
create_or_update_secret "flowmaestro-app-openai-api-key" "$OPENAI_API_KEY"
create_or_update_secret "flowmaestro-app-anthropic-api-key" "$ANTHROPIC_API_KEY"
create_or_update_secret "flowmaestro-app-google-api-key" "$GOOGLE_API_KEY"

# OAuth Secrets
create_or_update_secret "flowmaestro-app-slack-client-id" "$SLACK_CLIENT_ID"
create_or_update_secret "flowmaestro-app-slack-client-secret" "$SLACK_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-google-client-id" "$GOOGLE_CLIENT_ID"
create_or_update_secret "flowmaestro-app-google-client-secret" "$GOOGLE_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-notion-client-id" "$NOTION_CLIENT_ID"
create_or_update_secret "flowmaestro-app-notion-client-secret" "$NOTION_CLIENT_SECRET"

print_header "Setup Complete!"
print_success "All secrets have been created/updated in ${GCP_PROJECT}"
echo ""
print_info "Next steps:"
echo "  1. Run ./infra/scripts/sync-secrets-local.sh to pull secrets to .env"
echo "  2. Deploy with Pulumi: cd infra/pulumi && pulumi up"
echo ""
print_warn "Generated values (save these securely):"
echo "  JWT Secret: ${JWT_SECRET}"
echo "  Encryption Key: ${ENCRYPTION_KEY}"
[ -z "$OPENAI_API_KEY" ] || echo "  DB Password: ${DB_PASSWORD}"
echo ""
